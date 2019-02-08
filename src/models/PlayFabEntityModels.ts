//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class EntityKey {
    Id: string;
    Type: string;
}

export class EntityChainDetails {
    OriginalString: string;
    EntityType: string;
    EntityId: string;
    NamespaceId: string;
    TitleId: string;
    MasterPlayerAccountId: string;
    TitlePlayerAccountId: string;
    CharacterId: string;
    EntityPath: string;
    GroupId: string;
}

export interface IClaimant {
    EntityType: string;
    EntityId: string;
    EntityKey: EntityKey;
    EntityChain: EntityChainDetails;
}