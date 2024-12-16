import * as vscode from "vscode";
import { getRelativePath } from "./newComponent";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(createListener());
  context.subscriptions.push(createProvider());
  context.subscriptions.push(createCommand());
}

function createListener() {
  return vscode.workspace.onDidCreateFiles(async (event) => {
    for (const file of event.files) {
      if (/\/([A-Z]\w+).css$/.exec(file.path)) {
        const oldText = await (async () => {
          try {
            const content = await vscode.workspace.fs.readFile(file);
            return new TextDecoder().decode(content);
          } catch {
            return undefined;
          }
        })();

        if (!oldText?.trim()) {
          const newText = createStyleText(file.path);
          await vscode.workspace.fs.writeFile(file, Buffer.from(newText));

          await tryInsertStyleImport(file.path);
        }
      }
    }
  });
}

function createProvider() {
  return vscode.languages.registerCodeActionsProvider(
    {
      language: "typescriptreact",
      scheme: "file",
    },
    {
      provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range
      ): vscode.ProviderResult<vscode.CodeAction[]> {
        const text = document.getText();
        if (text.length > 10) {
          return [];
        }

        const codeAction = new vscode.CodeAction(
          "Insert react style sheet snippet",
          vscode.CodeActionKind.QuickFix
        );

        codeAction.command = {
          command: "tommy-vscode-extension.reacts.newStyleSheet",
          title: "Insert react component snippet",
          arguments: [document, range],
        };

        return [codeAction];
      },
    }
  );
}

function createCommand() {
  return vscode.commands.registerCommand(
    "tommy-vscode-extension.reacts.newStyleSheet",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const text = createStyleText(editor.document.fileName);
        editor.insertSnippet(new vscode.SnippetString(text));

        await tryInsertStyleImport(editor.document.fileName);
      }
    }
  );
}

function createStyleText(filePath: string): string {
  const relativePath = getRelativePath(filePath);

  const classText = relativePath.replaceAll(/[\\/]/g, "-").replace(".css", "");

  return `.${classText} {
}`;
}

async function tryInsertStyleImport(stylePath: string) {
  const componentFile = vscode.Uri.file(stylePath.replace(".css", ".tsx"));

  const componentText = await (async () => {
    try {
      const componentContent = await vscode.workspace.fs.readFile(
        componentFile
      );
      return new TextDecoder().decode(componentContent);
    } catch {
      return undefined;
    }
  })();

  if (componentText === undefined) {
    return;
  }

  const nameMatch = /[\\/](\w+).css$/.exec(stylePath);
  if (!nameMatch) {
    return;
  }

  const [, nameText] = nameMatch;

  const importText = `import "./${nameText}.css";`;
  if (componentText.includes(importText)) {
    return;
  }

  const lineBreaks = componentText.startsWith("import") ? "\n" : "\n\n";

  const outputText = `${importText}${lineBreaks}${componentText}`;
  await vscode.workspace.fs.writeFile(componentFile, Buffer.from(outputText));
}
