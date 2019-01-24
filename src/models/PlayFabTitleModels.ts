//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class CreateTitleRequest {
    DeveloperClientToken: string;
    Name: string;
    StudioId: string;
}

export class CreateTitleResponse {
    Title: Title;
}

export class GetTitleDataRequest {
    Keys: string[];
}

export class GetTitleDataResponse {
    Data: Map<string, string>;
}

export class SetTitleDataRequest {
    Key: string;
    Value: string;
}

export class SetTitleDataResponse {
}

export class Title {
    Id: string; // number?
    Name: string;
    SecretKey: string;
    GameManagerUrl: string; // Url?
}