//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { Event } from 'vscode';

export type PlayFabLoginStatus = 'Initializing' | 'LoggingIn' | 'LoggedIn' | 'LoggedOut';

export interface PlayFabAccount {
    readonly status: PlayFabLoginStatus;
    readonly onStatusChanged: Event<PlayFabLoginStatus>;
    readonly waitForLogin: () => Promise<boolean>;
    readonly sessions: PlayFabSession[];
    readonly onSessionsChanged: Event<void>;
    readonly getToken: () => string;
}

export interface PlayFabSession {
    readonly cloud: string;
    readonly userId: string;
    readonly credentials: PlayFabCredentials;
}

export interface PlayFabCredentials {
    readonly token: string;
}