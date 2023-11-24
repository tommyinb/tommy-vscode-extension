import * as vscode from "vscode";

export class NewComponentProvider implements vscode.CodeActionProvider {
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const text = document.getText().trim();
    if (text.length > 0) {
      return [];
    }

    const codeAction = new vscode.CodeAction(
      "Insert React Component Snippet",
      vscode.CodeActionKind.QuickFix
    );

    codeAction.command = {
      command: "tommy-vscode-extension.react.newComponent",
      title: "Insert React Component code",
      arguments: [document, range],
    };

    return [codeAction];
  }
}
