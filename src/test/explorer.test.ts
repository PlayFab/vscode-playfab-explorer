//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as assert from 'assert'
import * as Moq from 'typemoq'
import { PlayFabAccount } from '../playfab-account.api';
import { IPlayFabExplorerInputGatherer, PlayFabExplorer } from '../playfab-explorer'
import { MapFromObject } from '../helpers/PlayFabDataHelpers'
import { IHttpClient } from '../helpers/PlayFabHttpHelper'
import { PlayFabUriConstants } from '../helpers/PlayFabUriConstants';
import { GetEntityTokenRequest, GetEntityTokenResponse } from '../models/PlayFabAuthenticationModels';
import {
  ListFunctionsRequest, ListFunctionsResponse, RegisterFunctionRequest,
  RegisterFunctionResponse, UnregisterFunctionRequest, UnregisterFunctionResponse
} from '../models/PlayFabCloudScriptModels'
import { ErrorResponse } from '../models/PlayFabHttpModels';
import {
  GetCloudScriptRevisionRequest, GetCloudScriptRevisionResponse, UpdateCloudScriptRequest,
  UpdateCloudScriptResponse
} from '../models/PlayFabLegacyCloudScriptModels'
import { Studio } from '../models/PlayFabStudioModels';
import {
  CreateTitleRequest, CreateTitleResponse, GetTitleDataRequest, GetTitleDataResponse,
  SetTitleDataRequest, SetTitleDataResponse, Title
} from '../models/PlayFabTitleModels'
import { workspace, TextDocument, window } from 'vscode';

