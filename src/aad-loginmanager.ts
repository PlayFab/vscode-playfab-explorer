//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { aadCachePlugin } from './aad-cacheplugin';
import {
//    AccountInfo, AuthenticationResult, CryptoProvider, LogLevel, PublicClientApplication, SilentFlowRequest
    AccountInfo, AuthenticationResult, CryptoProvider, LogLevel, PublicClientApplication
} from '@azure/msal-node';
import { env, Uri } from 'vscode'

export class AadLoginManager {

    private static AAD_SIGNIN_URL: string = "https://login.microsoftonline.com/";
    private static ED_EX_AAD_SIGNIN_CLIENTID: string = "2d99511e-13ec-4b59-99c0-9ae8754f84aa";
    private static ED_EX_AAD_SCOPE: string = "448adbda-b8d8-4f33-a1b0-ac58cf44d4c1";
    private static ED_EX_AAD_SCOPES: string = AadLoginManager.ED_EX_AAD_SCOPE + "/plugin";
    private static ED_EX_AAD_SIGNNIN_TENANT: string = "common";
    private static ED_EX_AAD_SIGNIN_AUTHORITY: string = AadLoginManager.AAD_SIGNIN_URL + AadLoginManager.ED_EX_AAD_SIGNNIN_TENANT;

    private _account: AccountInfo;
    private _clientApp: PublicClientApplication;

    public async getToken(): Promise<string> {
        // TODO: Use MSAL to login a user and get a bearer token to use in an HTTP header.
        let token: string = "";

        this._clientApp = this._clientApp || new PublicClientApplication(
            {
                auth: {
                    clientId: AadLoginManager.ED_EX_AAD_SIGNIN_CLIENTID,
                    authority: AadLoginManager.ED_EX_AAD_SIGNIN_AUTHORITY
                },
                cache: {
                    cachePlugin: aadCachePlugin('./data/aad.cache.json')
                },
                system: {
                    loggerOptions: {
                        loggerCallback: (level, message, containsPii) => {
                            console.log(message)
                        },
                        piiLoggingEnabled: false,
                        logLevel: LogLevel.Info
                    }
                }
            }
        );



        return token;
    }

    public getUserId(): string {
        //return this._account?.username;
        return "";
    }

    private async getTokenSilent(): Promise<AuthenticationResult> {
        //const tokenRequest: SilentFlowRequest = {
        const tokenRequest = {
            account: this._account,
            forceRefresh: false,
            scopes: [AadLoginManager.ED_EX_AAD_SCOPES],
        };
        try {
            return await this._clientApp.acquireTokenSilent(tokenRequest);
        } catch (error) {
            // TODO: Log error message
            return await this.getTokenInteractive();
        }
    }

    private async getTokenInteractive(): Promise<AuthenticationResult> {
        // Generate PKCE Challenge and Verifier before request
        const cryptoProvider = new CryptoProvider();
        const { challenge, verifier } = await cryptoProvider.generatePkceCodes();

        // Add PKCE params to Auth Code URL request
        const authCodeUrlParams = {
            scopes: [AadLoginManager.ED_EX_AAD_SCOPES],
            redirectUri: "http://localhost", // TODO: Verify that this is the correct redirect URI
            codeChallenge: challenge,
            codeChallengeMethod: "S256"
        };

        try {
            // Get Auth Code URL
            const authCodeUrl = await this._clientApp.getAuthCodeUrl(authCodeUrlParams);
            const authWindow = await env.openExternal(Uri.parse(authCodeUrl));

            // TODO: Register a listener for redirectUrl and get the auth code from the URL
            let authCode: string;

            // Use Authorization Code and PKCE Code verifier to make token request
            const authResult: AuthenticationResult = await this._clientApp.acquireTokenByCode({
                scopes: [AadLoginManager.ED_EX_AAD_SCOPES],
                redirectUri: "http://localhost",
                code: authCode,
                codeVerifier: verifier
            });

            return authResult;
        } catch (error) {
            throw error;
        }
    }
}