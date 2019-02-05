//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class PlayFabUriConstants {
    private static adminBaseUrl: string = 'https://{titleId}.playfabapi.com'

    public static editorBaseUrl: string = 'https://editor.playfabapi.com';    

    public static GetAdminBaseUrl(titleId: string): string {
        return PlayFabUriConstants.adminBaseUrl.replace('{titleId}', titleId);
    }

    public static createTitlePath: string = '/DeveloperTools/User/CreateTitle';
    public static getTitleDataPath: string = '/Admin/GetTitleData';
    public static setTitleDataPath: string = '/Admin/SetTitleData';
    public static getTitleInternalDataPath: string = '/Admin/GetTitleInternalData';
    public static setTitleInternalDataPath: string = '/Admin/SetTitleInternalData';
    public static updateCloudScriptPath: string = '/Admin/UpdateCloudScript';
    public static getCloudScriptRevisionPath: string = '/Admin/GetCloudScriptRevision';

    public static getStudiosPath: string = '/DeveloperTools/User/GetStudios';

    public static createAccountPath: string = '/DeveloperTools/User/RegisterAccount';
    public static loginPath: string = '/DeveloperTools/User/Login';
    public static logoutPath: string = '/DeveloperTools/User/Logout';
};