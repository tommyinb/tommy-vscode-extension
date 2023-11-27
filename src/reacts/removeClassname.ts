import {
  ScriptKind,
  ScriptTarget,
  SourceFile,
  createSourceFile,
  isInterfaceDeclaration,
  isJsxAttribute,
  isJsxElement,
  isJsxExpression,
  isObjectBindingPattern,
  isParenthesizedExpression,
  isReturnStatement,
  isTemplateExpression,
} from "typescript";
import * as vscode from "vscode";
import { isComponent } from "./addClassname";
import { getPathParts } from "./newComponent";

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

        const match = /export function \w+\s*\([^)]*\)\s*{\s*/.exec(text);
        if (!match) {
          return [];
        }

        const [matched] = match;

        if (!matched.includes("className")) {
          return [];
        }

        const offset = document.offsetAt(range.start);

        if (offset < match.index || offset > match.index + matched.length) {
          return [];
        }

        const codeAction = new vscode.CodeAction(
          "Remove classname snippet",
          vscode.CodeActionKind.QuickFix
        );

        codeAction.command = {
          command: "tommy-vscode-extension.react.removeClassname",
          title: "Remove classname snippet",
          arguments: [document, range],
        };

        return [codeAction];
      },
    }
  );
}

function createCommand() {
  return vscode.commands.registerCommand(
    "tommy-vscode-extension.react.removeClassname",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const { document } = editor;
        const { fileName } = document;

        editor.edit((editBuilder) => {
          const sourceFile = createSourceFile(
            fileName,
            document.getText(),
            ScriptTarget.Latest,
            true,
            ScriptKind.TSX
          );

          tryRemoveParameter(sourceFile, document, editBuilder);
          tryRemoveUsage(sourceFile, document, editBuilder);
          tryRemoveProperty(sourceFile, document, editBuilder);
        });
      }
    }
  );
}

function tryRemoveParameter(
  sourceFile: SourceFile,
  document: vscode.TextDocument,
  editBuilder: vscode.TextEditorEdit
) {
  const pathParts = getPathParts(sourceFile.fileName);
  const className = pathParts[pathParts.length - 1];

  sourceFile.forEachChild((node) => {
    if (!isComponent(node, className)) {
      return;
    }

    const { parameters } = node;
    if (parameters.length <= 0) {
      return;
    }

    const parameter = parameters[0];
    if (
      !(
        isObjectBindingPattern(parameter.name) &&
        parameter.type?.getText() === "Props"
      )
    ) {
      return;
    }

    const { elements } = parameter.name;
    const element = elements.find(
      (element) => element.name.getText() === "className"
    );

    if (!element) {
      return;
    }

    if (elements.length > 1) {
      const startPosition = document.positionAt(element.pos);

      const tailingText = sourceFile.text.slice(element.end, element.end + 5);
      const tailingMatch = /\s*,\s*/.exec(tailingText);

      const endPosition = document.positionAt(
        element.end + (tailingMatch ? tailingMatch[0].length : 0)
      );

      const range = new vscode.Range(startPosition, endPosition);

      editBuilder.replace(range, "");
    } else {
      const startPosition = document.positionAt(parameters.pos);
      const endPosition = document.positionAt(parameters.end);
      const range = new vscode.Range(startPosition, endPosition);

      editBuilder.replace(range, "");
    }
  });
}

function tryRemoveUsage(
  sourceFile: SourceFile,
  document: vscode.TextDocument,
  editBuilder: vscode.TextEditorEdit
) {
  const pathParts = getPathParts(sourceFile.fileName);
  const className = pathParts[pathParts.length - 1];

  sourceFile.forEachChild((outerNode) => {
    if (isComponent(outerNode, className)) {
      outerNode.body?.forEachChild((innerNode) => {
        if (!isReturnStatement(innerNode)) {
          return;
        }

        if (!innerNode.expression) {
          return;
        }

        const returnExpression = isParenthesizedExpression(innerNode.expression)
          ? innerNode.expression.expression
          : innerNode.expression;

        if (!isJsxElement(returnExpression)) {
          return;
        }

        const { properties } = returnExpression.openingElement.attributes;

        const property = properties.find(
          (property) => property.name?.getText() === "className"
        );

        if (!(property && isJsxAttribute(property))) {
          return;
        }

        const { initializer } = property;
        if (!initializer) {
          return;
        }

        if (!isJsxExpression(initializer)) {
          return;
        }

        const valueExpression = initializer.expression;
        if (!valueExpression) {
          return;
        }

        if (!isTemplateExpression(valueExpression)) {
          return;
        }

        const oldValue = valueExpression.getText().slice(1, -1);

        const newValue = oldValue
          .replace(" ${className}", "")
          .replace("${className} ", "")
          .replace("${className}", "")
          .trim();

        if (newValue) {
          if (newValue.includes("$")) {
            const startPosition = document.positionAt(valueExpression.pos);
            const endPosition = document.positionAt(valueExpression.end);
            const range = new vscode.Range(startPosition, endPosition);

            editBuilder.replace(range, `\`${newValue}\``);
          } else {
            const startPosition = document.positionAt(initializer.pos);
            const endPosition = document.positionAt(initializer.end);
            const range = new vscode.Range(startPosition, endPosition);

            editBuilder.replace(range, `"${newValue}"`);
          }
        } else {
          const startPosition = document.positionAt(property.pos);
          const endPosition = document.positionAt(property.end);
          const range = new vscode.Range(startPosition, endPosition);

          editBuilder.replace(range, "");
        }
      });
    }
  });
}

function tryRemoveProperty(
  sourceFile: SourceFile,
  document: vscode.TextDocument,
  editBuilder: vscode.TextEditorEdit
) {
  sourceFile.forEachChild((node) => {
    if (!isInterfaceDeclaration(node)) {
      return;
    }

    if (node.name?.getText() !== "Props") {
      return;
    }

    const { members } = node;
    const member = members.find(
      (member) => member.name?.getText() === "className"
    );

    if (!member) {
      return;
    }

    if (members.length > 1) {
      const startPosition = document.positionAt(member.pos);
      const endPosition = document.positionAt(member.end);
      const range = new vscode.Range(startPosition, endPosition);

      editBuilder.replace(range, "");
    } else {
      const startPosition = document.positionAt(node.pos);
      const endPosition = document.positionAt(node.end);
      const range = new vscode.Range(startPosition, endPosition);

      editBuilder.replace(range, "");
    }
  });
}
