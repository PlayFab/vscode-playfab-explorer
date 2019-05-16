//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class FunctionInfo {
    FunctionName: string;
    FunctionUrl: string;
}

export class ListFunctionsRequest {
}

export class ListFunctionsResponse {
    Functions: FunctionInfo[];
}

export class RegisterHttpFunctionRequest {
    FunctionName: string;
    FunctionUrl: string;
}

export class RegisterFunctionResponse {
}

export class UnregisterFunctionRequest {
    FunctionName: string;
}

export class UnregisterFunctionResponse {
}