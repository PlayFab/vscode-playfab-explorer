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
    private static createAccountPath = "/DeveloperTools/User/RegisterAccount";
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

        let request = await this.getUserInputForLogin();
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
        const userName = await window.showInputBox({
            value: 'user@company.com',
            prompt: 'Please enter your e-mail address'
        });
        window.showInformationMessage(`User Name: ${userName}`);

        const password = await window.showInputBox({
            value: '',
            prompt: 'Please enter a password. Your password must be 8 characters or longer and contain at least two of these: uppercase characters, numbers, or symbols.',
            password: true
        });

        const secondpassword = await window.showInputBox({
            value: '',
            prompt: 'Please re-enter the password.',
            password: true
        });

        const studioName = await window.showInputBox({
            value: '',
            prompt: 'Please enter the name of your game studio.'
        });

        let result: CreateAccountRequest = null;

        if (password === secondpassword) {
            result = new CreateAccountRequest();

            result.Email = userName;
            result.Password = password;
            result.StudioName = studioName;
            result.DeveloperToolProductName = ExtensionInfo.getExtensionName();
            result.DeveloperToolProductVersion = ExtensionInfo.getExtensionVersion();
        }
        else {
            await window.showErrorMessage("Passwords did not match");
        }

        return result;
    }

    private async getUserInputForLogin(): Promise<LoginRequest> {
        const userName = await window.showInputBox({
            value: 'user@company.com',
            prompt: 'Please enter your username/e-mail'
        });

        const password = await window.showInputBox({
            value: '',
            prompt: 'Please enter your password',
            password: true
        });

        const twofa = await window.showInputBox({
            value: '123 456',
            prompt: 'Please enter your two-factor auth code',
        });

        let request = new LoginRequest();

        request.Email = userName;
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
        let cancelTitle: string = localize('playfab-account.cancel', "Cancel")
        let checkNetworkMessage: string = localize('playfab-account.checkNetwork', "You appear to be offline. Please check your network connection.");
        let offlineMessage: string = localize('playfab-account.offline', "Offline");
        await waitForOnline(
            cancelTitle,
            checkNetworkMessage,
            () => { throw new PlayFabLoginError(offlineMessage); }
        );
    }
}