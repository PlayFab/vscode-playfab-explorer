//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import {
    commands, ExtensionContext, TextDocument, TextEditor, 
    TreeView, window, Uri, workspace, WorkspaceConfiguration
} from 'vscode';
import { loadMessageBundle } from 'vscode-nls';
import { IPlayFabAccount } from './playfab-account.api';
import { PlayFabStudioTreeProvider } from './playfab-treeprovider';
import { ITreeNode } from './playfab-treeprovider.api';
import { GetLastPathPartFromUri, MapFromObject, EscapeValue, UnescapeValue } from './helpers/PlayFabDataHelpers';
import { IHttpClient, PlayFabHttpClient } from './helpers/PlayFabHttpHelper';
import { delay } from './helpers/PlayFabPromiseHelpers';
import { PlayFabUriConstants } from './helpers/PlayFabUriConstants';
import { GetEntityTokenRequest, GetEntityTokenResponse } from './models/PlayFabAuthenticationModels';
import {
    FunctionInfo, ListFunctionsRequest, ListFunctionsResponse, RegisterFunctionRequest,
    RegisterFunctionResponse, UnregisterFunctionRequest, UnregisterFunctionResponse
} from './models/PlayFabCloudScriptModels';
import {
    CloudScriptFile, GetCloudScriptRevisionRequest, GetCloudScriptRevisionResponse,
    UpdateCloudScriptRequest, UpdateCloudScriptResponse
} from './models/PlayFabLegacyCloudScriptModels';
import { ErrorResponse } from "./models/PlayFabHttpModels";
import { Studio } from './models/PlayFabStudioModels';
import {
    Title, CreateTitleRequest, CreateTitleResponse, GetTitleDataRequest, GetTitleDataResponse,
    SetTitleDataRequest, SetTitleDataResponse
} from './models/PlayFabTitleModels';
import * as path from "path";
import * as fs from "fs";

const localize = loadMessageBundle();

export interface IPlayFabExplorerInputGatherer {
    getUserInputForCreateTitle(): Promise<CreateTitleRequest>;
    getUserInputForGetCloudScriptRevision(): Promise<GetCloudScriptRevisionRequest>;
    getUserInputForGetTitleData(): Promise<GetTitleDataRequest>;
    getUserInputForListFunctions(): Promise<ListFunctionsRequest>;
    getUserInputForRegisterFunction(): Promise<RegisterFunctionRequest>;
    getUserInputForUnregisterFunction(): Promise<UnregisterFunctionRequest>;
    getUserInputForSetTitleData(): Promise<SetTitleDataRequest>;
    getUserInputForUnregisterFunction(): Promise<UnregisterFunctionRequest>;
}

export class PlayFabExplorer {

    private _playFabLocalSettingsFileName: string = "playfab.local.settings.json";
    private _playFabLocalSettingsFilePath: string = path.join(process.env.Temp, this._playFabLocalSettingsFileName);
    private _explorer: TreeView<ITreeNode>;
    private _account: IPlayFabAccount;
    private _httpClient: IHttpClient;
    private _inputGatherer: IPlayFabExplorerInputGatherer;
    private _treeDataProvider: PlayFabStudioTreeProvider;

    constructor(account: IPlayFabAccount,
        inputGatherer: IPlayFabExplorerInputGatherer = new PlayFabExplorerUserInputGatherer(),
        httpClient: IHttpClient = new PlayFabHttpClient()) {

        this._account = account;
        this._httpClient = httpClient;
        this._inputGatherer = inputGatherer;
        let treeDataProvider = new PlayFabStudioTreeProvider(this._account);
        this._treeDataProvider = treeDataProvider;
        this._explorer = window.createTreeView('playfabExplorer', { treeDataProvider });
    }

    async createTitle(studio: Studio): Promise<void> {
        let request: CreateTitleRequest = await this.getUserInputForCreateTitle();
        request.StudioId = studio.Id;
        request.DeveloperClientToken = this._account.getToken();

        await this._httpClient.makeApiCall(
            PlayFabUriConstants.createTitlePath,
            PlayFabUriConstants.editorBaseUrl,
            request,
            (response: CreateTitleResponse) => {
                // NOOP
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });

        this._treeDataProvider.refresh();
    }