suite('Explorer Tests', function () {

  let inputGatherer: Moq.IMock<IPlayFabExplorerInputGatherer> = Moq.Mock.ofType<IPlayFabExplorerInputGatherer>();
  let createTitleInputCount: number = 0;
  inputGatherer.setup(x => x.getUserInputForCreateTitle())
    .returns(async () => {
      createTitleInputCount++;
      let result: CreateTitleRequest = {
        Name: "TitleName",
        StudioId: "StudioID",
        DeveloperClientToken: "abcdef"
      };
      return result;
    });

  let getCloudScriptRevisionInputCount: number = 0;
  inputGatherer.setup(x => x.getUserInputForGetCloudScriptRevision())
    .returns(async () => {
      getCloudScriptRevisionInputCount++;
      let result: GetCloudScriptRevisionRequest = {
        Revision: null,
        Version: null
      };
      return result;
    });

  let getTitleDataInputCount: number = 0;
  inputGatherer.setup(x => x.getUserInputForGetTitleData())
    .returns(async () => {
      getTitleDataInputCount++;
      let result: GetTitleDataRequest = {
        Keys: ["a", "b", "c"]
      };
      return result;
    });

  let setTitleDataInputCount: number = 0;
  inputGatherer.setup(x => x.getUserInputForSetTitleData())
    .returns(async () => {
      setTitleDataInputCount++;
      let result: SetTitleDataRequest = {
        Key: "a",
        Value: "1"
      };
      return result;
    });

  let listFunctionsInputCount: number = 0;
  inputGatherer.setup(x => x.getUserInputForListFunctions())
    .returns(async () => {
      listFunctionsInputCount++;
      let result: ListFunctionsRequest = {
        TriggerType: "Http",
        InvocationSource: "Http"
      };
      return result;
    });

  let registerFunctionInputCount: number = 0;
  inputGatherer.setup(x => x.getUserInputForRegisterFunction())
    .returns(async () => {
      registerFunctionInputCount++;
      let result: RegisterFunctionRequest = {
        FunctionName: "Fn1",
        FunctionUrl: "https://some.func"
      };
      return result;
    });

  let unregisterFunctionInputCount: number = 0;
  inputGatherer.setup(x => x.getUserInputForUnregisterFunction())
    .returns(async () => {
      unregisterFunctionInputCount++;
      let result: UnregisterFunctionRequest = {
        FunctionName: "Fn1",
      };
      return result;
    });

  let title: Title = {
    Id: "AAAA",
    Name: "FunGame",
    SecretKey: "abcd",
    GameManagerUrl: ""
  };

  let titleData: Map<string, string> = MapFromObject({
    a: "1",
    b: "2",
    c: "3"
  });

  let httpCli: Moq.IMock<IHttpClient> = Moq.Mock.ofType<IHttpClient>();
  let createTitleHttpCount: number = 0;
  httpCli.setup(x => x.makeApiCall(
    Moq.It.isValue(PlayFabUriConstants.createTitlePath),
    Moq.It.isAnyString(),
    Moq.It.is<CreateTitleRequest>(x => true),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: CreateTitleRequest,
        successCallback: (response: CreateTitleResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        createTitleHttpCount++;
        let response: CreateTitleResponse = {
          Title: title
        };
        successCallback(response);
        return;
      });

  let getCloudScriptRevisionHttpCount: number = 0;
  httpCli.setup(x => x.makeTitleApiCall(
    Moq.It.isValue(PlayFabUriConstants.getCloudScriptRevisionPath),
    Moq.It.isAnyString(),
    Moq.It.is<GetCloudScriptRevisionRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: GetCloudScriptRevisionRequest,
        key: string,
        successCallback: (response: GetCloudScriptRevisionResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        getCloudScriptRevisionHttpCount++;
        let response: GetCloudScriptRevisionResponse = {
          CreatedAt: null,
          Files: [],
          Revision: 1,
          Version: 1,
          IsPublished: true
        };
        successCallback(response);
        return;
      });

  let updateCloudScriptHttpCount: number = 0;
  httpCli.setup(x => x.makeTitleApiCall(
    Moq.It.isValue(PlayFabUriConstants.updateCloudScriptPath),
    Moq.It.isAnyString(),
    Moq.It.is<UpdateCloudScriptRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: UpdateCloudScriptRequest,
        key: string,
        successCallback: (response: UpdateCloudScriptResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        updateCloudScriptHttpCount++;
        let response: UpdateCloudScriptResponse = {
          Revision: 1,
          Version: 1
        };
        successCallback(response);
        return;
      });

  let getTitleDataHttpCount: number = 0;
  httpCli.setup(x => x.makeTitleApiCall(
    Moq.It.isValue(PlayFabUriConstants.getTitleDataPath),
    Moq.It.isAnyString(),
    Moq.It.is<GetTitleDataRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: GetTitleDataRequest,
        key: string,
        successCallback: (response: GetTitleDataResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        getTitleDataHttpCount++;
        let response: GetTitleDataResponse = {
          Data: titleData
        };
        successCallback(response);
        return;
      });

  let getTitleInternalDataHttpCount: number = 0;
  httpCli.setup(x => x.makeTitleApiCall(
    Moq.It.isValue(PlayFabUriConstants.getTitleInternalDataPath),
    Moq.It.isAnyString(),
    Moq.It.is<GetTitleDataRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: GetTitleDataRequest,
        key: string,
        successCallback: (response: GetTitleDataResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        getTitleInternalDataHttpCount++;
        let response: GetTitleDataResponse = {
          Data: titleData
        };
        successCallback(response);
        return;
      });

  let setTitleDataHttpCount: number = 0;
  httpCli.setup(x => x.makeTitleApiCall(
    Moq.It.isValue(PlayFabUriConstants.setTitleDataPath),
    Moq.It.isAnyString(),
    Moq.It.is<SetTitleDataRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: SetTitleDataRequest,
        key: string,
        successCallback: (response: SetTitleDataResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        setTitleDataHttpCount++;
        let response: SetTitleDataResponse = {
        };
        successCallback(response);
        return;
      });

  let setTitleInternalDataHttpCount: number = 0;
  httpCli.setup(x => x.makeTitleApiCall(
    Moq.It.isValue(PlayFabUriConstants.setTitleInternalDataPath),
    Moq.It.isAnyString(),
    Moq.It.is<SetTitleDataRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: SetTitleDataRequest,
        key: string,
        successCallback: (response: SetTitleDataResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        setTitleInternalDataHttpCount++;
        let response: SetTitleDataResponse = {
        };
        successCallback(response);
        return;
      });

  let getEntityTokenHttpCount: number = 0;
  httpCli.setup(x => x.makeTitleApiCall(
    Moq.It.isValue(PlayFabUriConstants.getEntityTokenPath),
    Moq.It.isAnyString(),
    Moq.It.is<GetEntityTokenRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: GetEntityTokenRequest,
        secret: string,
        successCallback: (response: GetEntityTokenResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        getEntityTokenHttpCount++;
        let response: GetEntityTokenResponse = {
          EntityToken: "abcd",
          TokenExpiration: null
        };
        successCallback(response);
        return;
      });

  let listFunctionsHttpCount: number = 0;
  httpCli.setup(x => x.makeEntityApiCall(
    Moq.It.isValue(PlayFabUriConstants.listFunctionsPath),
    Moq.It.isAnyString(),
    Moq.It.is<ListFunctionsRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: ListFunctionsRequest,
        key: string,
        successCallback: (response: ListFunctionsResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        listFunctionsHttpCount++;
        let response: ListFunctionsResponse = {
          Functions: [
            {
              FunctionName: "Fn1",
              FunctionUrl: "https://some.func",
              TriggerType: "Http",
              InvocationSource: "Http"
            },
            {
              FunctionName: "Fn2",
              FunctionUrl: "https://someother.func",
              TriggerType: "Http",
              InvocationSource: "Http"
            },
          ]
        };
        successCallback(response);
        return;
      });


  let registerFunctionHttpCount: number = 0;
  httpCli.setup(x => x.makeEntityApiCall(
    Moq.It.isValue(PlayFabUriConstants.registerFunctionPath),
    Moq.It.isAnyString(),
    Moq.It.is<RegisterFunctionRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: RegisterFunctionRequest,
        key: string,
        successCallback: (response: RegisterFunctionResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        registerFunctionHttpCount++;
        let response: RegisterFunctionResponse = {
        };
        successCallback(response);
        return;
      });

  let unregisterFunctionHttpCount: number = 0;
  httpCli.setup(x => x.makeEntityApiCall(
    Moq.It.isValue(PlayFabUriConstants.unregisterFunctionPath),
    Moq.It.isAnyString(),
    Moq.It.is<UnregisterFunctionRequest>(x => true),
    Moq.It.isAnyString(),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: UnregisterFunctionRequest,
        key: string,
        successCallback: (response: UnregisterFunctionResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        unregisterFunctionHttpCount++;
        let response: UnregisterFunctionResponse = {
        };
        successCallback(response);
        return;
      });

  let account: Moq.IMock<PlayFabAccount> = Moq.Mock.ofType<PlayFabAccount>();
  account.setup(x => x.getToken()).returns(() => { return "abc123" });

  // Defines a Mocha unit test
  test('CreateTitle', async function () {

    let studio: Studio = {
      Name: "Small And Fast",
      Id: "FFFF",
      Titles: []
    };

    let expectedInputCount: number = createTitleInputCount + 1;
    let expectedHttpCount: number = createTitleHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.createTitle(studio);

    assert(createTitleInputCount === expectedInputCount, `Expected ${expectedInputCount} input calls for CreateTitle, got ${createTitleInputCount}`);
    assert(createTitleHttpCount === expectedHttpCount, `Expected ${expectedHttpCount} HTTP calls for CreateTitle, got ${createTitleHttpCount}`);
  });

  test('GetCloudScriptRevision', async function () {
    let expectedInputCount: number = getCloudScriptRevisionInputCount + 1;
    let expectedHttpCount: number = getCloudScriptRevisionHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.getCloudScriptRevision(title);

    assert(getCloudScriptRevisionInputCount === expectedInputCount, `Expected single input call for GetCloudScriptRevision, got ${getCloudScriptRevisionInputCount}`);
    assert(getCloudScriptRevisionHttpCount === expectedHttpCount, `Expected single HTTP call for GetCloudScriptRevision, got ${getCloudScriptRevisionHttpCount}`);
  });

  test('UpdateCloudScript', async function () {
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);

    // Open a dummy Javascript document
    let doc: TextDocument = await workspace.openTextDocument({ language: 'javascript', content: "" });
    await window.showTextDocument(doc);

    // Update
    await explorer.updateCloudScript(title);

    assert(updateCloudScriptHttpCount === 1, `Expected single HTTP call for updateCloudScript, got ${updateCloudScriptHttpCount}`);
  });

  test('GetTitleData', async function () {
    let expectedInputCount: number = getTitleDataInputCount + 1;
    let expectedHttpCount: number = getTitleDataHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.getTitleData(title, PlayFabUriConstants.getTitleDataPath);

    assert(getTitleDataInputCount === expectedInputCount, `Expected single input call for GetTitleData, got ${getTitleDataInputCount - expectedInputCount + 1}`);
    assert(getTitleDataHttpCount === expectedHttpCount, `Expected single HTTP call for GetTitleData, got ${getTitleDataHttpCount - expectedHttpCount + 1}`);
  });

  test('SetTitleData', async function () {
    let expectedInputCount: number = setTitleDataInputCount + 1;
    let expectedHttpCount: number = setTitleDataHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.setTitleData(title, PlayFabUriConstants.setTitleDataPath);

    assert(setTitleDataInputCount === expectedInputCount, `Expected single input call for SetTitleData, got ${setTitleDataInputCount - expectedInputCount + 1}`);
    assert(setTitleDataHttpCount === expectedHttpCount, `Expected single HTTP call for SetTitleData, got ${setTitleDataHttpCount - expectedHttpCount + 1}`);
  });

  test('GetTitleInternalData', async function () {
    let expectedInputCount: number = getTitleDataInputCount + 1;
    let expectedHttpCount: number = getTitleInternalDataHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.getTitleData(title, PlayFabUriConstants.getTitleInternalDataPath);

    assert(getTitleDataInputCount === expectedInputCount, `Expected single input call for GetTitleInternalData, got ${getTitleDataInputCount - expectedInputCount + 1}`);
    assert(getTitleInternalDataHttpCount === expectedHttpCount, `Expected single HTTP call for GetTitleInternalData, got ${getTitleInternalDataHttpCount - expectedHttpCount + 1}`);
  });

  test('SetTitleInternalData', async function () {
    let expectedInputCount: number = setTitleDataInputCount + 1;
    let expectedHttpCount: number = setTitleInternalDataHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.setTitleData(title, PlayFabUriConstants.setTitleInternalDataPath);

    assert(setTitleDataInputCount === expectedInputCount, `Expected single input call for SetTitleInternalData, got ${setTitleDataInputCount - expectedInputCount + 1}`);
    assert(setTitleInternalDataHttpCount === expectedHttpCount, `Expected single HTTP call for SetTitleInternalData, got ${setTitleInternalDataHttpCount - expectedHttpCount + 1}`);
  });

  test('ListFunctions', async function () {
    let expectedInputCount: number = listFunctionsInputCount + 1;
    let expectedGetEntityTokenHttpCount: number = getEntityTokenHttpCount + 1;
    let expectedListFunctionsHttpCount: number = listFunctionsHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.listFunctions(title);

    assert(listFunctionsInputCount === expectedInputCount, `Expected single input call for ListFunctions, got ${listFunctionsInputCount - expectedInputCount + 1}`);
    assert(getEntityTokenHttpCount === expectedGetEntityTokenHttpCount, `Expected single HTTP call for GetEntityToken, got ${getEntityTokenHttpCount - expectedGetEntityTokenHttpCount + 1}`);
    assert(listFunctionsHttpCount === expectedListFunctionsHttpCount, `Expected single HTTP call for ListFunctions, got ${listFunctionsHttpCount - expectedListFunctionsHttpCount + 1}`);
  });

  test('RegisterFunction', async function () {
    let expectedInputCount: number = registerFunctionInputCount + 1;
    let expectedGetEntityTokenHttpCount: number = getEntityTokenHttpCount + 1;
    let expectedRegisterFunctionHttpCount: number = registerFunctionHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.registerFunction(title);

    assert(registerFunctionInputCount === expectedInputCount, `Expected single input call for RegisterFunction, got ${registerFunctionInputCount - expectedInputCount + 1}`);
    assert(getEntityTokenHttpCount === expectedGetEntityTokenHttpCount, `Expected single HTTP call for GetEntityToken, got ${getEntityTokenHttpCount - expectedGetEntityTokenHttpCount + 1}`);
    assert(registerFunctionHttpCount === expectedRegisterFunctionHttpCount, `Expected single HTTP call for RegisterFunction, got ${registerFunctionHttpCount - expectedRegisterFunctionHttpCount + 1}`);
  });

  test('UnregisterFunction', async function () {
    let expectedInputCount: number = unregisterFunctionInputCount + 1;
    let expectedGetEntityTokenHttpCount: number = getEntityTokenHttpCount + 1;
    let expectedUnregisterFunctionHttpCount: number = unregisterFunctionHttpCount + 1;
    let explorer: PlayFabExplorer = new PlayFabExplorer(account.object, inputGatherer.object, httpCli.object);
    await explorer.unregisterFunction(title);

    assert(unregisterFunctionInputCount === expectedInputCount, `Expected single input call for UnregisterFunction, got ${registerFunctionInputCount - expectedInputCount + 1}`);
    assert(getEntityTokenHttpCount === expectedGetEntityTokenHttpCount, `Expected single HTTP call for GetEntityToken, got ${getEntityTokenHttpCount - expectedGetEntityTokenHttpCount + 1}`);
    assert(unregisterFunctionHttpCount === expectedUnregisterFunctionHttpCount, `Expected single HTTP call for UnregisterFunction, got ${unregisterFunctionHttpCount - expectedUnregisterFunctionHttpCount + 1}`);
  });
})