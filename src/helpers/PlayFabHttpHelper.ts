//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as http from 'typed-rest-client/HttpClient';
import { ExtensionInfo } from '../extension';
import { ErrorResponse } from "../models/PlayFabHttpModels"
import { asyncOr, timeout } from './PlayFabPromiseHelpers';

export interface IHttpClient {
    
    timeoutMilliseconds: number;

    makeApiCall<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        responseCallback: (response: TResponse) => void,
        errorCallback: (response: ErrorResponse) => void): Promise<void>;

    makeEntityApiCall<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        entityToken: string,
        responseCallback: (response: TResponse) => void,
        errorCallback: (response: ErrorResponse) => void): Promise<void>;

    makeTitleApiCall<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        titleSecret: string,
        responseCallback: (response: TResponse) => void,
        errorCallback: (response: ErrorResponse) => void): Promise<void>;
}

class EntityToken {
    token: string;
}

class TitleSecret {
    secret: string;
}

export class PlayFabHttpClient implements IHttpClient {

    public timeoutMilliseconds: number = 5000;

    public async makeApiCall<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        responseCallback: (response: TResponse) => void,
        errorCallback: (response: ErrorResponse) => void): Promise<void> {
        await asyncOr(
            this.makeApiCallInternal(path, endpoint, request, null, responseCallback, errorCallback),
            timeout(this.timeoutMilliseconds));
    }

    public async makeEntityApiCall<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        entityToken: string,
        responseCallback: (response: TResponse) => void,
        errorCallback: (response: ErrorResponse) => void): Promise<void> {
        await asyncOr(
            this.makeApiCallInternal(path, endpoint, request, { token: entityToken }, responseCallback, errorCallback),
            timeout(this.timeoutMilliseconds));
    }

    public async makeTitleApiCall<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        titleSecret: string,
        responseCallback: (response: TResponse) => void,
        errorCallback: (response: ErrorResponse) => void): Promise<void> {
        await asyncOr(
            this.makeApiCallInternal(path, endpoint, request, { secret: titleSecret }, responseCallback, errorCallback),
            timeout(this.timeoutMilliseconds));
    }

    private async makeApiCallInternal<TRequest, TResponse>(
        path: string,
        endpoint: string,
        request: TRequest,
        keyOrToken: EntityToken | TitleSecret,
        responseCallback: (response: TResponse) => void,
        errorCallback: (response: ErrorResponse) => void): Promise<void> {
        let url: string = endpoint + path;
        let requestBody: string = JSON.stringify(request);

        // Set headers
        let headers = {
            'Content-Type': 'application/json',
            'X-PlayFabSDK': ExtensionInfo.getExtensionInfo()
        };

        if (keyOrToken != null && keyOrToken != undefined) {
            if ((<TitleSecret>keyOrToken).secret) {
                headers['X-SecretKey'] = (<TitleSecret>keyOrToken).secret;
            }
            else if ((<EntityToken>keyOrToken).token) {
                headers['X-EntityToken'] = (<EntityToken>keyOrToken).token;
            }
        }

        let httpCli = new http.HttpClient(ExtensionInfo.getExtensionName());
        var httpResponse: http.HttpClientResponse = await httpCli.post(url, requestBody, headers);

        let rawBody: string = await httpResponse.readBody();

        if (this.isSuccessCode(httpResponse.message.statusCode)) {
            let rawResponse = JSON.parse(rawBody);
            let response: TResponse = rawResponse.data;

            responseCallback(response);
        }
        else {
            let errorResponse: ErrorResponse = rawBody.length > 0 ? JSON.parse(rawBody) : {
                code: null,
                status: null,
                error: httpResponse.message.statusCode,
                errorCode: null,
                errorMessage: httpResponse.message.statusMessage
            };

            errorCallback(errorResponse);
        }
    }

    private isSuccessCode(code: number): boolean {
        return code >= 200 && code <= 299;
    }
}


