//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { Event } from 'vscode';

export type PlayFabLoginStatus = 'Initializing' | 'LoggingIn' | 'LoggedIn' | 'LoggedOut';

export interface IPlayFabAccount {
    readonly status: PlayFabLoginStatus;
    readonly onStatusChanged: Event<PlayFabLoginStatus>;
    readonly waitForLogin: () => Promise<boolean>;
    readonly sessions: IPlayFabSession[];
    readonly onSessionsChanged: Event<void>;
    readonly getToken: () => string;
}

export interface IPlayFabSession {
    readonly userId: string;
    readonly credentials: IPlayFabCredentials;
}

export interface IPlayFabCredentials {
    readonly token: string;
}