//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { commands, ExtensionContext, StatusBarItem, window, workspace } from 'vscode';
import * as nls from 'vscode-nls';
import { PlayFabLoginManager } from './playfab-account';
import { PlayFabAccount } from './playfab-account.api';
import { PlayFabExplorer } from './playfab-explorer'

const localize = nls.loadMessageBundle();

export class ExtensionInfo {
    private static extensionName: string = "vscode-playfab-account";
    private static extensionVersion: string = "0.0.1";

    public static getExtensionInfo(): string { return ExtensionInfo.extensionName + '_' + ExtensionInfo.extensionVersion };
    public static getExtensionName(): string { return ExtensionInfo.extensionName; }
    public static getExtensionVersion(): string { return ExtensionInfo.extensionVersion; }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext): void {
    const loginManager = new PlayFabLoginManager(context);

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log(`${ExtensionInfo.getExtensionName()} is now active!`);

    context.subscriptions.push(createStatusBarItem(context, loginManager.api));
    context.subscriptions.push(commands.registerCommand('playfab-account.createAccount', async () => await createAccount(loginManager)));
    context.subscriptions.push(commands.registerCommand('playfab-account.login', async () => await login(loginManager)));
    context.subscriptions.push(commands.registerCommand('playfab-account.logout', async () => await logout(loginManager)));

    new PlayFabExplorer(context, loginManager.api);
}

// this method is called when your extension is deactivated
export function deactivate(): void {
    // NOOP
}

export async function createAccount(loginManager: PlayFabLoginManager): Promise<void> {
    await loginManager.createAccount();
}

export async function login(loginManager: PlayFabLoginManager): Promise<void> {
    await loginManager.login();
}

export async function logout(loginManager: PlayFabLoginManager): Promise<void> {
    await loginManager.logout();
}

function createStatusBarItem(context: ExtensionContext, api: PlayFabAccount): StatusBarItem {
    const statusBarItem: StatusBarItem = window.createStatusBarItem();

    function updateStatusBar() {
        switch (api.status) {
            case 'LoggingIn':
                statusBarItem.text = localize('playfab-account.loggingIn', "PlayFab: Signing in...");
                statusBarItem.show();
                break;
            case 'LoggedIn':
                if (api.sessions.length) {
                    const playfabConfig = workspace.getConfiguration('playfab');
                    const showSignedInEmail = playfabConfig.get<boolean>('showSignedInEmail');
                    statusBarItem.text = showSignedInEmail ? localize('playfab-account.loggedIn', "PlayFab: {0}", api.sessions[0].userId) : localize('playfab-account.loggedIn', "PlayFab: Signed In");
                    statusBarItem.show();
                }
                break;
            default:
                statusBarItem.hide();
                break;
        }
    }
    context.subscriptions.push(
        statusBarItem,
        api.onStatusChanged(updateStatusBar),
        api.onSessionsChanged(updateStatusBar),
        workspace.onDidChangeConfiguration(updateStatusBar)
    );
    updateStatusBar();
    return statusBarItem;
}