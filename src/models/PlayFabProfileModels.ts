//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { EntityDescriptorApiContext } from './PlayFabEntityApiContextModels';
import { EntityProfileBody } from './PlayFabEntityModels';

// Models for calls to the Profile controller

export class GetEntityProfileRequest extends EntityDescriptorApiContext {
    DataAsObject?: boolean;
}

export class GetEntityProfileResponse {
    Profile: EntityProfileBody;
}