//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { commands, Command, Event, EventEmitter, ExtensionContext, TextDocument, TreeDataProvider, TreeItem, TreeItemCollapsibleState, TreeView, window, Uri, workspace, QuickPickOptions, QuickInputButtons } from 'vscode';
import * as nls from 'vscode-nls';
import { Studio, GetStudiosRequest, GetStudiosResponse } from './models/PlayFabStudioModels';
import { Title, CreateTitleRequest, CreateTitleResponse, GetTitleDataRequest, GetTitleDataResponse, SetTitleDataRequest, SetTitleDataResponse } from './models/PlayFabTitleModels';
import { CloudScriptFile, GetCloudScriptRevisionRequest, GetCloudScriptRevisionResponse, UpdateCloudScriptRequest, UpdateCloudScriptResponse } from './models/PlayFabLegacyCloudScriptModels';
import { IHttpClient, PlayFabHttpClient } from './helpers/PlayFabHttpHelper'
import { PlayFabAccount, PlayFabLoginStatus } from './playfab-account.api';

const localize = nls.loadMessageBundle();

type EntryType = 'Studio' | 'Title' | "Command";

export interface IEntry {
    name: string;
    type: EntryType;
    data: any;
}

class Entry implements IEntry {
    name: string;
    type: EntryType;
    data: any;
}

export class PlayFabExplorer {
    private static editorBaseUrl: string = 'https://editor.playfabapi.com';
    private static adminBaseUrl: string = 'https://{titleId}.playfabapi.com'
    private static createTitlePath: string = '/DeveloperTools/User/CreateTitle';
    private static getTitleDataPath: string = '/Admin/GetTitleData';
    private static setTitleDataPath: string = '/Admin/SetTitleData';
    private static getTitleInternalDataPath: string = '/Admin/GetTitleInternalData';
    private static setTitleInternalDataPath: string = '/Admin/SetTitleInternalData';
    private static updateCloudScriptPath: string = '/Admin/UpdateCloudScript';
    private static getCloudScriptRevisionPath: string = '/Admin/GetCloudScriptRevision';

    private _explorer: TreeView<Entry>;
    private _account: PlayFabAccount;
    private _httpClient: IHttpClient;

    constructor(context: ExtensionContext, account: PlayFabAccount, httpClient: IHttpClient = null) {
        this._account = account;
        this._httpClient = httpClient || new PlayFabHttpClient();
        const treeDataProvider = new PlayFabStudioTreeProvider(account);
        this._explorer = window.createTreeView('playfabExplorer', { treeDataProvider });
        commands.registerCommand('playfabExplorer.refresh', () => treeDataProvider.refresh());
        commands.registerCommand('playfabExplorer.createTitle', async (studio) => await this.createTitle(studio.data, account));
        commands.registerCommand('playfabExplorer.getTitleData', async (title) => await this.getTitleData(title.data, account, PlayFabExplorer.getTitleDataPath));
        commands.registerCommand('playfabExplorer.setTitleData', async (title) => await this.setTitleData(title.data, account, PlayFabExplorer.setTitleDataPath));
        commands.registerCommand('playfabExplorer.getTitleInternalData', async (title) => await this.getTitleData(title.data, account, PlayFabExplorer.getTitleInternalDataPath));
        commands.registerCommand('playfabExplorer.setTitleInternalData', async (title) => await this.setTitleData(title.data, account, PlayFabExplorer.setTitleInternalDataPath));
        commands.registerCommand('playfabExplorer.getCloudScriptRevision', async (title) => await this.getCloudScriptRevision(title.data, account));
        commands.registerCommand('playfabExplorer.updateCloudScript', async (title) => await this.updateCloudScript(title.data, account));
        commands.registerCommand('playfabExplorer.openGameManagerPageForTitle',
            (titleId: string) => commands.executeCommand('vscode.open', Uri.parse(`https://developer.playfab.com/en-US/${titleId}/dashboard`)));
    }

    async createTitle(studio: Studio, account: PlayFabAccount): Promise<void> {
        let request: CreateTitleRequest = await this.getUserInputForCreateTitle();
        request.StudioId = studio.Id;
        request.DeveloperClientToken = account.getToken();

        await this._httpClient.makeApiCall(
            PlayFabExplorer.createTitlePath,
            PlayFabExplorer.editorBaseUrl,
            request,
            (response: CreateTitleResponse) => {
                // NOOP
            },
            (code: number, error: string) => {
                this.showError(code, error);
            });
    }

    async getCloudScriptRevision(title: Title, account: PlayFabAccount): Promise<void> {
        let request: GetCloudScriptRevisionRequest = await this.getUserInputForGetCloudScriptRevision();

        let baseUrl: string = PlayFabExplorer.adminBaseUrl;
        baseUrl = baseUrl.replace('{titleId}', title.Id);

        await this._httpClient.makeTitleApiCall(
            PlayFabExplorer.getCloudScriptRevisionPath,
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
            (code: number, error: string) => {
                this.showError(code, error);
            });
    }

