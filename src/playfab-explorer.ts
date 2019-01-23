//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { commands, Event, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, TreeItemCollapsibleState, TreeView, window, Uri } from 'vscode';
import { Studio, GetStudiosRequest, GetStudiosResponse } from './models/PlayFabStudioModels';
import { Title } from './models/PlayFabTitleModels';
import { PlayFabHttpClient } from './helpers/PlayFabHttpHelper'
import { PlayFabAccount, PlayFabLoginStatus } from './playfab-account.api';

type EntryType = 'Studio' | 'Title';

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
    private _explorer: TreeView<Entry>;
    private _account: PlayFabAccount;

    constructor(context: ExtensionContext, account: PlayFabAccount) {
        this._account = account;
        const treeDataProvider = new PlayFabStudioTreeProvider(account);
        this._explorer = window.createTreeView('playfabExplorer', { treeDataProvider });
        commands.registerCommand('playfabExplorer.refresh', () => treeDataProvider.refresh());
        commands.registerCommand('playfabExplorer.createTitle', (studio) => this.createTitle(studio));
        commands.registerCommand('playfabExplorer.openGameManagerPageForTitle',
            (titleId: string) => commands.executeCommand('vscode.open', Uri.parse(`https://developer.playfab.com/en-US/${titleId}/dashboard`)));
    }

    async createTitle(studio: Studio): Promise<void> {
        window.showInformationMessage("Create Title called");
    }
}

export class PlayFabStudioTreeProvider implements TreeDataProvider<IEntry> {

    private static baseUrl: string = "https://editor.playfabapi.com";
    private static getStudiosPath = "/DeveloperTools/User/GetStudios";

    private _rootData: Studio[];
    private _account: PlayFabAccount;

    private _onDidChangeTreeData: EventEmitter<IEntry | undefined> = new EventEmitter<IEntry | undefined>();
    readonly onDidChangeTreeData: Event<IEntry | undefined> = this._onDidChangeTreeData.event;

    constructor(account: PlayFabAccount) {
        this._account = account;
        this.clearRootData();
        this.refreshStudioData();
        const subscription = this._account.onStatusChanged((status: PlayFabLoginStatus) => {
            this.refreshStudioData();
        });
    }

    public refresh(): void {
        this.refreshStudioData();
    }

    public async getChildren(entry?: IEntry): Promise<IEntry[]> {
        if (entry) {
            switch (entry.type) {
                case "Studio":
                    return this.getStudioChildren(entry);
                case "Title":
                    return this.getTitleChildren(entry);
                default:
                    return [];
            }
        }

        return this._rootData.map((studio: Studio) => {
            let result = new Entry();
            result.name = studio.Name;
            result.type = "Studio";
            result.data = studio;
            return result;
        });
    }

    public getTreeItem(entry: IEntry): TreeItem {
        switch (entry.type) {
            case "Studio":
                return this.getStudioTreeItem(entry);
            case "Title":
                return this.getTitleTreeItem(entry);
            default:
                return null;
        }
    }

    private clearRootData(): void {
        this._rootData = [];
    }

    private getStudioTreeItem(entry: IEntry): TreeItem {
        let studio: Studio = entry.data;
        const treeItem = new TreeItem(
            entry.name,
            studio.Titles.length > 0 ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
        treeItem.command = { command: "playfabExplorer.createTitle", title: "Create Title...", arguments: [studio] };
        return treeItem;
    }

    private getTitleTreeItem(entry: IEntry): TreeItem {
        let title: Title = entry.data;
        const treeItem = new TreeItem(entry.name, TreeItemCollapsibleState.None);
        treeItem.command = { command: "playfabExplorer.openGameManagerPageForTitle", title: "Open in Game Manager", arguments: [title.Id] };
        return treeItem;
    }

    private updateStudioData(): void {

        // 1. Ensure developer has signed in to PlayFab
        if (this._account.status != "LoggedIn") {
            window.showInformationMessage("Please login to your PlayFab account");
            this.clearRootData();
            return;
        }

        // 2. Create request object
        let request: GetStudiosRequest = new GetStudiosRequest();
        request.DeveloperClientToken = this._account.getToken();

        // 3. Create HTTP Client object
        let httpcli = new PlayFabHttpClient(this._account);

        // 4. Make API call
        httpcli.makeApiCall(
            PlayFabStudioTreeProvider.getStudiosPath,
            PlayFabStudioTreeProvider.baseUrl,
            request,
            // 5. Set rootData on success
            (response: GetStudiosResponse) => {
                this._rootData = response.Studios;
            },
            // 6. Pop error toast on failure.
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
            result.type = "Title";
            result.data = title;
            return result;
        });
    }

    private getTitleChildren(entry: Entry): IEntry[] {
        return [];
    }

    private refreshStudioData(): void {
        this.updateStudioData();
        this._onDidChangeTreeData.fire();
    }

    private showError(statusCode: number, message: string): void {
        window.showErrorMessage(`${statusCode} - ${message}`);
    }
}