//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as assert from 'assert'
import { MapFromObject } from '../helpers/PlayFabDataHelpers'

suite('DataHelper Tests', function () {

    test('MapFromObjectForObjectReturnsExpectedMap', function () {
        let obj = {
            a: 1,
            b: 2,
            c: 3
        };
        let map: Map<string, string> = MapFromObject(obj);

        assert(map.size === Object.keys(obj).length, `Expected map with ${Object.keys(obj).length} entries but map has ${map.size} entries.`);
        assert(map.get('a') == "1");
        assert(map.get('b') == "2");
        assert(map.get('c') == "3");
    });

    test('MapFromObjectForEmptyObjectReturnsEmptyMap', function () {
        let map: Map<string, string> = MapFromObject({});
        assert(map.size == 0, `Expected empty map, but map has ${map.size} entries.`);
    });

    test('MapFromObjectForEmptyArrayReturnsEmptyMap', function () {
        let map: Map<string, string> = MapFromObject([]);
        assert(map.size == 0, `Expected empty map, but map has ${map.size} entries.`);
    });

    test('MapFromObjectForNoneEmptyArrayReturnsEmptyMap', function () {
        let map: Map<string, string> = MapFromObject([1, 2, 3]);
        assert(map.size == 0, `Expected empty map, but map has ${map.size} entries.`);
    });

    test('MapFromObjectForNullReturnsEmptyMap', function () {
        let map: Map<string, string> = MapFromObject(null);
        assert(map.size == 0, `Expected empty map, but map has ${map.size} entries.`);
    });

    test('MapFromObjectForUndefinedReturnsEmptyMap', function () {
        let map: Map<string, string> = MapFromObject(undefined);
        assert(map.size == 0, `Expected empty map, but map has ${map.size} entries.`);
    });

});