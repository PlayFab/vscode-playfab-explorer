//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as fs from "fs";
import * as path from "path";
import {
    commands, ExtensionContext, TextDocument, TextEditor,
    TreeView, window, Uri, workspace, WorkspaceConfiguration
} from 'vscode';
import { loadMessageBundle } from 'vscode-nls';

import { IPlayFabAccount } from './playfab-account.api';
import { PlayFabConfig } from './playfab-config';
import { IPlayFabConfig } from './playfab-config.api';
import { PlayFabStudioTreeProvider } from './playfab-treeprovider';
import { ITreeNode } from './playfab-treeprovider.api';

// Helper imports
import { GetLastPathPartFromUri, MapFromObject, EscapeValue, UnescapeValue } from './helpers/PlayFabDataHelpers';
import { IHttpClient, PlayFabHttpClient } from './helpers/PlayFabHttpHelper';
import { delay } from './helpers/PlayFabPromiseHelpers';
import { PlayFabUriHelpers } from './helpers/PlayFabUriHelpers';

// Model imports
import { GetEntityTokenRequest, GetEntityTokenResponse } from './models/PlayFabAuthenticationModels';
import {
    CloudScriptFile, GetCloudScriptRevisionRequest, GetCloudScriptRevisionResponse,
    UpdateCloudScriptRequest, UpdateCloudScriptResponse
} from './models/PlayFabClassicCloudScriptModels';
import {
    FunctionInfo, HttpFunctionInfo, ListFunctionsRequest, ListFunctionsResponse, ListHttpFunctionsResponse,
    ListQueuedFunctionsResponse, QueuedFunctionInfo, RegisterHttpFunctionRequest, RegisterQueuedFunctionRequest,
    RegisterFunctionResponse, UnregisterFunctionRequest, UnregisterFunctionResponse
} from './models/PlayFabCloudScriptModels';
import { EntityKey } from './models/PlayFabEntityModels';
import {
    CreateExperimentRequest, CreateExperimentResponse, DeleteExperimentRequest, DeleteExperimentResponse, Experiment,
    GetExperimentsRequest, GetExperimentsResponse, GetLatestScoreCardRequest, GetLatestScoreCardResponse,
    GetTreatmentAssignmentRequest, GetTreatmentAssignmentResponse, StartExperimentRequest, StopExperimentRequest,
    UpdateExperimentRequest, Variable, Variant
} from './models/PlayFabExperimentationModels'
import { ErrorResponse } from "./models/PlayFabHttpModels";
import { GetEntityProfileRequest, GetEntityProfileResponse } from './models/PlayFabProfileModels';
import { Studio } from './models/PlayFabStudioModels';
import {
    Title, CreateTitleRequest, CreateTitleResponse, GetTitleDataRequest, GetTitleDataResponse,
    SetTitleDataRequest, SetTitleDataResponse
} from './models/PlayFabTitleModels';

const localize = loadMessageBundle();

export interface IPlayFabExplorerInputGatherer {
    getUserInputForCreateExperiment(): Promise<CreateExperimentRequest>;
    getUserInputForCreateTitle(): Promise<CreateTitleRequest>;
    getUserInputForDeleteExperiment(): Promise<DeleteExperimentRequest>;
    getUserInputForGetCloudScriptRevision(): Promise<GetCloudScriptRevisionRequest>;
    getUserInputForGetEntityProfile(): Promise<GetEntityProfileRequest>;
    getUserInputForGetExperiments(): Promise<GetExperimentsRequest>;
    getUserInputForGetLatestScoreCard(): Promise<GetLatestScoreCardRequest>;
    getUserInputForGetTitleData(): Promise<GetTitleDataRequest>;
    getUserInputForGetTreatmentAssignment(): Promise<GetTreatmentAssignmentRequest>;
    getUserInputForListFunctions(): Promise<ListFunctionsRequest>;
    getUserInputForRegisterHttpFunction(): Promise<RegisterHttpFunctionRequest>;
    getUserInputForRegisterQueuedFunction(): Promise<RegisterQueuedFunctionRequest>;
    getUserInputForSetTitleData(): Promise<SetTitleDataRequest>;
    getUserInputForStartExperiment(): Promise<StartExperimentRequest>;
    getUserInputForStopExperiment(): Promise<StopExperimentRequest>;
    getUserInputForUpdateExperiment(): Promise<UpdateExperimentRequest>;
    getUserInputForUnregisterFunction(): Promise<UnregisterFunctionRequest>;
}

