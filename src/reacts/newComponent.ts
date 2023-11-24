import * as vscode from "vscode";
import { NewComponentProvider } from "./newComponentProvider";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tommy-vscode-extension.react.newComponent",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const snippet = createSnippet(editor.document.fileName);
          editor.insertSnippet(new vscode.SnippetString(snippet));
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { language: "typescriptreact", scheme: "file" },
      new NewComponentProvider()
    )
  );
}

function createSnippet(filePath: string): string {
  const allParts = filePath.split(/[\\/]/);

  const startIndex = allParts.indexOf("src");
  const validParts = allParts.slice(startIndex >= 0 ? startIndex + 1 : -1);

  const fileName = validParts[validParts.length - 1];
  const componentName = fileName.replace(".tsx", "");

  const classParts = validParts.slice(0, -1);
  const classText = [...classParts, componentName].join("-");

  return `export function ${componentName}() {
  return <div className="${classText}"></div>;
}`;
}
