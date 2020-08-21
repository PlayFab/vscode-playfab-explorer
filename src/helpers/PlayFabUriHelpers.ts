//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class PlayFabUriHelpers {
    private static playfabBaseUrl: string = 'https://{titleId}.playfabapi.com'

    private static playfabBaseUrlForPrivateCloud: string = 'https://{titleId}.{cloud}.playfabapi.com'

    private static editorBaseUrl: string = 'https://editor.playfabapi.com';

    private static editorBaseUrlForPrivateCloud: string = 'https://editor.{cloud}.playfabapi.com';

    private static gameManagerBaseUrl = 'https://developer.playfab.com/en-US/{titleId}/dashboard';

    private static gameManagerBaseUrlForPrivateCloud = 'https://developer.{cloud}.playfab.com/en-US/{titleId}/dashboard';

    public static cloud: string;

    // Admin
    public static getCloudScriptRevisionPath: string = '/Admin/GetCloudScriptRevision';
    public static getTitleDataPath: string = '/Admin/GetTitleData';
    public static getTitleInternalDataPath: string = '/Admin/GetTitleInternalData';
    public static setTitleDataPath: string = '/Admin/SetTitleData';
    public static setTitleInternalDataPath: string = '/Admin/SetTitleInternalData';
    public static updateCloudScriptPath: string = '/Admin/UpdateCloudScript';
    
    // Authentication
    public static getEntityTokenPath: string = '/Authentication/GetEntityToken';

    // CloudScript
    public static listFunctionsPath: string = '/CloudScript/ListFunctions';
    public static listHttpFunctionsPath: string = '/CloudScript/ListHttpFunctions';
    public static listQueuedFunctionsPath: string = '/CloudScript/ListQueuedFunctions';
    public static registerHttpFunctionPath: string = '/CloudScript/RegisterHttpFunction';
    public static registerQueuedFunctionPath: string = '/CloudScript/RegisterQueuedFunction';
    public static unregisterFunctionPath: string = '/CloudScript/UnregisterFunction';
    
    // DeveloperTools
    public static createTitlePath: string = '/DeveloperTools/User/CreateTitle';    
    public static getStudiosPath: string = '/DeveloperTools/User/GetStudios';
    public static loginPath: string = '/DeveloperTools/User/Login';
    public static logoutPath: string = '/DeveloperTools/User/Logout';
    public static createAccountPath: string = '/DeveloperTools/User/RegisterAccount';    
    
    // Experimentation
    public static createExperimentPath: string = '/Experimentation/CreateExperiment';
    public static deleteExperimentPath: string = '/Experimentation/DeleteExperiment';
    public static getExperimentsPath: string = '/Experimentation/GetExperiments';
    public static getLastestScorecardPath: string = '/Experimentation/GetLatestScorecard';
    public static getTreatmentAssignmentPath: string = '/Experimentation/GetTreatmentAssignment';
    public static startExperimentPath: string = '/Experimentation/StartExperiment';
    public static stopExperimentPath: string = '/Experimentation/StopExperiment';
    public static updateExperimentPath: string = '/Experimentation/UpdateExperiment';
    
    // Profile    
    public static getProfilePath: string = '/Profile/GetProfile';

    public static GetPlayFabBaseUrl(titleId: string): string {
        const baseUrl: string = !PlayFabUriHelpers.IsPrivateCloud() ? this.playfabBaseUrl :
            PlayFabUriHelpers.playfabBaseUrlForPrivateCloud.replace('{cloud}', PlayFabUriHelpers.cloud);
        return baseUrl.replace('{titleId}', titleId);
    }

    public static GetPlayFabEditorBaseUrl(): string {
        return !PlayFabUriHelpers.IsPrivateCloud() ? this.editorBaseUrl :
            PlayFabUriHelpers.editorBaseUrlForPrivateCloud.replace('{cloud}', PlayFabUriHelpers.cloud);
    }

    public static GetGameManagerUrl(titleId: string): string {
        const url = !PlayFabUriHelpers.IsPrivateCloud() ? this.gameManagerBaseUrl :
            PlayFabUriHelpers.gameManagerBaseUrlForPrivateCloud.replace('{cloud}', PlayFabUriHelpers.cloud);
        return url.replace('{titleId}', titleId);
    }

    private static IsPrivateCloud(): boolean {
        return !(PlayFabUriHelpers.cloud == null || PlayFabUriHelpers.cloud === '' || PlayFabUriHelpers.cloud.trim() === '');
    }
};