    async updateCloudScript(title: Title, account: PlayFabAccount): Promise<void> {
        let request: UpdateCloudScriptRequest = new UpdateCloudScriptRequest();
        request.Publish = true;
        let file = new CloudScriptFile();
        file.Filename = window.activeTextEditor.document.fileName;
        file.FileContents = window.activeTextEditor.document.getText();
        request.Files = [file];

        let baseUrl: string = PlayFabExplorer.adminBaseUrl;
        baseUrl = baseUrl.replace('{titleId}', title.Id);

        await this._httpClient.makeTitleApiCall(
            PlayFabExplorer.updateCloudScriptPath,
            baseUrl,
            request,
            title.SecretKey,
            (response: UpdateCloudScriptResponse) => {
                const msg: string = localize('playfab-explorer.cloudscriptUpdated', 'CloudScript updated to revision {0}', response.Revision);
                window.showInformationMessage(msg)
            },
            (code: number, error: string) => {
                this.showError(code, error);
            });
    }

    async getTitleData(title: Title, account: PlayFabAccount, path: string): Promise<void> {
        let request: GetTitleDataRequest = await this.getUserInputForGetTitleData();

        let baseUrl: string = PlayFabExplorer.adminBaseUrl;
        baseUrl = baseUrl.replace('{titleId}', title.Id);

        await this._httpClient.makeTitleApiCall(
            path,
            baseUrl,
            request,
            title.SecretKey,
            (response: GetTitleDataResponse) => {
                let map: Map<string, string> = new Map();
                Object.keys(response.Data).forEach((key: string) => {
                    map.set(key, response.Data[key]);
                });
                if (map.size > 0) {
                    map.forEach((value: string, key: string) => {
                        window.showInformationMessage(`${key} - ${value}`);
                    });
                }
                else {
                    const msg: string = localize('playfab-explorer.noTitleData', 'No title data found with specified key(s)');
                    window.showInformationMessage(msg);
                }
            },
            (code: number, error: string) => {
                this.showError(code, error);
            });
    }

    async setTitleData(title: Title, account: PlayFabAccount, path: string): Promise<void> {
        let request: SetTitleDataRequest = await this.getUserInputForSetTitleData();

        let baseUrl: string = PlayFabExplorer.adminBaseUrl;
        baseUrl = baseUrl.replace('{titleId}', title.Id);

        await this._httpClient.makeTitleApiCall(
            path,
            baseUrl,
            request,
            title.SecretKey,
            (response: SetTitleDataResponse) => {
                const msg: string = localize('playfab-explorer.titleDataSet', 'Title data set');
                window.showInformationMessage(msg);
            },
            (code: number, error: string) => {
                this.showError(code, error);
            });
    }

    private async getUserInputForCreateTitle(): Promise<CreateTitleRequest> {
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

    private async getUserInputForGetCloudScriptRevision(): Promise<GetCloudScriptRevisionRequest> {
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

    private async getUserInputForGetTitleData(): Promise<GetTitleDataRequest> {
        const keysValue: string = localize('playfab-explorer.keysValue', 'Key Names');
        const keysPrompt: string = localize('playfab-explorer.keysPrompt', 'Please enter the key name(s)');

        const keys = await window.showInputBox({
            value: keysValue,
            prompt: keysPrompt
        });

        let request = new GetTitleDataRequest();
        request.Keys = keys.split(' ');
        return request;
    }

    private async getUserInputForSetTitleData(): Promise<SetTitleDataRequest> {
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

    private showError(statusCode: number, message: string): void {
        window.showErrorMessage(`${statusCode} - ${message}`);
    }
}

export class PlayFabStudioTreeProvider implements TreeDataProvider<IEntry> {

    private static baseUrl: string = 'https://editor.playfabapi.com';
    private static getStudiosPath = '/DeveloperTools/User/GetStudios';

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
        let title: Title = entry.data;
        const menuTitle = localize('playfab-explorer.commands.openGameManagerPageForTitle', 'Open in Game Manager');
        const treeItem = new TreeItem(entry.name, TreeItemCollapsibleState.None);
        treeItem.contextValue = 'title';
        treeItem.command = { command: 'playfabExplorer.openGameManagerPageForTitle', title: menuTitle, arguments: [title.Id] };
        return treeItem;
    }

    private isLoggedIn(): boolean {
        return this._account.status === 'LoggedIn';
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
            PlayFabStudioTreeProvider.getStudiosPath,
            PlayFabStudioTreeProvider.baseUrl,
            request,
            (response: GetStudiosResponse) => {
                this._rootData = response.Studios;
            },
            (code: number, error: string) => {
                this.showError(code, error);
                this.clearRootData();
            });
    }

    private getStudioChildren(entry: Entry): IEntry[] {
        let studio: Studio = entry.data;
        let titles: Title[] = studio.Titles;
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

    private showError(statusCode: number, message: string): void {
        window.showErrorMessage(`${statusCode} - ${message}`);
    }
}