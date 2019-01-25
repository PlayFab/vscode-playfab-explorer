//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as nls from 'vscode-nls';
import { ExtensionContext, window, EventEmitter } from 'vscode';
import { ExtensionInfo } from './extension';
import { PlayFabAccount, PlayFabLoginStatus } from './playfab-account.api';
import { PlayFabHttpClient } from './helpers/PlayFabHttpHelper'
import { CreateAccountRequest, CreateAccountResponse, LoginRequest, LoginResponse, LogoutRequest, LogoutResponse } from './models/PlayFabAccountModels'
import { waitForOnline } from './helpers/PlayFabNetworkHelpers'

const localize = nls.loadMessageBundle();

interface PlayFabAccountWritable extends PlayFabAccount {
    status: PlayFabLoginStatus;
}

class PlayFabLoginError extends Error {
    constructor(message: string, public reason?: any) {
        super(message);
    }
}

export class PlayFabLoginManager {

    private static baseUrl: string = "https://editor.playfabapi.com";
    private static createAccountPath: string = "/DeveloperTools/User/RegisterAccount";
    private static loginPath: string = "/DeveloperTools/User/Login";
    private static logoutPath: string = "/DeveloperTools/User/Logout";

    private onStatusChanged = new EventEmitter<PlayFabLoginStatus>();
    private onSessionsChanged = new EventEmitter<void>();

    constructor(private context: ExtensionContext) {
    }

    async createAccount(): Promise<void> {

        await this.waitForOnline();

        let request: CreateAccountRequest = await this.getUserInputForCreateAccount();
        let httpCli = new PlayFabHttpClient(this.api);

        await httpCli.makeApiCall(
            PlayFabLoginManager.createAccountPath,
            PlayFabLoginManager.baseUrl,
            request,
            (response: CreateAccountResponse): void => {
                this.api.sessions.splice(0, this.api.sessions.length, {
                    cloud: "global",
                    credentials: {
                        token: response.DeveloperClientToken
                    },
                    userId: request.Email
                });
            },
            (code: number, message: string): void => {
                this.showLoginError(code, message);
                this.clearSessions();
            });

        this.endLoggingInOrOut();
    }

    async login(): Promise<void> {

        await this.waitForOnline();

        this.beginLoggingIn();

        let request: LoginRequest = await this.getUserInputForLogin();
        let httpCli = new PlayFabHttpClient(this.api);

        await httpCli.makeApiCall(
            PlayFabLoginManager.loginPath,
            PlayFabLoginManager.baseUrl,
            request,
            (response: LoginResponse): void => {
                this.api.sessions.splice(0, this.api.sessions.length, {
                    cloud: "global",
                    credentials: {
                        token: response.DeveloperClientToken
                    },
                    userId: request.Email
                });
            },
            (code: number, message: string): void => {
                this.showLoginError(code, message);
                this.clearSessions();
            });

        this.endLoggingInOrOut();
    }

    async logout(): Promise<void> {

        await this.api.waitForLogin();

        let request: LogoutRequest = new LogoutRequest();
        request.DeveloperClientToken = this.api.getToken();

        let httpCli = new PlayFabHttpClient(this.api);

        await httpCli.makeApiCall(
            PlayFabLoginManager.logoutPath,
            PlayFabLoginManager.baseUrl,
            request,
            (response: LogoutResponse): void => {
            },
            (code: number, message: string): void => {
                this.showLoginError(code, message);
            });

        await this.clearSessions();
        this.endLoggingInOrOut();
    }

    api: PlayFabAccount = {
        status: "Initializing",
        onStatusChanged: this.onStatusChanged.event,
        waitForLogin: () => this.waitForLogin(),
        sessions: [],
        onSessionsChanged: this.onSessionsChanged.event,
        getToken: () => this.getToken()
    }

    private beginLoggingIn(): void {
        this.updateStatus("LoggingIn");
    }

    private clearSessions(): void {
        const sessions = this.api.sessions;
        sessions.length = 0;
        this.onSessionsChanged.fire();
    }

    private endLoggingInOrOut(): void {
        this.updateStatus(this.api.sessions.length ? "LoggedIn" : "LoggedOut");
    }

