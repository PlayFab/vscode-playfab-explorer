//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as http from 'typed-rest-client/HttpClient';
import { PlayFabAccount } from '../playfab-account.api';
import { ExtensionInfo } from '../extension';

export class PlayFabHttpClient {

    private _account: PlayFabAccount;

    constructor(account: PlayFabAccount) {
        this._account = account;
    }

    public async makeApiCall<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        responseCallback: (response: TResponse) => void, 
        errorCallback: (code: number, error: string) => void): Promise<void> {
            await this.makeApiCallInternal(path, endpoint, request, null, responseCallback, errorCallback);
    }
    
    public async makeApiCallWithSecretKey<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        key: string,
        responseCallback: (response: TResponse) => void, 
        errorCallback: (code: number, error: string) => void): Promise<void> {
            await this.makeApiCallInternal(path, endpoint, request, key, responseCallback, errorCallback);
    }

    private async makeApiCallInternal<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        key: string,
        responseCallback: (response: TResponse) => void, 
        errorCallback: (code: number, error: string) => void): Promise<void> {
        let url: string = endpoint + path;
        let requestBody: string = JSON.stringify(request);

        // Set headers
        let headers = {
            "Content-Type": "application/json",
            "X-PlayFabSDK": ExtensionInfo.getExtensionInfo()
        };

        if (path.includes('/Server/') || path.includes('/Admin/') && key != null && key != undefined) {
            headers["X-SecretKey"] = key;
        }

        let httpCli = new http.HttpClient(ExtensionInfo.getExtensionName());
        var httpResponse: http.HttpClientResponse = await httpCli.post(url, requestBody, headers);

        if (this.isSuccessCode(httpResponse.message.statusCode)) {

            let rawBody: string = await httpResponse.readBody();
            let rawResponse = JSON.parse(rawBody);
            let response: TResponse = rawResponse.data;

            responseCallback(response);
        }
        else {
            errorCallback(httpResponse.message.statusCode, httpResponse.message.statusMessage);
        }
    }

    private isSuccessCode(code: number): boolean {
        return code >= 200 && code <= 299;
    }
}


