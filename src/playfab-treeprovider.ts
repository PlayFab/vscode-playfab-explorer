//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import {
    Command, Event, EventEmitter, TreeDataProvider, TreeItem,
    TreeItemCollapsibleState, window, workspace, WorkspaceConfiguration
} from 'vscode';
import { loadMessageBundle } from 'vscode-nls';
import { IPlayFabAccount, PlayFabLoginStatus } from './playfab-account.api';
import { ITreeNode, NodeType, IPlayFabStudioTree } from './playfab-treeprovider.api';
import { IHttpClient, PlayFabHttpClient } from './helpers/PlayFabHttpHelper';
import { PlayFabUriConstants } from './helpers/PlayFabUriConstants';
import { ErrorResponse } from "./models/PlayFabHttpModels";
import { Studio, GetStudiosRequest, GetStudiosResponse } from './models/PlayFabStudioModels';
import { Title } from './models/PlayFabTitleModels';

const localize = loadMessageBundle();

class TreeNode implements ITreeNode {
    name: string;
    type: NodeType;
    data: Studio | Title | Command;
}

export class PlayFabStudioTreeProvider implements TreeDataProvider<ITreeNode> {

    private _rootData: Studio[];
    private _account: IPlayFabAccount;
    private _httpClient: IHttpClient;

    private _onDidChangeTreeData: EventEmitter<ITreeNode | undefined> = new EventEmitter<ITreeNode | undefined>();
    readonly onDidChangeTreeData: Event<ITreeNode | undefined> = this._onDidChangeTreeData.event;

    constructor(account: IPlayFabAccount, httpClient: IHttpClient = null) {
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

    public async getChildren(entry?: ITreeNode): Promise<ITreeNode[]> {
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

    public getTreeItem(entry: ITreeNode): TreeItem {
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

    api: IPlayFabStudioTree = {
        studios: this._rootData,
        onStudiosChanged: this._onDidChangeTreeData.event
    }

    private clearRootData(): void {
        this._rootData = [];
    }

    private getCommandEntries(): ITreeNode[] {
        const signInTitle: string = localize("playfab-account.commands.loginTitle", "Sign In to PlayFab...");
        const signInEntry: ITreeNode = {
            name: "login",
            type: "Command",
            data: { command: "playfab-account.login", title: signInTitle }
        };

        const createAccountTitle: string = localize("playfab-account.commands.createAccountTitle", "Create a PlayFab account...");
        const createAccountEntry: ITreeNode = {
            name: "createAccount",
            type: "Command",
            data: { command: "playfab-account.createAccount", title: createAccountTitle }
        };

        return [
            signInEntry, createAccountEntry
        ];
    }

    private getCommandTreeItem(entry: ITreeNode): TreeItem {
        const command: Command = <Command>entry.data;
        const treeItem = new TreeItem(
            command.title,
            TreeItemCollapsibleState.None);
        treeItem.contextValue = 'command';
        treeItem.command = command;
        return treeItem;
    }

    private getStudioEntries(): ITreeNode[] {
        return this._rootData.map(
            (studio: Studio) => {
                let result: ITreeNode = {
                    name: studio.Name,
                    type: 'Studio',
                    data: studio
                }
                return result;
            });
    }

    private getStudioTreeItem(entry: ITreeNode): TreeItem {
        let studio: Studio = <Studio>entry.data;
        const treeItem = new TreeItem(
            entry.name,
            studio.Titles.length > 0 ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
        treeItem.contextValue = 'studio';
        return treeItem;
    }

    private getTitleTreeItem(entry: ITreeNode): TreeItem {
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

    private getStudioChildren(entry: TreeNode): ITreeNode[] {
        let studio: Studio = <Studio>entry.data;
        let titles: Title[] = studio.Titles;

        if (this.getConfigValue('sortTitlesAlphabetically')) {
            titles = studio.Titles.sort(PlayFabStudioTreeProvider.sortTitlesByName);
        }

        return titles.map((title: Title) => {
            let result = new TreeNode();
            result.name = title.Name;
            result.type = 'Title';
            result.data = title;
            return result;
        });
    }

    private getTitleChildren(entry: TreeNode): ITreeNode[] {
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