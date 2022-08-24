//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import {
    workspace, WorkspaceConfiguration
} from 'vscode';

import { IPlayFabConfig } from './playfab-config.api'

class PlayFabConfigConstants {
    public static ConfigurationName: string = 'playfab';

    // Config value names
    public static CloudName: string = 'cloudName';
    public static JsonSpaces: string = 'jsonSpaces';
    public static LoginId: string = 'loginId';
    public static ShowSignedInEmail: string = 'showSignedInEmail';
    public static ShowTitleIds: string = 'showTitleIds';
    public static SortStudiosAlphabetically: string = 'sortStudiosAlphabetically';
    public static SortTitlesAlphabetically: string = 'sortTitlesAlphabetically';
}

export class PlayFabConfig implements IPlayFabConfig {

    // IPlayFabConfig
    getCloudName(): string {
        return this.getStringConfigValue(PlayFabConfigConstants.CloudName);
    }
    getJsonSpaces(): number {
        return this.getNumberConfigValue(PlayFabConfigConstants.JsonSpaces);
    }
    getLoginId(): string {
        return this.getStringConfigValue(PlayFabConfigConstants.LoginId);
    }
    getShowSignedInEmail(): boolean {
        return this.getBooleanConfigValue(PlayFabConfigConstants.ShowSignedInEmail);
    }
    getShowTitleIds(): boolean {
        return this.getBooleanConfigValue(PlayFabConfigConstants.ShowTitleIds);
    }
    getSortStudiosAlphabetically(): boolean {
        return this.getBooleanConfigValue(PlayFabConfigConstants.SortStudiosAlphabetically);
    }
    getSortTitlesAlphabetically(): boolean {
        return this.getBooleanConfigValue(PlayFabConfigConstants.SortTitlesAlphabetically);
    }

    private getBooleanConfigValue(name: string): boolean {
        const playfabConfig: WorkspaceConfiguration = workspace.getConfiguration(PlayFabConfigConstants.ConfigurationName);
        return playfabConfig.get<boolean>(name);
    }

    private getNumberConfigValue(name: string): number {
        const playfabConfig: WorkspaceConfiguration = workspace.getConfiguration(PlayFabConfigConstants.ConfigurationName);
        return playfabConfig.get<number>(name);
    }

    private getStringConfigValue(name: string): string {
        const playfabConfig: WorkspaceConfiguration = workspace.getConfiguration(PlayFabConfigConstants.ConfigurationName);
        return playfabConfig.get<string>(name);
    }
}