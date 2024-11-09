import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(createListener());
  context.subscriptions.push(createProvider());
  context.subscriptions.push(createCommand());
}

function createListener() {
  return vscode.workspace.onDidCreateFiles(async (event) => {
    const files = event.files.filter((file) => {
      const match = /\/([A-Z]\w+).tsx$/.exec(file.path);
      if (!match) {
        return false;
      }

      const [, name] = match;
      return !name.endsWith("Context");
    });

    for (const file of files) {
      const text = await createSnippet(file.path);
      await vscode.workspace.fs.writeFile(file, Buffer.from(text));
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
          "Insert react component snippet",
          vscode.CodeActionKind.QuickFix
        );

        codeAction.command = {
          command: "tommy-vscode-extension.reacts.newComponent",
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
    "tommy-vscode-extension.reacts.newComponent",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const text = await createSnippet(editor.document.fileName);
        editor.insertSnippet(new vscode.SnippetString(text));
      }
    }
  );
}

async function createSnippet(componentPath: string) {
  const componentParts = getPathParts(componentPath);
  const componentName = componentParts[componentParts.length - 1];

  const componentClass = componentParts.join("-");

  const componentText = `export function ${componentName}() {
  return <div className="${componentClass}"></div>;
}`;

  const stylePath = componentPath.replace(
    `${componentName}.tsx`,
    `${componentName}.css`
  );
  const styleUri = vscode.Uri.file(stylePath);

  const styled = await (async () => {
    try {
      await vscode.workspace.fs.stat(styleUri);
      return true;
    } catch {
      return false;
    }
  })();

  if (styled) {
    return `import "./${componentName}.css";\n\n${componentText}`;
  } else {
    return componentText;
  }
}

export function getRelativePath(filePath: string) {
  const match = /[\\/]src[\\/](.+)$/.exec(filePath);
  return match ? match[1] : filePath;
}

export function getPathParts(filePath: string) {
  const relativePath = getRelativePath(filePath);

  const parts = relativePath.split(/[\\/]/);

  const fileName = parts[parts.length - 1];
  const componentName = fileName.replace(".tsx", "");

  const pathParts = parts.slice(0, -1);
  return [...pathParts, componentName];
}
