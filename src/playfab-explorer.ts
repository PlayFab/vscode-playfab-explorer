//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import {
    commands, Command, Event, EventEmitter, ExtensionContext, TextDocument, TextEditor, TreeDataProvider,
    TreeItem, TreeItemCollapsibleState, TreeView, window, Uri, workspace, WorkspaceConfiguration, WorkspaceFolder
} from 'vscode';
import { loadMessageBundle } from 'vscode-nls';
import { PlayFabAccount, PlayFabLoginStatus } from './playfab-account.api';
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
import { Studio, GetStudiosRequest, GetStudiosResponse } from './models/PlayFabStudioModels';
import {
    Title, CreateTitleRequest, CreateTitleResponse, GetTitleDataRequest, GetTitleDataResponse,
    SetTitleDataRequest, SetTitleDataResponse
} from './models/PlayFabTitleModels';
import * as path from "path";
import * as fs from "fs";

const localize = loadMessageBundle();

type EntryType = 'Studio' | 'Title' | "Command";

interface IEntry {
    name: string;
    type: EntryType;
    data: any;
}

class Entry implements IEntry {
    name: string;
    type: EntryType;
    data: any;
}

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
    private _explorer: TreeView<Entry>;
    private _account: PlayFabAccount;
    private _httpClient: IHttpClient;
    private _inputGatherer: IPlayFabExplorerInputGatherer;
    private _treeDataProvider: PlayFabStudioTreeProvider;

    constructor(account: PlayFabAccount,
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
            (response: GetCloudScriptRevisionResponse) => {
                if (response.Files.length > 0) {
                    let file: CloudScriptFile = response.Files[0];
                    workspace.openTextDocument({ language: 'javascript', content: file.FileContents })
                        .then((doc: TextDocument) => {
                            window.showTextDocument(doc);
                        })
                        .then(() => {
                            window.showInformationMessage(`Downloaded CloudScript revision ${response.Revision} for ${title.Name}`);
                        });
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
            (response: ListFunctionsResponse) => {
                workspace.openTextDocument({ language: 'markdown', content: this.getMarkDownForFunctionList(response.Functions) })
                    .then((doc: TextDocument) => {
                        window.showTextDocument(doc);
                    });
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
            (response: RegisterFunctionResponse) => {
                window.showInformationMessage(`Registered function ${request.FunctionName} at ${request.FunctionUrl}`);
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
            (response: UnregisterFunctionResponse) => {
                window.showInformationMessage(`Unregistered function ${request.FunctionName}`);
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
            (response: UpdateCloudScriptResponse) => {
                const msg: string = localize('playfab-explorer.cloudscriptUpdated', 'CloudScript updated to revision {0}', response.Revision);
                window.showInformationMessage(msg)
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
            (response: GetTitleDataResponse) => {
                let map: Map<string, string> = MapFromObject(response.Data);
                if (map.size > 0) {

                    let titleData: any = {};

                    map.forEach((value: string, key: string, map: Map<string, string>) => {
                        titleData[key] = UnescapeValue(value);
                    });

                    const playfabConfig: WorkspaceConfiguration = workspace.getConfiguration('playfab');
                    let spaces: number = playfabConfig.get<number>('titleDataSpaces');

                    workspace.openTextDocument({ language: 'json', content: JSON.stringify(titleData, null, spaces) })
                        .then((doc: TextDocument) => {
                            window.showTextDocument(doc);
                        })
                }
                else {
                    const msg: string = localize('playfab-explorer.noTitleData', 'No title data found with specified key(s)');
                    window.showInformationMessage(msg);
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

    async createNewFunction(): Promise<void> {
        const functionType = await window.showQuickPick([ "Http Trigger", "PlayStream Trigger", "Timer Trigger" ]);
        const functionName = await window.showInputBox({
            prompt: 'Please enter the new CloudScript Function name'
        });


        let workspaceFolders : WorkspaceFolder[] | undefined = workspace.workspaceFolders;
        if (workspaceFolders !== undefined) {
            window.showInformationMessage('Workspace found');
            let rootFolder : WorkspaceFolder | undefined = workspaceFolders[0];

            if (rootFolder === undefined)
            {
                window.showErrorMessage('Workspace root folder not found.');
                return;
            }

            let functionPath : string = path.join(rootFolder.uri.fsPath, functionName + '.cs');
            if (!fs.existsSync(functionPath)) {
                fs.appendFileSync(functionPath, '', {
                    encoding: 'utf8'
                });
            }
            else {
                fs.writeFileSync(functionPath, '', {
                    encoding: 'utf8',
                });
            }
            
            let functionUriPath : Uri = Uri.file(functionPath);
            let doc: TextDocument = await workspace.openTextDocument(functionUriPath);
            await window.showTextDocument(doc);
            switch (functionType)
            {
                case 'Http Trigger':
                {
                    commands.executeCommand('editor.action.insertSnippet', {
                        'name': 'pf-af-http-new'
                    });
                    break;
                }
                case 'PlayStream Trigger':
                {
                    break;
                }
                case 'Timer Trigger':
                {
                    break;
                }
            }
        }
        else {
            window.showWarningMessage('Please open a folder or workspace before attempting to create a function');
        }
    }

    public registerCommands(context: ExtensionContext): void {
        context.subscriptions.push(commands.registerCommand('playfabExplorer.refresh', () => this._treeDataProvider.refresh()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.createTitle', async (studio) => await this.createTitle(studio.data)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getTitleData', async (title) => await this.getTitleData(title.data, PlayFabUriConstants.getTitleDataPath)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.setTitleData', async (title) => await this.setTitleData(title.data, PlayFabUriConstants.setTitleDataPath)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getTitleInternalData', async (title) => await this.getTitleData(title.data, PlayFabUriConstants.getTitleInternalDataPath)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.setTitleInternalData', async (title) => await this.setTitleData(title.data, PlayFabUriConstants.setTitleInternalDataPath)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getCloudScriptRevision', async (title) => await this.getCloudScriptRevision(title.data)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.updateCloudScript', async (title) => await this.updateCloudScript(title.data)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.newFunction', async () => await this.createNewFunction()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.listFunctions', async (title) => await this.listFunctions(title.data)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.registerFunction', async (title) => await this.registerFunction(title.data)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.unregisterFunction', async (title) => await this.unregisterFunction(title.data)));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.enableLocalDebugging', async () => await this.enableLocalDebugging()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.disableLocalDebugging', async () => await this.disableLocalDebugging()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.openGameManagerPageForTitle',
            (title) => commands.executeCommand('vscode.open', Uri.parse(`https://developer.playfab.com/en-US/${title.data.Id}/dashboard`))));
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
                window.showInformationMessage(msg);
            }
        }
        catch (SyntaxException) {
            const msg: string = localize('playfab-explorer.titleDataParseFailure', 'Title data could not be parsed.');
            window.showErrorMessage(msg);
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
            (response: SetTitleDataResponse) => {
                if (showSuccessMessages) {
                    const msg: string = localize('playfab-explorer.titleDataUpdated', 'Title data updated.');
                    window.showInformationMessage(msg);
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

export class PlayFabStudioTreeProvider implements TreeDataProvider<IEntry> {

    private _rootData: Studio[];
    private _account: PlayFabAccount;
    private _httpClient: IHttpClient;

    private _onDidChangeTreeData: EventEmitter<IEntry | undefined> = new EventEmitter<IEntry | undefined>();
    readonly onDidChangeTreeData: Event<IEntry | undefined> = this._onDidChangeTreeData.event;

    constructor(account: PlayFabAccount, httpClient: IHttpClient = null) {
        this._account = account;
        this._httpClient = httpClient || new PlayFabHttpClient();
        this.clearRootData();
        const subscription = this._account.onStatusChanged((status: PlayFabLoginStatus) => {
            this.refreshStudioData();
        });
        const subscription2 = workspace.onDidChangeConfiguration(this.refresh, this);
    }

    public async refresh(): Promise<void> {
        await this.refreshStudioData();
    }

    public async getChildren(entry?: IEntry): Promise<IEntry[]> {
        if (entry) {
            switch (entry.type) {
                case 'Studio':
                    return this.getStudioChildren(entry);
                case 'Title':
                    return this.getTitleChildren(entry);
                default:
                    return [];
            }
        }

        // Entry is null/undefined, which means we are being asked for the root nodes. 
        // Return Studio or Command entries as appropriate
        return this.isLoggedIn() ? this.getStudioEntries() : this.getCommandEntries();
    }

    public getTreeItem(entry: IEntry): TreeItem {
        switch (entry.type) {
            case 'Studio':
                return this.getStudioTreeItem(entry);
            case 'Title':
                return this.getTitleTreeItem(entry);
            case 'Command':
                return this.getCommandTreeItem(entry);
            default:
                return null;
        }
    }

    private clearRootData(): void {
        this._rootData = [];
    }

    private getCommandEntries(): IEntry[] {
        const signInTitle: string = localize("playfab-account.commands.loginTitle", "Sign In to PlayFab...");
        const signInEntry: IEntry = {
            name: "login",
            type: "Command",
            data: { command: "playfab-account.login", title: signInTitle }
        };

        const createAccountTitle: string = localize("playfab-account.commands.createAccountTitle", "Create a PlayFab account...");
        const createAccountEntry: IEntry = {
            name: "createAccount",
            type: "Command",
            data: { command: "playfab-account.createAccount", title: createAccountTitle }
        };

        return [
            signInEntry, createAccountEntry
        ];
    }

    private getCommandTreeItem(entry: IEntry): TreeItem {
        const command: Command = entry.data;
        const treeItem = new TreeItem(
            command.title,
            TreeItemCollapsibleState.None);
        treeItem.contextValue = 'command';
        treeItem.command = command;
        return treeItem;
    }

    private getStudioEntries(): IEntry[] {
        return this._rootData.map(
            (studio: Studio) => {
                let result: IEntry = {
                    name: studio.Name,
                    type: 'Studio',
                    data: studio
                }
                return result;
            });
    }

    private getStudioTreeItem(entry: IEntry): TreeItem {
        let studio: Studio = entry.data;
        const treeItem = new TreeItem(
            entry.name,
            studio.Titles.length > 0 ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
        treeItem.contextValue = 'studio';
        return treeItem;
    }

    private getTitleTreeItem(entry: IEntry): TreeItem {
        const treeItem = new TreeItem(entry.name, TreeItemCollapsibleState.None);
        treeItem.contextValue = 'title';
        return treeItem;
    }

    private isLoggedIn(): boolean {
        return this._account.status === 'LoggedIn';
    }

    private getConfigValue(name: string): boolean {
        const playfabConfig: WorkspaceConfiguration = workspace.getConfiguration('playfab');
        return playfabConfig.get<boolean>(name);
    }

    private async updateStudioData(): Promise<void> {

        // Ensure developer has signed in to PlayFab
        if (!this.isLoggedIn()) {
            this.clearRootData();
            return;
        }

        let request: GetStudiosRequest = new GetStudiosRequest();
        request.DeveloperClientToken = this._account.getToken();

        await this._httpClient.makeApiCall(
            PlayFabUriConstants.getStudiosPath,
            PlayFabUriConstants.editorBaseUrl,
            request,
            (response: GetStudiosResponse) => {
                this._rootData = response.Studios;

                if (this.getConfigValue('sortStudiosAlphabetically')) {
                    this._rootData = response.Studios.sort(PlayFabStudioTreeProvider.sortStudiosByName);
                }
            },
            (response: ErrorResponse) => {
                this.showError(response);
                this.clearRootData();
            });
    }

    private getStudioChildren(entry: Entry): IEntry[] {
        let studio: Studio = entry.data;
        let titles: Title[] = studio.Titles;

        if (this.getConfigValue('sortTitlesAlphabetically')) {
            titles = studio.Titles.sort(PlayFabStudioTreeProvider.sortTitlesByName);
        }

        return titles.map((title: Title) => {
            let result = new Entry();
            result.name = title.Name;
            result.type = 'Title';
            result.data = title;
            return result;
        });
    }

    private getTitleChildren(entry: Entry): IEntry[] {
        return [];
    }

    private async refreshStudioData(): Promise<void> {
        await this.updateStudioData();
        this._onDidChangeTreeData.fire();
    }

    private showError(response: ErrorResponse): void {
        window.showErrorMessage(`${response.error} - ${response.errorMessage}`);
    }

    private static sortString(left: string, right: string): number {
        if (left > right) {
            return 1;
        }
        else if (left < right) {
            return -1;
        }

        return 0;
    }

    private static sortStudiosByName(left: Studio, right: Studio): number {
        return PlayFabStudioTreeProvider.sortString(left.Name, right.Name);
    }

    private static sortTitlesByName(left: Title, right: Title): number {
        return PlayFabStudioTreeProvider.sortString(left.Name, right.Name);
    }
}