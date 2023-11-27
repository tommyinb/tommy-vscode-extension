import {
  FunctionDeclaration,
  Node,
  ScriptKind,
  ScriptTarget,
  SourceFile,
  SyntaxKind,
  createSourceFile,
  isFunctionDeclaration,
  isInterfaceDeclaration,
  isJsxAttribute,
  isJsxElement,
  isJsxExpression,
  isNoSubstitutionTemplateLiteral,
  isObjectBindingPattern,
  isParenthesizedExpression,
  isReturnStatement,
  isStringLiteral,
  isTemplateExpression,
} from "typescript";
import * as vscode from "vscode";
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

        if (matched.includes("className")) {
          return [];
        }

        const offset = document.offsetAt(range.start);

        if (offset < match.index || offset > match.index + matched.length) {
          return [];
        }

        const codeAction = new vscode.CodeAction(
          "Add classname snippet",
          vscode.CodeActionKind.QuickFix
        );

        codeAction.command = {
          command: "tommy-vscode-extension.react.addClassname",
          title: "Add classname snippet",
          arguments: [document, range],
        };

        return [codeAction];
      },
    }
  );
}

function createCommand() {
  return vscode.commands.registerCommand(
    "tommy-vscode-extension.react.addClassname",
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

          tryAddParameter(sourceFile, document, editBuilder);
          tryAddUsage(sourceFile, document, editBuilder);
          tryAddProperty(sourceFile, document, editBuilder);
        });
      }
    }
  );
}

function tryAddParameter(
  sourceFile: SourceFile,
  document: vscode.TextDocument,
  editBuilder: vscode.TextEditorEdit
) {
  const pathParts = getPathParts(sourceFile.fileName);
  const className = pathParts[pathParts.length - 1];

  sourceFile.forEachChild((node) => {
    if (isComponent(node, className)) {
      const { parameters } = node;
      if (parameters.length <= 0) {
        const startPosition = document.positionAt(parameters.pos);
        const endPosition = document.positionAt(parameters.end);
        const range = new vscode.Range(startPosition, endPosition);

        editBuilder.replace(range, `{ className }: Props`);
        return;
      }

      const parameter = parameters[0];
      if (
        !(
          isObjectBindingPattern(parameter.name) &&
          parameter.type?.getText() === "Props"
        )
      ) {
        const startPosition = document.positionAt(parameters.pos);
        const endPosition = document.positionAt(parameters.pos);
        const range = new vscode.Range(startPosition, endPosition);

        editBuilder.replace(range, `{ className }: Props, `);
        return;
      }

      const { elements } = parameter.name;

      if (elements.length <= 0) {
        const startPosition = document.positionAt(elements.pos);
        const endPosition = document.positionAt(elements.end);
        const range = new vscode.Range(startPosition, endPosition);

        editBuilder.replace(range, "className");
        return;
      }

      if (!elements.some((element) => element.name.getText() === "className")) {
        const startPosition = document.positionAt(elements.pos);
        const endPosition = document.positionAt(elements.pos);
        const range = new vscode.Range(startPosition, endPosition);

        editBuilder.replace(range, "className, ");
        return;
      }
    }
  });
}

export function isComponent(
  node: Node,
  className: string
): node is FunctionDeclaration {
  return !!(
    isFunctionDeclaration(node) &&
    node.name?.getText() === className &&
    node.modifiers?.some(
      (modifier) => modifier.kind === SyntaxKind.ExportKeyword
    )
  );
}

function tryAddUsage(
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
          const startPosition = document.positionAt(properties.pos);
          const endPosition = document.positionAt(properties.end);
          const range = new vscode.Range(startPosition, endPosition);

          editBuilder.replace(range, ` className={className} `);
          return;
        }

        const { initializer } = property;
        if (!initializer) {
          return;
        }

        if (
          isStringLiteral(initializer) ||
          isNoSubstitutionTemplateLiteral(initializer)
        ) {
          const startPosition = document.positionAt(initializer.pos);
          const endPosition = document.positionAt(initializer.end);
          const range = new vscode.Range(startPosition, endPosition);

          const oldValue = initializer.getText().slice(1, -1);

          editBuilder.replace(range, `{\`${oldValue} \${className}\`}`);
        } else if (isJsxExpression(initializer)) {
          const valueExpression = initializer.expression;
          if (!valueExpression) {
            return;
          }

          if (
            isStringLiteral(valueExpression) ||
            isNoSubstitutionTemplateLiteral(valueExpression)
          ) {
            const startPosition = document.positionAt(valueExpression.pos);
            const endPosition = document.positionAt(valueExpression.end);
            const range = new vscode.Range(startPosition, endPosition);

            const oldValue = valueExpression.getText().slice(1, -1);

            editBuilder.replace(range, `\`${oldValue} \${className}\``);
          } else if (isTemplateExpression(valueExpression)) {
            const startPosition = document.positionAt(valueExpression.pos);
            const endPosition = document.positionAt(valueExpression.end);
            const range = new vscode.Range(startPosition, endPosition);

            const oldValue = valueExpression.getText().slice(1, -1);

            if (oldValue.includes("${className}")) {
              return;
            }

            editBuilder.replace(range, `\`${oldValue} \${className}\``);
          }
        }
      });
    }
  });
}

function tryAddProperty(
  sourceFile: SourceFile,
  document: vscode.TextDocument,
  editBuilder: vscode.TextEditorEdit
) {
  let olded = false;

  sourceFile.forEachChild((node) => {
    if (isInterfaceDeclaration(node) && node.name?.getText() === "Props") {
      olded = true;

      const { members } = node;
      if (members.length <= 0) {
        const startPosition = document.positionAt(members.pos);
        const endPosition = document.positionAt(members.end);
        const range = new vscode.Range(startPosition, endPosition);

        editBuilder.replace(range, "\n  className: string\n");
        return;
      }

      if (!members.some((member) => member.name?.getText() === "className")) {
        const startPosition = document.positionAt(members.pos);
        const endPosition = document.positionAt(members.pos);
        const range = new vscode.Range(startPosition, endPosition);

        editBuilder.replace(range, "\n  className: string,");
        return;
      }
    }
  });

  if (olded) {
    return;
  }

  const lastPosition = document.positionAt(document.getText().length);

  editBuilder.insert(
    lastPosition,
    "\n\ninterface Props {\n  className: string;\n}\n"
  );
}
