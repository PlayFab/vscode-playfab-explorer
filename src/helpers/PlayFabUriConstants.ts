//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class PlayFabUriConstants {
    private static playfabBaseUrl: string = 'https://{titleId}.playfabapi.com'

    public static editorBaseUrl: string = 'https://editor.playfabapi.com';

    public static GetPlayFabBaseUrl(titleId: string): string {
        return PlayFabUriConstants.playfabBaseUrl.replace('{titleId}', titleId);
    }

    public static createTitlePath: string = '/DeveloperTools/User/CreateTitle';
    public static getTitleDataPath: string = '/Admin/GetTitleData';
    public static setTitleDataPath: string = '/Admin/SetTitleData';
    public static getTitleInternalDataPath: string = '/Admin/GetTitleInternalData';
    public static setTitleInternalDataPath: string = '/Admin/SetTitleInternalData';
    public static listFunctionsPath: string = '/CloudScript/ListFunctions';
    public static registerFunctionPath: string = '/CloudScript/RegisterFunction';
    public static unregisterFunctionPath: string = '/CloudScript/UnregisterFunction';
    public static updateCloudScriptPath: string = '/Admin/UpdateCloudScript';
    public static getCloudScriptRevisionPath: string = '/Admin/GetCloudScriptRevision';

    public static getStudiosPath: string = '/DeveloperTools/User/GetStudios';

    public static createAccountPath: string = '/DeveloperTools/User/RegisterAccount';
    public static loginPath: string = '/DeveloperTools/User/Login';
    public static logoutPath: string = '/DeveloperTools/User/Logout';

    public static getEntityTokenPath: string = '/Authentication/GetEntityToken';
};