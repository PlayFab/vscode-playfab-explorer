//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export interface IPlayFabConfig {
    getCloudName(): string;
    getJsonSpaces(): number;
    getLoginId(): string;
    getShowSignedInEmail(): boolean;
    getShowTitleIds(): boolean;
    getSortStudiosAlphabetically(): boolean;
    getSortTitlesAlphabetically(): boolean;
}