    async disableLocalDebugging(): Promise<void> {
        fs.exists(this._playFabLocalSettingsFilePath, (exists: boolean) => {
            if (exists) {
                fs.unlink(this._playFabLocalSettingsFilePath, (error: NodeJS.ErrnoException): void => {
                    if (error) {
                        const msg: string = localize('playfab-explorer.disableLocalDebuggingFailed', 'Unable to disable local debugging');
                        window.showErrorMessage(msg);
                    }
                    else {
                        const msg: string = localize('playfab-explorer.disableLocalDebuggingSucceeded', 'Local debugging disabled');
                        window.showInformationMessage(msg);
                    }
                });
            }
            else {
                const msg: string = localize('playfab-explorer.disableLocalDebuggingSucceeded', 'Local debugging disabled');
                window.showInformationMessage(msg);
            }
        });
    }

    async enableLocalDebugging(): Promise<void> {
        // Need to emit a JSON file of the form;
        // {
        //     "LocalApiServer": "http://localhost:7071/api/"
        // }

        let fileContent: string = '{ "LocalApiServer": "http://localhost:7071/api/" }';
        fs.writeFile(this._playFabLocalSettingsFilePath, fileContent, null, (error: NodeJS.ErrnoException): void => {
            if (error) {
                const msg: string = localize('playfab-explorer.enableLocalDebuggingFailed', 'Unable to enable local debugging');
                window.showErrorMessage(msg);
            }
            else {
                const msg: string = localize('playfab-explorer.enableLocalDebuggingSucceeded', 'Local debugging enabled');
                window.showInformationMessage(msg);
            }
        });
    }

