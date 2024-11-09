import * as vscode from "vscode";
import { activate as activateHello } from "./hellos/hello";
import { activate as activateFormIfStatement } from "./logics/formIfStatement";
import { activate as activateFormTernaryOperator } from "./logics/formTernaryOperator";
import { activate as activateAddClassname } from "./reacts/addClassname";
import { activate as activateNewComponent } from "./reacts/newComponent";
import { activate as activateNewStyleSheet } from "./reacts/newStyleSheet";
import { activate as activateRemoveClassname } from "./reacts/removeClassname";

export function activate(context: vscode.ExtensionContext) {
  activateHello(context);

  activateNewComponent(context);

  activateAddClassname(context);
  activateRemoveClassname(context);

  activateNewStyleSheet(context);

  activateFormTernaryOperator(context);
  activateFormIfStatement(context);
}

export function deactivate() {}
