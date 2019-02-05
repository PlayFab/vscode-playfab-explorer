//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as assert from 'assert'
import * as Moq from 'typemoq'
import { IHttpClient } from '../helpers/PlayFabHttpHelper'
import { CreateTitleRequest, CreateTitleResponse, GetTitleDataRequest, GetTitleDataResponse, SetTitleDataRequest, SetTitleDataResponse, Title } from '../models/PlayFabTitleModels'
import { GetCloudScriptRevisionRequest, GetCloudScriptRevisionResponse, UpdateCloudScriptRequest, UpdateCloudScriptResponse } from '../models/PlayFabLegacyCloudScriptModels'
import { IPlayFabExplorerInputGatherer, PlayFabExplorer } from '../playfab-explorer'
import { PlayFabUriConstants } from '../helpers/PlayFabUriConstants';
import { PlayFabAccount } from '../playfab-account.api';
import { Studio } from '../models/PlayFabStudioModels';
import { MapFromObject } from '../helpers/PlayFabDataHelpers'

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
        errorCallback: (code: number, message: string) => void
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
        errorCallback: (code: number, message: string) => void
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
        errorCallback: (code: number, message: string) => void
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
        errorCallback: (code: number, message: string) => void
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
        errorCallback: (code: number, message: string) => void
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
        errorCallback: (code: number, message: string) => void
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
        errorCallback: (code: number, message: string) => void
      ): Promise<void> => {
        setTitleInternalDataHttpCount++;
        let response: SetTitleDataResponse = {
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
})