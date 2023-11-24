import * as vscode from "vscode";
import { activate as activateHello } from "./hellos/hello";
import { activate as activateNewComponent } from "./reacts/newComponent";

export function activate(context: vscode.ExtensionContext) {
  activateHello(context);

  activateNewComponent(context);
}

export function deactivate() {}
