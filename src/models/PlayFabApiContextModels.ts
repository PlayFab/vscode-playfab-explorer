//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { EntityChainDetails, EntityKey, IClaimant } from './PlayFabEntityModels';
import { IPLocationInfo } from './PlayFabLocationModels';

/// <summary>
/// The calling context for this request. Derived types such as PlayerApiContext and TitleApiContext direct use should be rare and not used to deny access to an API based on it's entity type.
/// </summary>
export interface IApiContext {
    EntityType: string;
    EntityId: string;
    Entity: EntityKey;
    EntityChain: EntityChainDetails;
    Claimant: IClaimant;
    ClientLocation: IPLocationInfo;
    ClientIPMasked: string;
    ClientIP: string;
    SDKDetails: SDKDetails;
    Log: any; // log4net.ILog
    EntityProfile: any; // EntityProfle
    IsAnonymous: boolean;
    AuthenticationMethod: AuthenticationMethod;

    /// <summary>
    /// Adds a PlayStream event to the context collection.
    /// </summary>
    //AddPlayStreamEvent(psEvent: IPlayStreamEvent<IPlayStreamEventData, object>): void;

    /// <summary>
    /// Adds a collection of PlayStream event to the context collection.
    /// </summary>
    //AddPlayStreamEvents(psEvents: IEnumerable<IPlayStreamEvent<IPlayStreamEventData, object>>): void;

    //GetPlayStreamEvents(): IPlayStreamEvent<IPlayStreamEventData, object>[];

    //CountPlayStreamEvents(): number;

    //ClearPlayStreamEvents(): void;
}

export enum AuthenticationMethod {
    AnonymousPlayer,
    AuthenticationTicket,
    TitleSecretKey,
    EntityToken,
    InternalKey
}

export interface IApiContextRequest {
    Context: IApiContext;
}

export class ApiContextRequest implements IApiContextRequest {
    Context: IApiContext;
}

export class SDKDetails {
    SDK: string;

    Version: string;
}

export enum HandlingApplication {
    Unknown,
    MainServer,
    LogicServer,
    GameManager
}