//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert'
import * as Moq from 'typemoq'
import { IHttpClient } from '../helpers/PlayFabHttpHelper'
import { CreateAccountRequest, CreateAccountResponse, LoginResponse, LoginRequest, LogoutRequest, LogoutResponse } from '../models/PlayFabAccountModels';
import { PlayFabLoginManager, IPlayFabLoginInputGatherer } from '../playfab-account';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';


// Defines a Mocha test suite to group tests of similar kind together
suite('Extension Tests', function () {

  let inputGatherer: Moq.IMock<IPlayFabLoginInputGatherer> = Moq.Mock.ofType<IPlayFabLoginInputGatherer>();
  inputGatherer.setup(x => x.getUserInputForLogin())
    .returns(async () => {
      let result: LoginRequest = {
        Email: "user@domain.suffix",
        Password: "supersecretpassword",
        TwoFactorAuth: "123456",
        DeveloperToolProductName: "UnitTest",
        DeveloperToolProductVersion: "001"
      };
      return result;
    })

  let httpCli: Moq.IMock<IHttpClient> = Moq.Mock.ofType<IHttpClient>();
  let token: string = "abcdefghihjk";
  httpCli.setup(x => x.makeApiCall(
    Moq.It.isValue('/DeveloperTools/User/Login'),
    Moq.It.isAnyString(),
    Moq.It.is<LoginRequest>(x => true),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: LoginRequest,
        successCallback: (response: LoginResponse) => void,
        errorCallback: (code: number, message: string) => void
      ): Promise<void> => {
        let response: LoginResponse = {
          DeveloperClientToken: token,
        };
        successCallback(response);
        return;
      });

  httpCli.setup(x => x.makeApiCall(
    Moq.It.isValue('/DeveloperTools/User/Logout'),
    Moq.It.isAnyString(),
    Moq.It.is<LoginRequest>(x => true),
    Moq.It.isAny(),
    Moq.It.isAny()))
    .returns(
      (path: string,
        endpoint: string,
        request: LogoutRequest,
        successCallback: (response: LogoutResponse) => void,
        errorCallback: (code: number, message: string) => void
      ): Promise<void> => {
        let response: LogoutResponse = {
        };
        successCallback(response);
        return;
      });

  // Defines a Mocha unit test
  test('LoginWhenLoggedOut', async function () {
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.login()
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    let apiToken: string = loginManager.api.getToken();
    assert(apiToken === token, "Token does not match");
  });

  test('LoginWhenLoggedIn', async function () {
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    assert(loginManager.api.status === "Initializing", "Status is not Initializing");
    await loginManager.login()
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    let apiToken: string = loginManager.api.getToken();
    assert(apiToken === token, "Token does not match");

    await loginManager.login()
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    apiToken = loginManager.api.getToken();
    assert(apiToken === token, "Token does not match");
  });

  test('LogoutWhenLoggedIn', async function () {
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    await loginManager.login()
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    await loginManager.logout();
    assert(loginManager.api.status === "LoggedOut", "Status is not LoggedOut");
  });

  test('LogoutWhenLoggedOut', async function () {
    let loginManager: PlayFabLoginManager = new PlayFabLoginManager(null, httpCli.object, inputGatherer.object);
    await loginManager.login()
    assert(loginManager.api.status === "LoggedIn", "Status is not LoggedIn");
    await loginManager.logout();
    assert(loginManager.api.status === "LoggedOut", "Status is not LoggedOut");
    await loginManager.logout();
    assert(loginManager.api.status === "LoggedOut", "Status is not LoggedOut");
  });
})