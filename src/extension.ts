import * as vscode from 'vscode';
import request = require("request");

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {

	const subscriptions = context.subscriptions;

	const commandId = "og.showWhoIsRunningABuild";
	subscriptions.push(vscode.commands.registerCommand(commandId, () => {
		updateStatusBarItem();
	}));

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = commandId;
	statusBarItem.text = "$(sync) Who is running a build?";
	subscriptions.push(statusBarItem);
	statusBarItem.show();

	subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
}

function updateStatusBarItem() {
	loadDevOpsBuildInfo().then((s) => {
		statusBarItem.text = s;
	});
}

async function loadDevOpsBuildInfo(): Promise<string> {
	return new Promise<string>(resolve => {
		request("https://ogccc-devops-tools.azurewebsites.net/api/DevopsBuilds?code=nWnmT3fnYFnZnZMOZa1GDkF2eb1kiC0YQ8263/oHmeqnFxXC0FMm8Q==", (error, response, body) => {
			const data = JSON.parse(body);
			if (data.isRunning) {
				resolve(`$(clock) ${data.owner} is building '${data.buildTitle}'`);
			} else {
				resolve("$(thumbsup) No running builds");
			}
		});
	});
}