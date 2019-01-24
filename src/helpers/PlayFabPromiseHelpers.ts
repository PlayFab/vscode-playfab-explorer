//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

//
// These functions are copied from 
//
// https://github.com/Microsoft/vscode-azure-account/blob/master/src/azure-account.ts
//

export function delay<T = void>(ms: number, result?: T): Promise<T> {
    return new Promise<T>(resolve => setTimeout(() => resolve(result), ms));
}

export function timeout(ms: number, result: any = 'timeout'): Promise<never> {
    return new Promise<never>((_, reject) => setTimeout(() => reject(result), ms));
}

export async function asyncOr<A, B>(a: Promise<A>, b: Promise<B>): Promise<A | B> {
    return Promise.race([awaitAOrB(a, b), awaitAOrB(b, a)]);
}

async function awaitAOrB<A, B>(a: Promise<A>, b: Promise<B>): Promise<A | B> {
    return (await a) || b;
}


