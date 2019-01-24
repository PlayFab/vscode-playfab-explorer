//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class CloudScriptFile {
    FileName: string;
    FileContents: string;
}

export class GetCloudScriptRevisionRequest {
    Version: number;
    Revision: number;
}

export class GetCloudScriptRevisionResponse {
    Version: number;
    Revision: number;
    CreatedAt: Date;
    Files: CloudScriptFile[];
    IsPublished: boolean;    
}

export class UpdateCloudScriptRequest {
    Files: CloudScriptFile[];
    Publish: boolean;
    DeveloperPlayFabId: string;
}

export class UpdateCloudScriptResponse
{
    Version: number;
    Revision: number;
}