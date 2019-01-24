//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { Title } from './PlayFabTitleModels';

export class GetStudiosRequest {
    DeveloperClientToken: string;
}

export class GetStudiosResponse {
    Studios: Studio[];
}

export class Studio {
    Id: string;
    Name: string;
    Titles: Title[];
}
