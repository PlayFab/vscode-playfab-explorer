//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export function MapFromObject(obj: object): Map<string, string> {
    let map: Map<string, string> = new Map();
    if (obj && !Array.isArray(obj)) {
        Object.keys(obj).forEach((key: string) => {
            map.set(key, obj[key]);
        });
    }
    return map;
}

export function GetLastPathPartFromUri(uri: string): string {
    let uriSchemeHostAndPath: string = uri.split('?')[0];
    let hostStartIndex: number = uriSchemeHostAndPath.indexOf("//") + 2;
    let uriHostAndPath: string = uriSchemeHostAndPath.substring(hostStartIndex);
    let pathStartIndex: number = uriHostAndPath.indexOf("/") + 1;
    let uriPath: string = uriHostAndPath.substring(pathStartIndex);

    let result: string = null;
    if(uriPath !== uriHostAndPath){
        let uriPathParts: string[] = uriPath.split('/');    
        result =  uriPathParts[uriPathParts.length - 1];
    }

    return result === "" ? null : result;
}