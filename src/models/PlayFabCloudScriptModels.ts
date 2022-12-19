//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class FunctionInfo {
    FunctionName: string;
    FunctionAddress: string;
}

export class HttpFunctionInfo {
    FunctionName: string;
    FunctionUrl: string;
}

export class QueuedFunctionInfo {
    FunctionName: string;
    QueueName: string;
    ConnectionString: string;
}

export class EventHubFunctionInfo {
    FunctionName: string;
    EventHubName: string;
    ConnectionString: string;
}

export class ListFunctionsRequest {
}

export class ListFunctionsResponse {
    Functions: FunctionInfo[];
}

export class ListHttpFunctionsResponse {
    Functions: HttpFunctionInfo[];
}

export class ListQueuedFunctionsResponse {
    Functions: QueuedFunctionInfo[];
}

export class ListEventHubFunctionsResponse {
    Functions: EventHubFunctionInfo[];
}

export class RegisterHttpFunctionRequest {
    FunctionName: string;
    FunctionUrl: string;
}

export class RegisterQueuedFunctionRequest {
    FunctionName: string;
    QueueName: string;
    ConnectionString: string;
}

export class RegisterEventHubFunctionRequest {
    FunctionName: string;
    EventHubName: string;
    ConnectionString: string;
}

export class RegisterFunctionResponse {
}

export class UnregisterFunctionRequest {
    FunctionName: string;
}

export class UnregisterFunctionResponse {
}