//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { EntityDescriptorApiContext, EntityDescriptorApiResponse } from './PlayFabEntityDescriptorModels';

export class GetEntityTokenRequest extends EntityDescriptorApiContext {
}

export class EntityTokenResponse extends EntityDescriptorApiResponse {
    EntityToken: string;
    TokenExpiration: Date; // string?
}

export class GetEntityTokenResponse extends EntityTokenResponse {
}

