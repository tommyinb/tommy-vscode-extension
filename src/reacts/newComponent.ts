import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(createProvider());
  context.subscriptions.push(createCommand());
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
        const text = document.getText().trim();
        if (text.length > 0) {
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
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const text = createSnippet(editor.document.fileName);
        editor.insertSnippet(new vscode.SnippetString(text));
      }
    }
  );
}

function createSnippet(filePath: string): string {
  const pathParts = getPathParts(filePath);

  const componentName = pathParts[pathParts.length - 1];

  const classText = pathParts.join("-");

  return `export function ${componentName}() {
  return <div className="${classText}"></div>;
}`;
}

export function getPathParts(filePath: string) {
  const allParts = filePath.split(/[\\/]/);

  const startIndex = allParts.indexOf("src");
  const validParts = allParts.slice(startIndex >= 0 ? startIndex + 1 : -1);

  const fileName = validParts[validParts.length - 1];
  const componentName = fileName.replace(".tsx", "");

  const pathParts = validParts.slice(0, -1);
  return [...pathParts, componentName];
}
