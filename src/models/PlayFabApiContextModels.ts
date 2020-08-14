//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { EntityChainDetails, EntityKey, IClaimant } from './PlayFabEntityModels';
import { IPLocationInfo } from './PlayFabLocationModels';

export class ApiContextRequest implements IApiContextRequest {
    Context: IApiContext;
    CustomTags: Map<string,string>
}

export enum AuthenticationMethod {
    Unknown,
    AnonymousPlayer,
    AuthenticationTicket,
    TitleSecretKey,
    EntityToken,
    InternalKey,
    EntityAPIKey
}

export class ClassicApiRequest implements ICustomTags {
    CustomTags: Map<string,string>;
}

export interface IApiContext {
    Claimant: IClaimant;
    ClientLocation: IPLocationInfo;
    ClientIPMasked: string;
    ClientIP: string;
    ClientOriginId: string;
    SDKDetails: SDKDetails;
    RequestId: string;
    TraceId: string;
    RequestTime: string // DateTime
    ActionHistory: string;
    AcceptLanguage: string;
    IsAnonymous: boolean;
    AuthenticationMethod: AuthenticationMethod;
}

export interface IApiContextRequest {
    Context: IApiContext;
}

export interface ICustomTags {
    CustomTags: Map<string,string>;
}
export class SDKDetails {
    SDK: string;
    Version: string;
}