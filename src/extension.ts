import * as vscode from 'vscode';
import request = require("request");

let statusBarItem: vscode.StatusBarItem;
let devOpsOrg: string;
let devOpsToken: string;

export function activate(context: vscode.ExtensionContext) {

	const subscriptions = context.subscriptions;
	const commandId = "showWhoIsRunningABuild";
	const resetCommandId = "resetDevOpsConfig";

	devOpsOrg = context.globalState.get("DevOpsOrg", "");
	devOpsToken = context.globalState.get("DevOpsToken", "");

	let isConfigured = (devOpsOrg.length > 0 && devOpsToken.length > 0);

	subscriptions.push(vscode.commands.registerCommand(resetCommandId, () => {
		context.globalState.update("DevOpsOrg", "");
		context.globalState.update("DevOpsToken", "");
		devOpsOrg = "";
		devOpsToken = "";
		isConfigured = false;
		statusBarItem.text = "$(gear) Click here to configure your DevOps Org";
		vscode.window.showInformationMessage("Token and Org info removed.");
	}));

	subscriptions.push(vscode.commands.registerCommand(commandId, () => {
		if (isConfigured) {
			updateStatusBarItem();
		} else {
			vscode.window.showInputBox({
				prompt: "Please enter your DevOps Organization (https://dev.azure.com/ORG)",
				placeHolder: "ORG",
			}).then((org) => {
				if (org) {
					devOpsOrg = org;
					vscode.window.showInputBox({
						prompt: "Please enter your 'Full Access' personal access token",
						placeHolder: "TOKEN from DevOps->Security->Personal Access Tokens"
					}).then((token) => {
						if (token) {
							devOpsToken = token;

							context.globalState.update("DevOpsOrg", devOpsOrg).then(() => {
								context.globalState.update("DevOpsToken", devOpsToken).then(() => {
									updateStatusBarItem();
								});
							});
							isConfigured = true;
							statusBarItem.text = "$(sync) Loading...";
						}
					});
				}
			});
		}
	}));

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = commandId;

	if (isConfigured) {
		statusBarItem.text = "$(sync) Loading...";
	} else {
		statusBarItem.text = "$(gear) Click here to configure your DevOps Org";
	}

	subscriptions.push(statusBarItem);
	statusBarItem.show();

	subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));

	updateStatusBarItem();
}

function updateStatusBarItem() {
	request(`https://dev.azure.com/${devOpsOrg}/_apis/distributedtask/resourceusage?parallelismTag=Private&poolIsHosted=true&includeRunningRequests=true`, {
		auth: {
			username: "dummy",
			password: devOpsToken
		}
	}, (error, response, body) => {
		const data = JSON.parse(body);

		if (data.usedCount > 0 && data.runningRequests && data.runningRequests.length > 0) {

			if (data.runningRequests.length > 1) {
				statusBarItem.text = `$(clock) ${data.runningRequests.length} running builds`;
			} else {
				const buildTitle = data.runningRequests[0].definition.name;
				const buildDetailsUrl = data.runningRequests[0].owner._links.self.href;

				const planType = data.runningRequests[0].planType;
				if (planType === "Release") {
					statusBarItem.text = `$(clock) Releasing '${buildTitle}'`;
				} else if (planType === "Build") {
					request(buildDetailsUrl, {
						auth: {
							username: "dummy",
							password: devOpsToken
						}
					}, (error2, response2, body2) => {
						const dataDetails = JSON.parse(body2);
						const owner = dataDetails.requestedFor.displayName;
						statusBarItem.text = `$(clock) ${owner} is building '${buildTitle}'`;
					});
				}
			}
		} else {
			statusBarItem.text = "$(thumbsup) No running builds";
		}
	});
}