//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class CreateAccountRequest {
    Email: string;
    Password: string;
    StudioName: string;
    DeveloperToolProductName: string;
    DeveloperToolProductVersion: string;
}

export class CreateAccountResponse {
    DeveloperClientToken: string;
}

export class LoginRequest {
    Email: string;
    Password: string;
    TwoFactorAuth: string; // Two-Factor Authentication code. e.g. 123456
    DeveloperToolProductName: string;
    DeveloperToolProductVersion: string;
}

export class LoginResponse {
    DeveloperClientToken: string;
}

export class LogoutRequest {
    DeveloperClientToken: string;
}

export class LogoutResponse {
}
