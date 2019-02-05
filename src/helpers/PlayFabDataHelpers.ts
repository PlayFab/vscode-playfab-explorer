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