    private getToken(): string {
        return this.api.sessions.length > 0 ? this.api.sessions[0].credentials.token : null;
    }

    private async getUserInputForCreateAccount(): Promise<CreateAccountRequest> {
        const emailPrompt: string = localize("playfab-account.emailPrompt", "Please enter your e-mail address");
        const emailAddress: string = await window.showInputBox({
            value: 'user@company.com',
            prompt: emailPrompt
        });

        const newPasswordPrompt: string = localize("playfab-account.newPasswordPrompt", "Please enter a password. Your password must be 8 characters or longer and contain at least two of these: uppercase characters, numbers, or symbols.");
        const password: string = await window.showInputBox({
            value: '',
            prompt: newPasswordPrompt,
            password: true
        });

        const reenterPasswordPrompt: string = localize("playfab-account.reenterPasswordPrompt", "Please re-enter the password.");
        const secondpassword: string = await window.showInputBox({
            value: '',
            prompt: reenterPasswordPrompt,
            password: true
        });

        const studioNamePrompt: string = localize("playfab-account.studioNamePrompt", "Please enter the name of your game studio.");
        const studioName: string = await window.showInputBox({
            value: '',
            prompt: studioNamePrompt
        });

        let result: CreateAccountRequest = null;

        if (password === secondpassword) {
            result = new CreateAccountRequest();

            result.Email = emailAddress;
            result.Password = password;
            result.StudioName = studioName;
            result.DeveloperToolProductName = ExtensionInfo.getExtensionName();
            result.DeveloperToolProductVersion = ExtensionInfo.getExtensionVersion();
        }
        else {
            const msg: string = localize("playfab-account.passwordMismatch", "Passwords did not match.");
            await window.showErrorMessage(msg);
        }

        return result;
    }

    private async getUserInputForLogin(): Promise<LoginRequest> {
        const emailPrompt: string = localize("playfab-account.emailPrompt", "Please enter your e-mail address");
        const emailAddress: string = await window.showInputBox({
            value: 'user@company.com',
            prompt: emailPrompt
        });

        const passwordPrompt: string = localize("playfab-account.passwordPrompt", "Please enter your password");
        const password: string = await window.showInputBox({
            value: '',
            prompt: passwordPrompt,
            password: true
        });

        const twofaPrompt: string = localize("playfab-account.twofaPrompt", "Please enter your two-factor auth code");
        const twofa: string = await window.showInputBox({
            value: '123 456',
            prompt: twofaPrompt,
        });

        let request = new LoginRequest();

        request.Email = emailAddress;
        request.Password = password;
        request.TwoFactorAuth = twofa;
        request.DeveloperToolProductName = ExtensionInfo.getExtensionName();
        request.DeveloperToolProductVersion = ExtensionInfo.getExtensionVersion();

        return request;
    }

    private showLoginError(statusCode: number, message: string): void {
        window.showErrorMessage(`${statusCode} - ${message}`);
    }

    private updateStatus(status: PlayFabLoginStatus): void {
        if (this.api.status != status) {
            (<PlayFabAccountWritable>this.api).status = status;
            this.onStatusChanged.fire(this.api.status);
        }
    }

    private async waitForLogin(): Promise<boolean> {
        switch (this.api.status) {
            case 'LoggedIn':
                return true;
            case 'LoggedOut':
                return false;
            case 'Initializing':
            case 'LoggingIn':
                return new Promise<boolean>(resolve => {
                    const subscription = this.api.onStatusChanged(() => {
                        subscription.dispose();
                        resolve(this.waitForLogin());
                    });
                });
            default:
                const status: never = this.api.status;
                throw new Error(`Unexpected status '${status}'`);
        }
    }

    private async waitForOnline(): Promise<void> {
        const cancelTitle: string = localize('playfab-account.cancel', "Cancel")
        const checkNetworkMessage: string = localize('playfab-account.checkNetwork', "You appear to be offline. Please check your network connection.");
        const offlineMessage: string = localize('playfab-account.offline', "Offline");
        await waitForOnline(
            cancelTitle,
            checkNetworkMessage,
            () => { throw new PlayFabLoginError(offlineMessage); }
        );
    }
}