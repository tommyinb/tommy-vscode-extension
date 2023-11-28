import {
  IfStatement,
  Node,
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  isBlock,
  isExpressionStatement,
  isIfStatement,
  isParenthesizedExpression,
  isReturnStatement,
} from "typescript";
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
        const text = document.getText();

        const start = document.offsetAt(range.start);
        const end = document.offsetAt(range.end);

        const ranged = text.slice(start, end);
        if (!(ranged.includes("if") && ranged.includes("else"))) {
          return [];
        }

        const codeAction = new vscode.CodeAction(
          "Form ternary operator snippet",
          vscode.CodeActionKind.QuickFix
        );

        codeAction.command = {
          command: "tommy-vscode-extension.logics.formTernaryOperator",
          title: "Form ternary operator snippet",
          arguments: [document, range],
        };

        return [codeAction];
      },
    }
  );
}

function createCommand() {
  return vscode.commands.registerCommand(
    "tommy-vscode-extension.logics.formTernaryOperator",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.edit((editBuilder) => {
          const { document } = editor;

          const selectionStart = document.offsetAt(editor.selection.start);
          const selectionEnd = document.offsetAt(editor.selection.end);

          const selected = document
            .getText()
            .slice(selectionStart, selectionEnd);

          const sourceFile = createSourceFile(
            "selected.tsx",
            selected,
            ScriptTarget.Latest,
            true,
            ScriptKind.TSX
          );

          sourceFile.forEachChild((node) => {
            const content = removeBlocks(node);

            if (isIfStatement(content)) {
              const converted = formOuter(content);

              editBuilder.replace(editor.selection, converted);
            }
          });
        });
      }
    }
  );
}

export function removeBlocks(node: Node): Node {
  if (isParenthesizedExpression(node)) {
    return removeBlocks(node.expression);
  } else if (isBlock(node) && node.statements.length === 1) {
    return removeBlocks(node.statements[0]);
  } else if (isExpressionStatement(node)) {
    return removeBlocks(node.expression);
  } else {
    return node;
  }
}

function formOuter(ifStatement: IfStatement): string {
  const conditionText = ifStatement.expression.getText();

  const trueText = formInner(ifStatement.thenStatement);

  const falseText = ifStatement.elseStatement
    ? formInner(ifStatement.elseStatement)
    : "undefined";

  return `${conditionText} ? ${trueText} : ${falseText}`;
}

function formInner(node: Node): string {
  const inner = removeBlocks(node);

  if (isIfStatement(inner)) {
    return formOuter(inner);
  } else if (isReturnStatement(inner)) {
    return inner.expression?.getText() ?? "undefined";
  } else {
    return `(() => {${inner.getText()}})()`;
  }
}
