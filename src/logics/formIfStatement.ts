import {
  ConditionalExpression,
  Node,
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  isConditionalExpression,
} from "typescript";
import * as vscode from "vscode";
import { removeBlocks } from "./formTernaryOperator";

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
        if (!(ranged.includes("?") && ranged.includes(":"))) {
          return [];
        }

        const codeAction = new vscode.CodeAction(
          "Form if statement snippet",
          vscode.CodeActionKind.QuickFix
        );

        codeAction.command = {
          command: "tommy-vscode-extension.logics.formIfStatement",
          title: "Form if statement snippet",
          arguments: [document, range],
        };

        return [codeAction];
      },
    }
  );
}

function createCommand() {
  return vscode.commands.registerCommand(
    "tommy-vscode-extension.logics.formIfStatement",
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

            if (isConditionalExpression(content)) {
              const converted = formOuter(content);

              const indentation = " ".repeat(editor.selection.start.character);
              const indented = indent(converted, indentation);

              const output = indented.slice(indentation.length);

              editBuilder.replace(editor.selection, output);
            }
          });
        });
      }
    }
  );
}

function formOuter(conditionalStatment: ConditionalExpression): string {
  const conditionText = conditionalStatment.condition.getText();

  const trueText = formInner(conditionalStatment.whenTrue);
  const falseText = formInner(conditionalStatment.whenFalse);

  return `if (${conditionText}) {
${indent(trueText, "  ")}
} else {
${indent(falseText, "  ")}
}`;
}

function formInner(node: Node): string {
  const inner = removeBlocks(node);

  if (isConditionalExpression(inner)) {
    return formOuter(inner);
  } else {
    return `return ${inner.getText()}`;
  }
}

function indent(text: string, indentation: string) {
  return text
    .split(/\r?\n/)
    .map((line) => `${indentation}${line}`)
    .join("\n");
}
