//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as assert from 'assert'
import * as Moq from 'typemoq'
import { PlayFabLoginManager, IPlayFabLoginInputGatherer } from '../playfab-account';
import { IHttpClient } from '../helpers/PlayFabHttpHelper'
import { PlayFabUriHelpers } from '../helpers/PlayFabUriHelpers'
import {
  CreateAccountRequest, CreateAccountResponse, LoginResponse, LoginRequest,
  LogoutRequest, LogoutResponse
} from '../models/PlayFabAccountModels';
import { ErrorResponse } from '../models/PlayFabHttpModels';
import { delay } from '../helpers/PlayFabPromiseHelpers';

suite('Account Tests', function () {

  class User {
    email: string;
    password: string;
    twofa: string;
    studioName: string;
    devToolName: string;
    devToolVersion: string;
    token: string;
  }

  let user1: User = {
    email: "user1@domain.suffix",
    password: "supersecret",
    twofa: "",
    studioName: "Small And Fast",
    devToolName: "UnitTest",
    devToolVersion: "001",
    token: "abcdef"
  };

  let user2: User = {
    email: "user2@domain.suffix",
    password: "SuperSecret",
    twofa: "456789",
    studioName: "Big And Slow",
    devToolName: "UnitTest",
    devToolVersion: "001",
    token: "ghi123",
  };

  let user: User;
  let inputGatherer: Moq.IMock<IPlayFabLoginInputGatherer> = Moq.Mock.ofType<IPlayFabLoginInputGatherer>();
  inputGatherer.setup(x => x.getUserInputForCreateAccount())
    .returns(async () => {
      let result: CreateAccountRequest = {
        Email: user.email,
        Password: user.password,
        StudioName: user.studioName,
        DeveloperToolProductName: user.devToolName,
        DeveloperToolProductVersion: user.devToolVersion
      };
      return result;
    });
  inputGatherer.setup(x => x.getUserInputForLogin(Moq.It.isAnyString()))
    .returns(async () => {
      let result: LoginRequest = {
        Email: user.email,
        Password: user.password,
        TwoFactorAuth: "",
        DeveloperToolProductName: user.devToolName,
        DeveloperToolProductVersion: user.devToolVersion
      };
      return result;
    });
  inputGatherer.setup(x => x.getUserInputForTwoFA(Moq.It.is<LoginRequest>(x => true)))
    .returns(async (request: LoginRequest) => {
      request.TwoFactorAuth = user.twofa;
      return request;
    });


  let httpCli: Moq.IMock<IHttpClient> = Moq.Mock.ofType<IHttpClient>();
  httpCli.setup(x => x.makeApiCall(
    Moq.It.isValue(PlayFabUriHelpers.loginPath),
    Moq.It.isAnyString(),
    Moq.It.is<LoginRequest>(x => true),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: LoginRequest,
        successCallback: (response: LoginResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        let response: LoginResponse = {
          DeveloperClientToken: user.token,
        };
        successCallback(response);
        return;
      });

  httpCli.setup(x => x.makeApiCall(
    Moq.It.isValue(PlayFabUriHelpers.logoutPath),
    Moq.It.isAnyString(),
    Moq.It.is<LoginRequest>(x => true),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: LogoutRequest,
        successCallback: (response: LogoutResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        let response: LogoutResponse = {
        };
        successCallback(response);
        return;
      });

  httpCli.setup(x => x.makeApiCall(
    Moq.It.isValue(PlayFabUriHelpers.createAccountPath),
    Moq.It.isAnyString(),
    Moq.It.is<CreateAccountRequest>(x => true),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: CreateAccountRequest,
        successCallback: (response: CreateAccountResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        let response: CreateAccountResponse = {
          DeveloperClientToken: user.token
        };
        successCallback(response);
        return;
      });

  let httpCliTimeout: Moq.IMock<IHttpClient> = Moq.Mock.ofType<IHttpClient>();
  httpCliTimeout.setup(x => x.timeoutMilliseconds).returns(() => 100);
  httpCliTimeout.setup(x => x.makeApiCall(
    Moq.It.isValue(PlayFabUriHelpers.loginPath),
    Moq.It.isAnyString(),
    Moq.It.is<LoginRequest>(x => true),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: LoginRequest,
        successCallback: (response: LoginResponse) => void,
        errorCallback: (response: ErrorResponse) => void
      ): Promise<void> => {
        return delay(httpCliTimeout.object.timeoutMilliseconds + 100);
      });

  test('CreateAccountWhenLoggedOut', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.createAccount();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    let apiToken: string = loginManager.api.getToken();
    assert(apiToken === user1.token, "Token does not match");
  });

  test('CreateAccountDifferentUserWhenLoggedIn', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.login();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    let apiToken: string = loginManager.api.getToken();
    assert(apiToken === user1.token, "Token does not match");

    user = user2;

    await loginManager.createAccount();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    apiToken = loginManager.api.getToken();
    assert(apiToken === user2.token, "Token does not match");
  });

  test('LoginWhenLoggedOut', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.login();

    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    let apiToken: string = loginManager.api.getToken();
    assert(apiToken === user1.token, "Token does not match");
  });

  test('LoginWhenLoggedOutTimeout', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCliTimeout.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.login();

    assert(loginManager.api.status === "LoggedOut", "Status is not LoggedOut");
  });

  test('LoginWhenLoggedOutNeed2FA', async function () {
    user = user2;

    let httpCli2FA: Moq.IMock<IHttpClient> = Moq.Mock.ofType<IHttpClient>();
    let callCount: number = 0;
    httpCli2FA.setup(x => x.makeApiCall(
      Moq.It.isValue(PlayFabUriHelpers.loginPath),
      Moq.It.isAnyString(),
      Moq.It.is<LoginRequest>(x => true),
      Moq.It.isAny(),
      Moq.It.isAny()))
      .returns(
        (path: string,
          endpoint: string,
          request: LoginRequest,
          successCallback: (response: LoginResponse) => void,
          errorCallback: (response: ErrorResponse) => void
        ): Promise<void> => {

          switch (callCount) {
            case 0:
              let errorResponse: ErrorResponse = {
                code: 400,
                status: "BadRequest",
                error: "TwoFaError",
                errorCode: 1246,
                errorMessage: "TwoFa error"
              };
              errorCallback(errorResponse);
              callCount++;
              break;
            case 1:
              let response: LoginResponse = {
                DeveloperClientToken: user.token
              };
              successCallback(response);
              callCount++;
              break;
            default:
              break;
          }

          return;
        });

    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli2FA.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.login();

    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    let apiToken: string = loginManager.api.getToken();
    assert(apiToken === user2.token, "Token does not match");
  });

  test('LoginSameUserWhenLoggedIn', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.login();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    let apiToken: string = loginManager.api.getToken();
    assert(apiToken === user1.token, "Token does not match");

    await loginManager.login();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    apiToken = loginManager.api.getToken();
    assert(apiToken === user1.token, "Token does not match");
  });

  test('LoginDifferentUserWhenLoggedIn', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.login();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    let apiToken: string = loginManager.api.getToken();
    assert(apiToken === user1.token, "Token does not match");

    user = user2;

    await loginManager.login();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    apiToken = loginManager.api.getToken();
    assert(apiToken === user2.token, "Token does not match");
  });

  test('LogoutWhenLoggedIn', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    await loginManager.login();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    await loginManager.logout();
    assert(loginManager.api.status === "LoggedOut", "Status is not LoggedOut");
  });

  test('LogoutWhenLoggedOut', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    await loginManager.login();
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    await loginManager.logout();
    assert(loginManager.api.status === "LoggedOut", "Status is not LoggedOut");
    await loginManager.logout();
    assert(loginManager.api.status === "LoggedOut", "Status is not LoggedOut");
  });
})