//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

//
// These functions are copied or adapted from
//
// https://github.com/Microsoft/vscode-azure-account/blob/master/src/azure-account.ts
//

import { CancellationTokenSource, window } from 'vscode';
import { resolve } from 'dns';
import { promisify } from 'util';
import { asyncOr, delay } from './PlayFabPromiseHelpers'

const intervalMilliseconds: number = 2000;

export async function waitForOnline(cancelTitle: string, checkNetworkMessage: string, cancelCallback: () => void): Promise<void> {
    const cancelSource = new CancellationTokenSource();
    const online = becomeOnline(intervalMilliseconds, cancelSource.token);
    const timer = delay(intervalMilliseconds, true);

    if (await Promise.race([online, timer])) {
        const cancel = { title: cancelTitle };
        await Promise.race([
            online,
            window.showInformationMessage(checkNetworkMessage, cancel)
                .then(result => {
                    if (result === cancel) {
                        cancelCallback();
                    }
                })
        ]);
        await online;
    }
}

async function becomeOnline(interval: number, token = new CancellationTokenSource().token): Promise<void> {
    let o = isOnline();
    let d = delay(interval, false);
    while (!token.isCancellationRequested && !await Promise.race([o, d])) {
        await d;
        o = asyncOr(o, isOnline());
        d = delay(interval, false);
    }
}

async function isOnline(): Promise<boolean> {
    let host = 'playfab.com'; // TODO: playfab.cn for China
    try {
        await promisify(resolve)(host);
        return true;
    } catch (err) {
        return false;
    }
}