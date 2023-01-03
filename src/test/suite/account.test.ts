//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as assert from 'assert'
import { suite, test } from 'mocha'
import * as Moq from 'typemoq'
import { PlayFabLoginManager, IPlayFabLoginInputGatherer } from '../../playfab-account';
import { IPlayFabAccount, PlayFabLoginStatus } from '../../playfab-account.api';
import { IHttpClient } from '../../helpers/PlayFabHttpHelper'
import { PlayFabUriHelpers } from '../../helpers/PlayFabUriHelpers'
import {
  CreateAccountRequest, CreateAccountResponse, LoginResponse, LoginRequest,
  LogoutRequest, LogoutResponse
} from '../../models/PlayFabAccountModels';
import { ErrorResponse } from '../../models/PlayFabHttpModels';
import { delay } from '../../helpers/PlayFabPromiseHelpers';

class TestHelper {
  private static initializing: PlayFabLoginStatus = 'Initializing';
  private static loggedIn: PlayFabLoginStatus = 'LoggedIn';
  private static loggedOut: PlayFabLoginStatus = 'LoggedOut';

  public static assertLoginStatusIsInitializing(account: IPlayFabAccount) {
    TestHelper.checkLoginStatus(TestHelper.initializing, account.status);
  }

  public static assertLoginStatusIsLoggedIn(account: IPlayFabAccount) {
    TestHelper.checkLoginStatus(TestHelper.loggedIn, account.status);
  }

  public static assertLoginStatusIsLoggedOut(account: IPlayFabAccount) {
    TestHelper.checkLoginStatus(TestHelper.loggedOut, account.status);
  }

  public static checkToken(expected: string, actual: string): void {
    assert(expected === actual, "Token is not " + expected);
  }

  private static checkLoginStatus(expected: PlayFabLoginStatus, actual: PlayFabLoginStatus): void {
    assert(expected === actual, "Status is not " + expected);
  }
}


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
    TestHelper.assertLoginStatusIsInitializing(loginManager.api);

    await loginManager.createAccount();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user1.token, loginManager.api.getToken());
  });

  test('CreateAccountDifferentUserWhenLoggedIn', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    TestHelper.assertLoginStatusIsInitializing(loginManager.api);

    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user1.token, loginManager.api.getToken());

    user = user2;

    await loginManager.createAccount();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user2.token, loginManager.api.getToken());
  });

  test('LoginWhenLoggedOut', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    TestHelper.assertLoginStatusIsInitializing(loginManager.api);

    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user1.token, loginManager.api.getToken());
  });

  test('LoginWhenLoggedOutTimeout', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCliTimeout.object, inputGatherer.object);
    TestHelper.assertLoginStatusIsInitializing(loginManager.api);

    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedOut(loginManager.api);
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
    TestHelper.assertLoginStatusIsInitializing(loginManager.api);

    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user2.token, loginManager.api.getToken());
  });

  test('LoginSameUserWhenLoggedIn', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    TestHelper.assertLoginStatusIsInitializing(loginManager.api);

    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user1.token, loginManager.api.getToken());

    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user1.token, loginManager.api.getToken());
  });

  test('LoginDifferentUserWhenLoggedIn', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    TestHelper.assertLoginStatusIsInitializing(loginManager.api);

    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user1.token, loginManager.api.getToken());

    user = user2;
    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    TestHelper.checkToken(user2.token, loginManager.api.getToken());
  });

  test('LogoutWhenLoggedIn', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    await loginManager.logout();
    TestHelper.assertLoginStatusIsLoggedOut(loginManager.api);
  });

  test('LogoutWhenLoggedOut', async function () {
    user = user1;
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    await loginManager.login();
    TestHelper.assertLoginStatusIsLoggedIn(loginManager.api);
    await loginManager.logout();
    TestHelper.assertLoginStatusIsLoggedOut(loginManager.api);
    await loginManager.logout();
    TestHelper.assertLoginStatusIsLoggedOut(loginManager.api);
  });

})