export class PlayFabExplorer {

    private _playFabLocalSettingsFileName: string = "playfab.local.settings.json";
    private _tmpdir: string = process.env.Temp || process.env.TMPDIR
    private _playFabLocalSettingsFilePath: string = path.join(this._tmpdir, this._playFabLocalSettingsFileName);
    private _explorer: TreeView<ITreeNode>;
    private _account: IPlayFabAccount;
    private _config: IPlayFabConfig;
    private _httpClient: IHttpClient;
    private _inputGatherer: IPlayFabExplorerInputGatherer;
    private _treeDataProvider: PlayFabStudioTreeProvider;

    constructor(account: IPlayFabAccount,
        inputGatherer: IPlayFabExplorerInputGatherer = new PlayFabExplorerUserInputGatherer(),
        httpClient: IHttpClient = new PlayFabHttpClient()) {

        this._account = account;
        this._httpClient = httpClient;
        this._inputGatherer = inputGatherer;
        this._config = new PlayFabConfig();
        let treeDataProvider = new PlayFabStudioTreeProvider(this._account, this._config);
        this._treeDataProvider = treeDataProvider;
        this._explorer = window.createTreeView('playfabExplorer', { treeDataProvider });
    }

    async createExperiment(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: CreateExperimentRequest = await this.getUserInputForCreateExperiment();

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.createExperimentPath,
            PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id),
            request,
            entityToken,
            (response: CreateExperimentResponse) => {
                window.showInformationMessage(`Experiment ${response.ExperimentId} created for title ${title.Name}`)
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async createTitle(studio: Studio): Promise<void> {
        let request: CreateTitleRequest = await this.getUserInputForCreateTitle();
        request.StudioId = studio.Id;
        request.DeveloperClientToken = this._account.getToken();

        await this._httpClient.makeApiCall(
            PlayFabUriHelpers.createTitlePath,
            PlayFabUriHelpers.GetPlayFabEditorBaseUrl(),
            request,
            (response: CreateTitleResponse) => {
                // NOOP
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });

        this._treeDataProvider.refresh();
    }

    async deleteExperiment(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: DeleteExperimentRequest = await this.getUserInputForDeleteExperiment();

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.deleteExperimentPath,
            PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id),
            request,
            entityToken,
            (response: DeleteExperimentResponse) => {
                window.showInformationMessage(`Experiment ${request.ExperimentId} deleted for title ${title.Name}`)
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async getExperiments(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: GetExperimentsRequest = await this.getUserInputForGetExperiments();

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.getExperimentsPath,
            PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id),
            request,
            entityToken,
            async (response: GetExperimentsResponse) => {
                let showTitleIds: boolean = this._config.getShowTitleIds();
                let doc: TextDocument = await workspace.openTextDocument({ language: 'markdown', content: this.getMarkDownForExperimentList(title, response.Experiments, showTitleIds) });
                await window.showTextDocument(doc);

                // TODO: Show experiments as part of the tree view, rather than in a markdown document?
                // THen have Create on the 'Experiments' node, and delete/update/state/stop etc. on the individual experiments
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async getLatestScoreCard(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: GetLatestScoreCardRequest = await this.getUserInputForGetLatestScoreCard();

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.getLastestScorecardPath,
            PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id),
            request,
            entityToken,
            (response: GetLatestScoreCardResponse) => {
                // TODO
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async getTreatmentAssignment(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: GetTreatmentAssignmentRequest = await this.getUserInputForGetTreatmentAssignment();

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.getTreatmentAssignmentPath,
            PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id),
            request,
            entityToken,
            (response: GetTreatmentAssignmentResponse) => {
                // TODO
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async startExperiment(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: StartExperimentRequest = await this.getUserInputForStartExperiment();

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.startExperimentPath,
            PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id),
            request,
            entityToken,
            () => {
                // TODO
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async stopExperiment(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: StartExperimentRequest = await this.getUserInputForStopExperiment();

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.stopExperimentPath,
            PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id),
            request,
            entityToken,
            () => {
                // TODO
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async updateExperiment(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: UpdateExperimentRequest = await this.getUserInputForUpdateExperiment();

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.updateExperimentPath,
            PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id),
            request,
            entityToken,
            () => {
                // TODO
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
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
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeTitleApiCall(
            PlayFabUriHelpers.getCloudScriptRevisionPath,
            baseUrl,
            request,
            title.SecretKey,
            async (response: GetCloudScriptRevisionResponse) => {
                if (response.Files.length > 0) {
                    let file: CloudScriptFile = response.Files[0];
                    let doc: TextDocument = await workspace.openTextDocument({ language: 'javascript', content: file.FileContents });
                    await window.showTextDocument(doc);
                    await window.showInformationMessage(localize('playfab-explorer.downloadedCloudScriptMessage', 'Downloaded CloudScript revision {0} for {1}', response.Revision, title.Name));
                }
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async listFunctions(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: ListFunctionsRequest = await this.getUserInputForListFunctions();
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.listFunctionsPath,
            baseUrl,
            request,
            entityToken,
            async (response: ListFunctionsResponse) => {
                let showTitleIds: boolean = this._config.getShowTitleIds();
                let doc: TextDocument = await workspace.openTextDocument({ language: 'markdown', content: this.getMarkDownForFunctionList(title, response.Functions, showTitleIds) });
                await window.showTextDocument(doc);
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async listHttpFunctions(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: ListFunctionsRequest = await this.getUserInputForListFunctions();
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.listHttpFunctionsPath,
            baseUrl,
            request,
            entityToken,
            async (response: ListHttpFunctionsResponse) => {
                let showTitleIds: boolean = this._config.getShowTitleIds();
                let doc: TextDocument = await workspace.openTextDocument({ language: 'markdown', content: this.getMarkDownForHttpFunctionList(title, response.Functions, showTitleIds) });
                await window.showTextDocument(doc);
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async listQueuedFunctions(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: ListFunctionsRequest = await this.getUserInputForListFunctions();
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.listQueuedFunctionsPath,
            baseUrl,
            request,
            entityToken,
            async (response: ListQueuedFunctionsResponse) => {
                let showTitleIds: boolean = this._config.getShowTitleIds();
                let doc: TextDocument = await workspace.openTextDocument({ language: 'markdown', content: this.getMarkDownForQueuedFunctionList(title, response.Functions, showTitleIds) });
                await window.showTextDocument(doc);
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async registerHttpFunction(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: RegisterHttpFunctionRequest = await this.getUserInputForRegisterHttpFunction();
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.registerHttpFunctionPath,
            baseUrl,
            request,
            entityToken,
            async (response: RegisterFunctionResponse) => {
                await window.showInformationMessage(localize('playfab-explorer.registeredFunctionMessage', 'Registered function {0} at {1}', request.FunctionName, request.FunctionUrl));
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async registerQueuedFunction(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: RegisterQueuedFunctionRequest = await this.getUserInputForRegisterQueuedFunction();
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.registerQueuedFunctionPath,
            baseUrl,
            request,
            entityToken,
            async (response: RegisterFunctionResponse) => {
                await window.showInformationMessage(localize('playfab-explorer.registeredFunctionMessage', 'Registered function {0} at {1}', request.FunctionName, request.QueueName));
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async unregisterFunction(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: UnregisterFunctionRequest = await this.getUserInputForUnregisterFunction();
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.unregisterFunctionPath,
            baseUrl,
            request,
            entityToken,
            async (response: UnregisterFunctionResponse) => {
                await window.showInformationMessage(localize('playfab-explorer.unRegisteredFunctionMessage', 'Unregistered function {0}', request.FunctionName));
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

        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeTitleApiCall(
            PlayFabUriHelpers.updateCloudScriptPath,
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

    async getEntityProfile(title: Title): Promise<void> {
        let entityToken: string = await this.getEntityToken(title);
        let request: GetEntityProfileRequest = await this.getUserInputForGetEntityProfile();
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

        await this._httpClient.makeEntityApiCall(
            PlayFabUriHelpers.getProfilePath,
            baseUrl,
            request,
            entityToken,
            async (response: GetEntityProfileResponse) => {
                const playfabConfig: WorkspaceConfiguration = workspace.getConfiguration('playfab');
                let spaces: number = playfabConfig.get<number>('jsonSpaces');

                let doc: TextDocument = await workspace.openTextDocument({ language: 'json', content: JSON.stringify(response.Profile, null, spaces) });
                await window.showTextDocument(doc);
            },
            (response: ErrorResponse) => {
                this.showError(response);
            });
    }

    async getTitleData(title: Title, path: string): Promise<void> {
        let request: GetTitleDataRequest = await this.getUserInputForGetTitleData();

        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

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
                    let spaces: number = playfabConfig.get<number>('jsonSpaces');

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
            await this.createTitle(await this.getStudioFromTreeNode(studioNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getTitleData', async (titleNode) => {
            await this.getTitleData(await this.getTitleFromTreeNode(titleNode), PlayFabUriHelpers.getTitleDataPath);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.setTitleData', async (titleNode) => {
            await this.setTitleData(await this.getTitleFromTreeNode(titleNode), PlayFabUriHelpers.setTitleDataPath);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getTitleInternalData', async (titleNode) => {
            await this.getTitleData(await this.getTitleFromTreeNode(titleNode), PlayFabUriHelpers.getTitleInternalDataPath);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.setTitleInternalData', async (titleNode) => {
            await this.setTitleData(await this.getTitleFromTreeNode(titleNode), PlayFabUriHelpers.setTitleInternalDataPath);
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getEntityProfile', async (titleNode) => {
            await this.getEntityProfile(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getCloudScriptRevision', async (titleNode) => {
            await this.getCloudScriptRevision(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.updateCloudScript', async (titleNode) => {
            await this.updateCloudScript(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.listFunctions', async (titleNode) => {
            await this.listFunctions(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.listHttpFunctions', async (titleNode) => {
            await this.listHttpFunctions(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.listQueuedFunctions', async (titleNode) => {
            await this.listQueuedFunctions(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.registerHttpFunction', async (titleNode) => {
            await this.registerHttpFunction(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.registerQueuedFunction', async (titleNode) => {
            await this.registerQueuedFunction(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.unregisterFunction', async (titleNode) => {
            await this.unregisterFunction(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.enableLocalDebugging', async () => await this.enableLocalDebugging()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.disableLocalDebugging', async () => await this.disableLocalDebugging()));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.openGameManagerPageForTitle', async (titleNode) => {
            let title: Title = await this.getTitleFromTreeNode(titleNode);
            commands.executeCommand('vscode.open', Uri.parse(PlayFabUriHelpers.GetGameManagerUrl(title.Id)));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.createExperiment', async (titleNode) => {
            await this.createExperiment(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.deleteExperiment', async (titleNode) => {
            await this.deleteExperiment(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getExperiments', async (titleNode) => {
            await this.getExperiments(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getLatestScoreCard', async (titleNode) => {
            await this.getLatestScoreCard(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.getTreatmentAssignment', async (titleNode) => {
            await this.getTreatmentAssignment(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.startExperiment', async (titleNode) => {
            await this.startExperiment(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.stopExperiment', async (titleNode) => {
            await this.stopExperiment(await this.getTitleFromTreeNode(titleNode));
        }));
        context.subscriptions.push(commands.registerCommand('playfabExplorer.updateExperiment', async (titleNode) => {
            await this.updateExperiment(await this.getTitleFromTreeNode(titleNode));
        }));
    }

    private async getEntityToken(title: Title): Promise<string> {
        let tokenRequest: GetEntityTokenRequest = {
            Context: null,
            CustomTags: null
        };

        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);
        let entityToken: string = null;
        await this._httpClient.makeTitleApiCall(
            PlayFabUriHelpers.getEntityTokenPath,
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

    private getListMarkDown(newline: string, header: string, columns: string[]): string {

        let result: string = '# ';
        result += header;
        result += newline;

        let columnHeaders: string = '';
        let columnHeader: string = '---';
        let initialDelimiter: string = '| ';
        let intermediateDelimiter: string = ' | ';
        let finalDelimiter: string = ' |';

        for (var index: number = 0; index < columns.length; ++index) {
            if (index == 0) {
                result += initialDelimiter;
                columnHeaders += initialDelimiter;
            }

            result += columns[index];
            columnHeaders += columnHeader;

            if (index == columns.length - 1) {
                result += finalDelimiter;
                columnHeaders += finalDelimiter;
            }
            else {
                result += intermediateDelimiter;
                columnHeaders += intermediateDelimiter;
            }
        }

        result += newline;
        result += columnHeaders;
        result += newline;

        return result;
    }

    private getMarkDownForExperimentList(title: Title, experiments: Experiment[], showTitleIds: boolean): string {

        let newline: string = this.getNewLineForCurrentPlatform();
        let header: string = localize('playfab-explorer.experimentListHeader', 'List Of Experiments for {0}', title.Name);

        if (showTitleIds) {
            header = `${header} (${title.Id})`
        }

        let columns: string[] = [
            localize('playfab-explorer.experimentListNameColumn', 'Name'),
            localize('playfab-explorer.experimentListIdColumn', 'Id'),
            localize('playfab-explorer.experimentListDescriptionColumn', 'Description'),
            localize('playfab-explorer.experimentListStartDateColumn', 'Start Date'),
            localize('playfab-explorer.experimentListEndDateColumn', 'End Date'),
            localize('playfab-explorer.experimentListSegmentIdColumn', 'Segment Id'),
            localize('playfab-explorer.experimentListTypeColumn', 'Type'),
            localize('playfab-explorer.experimentListStateColumn', 'State'),
        ];
        let result: string = this.getListMarkDown(newline, header, columns);

        experiments.forEach((experiment: Experiment) => {
            result += `| ${experiment.Name} | ${experiment.Id} | ${experiment.Description} | ${experiment.StartDate} | ${experiment.EndDate} | ${experiment.SegmentId} | ${experiment.ExperimentType} | ${experiment.State} |`;
            result += newline;
        });

        return result;
    }

    private getMarkDownForFunctionList(title: Title, functions: FunctionInfo[], showTitleIds: boolean): string {

        let newline: string = this.getNewLineForCurrentPlatform();
        let header: string = localize('playfab-explorer.functionListHeader', 'List Of Functions for {0}', title.Name);

        if (showTitleIds) {
            header = `${header} (${title.Id})`
        }

        let columns: string[] = [localize('playfab-explorer.functionListNameColumn', 'Name'), localize('playfab-explorer.functionListAddressColumn', 'Address')];
        let result: string = this.getListMarkDown(newline, header, columns);

        functions.forEach((fnInfo: FunctionInfo) => {
            result += `| ${fnInfo.FunctionName} | ${fnInfo.FunctionAddress} |`;
            result += newline;
        });

        return result;
    }

    private getMarkDownForHttpFunctionList(title: Title, functions: HttpFunctionInfo[], showTitleIds: boolean): string {

        let newline: string = this.getNewLineForCurrentPlatform();
        let header: string = localize('playfab-explorer.functionListHTTPHeader', 'List Of HTTP Functions for {0}', title.Name);

        if (showTitleIds) {
            header = `${header} (${title.Id})`
        }

        let columns: string[] = [localize('playfab-explorer.functionListNameColumn', 'Name'), localize('playfab-explorer.functionListUrlColumn', 'Url')];
        let result: string = this.getListMarkDown(newline, header, columns);

        functions.forEach((fnInfo: HttpFunctionInfo) => {
            result += `| ${fnInfo.FunctionName} | ${fnInfo.FunctionUrl} |`;
            result += newline;
        });

        return result;
    }

    private getMarkDownForQueuedFunctionList(title: Title, functions: QueuedFunctionInfo[], showTitleIds: boolean): string {

        let newline: string = this.getNewLineForCurrentPlatform();
        let header: string = localize('playfab-explorer.functionListQueuedHeader', 'List Of Queued Functions for {0}', title.Name);

        if (showTitleIds) {
            header = `${header} (${title.Id})`
        }

        let columns: string[] = [localize('playfab-explorer.functionListNameColumn', 'Name'), localize('playfab-explorer.functionListQueueColumn', 'Queue'), localize('playfab-explorer.functionListConnectionStringColumn', 'Connection String')];
        let result: string = this.getListMarkDown(newline, header, columns);

        functions.forEach((fnInfo: QueuedFunctionInfo) => {
            result += `| ${fnInfo.FunctionName} | ${fnInfo.QueueName} | ${fnInfo.ConnectionString} |`;
            result += newline;
        });

        return result;
    }

    private getNewLineForCurrentPlatform(): string {
        return process.platform == 'win32' ? '\r\n' : '\n';
    }

    private async getStudioTreeNodeFromUser(): Promise<ITreeNode> {
        return await this.getTreeNodeFromUser(null, localize('playfab-explorer.chooseStudio', 'Please choose a Studio'));
    }

    private async getStudioFromTreeNode(studioNode: ITreeNode): Promise<Studio> {
        return (studioNode || await await this.getStudioTreeNodeFromUser()).data as Studio;
    }

    private async getTitleFromTreeNode(titleNode: ITreeNode): Promise<Title> {
        return (titleNode || await this.getTitleTreeNodeFromUser(await this.getStudioTreeNodeFromUser())).data as Title;
    }

    private async getTitleTreeNodeFromUser(studioTreeNode: ITreeNode): Promise<ITreeNode> {
        return await this.getTreeNodeFromUser(studioTreeNode, localize('playfab-explorer.chooseTitle', 'Please choose a Title'));
    }

    private async getTreeNodeFromUser(rootTreeNode: ITreeNode, placeHolder: string) {
        let nodes: ITreeNode[] = await this._treeDataProvider.getChildren(rootTreeNode);
        let names: string[] = nodes.map((node) => node.name);
        const name: string = await window.showQuickPick(names, { placeHolder: placeHolder });
        return nodes.find((value: ITreeNode) => value.name === name);
    }

    private async getUserInputForCreateExperiment(): Promise<CreateExperimentRequest> {
        return await this._inputGatherer.getUserInputForCreateExperiment();
    }

    private async getUserInputForCreateTitle(): Promise<CreateTitleRequest> {
        return await this._inputGatherer.getUserInputForCreateTitle();
    }

    private async getUserInputForGetCloudScriptRevision(): Promise<GetCloudScriptRevisionRequest> {
        return await this._inputGatherer.getUserInputForGetCloudScriptRevision();
    }

    private async getUserInputForDeleteExperiment(): Promise<DeleteExperimentRequest> {
        return await this._inputGatherer.getUserInputForDeleteExperiment();
    }

    private async getUserInputForGetEntityProfile(): Promise<GetEntityProfileRequest> {
        return await this._inputGatherer.getUserInputForGetEntityProfile();
    }

    private async getUserInputForGetExperiments(): Promise<GetExperimentsRequest> {
        return await this._inputGatherer.getUserInputForGetExperiments();
    }

    private async getUserInputForGetLatestScoreCard(): Promise<GetLatestScoreCardRequest> {
        return await this._inputGatherer.getUserInputForGetLatestScoreCard();
    }

    private async getUserInputForGetTitleData(): Promise<GetTitleDataRequest> {
        return await this._inputGatherer.getUserInputForGetTitleData();
    }

    private async getUserInputForGetTreatmentAssignment(): Promise<GetTreatmentAssignmentRequest> {
        return await this._inputGatherer.getUserInputForGetTreatmentAssignment();
    }

    private async getUserInputForListFunctions(): Promise<ListFunctionsRequest> {
        return await this._inputGatherer.getUserInputForListFunctions();
    }

    private async getUserInputForRegisterHttpFunction(): Promise<RegisterHttpFunctionRequest> {
        return await this._inputGatherer.getUserInputForRegisterHttpFunction();
    }

    private async getUserInputForRegisterQueuedFunction(): Promise<RegisterQueuedFunctionRequest> {
        return await this._inputGatherer.getUserInputForRegisterQueuedFunction();
    }

    private async getUserInputForSetTitleData(): Promise<SetTitleDataRequest> {
        return await this._inputGatherer.getUserInputForSetTitleData();
    }

    private async getUserInputForStartExperiment(): Promise<StartExperimentRequest> {
        return await this._inputGatherer.getUserInputForStartExperiment();
    }

    private async getUserInputForStopExperiment(): Promise<StopExperimentRequest> {
        return await this._inputGatherer.getUserInputForStopExperiment();
    }

    private async getUserInputForUnregisterFunction(): Promise<UnregisterFunctionRequest> {
        return await this._inputGatherer.getUserInputForUnregisterFunction();
    }

    private async getUserInputForUpdateExperiment(): Promise<UpdateExperimentRequest> {
        return await this._inputGatherer.getUserInputForUpdateExperiment();
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
        let baseUrl: string = PlayFabUriHelpers.GetPlayFabBaseUrl(title.Id);

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

    public async getUserInputForCreateExperiment(): Promise<CreateExperimentRequest> {
        const millisecondsPerDay: number = 1000 * 60 * 60 * 24;
        const experimentNameValue: string = localize('playfab-explorer.experimentNameValue', 'Experiment Name');
        const experimentNamePrompt: string = localize('playfab-explorer.experimentNamePrompt', 'Please enter the name of your experiment');

        const experimentName = await window.showInputBox({
            value: experimentNameValue,
            prompt: experimentNamePrompt
        });

        const experimentDescriptionValue: string = localize('playfab-explorer.experimentDescriptionValue', 'Experiment Description');
        const experimentDescriptionPrompt: string = localize('playfab-explorer.experimentDescriptionPrompt', 'Please enter a description for your experiment');

        const experimentDescription = await window.showInputBox({
            value: experimentDescriptionValue,
            prompt: experimentDescriptionPrompt
        });

        const experimentDurationValue: string = localize('playfab-explorer.experimentDurationValue', '7');
        const experimentDurationPrompt: string = localize('playfab-explorer.experimentDurationPrompt', 'Please enter a duration for your experiment, in days, between 1 and 21');

        const experimentDurationStr = await window.showInputBox({
            value: experimentDurationValue,
            prompt: experimentDurationPrompt
        });

        const experimentDuration: number = Math.max(7, Math.min(21, parseInt(experimentDurationStr)));

        // Get number of variants 
        const experimentVariantCountValue: string = localize('playfab-explorer.experimentVariantCountValue', '1');
        const experimentVariantCountPrompt: string = localize('playfab-explorer.experimentVariantCountPrompt', 'Please enter the number of variants for your experiment, between 1 and 10');

        const experimentVariantCountStr = await window.showInputBox({
            value: experimentVariantCountValue,
            prompt: experimentVariantCountPrompt
        });

        const experimentVariantCount: number = Math.max(1, Math.min(10, parseInt(experimentVariantCountStr)));

        // Get variants
        var variants: Variant[] = new Array<Variant>();

        for (var i = 0; i < experimentVariantCount; i++) {
            var variant = await this.getUserInputForVariant();
            variants.push(variant);
        }

        let request = new CreateExperimentRequest();
        request.Name = experimentName;
        request.Description = experimentDescription;

        var start = new Date();
        var end = new Date(start.getTime() + (millisecondsPerDay * experimentDuration));
        request.StartDate = start.toISOString();
        request.EndDate = end.toISOString();
        request.Variants = variants;

        return request;
    }

    public async getUserInputForDeleteExperiment(): Promise<DeleteExperimentRequest> {
        // TODO: Get user input

        let request = new DeleteExperimentRequest();

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

    public async getUserInputForGetEntityProfile(): Promise<GetEntityProfileRequest> {
        const entityTypePrompt: string = localize('playfab-explorer.entityTypePrompt', 'Please choose an entity type.');
        const entityIdPrompt: string = localize('playfab-explorer.entityIdPrompt', 'Please enter an entity id.');

        const entityType: string = await window.showQuickPick(
            ["namespace", "title", "master_player_account", "title_player_account", "character", "group", "service", "cloud_root"],
            { placeHolder: entityTypePrompt });

        const entityId: string = await window.showInputBox({
            prompt: entityIdPrompt
        });

        let request = new GetEntityProfileRequest();
        request.Entity = new EntityKey();
        request.Entity.Id = entityId;
        request.Entity.Type = entityType;
        request.DataAsObject = true;
        return request;
    }

    public async getUserInputForGetExperiments(): Promise<GetExperimentsRequest> {
        let request = new GetExperimentsRequest();

        return request;
    }

    public async getUserInputForGetLatestScoreCard(): Promise<GetLatestScoreCardRequest> {
        // TODO: Get user input

        let request = new GetLatestScoreCardRequest();

        return request;
    }

    public async getUserInputForGetTreatmentAssignment(): Promise<GetTreatmentAssignmentRequest> {
        // TODO: Get user input

        let request = new GetTreatmentAssignmentRequest();

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
        let request: ListFunctionsRequest = {
        };

        return request;
    }

    public async getUserInputForRegisterHttpFunction(): Promise<RegisterHttpFunctionRequest> {
        const functionUriValue: string = localize('playfab-explorer.functionUriValue', 'Function URL');
        const functionUriPrompt: string = localize('playfab-explorer.functionUriPrompt', 'Please enter the URL of the function.');

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

        let request: RegisterHttpFunctionRequest = {
            FunctionName: functionName,
            FunctionUrl: functionUri
        };

        return request;
    }

    public async getUserInputForRegisterQueuedFunction(): Promise<RegisterQueuedFunctionRequest> {
        const queueNameValue: string = localize('playfab-explorer.queueNameValue', 'Queue Name');
        const queueNamePrompt: string = localize('playfab-explorer.queueNamePrompt', 'Please enter the QueueName for the function.');

        const queueName = await window.showInputBox({
            value: queueNameValue,
            prompt: queueNamePrompt
        });

        const connectionStringValue: string = localize('playfab-explorer.connectionStringValue', 'Connection String');
        const connectionStringPrompt: string = localize('playfab-explorer.connectionStringPrompt', 'Please enter the Connection String for the queue.');

        const connectionString = await window.showInputBox({
            value: connectionStringValue,
            prompt: connectionStringPrompt
        });

        const functionNameValue: string = localize('playfab-explorer.functionNameValue', 'Function Name');
        const functionNamePrompt: string = localize('playfab-explorer.functionNamePrompt', 'Please enter the function name');

        const functionName = await window.showInputBox({
            value: functionNameValue,
            prompt: functionNamePrompt
        });

        let request: RegisterQueuedFunctionRequest = {
            FunctionName: functionName,
            QueueName: queueName,
            ConnectionString: connectionString
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

    public async getUserInputForStartExperiment(): Promise<StartExperimentRequest> {
        // TODO: Get user input

        let request = new StartExperimentRequest();

        return request;
    }

    public async getUserInputForStopExperiment(): Promise<StopExperimentRequest> {
        // TODO: Get user input

        let request = new StopExperimentRequest();

        return request;
    }

    public async getUserInputForUpdateExperiment(): Promise<UpdateExperimentRequest> {
        // TODO: Get user input

        let request = new UpdateExperimentRequest();

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

    private async getUserInputForVariant(): Promise<Variant> {
        const variantNameValue: string = localize('playfab-explorer.variantNameValue', 'Variant1');
        const variantNamePrompt: string = localize('playfab-explorer.variantNamePrompt', 'Please enter the variant name');

        const variantName = await window.showInputBox({
            value: variantNameValue,
            prompt: variantNamePrompt
        });

        const variantDescriptionValue: string = localize('playfab-explorer.variantDescriptionValue', '');
        const variantDescriptionPrompt: string = localize('playfab-explorer.variantDescriptionPrompt', 'Please enter the variant description');

        const variantDescription = await window.showInputBox({
            value: variantDescriptionValue,
            prompt: variantDescriptionPrompt
        });

        const variantTrafficPercentageValue: string = localize('playfab-explorer.variantTrafficPercentageValue', '50');
        const variantTrafficPercentagePrompt: string = localize('playfab-explorer.variantDescriptionPrompt', 'Please enter the variant percentage');

        const variantTrafficPercentageStr = await window.showInputBox({
            value: variantTrafficPercentageValue,
            prompt: variantTrafficPercentagePrompt
        });

        const variantTrafficPercentage: number = Math.max(1, Math.min(100, parseInt(variantTrafficPercentageStr)));

        const variantIsControlValue: string = localize('playfab-explorer.variantIsControlValue', 'false');
        const variantIsControlPrompt: string = localize('playfab-explorer.variantIsControlPrompt', 'Please choose whether the variant is a control variant');

        const variantIsControlStr = await window.showInputBox({
            value: variantIsControlValue,
            prompt: variantIsControlPrompt
        });

        const variantIsControl: boolean = variantIsControlStr === 'true'

        // Get number of variables
        const variantVariableCountValue: string = localize('playfab-explorer.variantVariableCountValue', '1');
        const variantVariableCountPrompt: string = localize('playfab-explorer.variantVariableCountPrompt', 'Please enter the number of variables for the variant, between 1 and 10');

        const variantVariableCountStr = await window.showInputBox({
            value: variantVariableCountValue,
            prompt: variantVariableCountPrompt
        });

        const variantVariableCount: number = Math.max(1, Math.min(10, parseInt(variantVariableCountStr)));

        // Get variables
        var variables: Variable[] = new Array<Variable>();

        for(var i=0;i<variantVariableCount;i++) {
            var variable = await this.getUserInputForVariable();
            variables.push(variable);
        }

        let variant: Variant = {
            Id: '',
            Name: variantName,
            Description: variantDescription,
            IsControl: variantIsControl,
            TrafficPercentage: variantTrafficPercentage,
            TitleDataOverrideLabel: '',
            Variables: variables
        };

        // For each variable
        // Get variable name
        // Get variable value   
        return variant;
    }

    async getUserInputForVariable() : Promise<Variable> {
        const variableNameValue: string = localize('playfab-explorer.variableNameValue', 'Variable1');
        const variableNamePrompt: string = localize('playfab-explorer.variableNamePrompt', 'Please enter the variable name');

        const variableName = await window.showInputBox({
            value: variableNameValue,
            prompt: variableNamePrompt
        });

        const variableValueValue: string = localize('playfab-explorer.variableValueValue', '');
        const variableValuePrompt: string = localize('playfab-explorer.variableValuePrompt', 'Please enter the variable value');

        const variableValue = await window.showInputBox({
            value: variableValueValue,
            prompt: variableValuePrompt
        });

        let variable: Variable = {
            Name: variableName,
            Value: variableValue
        }

        return variable;
    }
}