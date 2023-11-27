import * as vscode from "vscode";
import { activate as activateHello } from "./hellos/hello";
import { activate as activateAddClassname } from "./reacts/addClassname";
import { activate as activateNewComponent } from "./reacts/newComponent";
import { activate as activateRemoveClassname } from "./reacts/removeClassname";

export function activate(context: vscode.ExtensionContext) {
  activateHello(context);

  activateNewComponent(context);

  activateAddClassname(context);
  activateRemoveClassname(context);
}

export function deactivate() {}
