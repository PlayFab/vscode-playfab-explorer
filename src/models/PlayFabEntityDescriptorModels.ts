//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { ApiContextRequest } from './PlayFabApiContextModels';
import { EntityKey, EntityProfileBody } from './PlayFabEntityModels';

export class EntityDescriptorRequiredApiContext extends ApiContextRequest {
    Entity: EntityKey;
}

export class EntityDescriptorApiResponse {
    Entity?: EntityKey;
}

export class EntityDescriptorApiContext extends ApiContextRequest {
    Entity?: EntityKey;
}

export class GetEntityProfileRequest extends EntityDescriptorApiContext {
    DataAsObject?: boolean;
}

export class GetEntityProfileResponse {
    Profile: any; // EntityProfileBody
}