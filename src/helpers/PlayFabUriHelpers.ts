//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class PlayFabUriHelpers {
    private static playfabBaseUrl: string = 'https://{titleId}.playfabapi.com'

    private static playfabBaseUrlForPrivateCloud: string = 'https://{titleId}.{cloud}.playfabapi.com'

    private static editorBaseUrl: string = 'https://editor.playfabapi.com';

    private static editorBaseUrlForPrivateCloud: string = 'https://editor.{cloud}.playfabapi.com';

    private static gameManagerBaseUrl = "https://developer.playfab.com/en-US/{titleId}/dashboard";

    private static gameManagerBaseUrlForPrivateCloud = "https://developer.{cloud}.playfab.com/en-US/{titleId}/dashboard";

    public static cloud: string;

    public static GetPlayFabBaseUrl(titleId: string): string {
        const baseUrl: string = PlayFabUriHelpers.cloud == null ? this.playfabBaseUrl :
            PlayFabUriHelpers.playfabBaseUrlForPrivateCloud.replace('{cloud}', PlayFabUriHelpers.cloud);
        return baseUrl.replace('{titleId}', titleId);
    }

    public static GetPlayFabEditorBaseUrl(): string {
        return PlayFabUriHelpers.cloud == null ? this.editorBaseUrl : 
            PlayFabUriHelpers.editorBaseUrlForPrivateCloud.replace('{cloud}', PlayFabUriHelpers.cloud);
    }

    public static GetGameManagerUrl(titleId: string): string {
        const url = PlayFabUriHelpers.cloud == null ? this.gameManagerBaseUrl :
            PlayFabUriHelpers.gameManagerBaseUrlForPrivateCloud.replace('{cloud}', PlayFabUriHelpers.cloud);
        return url.replace('{titleId}', titleId);
    }

    public static createTitlePath: string = '/DeveloperTools/User/CreateTitle';
    public static getTitleDataPath: string = '/Admin/GetTitleData';
    public static setTitleDataPath: string = '/Admin/SetTitleData';
    public static getTitleInternalDataPath: string = '/Admin/GetTitleInternalData';
    public static setTitleInternalDataPath: string = '/Admin/SetTitleInternalData';
    public static listFunctionsPath: string = '/CloudScript/ListFunctions';
    public static registerHttpFunctionPath: string = '/CloudScript/RegisterHttpFunction';
    public static unregisterFunctionPath: string = '/CloudScript/UnregisterFunction';
    public static updateCloudScriptPath: string = '/Admin/UpdateCloudScript';
    public static getCloudScriptRevisionPath: string = '/Admin/GetCloudScriptRevision';

    public static getStudiosPath: string = '/DeveloperTools/User/GetStudios';

    public static createAccountPath: string = '/DeveloperTools/User/RegisterAccount';
    public static loginPath: string = '/DeveloperTools/User/Login';
    public static logoutPath: string = '/DeveloperTools/User/Logout';

    public static getEntityTokenPath: string = '/Authentication/GetEntityToken';

    public static getProfilePath: string = '/Profile/GetProfile';
};