    async getCloudScriptRevision(title: Title): Promise<void> {
        let request: GetCloudScriptRevisionRequest = await this.getUserInputForGetCloudScriptRevision();
        let baseUrl: string = PlayFabUriConstants.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeTitleApiCall(
            PlayFabUriConstants.getCloudScriptRevisionPath,
            baseUrl,
            request,
            title.SecretKey,
            async (response: GetCloudScriptRevisionResponse) => {
                if (response.Files.length > 0) {
                    let file: CloudScriptFile = response.Files[0];
                    let doc: TextDocument = await workspace.openTextDocument({ language: 'javascript', content: file.FileContents });
                    await window.showTextDocument(doc);
                    await window.showInformationMessage(`Downloaded CloudScript revision ${response.Revision} for ${title.Name}`);
                }
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async listFunctions(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: ListFunctionsRequest = await this.getUserInputForListFunctions();
        let baseUrl: string = PlayFabUriConstants.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriConstants.listFunctionsPath,
            baseUrl,
            request,
            entityToken,
            async (response: ListFunctionsResponse) => {
                let doc: TextDocument = await workspace.openTextDocument({ language: 'markdown', content: this.getMarkDownForFunctionList(response.Functions) });
                await window.showTextDocument(doc);
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async registerFunction(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: RegisterFunctionRequest = await this.getUserInputForRegisterFunction();
        let baseUrl: string = PlayFabUriConstants.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriConstants.registerFunctionPath,
            baseUrl,
            request,
            entityToken,
            async (response: RegisterFunctionResponse) => {
                await window.showInformationMessage(`Registered function ${request.FunctionName} at ${request.FunctionUrl}`);
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async unregisterFunction(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: UnregisterFunctionRequest = await this.getUserInputForUnregisterFunction();
        let baseUrl: string = PlayFabUriConstants.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriConstants.unregisterFunctionPath,
            baseUrl,
            request,
            entityToken,
            async (response: UnregisterFunctionResponse) => {
                await window.showInformationMessage(`Unregistered function ${request.FunctionName}`);
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async updateCloudScript(title: Title): Promise<void> {
        let request: UpdateCloudScriptRequest = new UpdateCloudScriptRequest();
        request.Publish = true;
        let file = new CloudScriptFile();
        file.Filename = window.activeTextEditor.document.fileName;
        file.FileContents = window.activeTextEditor.document.getText();
        request.Files = [file];

        let baseUrl: string = PlayFabUriConstants.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeTitleApiCall(
            PlayFabUriConstants.updateCloudScriptPath,
            baseUrl,
            request,
            title.SecretKey,
            async (response: UpdateCloudScriptResponse) => {
                const msg: string = localize('playfab-explorer.cloudscriptUpdated', 'CloudScript updated to revision {0}', response.Revision);
                await window.showInformationMessage(msg)
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async getTitleData(title: Title, path: string): Promise<void> {
        let request: GetTitleDataRequest = await this.getUserInputForGetTitleData();

        let baseUrl: string = PlayFabUriConstants.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeTitleApiCall(
            path,
            baseUrl,
            request,
            title.SecretKey,
            async (response: GetTitleDataResponse) => {
                let map: Map<string, string> = MapFromObject(response.Data);
                if (map.size > 0) {

                    let titleData: any = {};

                    map.forEach((value: string, key: string, map: Map<string, string>) => {
                        titleData[key] = UnescapeValue(value);
                    });

                    const playfabConfig: WorkspaceConfiguration = workspace.getConfiguration('playfab');
                    let spaces: number = playfabConfig.get<number>('titleDataSpaces');

                    let doc: TextDocument = await workspace.openTextDocument({ language: 'json', content: JSON.stringify(titleData, null, spaces) });
                    await window.showTextDocument(doc);
                }
                else {
                    const msg: string = localize('playfab-explorer.noTitleData', 'No title data found with specified key(s)');
                    await window.showInformationMessage(msg);
                }
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async setTitleData(title: Title, path: string): Promise<void> {

        let textEditor: TextEditor = window.activeTextEditor;

        if (textEditor !== undefined && textEditor.document.languageId === "json") {
            await this.setTitleDataFromJsonFile(title, path, textEditor.document.getText());
        }
        else {
            await this.setTitleDataFromUserInput(title, path);
        }
    }

    public registerCommands(context: ExtensionContext): void {
        context.subscriptions.push(commands.registerCommand('playfabExplorer.refresh', () => this._treeDataProvider.refresh()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.createTitle', async (studioNode) => {
            await this.createTitle((studioNode || await this.getStudioTreeNodeFromUser()).data);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getTitleData', async (title) => {
         await this.getTitleData(title.data, PlayFabUriConstants.getTitleDataPath);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.setTitleData', async (title) => {
            await this.setTitleData(title.data, PlayFabUriConstants.setTitleDataPath);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getTitleInternalData', async (title) => {
            await this.getTitleData(title.data, PlayFabUriConstants.getTitleInternalDataPath);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.setTitleInternalData', async (title) => {
            await this.setTitleData(title.data, PlayFabUriConstants.setTitleInternalDataPath);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getCloudScriptRevision', async (title) => {
            await this.getCloudScriptRevision(title.data);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.updateCloudScript', async (title) => { 
            await this.updateCloudScript(title.data);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.listFunctions', async (title) => { 
            await this.listFunctions(title.data);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.registerFunction', async (title) => {
            await this.registerFunction(title.data);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.unregisterFunction', async (title) => {
            await this.unregisterFunction(title.data);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.enableLocalDebugging', async () => await this.enableLocalDebugging()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.disableLocalDebugging', async () => await this.disableLocalDebugging()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.openGameManagerPageForTitle', (title) => {
            commands.executeCommand('vscode.open', Uri.parse(`https://developer.playfab.com/en-US/${title.data.Id}/dashboard`));
        }));
    }

    private async getEntityToken(title: Title): Promise<string> {
        let tokenRequest: GetEntityTokenRequest = {
            Context: null
        };

        let baseUrl: string = PlayFabUriConstants.GetPlayFabBaseUrl(title.Id);
        let entityToken: string = null;
        await this._httpClient.makeTitleApiCall(
            PlayFabUriConstants.getEntityTokenPath,
            baseUrl,
            tokenRequest,
            title.SecretKey,
            (response: GetEntityTokenResponse) => {
                entityToken = response.EntityToken;
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });

        return entityToken;
    }

    private getMarkDownForFunctionList(functions: FunctionInfo[]): string {

        let newline: string = process.platform == 'win32' ? '\r\n' : '\n';
        let result: string = "# List Of Functions";
        result += newline;
        result += "| Name | Url | Trigger | Invocation |";
        result += newline;
        result += "| --- | --- | --- | --- |";
        result += newline;

        functions.forEach((fnInfo: FunctionInfo) => {
            result += `| ${fnInfo.FunctionName} | ${fnInfo.FunctionUrl} | ${fnInfo.TriggerType} | ${fnInfo.InvocationSource} |`;
            result += newline;
        });

        return result;
    }

    private async getStudioTreeNodeFromUser(): Promise<ITreeNode> {
        return await this.getTreeNodeFromUser(null, "Please choose a Studio");
    }

    private async getTitleTreeNodeFromUser(studioTreeNode: ITreeNode): Promise<ITreeNode> {
        return await this.getTreeNodeFromUser(studioTreeNode, "Please choose a Title");
    }

    private async getTreeNodeFromUser(rootTreeNode: ITreeNode, placeHolder: string) {
        let nodes: ITreeNode[] = await this._treeDataProvider.getChildren(rootTreeNode);
        let names: string[] = nodes.map((node) => node.name);
        const name: string = await window.showQuickPick(names, { placeHolder: placeHolder });
        return nodes.find((value: ITreeNode) => value.name === name);
    }

    private async getUserInputForCreateTitle(): Promise<CreateTitleRequest> {
        return await this._inputGatherer.getUserInputForCreateTitle();
    }

    private async getUserInputForGetCloudScriptRevision(): Promise<GetCloudScriptRevisionRequest> {
        return await this._inputGatherer.getUserInputForGetCloudScriptRevision();
    }

    private async getUserInputForGetTitleData(): Promise<GetTitleDataRequest> {
        return await this._inputGatherer.getUserInputForGetTitleData();
    }

    private async getUserInputForListFunctions(): Promise<ListFunctionsRequest> {
        return await this._inputGatherer.getUserInputForListFunctions();
    }

    private async getUserInputForRegisterFunction(): Promise<RegisterFunctionRequest> {
        return await this._inputGatherer.getUserInputForRegisterFunction();
    }

    private async getUserInputForSetTitleData(): Promise<SetTitleDataRequest> {
        return await this._inputGatherer.getUserInputForSetTitleData();
    }

    private async getUserInputForUnregisterFunction(): Promise<UnregisterFunctionRequest> {
        return await this._inputGatherer.getUserInputForUnregisterFunction();
    }

    private async setTitleDataFromJsonFile(title: Title, path: string, documentContent: string): Promise<void> {
        try {
            let obj: any = JSON.parse(documentContent);

            if (obj && !Array.isArray(obj)) {
                for (let key of Object.keys(obj)) {
                    let request: SetTitleDataRequest = {
                        Key: key,
                        Value: EscapeValue(obj[key])
                    }

                    await this.makeSetTitleDataApiCall(title, path, request);
                    // Need a slight delay between set title data API calls otherwise we get Conflict errors
                    await delay(100);
                }

                const msg: string = localize('playfab-explorer.titleDataUpdated', 'Title data updated');
                await window.showInformationMessage(msg);
            }
        }
        catch (SyntaxException) {
            const msg: string = localize('playfab-explorer.titleDataParseFailure', 'Title data could not be parsed.');
            await window.showErrorMessage(msg);
        }
    }

    private async setTitleDataFromUserInput(title: Title, path: string): Promise<void> {
        let request: SetTitleDataRequest = await this.getUserInputForSetTitleData();
        await this.makeSetTitleDataApiCall(title, path, request, true);
    }

    private async makeSetTitleDataApiCall(title: Title, path: string, request: SetTitleDataRequest, showSuccessMessages: boolean = false): Promise<void> {
        let baseUrl: string = PlayFabUriConstants.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeTitleApiCall(
            path,
            baseUrl,
            request,
            title.SecretKey,
            async (response: SetTitleDataResponse) => {
                if (showSuccessMessages) {
                    const msg: string = localize('playfab-explorer.titleDataUpdated', 'Title data updated.');
                    await window.showInformationMessage(msg);
                }
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    private showError(response: ErrorResponse): void {
        window.showErrorMessage(`${response.error} - ${response.errorMessage}`);
    }
}

class PlayFabExplorerUserInputGatherer implements IPlayFabExplorerInputGatherer {

    public async getUserInputForCreateTitle(): Promise<CreateTitleRequest> {
        const titleNameValue: string = localize('playfab-explorer.titleNameValue', 'Game Name');
        const titleNamePrompt: string = localize('playfab-explorer.titleNamePrompt', 'Please enter the name of your game');

        const titleName = await window.showInputBox({
            value: titleNameValue,
            prompt: titleNamePrompt
        });

        let request = new CreateTitleRequest();
        request.Name = titleName;
        return request;
    }

    public async getUserInputForGetCloudScriptRevision(): Promise<GetCloudScriptRevisionRequest> {
        const revisionValue: string = null;
        const revisionPrompt: string = localize('playfab-explorer.revisionPrompt', 'Optionally enter a CloudScript revision');

        const revisionStr = await window.showInputBox({
            value: revisionValue,
            prompt: revisionPrompt
        });

        let revision: number = parseInt(revisionStr);

        let request = new GetCloudScriptRevisionRequest();
        request.Version = null;
        request.Revision = revision;
        return request;
    }

    public async getUserInputForGetTitleData(): Promise<GetTitleDataRequest> {
        const keysPrompt: string = localize('playfab-explorer.keysPrompt', 'Please enter the key name(s) or leave blank for all.');

        const keys = await window.showInputBox({
            prompt: keysPrompt
        });

        let request = new GetTitleDataRequest();
        request.Keys = keys === "" ? null : keys.split(' ');
        return request;
    }

    public async getUserInputForListFunctions(): Promise<ListFunctionsRequest> {
        const triggerTypePrompt: string = localize('playfab-explorer.triggerTypePrompt', 'Please choose a trigger type.');
        const invocationSourcePrompt: string = localize('playfab-explorer.invocationSourcePrompt', 'Please choose an invocation source.');

        const triggerType: string = await window.showQuickPick(["All", "Http", "Azure Queue"], { placeHolder: triggerTypePrompt });
        let invocationSource: string = "";

        if (triggerType !== "http") {
            invocationSource = await window.showQuickPick(["All", "PlayStream", "Segment", "Scheduled Task"], { placeHolder: invocationSourcePrompt });
        }

        let request: ListFunctionsRequest = {
            TriggerType: triggerType,
            InvocationSource: invocationSource
        };

        return request;
    }

    public async getUserInputForRegisterFunction(): Promise<RegisterFunctionRequest> {
        const functionUriValue: string = localize('playfab-explorer.functionUriValue', 'Function Uri');
        const functionUriPrompt: string = localize('playfab-explorer.functionUriPrompt', 'Please enter the function uri');

        const functionUri = await window.showInputBox({
            value: functionUriValue,
            prompt: functionUriPrompt
        });

        let tentativeFunctionName: string = GetLastPathPartFromUri(functionUri);

        const functionNameValue: string = tentativeFunctionName || localize('playfab-explorer.functionNameValue', 'Function Name');
        const functionNamePrompt: string = localize('playfab-explorer.functionNamePrompt', 'Please enter the function name');

        const functionName = await window.showInputBox({
            value: functionNameValue,
            prompt: functionNamePrompt
        });

        let request: RegisterFunctionRequest = {
            FunctionName: functionName,
            FunctionUrl: functionUri
        };

        return request;
    }

    public async getUserInputForSetTitleData(): Promise<SetTitleDataRequest> {
        const keyValue: string = localize('playfab-explorer.keyValue', 'Key Name');
        const keyPrompt: string = localize('playfab-explorer.keyPrompt', 'Please enter the key name');

        const key = await window.showInputBox({
            value: keyValue,
            prompt: keyPrompt
        });

        const valueValue: string = localize('playfab-explorer.valueValue', 'Value');
        const valuePrompt: string = localize('playfab-explorer.valuePrompt', 'Please enter the value');

        const value = await window.showInputBox({
            value: valueValue,
            prompt: valuePrompt
        });

        let request = new SetTitleDataRequest();
        request.Key = key;
        request.Value = value;
        return request;
    }

    public async getUserInputForUnregisterFunction(): Promise<UnregisterFunctionRequest> {
        const functionNameValue: string = localize('playfab-explorer.functionNameValue', 'Function Name');
        const functionNamePrompt: string = localize('playfab-explorer.functionNamePrompt', 'Please enter the function name');

        const functionName = await window.showInputBox({
            value: functionNameValue,
            prompt: functionNamePrompt
        });

        let request: UnregisterFunctionRequest = {
            FunctionName: functionName,
        };

        return request;
    }
};