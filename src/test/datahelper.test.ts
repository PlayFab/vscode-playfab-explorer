//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import * as assert from 'assert';
import { GetLastPathPartFromUri, MapFromObject } from '../helpers/PlayFabDataHelpers';

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

    test('GetLastPathPartFromUriForEmptyStringReturnsNull', function() {
        let result: string = GetLastPathPartFromUri("");
        assert(result === null, `Expected empty string but got ${result}`);
    });

    test('GetLastPathPartFromUriForUriWithNoPathReturnsNull', function() {
        let result: string = GetLastPathPartFromUri("http://www.microsoft.com");
        assert(result === null, `Expected empty string but got ${result}`);
    });

    test('GetLastPathPartFromUriForUriWithNoSlashAtEndOfPathReturnsExpectedValue', function() {
        let result: string = GetLastPathPartFromUri("http://www.microsoft.com/path1");
        assert(result === "path1", `Expected path1 but got ${result}`);

        result = GetLastPathPartFromUri("http://www.microsoft.com/path1/path2");
        assert(result === "path2", `Expected path2 but got ${result}`)

        result = GetLastPathPartFromUri("http://www.microsoft.com/path1/path2/path3");
        assert(result === "path3", `Expected path3 but got ${result}`)
    });

    test('GetLastPathPartFromUriForUriWithNoSlashAtEndOfPathAndQueryStringReturnsExpectedValue', function() {
        let result: string = GetLastPathPartFromUri("http://www.microsoft.com/path1?code=abc");
        assert(result === "path1", `Expected path1 but got ${result}`);

        result = GetLastPathPartFromUri("http://www.microsoft.com/path1/path2?code=abc");
        assert(result === "path2", `Expected path2 but got ${result}`)

        result = GetLastPathPartFromUri("http://www.microsoft.com/path1/path2/path3?code=abc");
        assert(result === "path3", `Expected path3 but got ${result}`)
    });

    test('GetLastPathPartFromUriForUriWithSlashAtEndOfPathReturnsExpectedValue', function() {
        let result: string = GetLastPathPartFromUri("http://www.microsoft.com/path1/");
        assert(result === null, `Expected null string but got ${result}`);

        result = GetLastPathPartFromUri("http://www.microsoft.com/path1/path2/");
        assert(result === null, `Expected null string but got ${result}`)

        result = GetLastPathPartFromUri("http://www.microsoft.com/path1/path2/path3/");
        assert(result === null, `Expected null but got ${result}`)
    });

    test('GetLastPathPartFromUriForUriWithSlashAtEndOfPathAndQueryStringReturnsExpectedValue', function() {
        let result: string = GetLastPathPartFromUri("http://www.microsoft.com/path1/?code=abc");
        assert(result === null, `Expected null string but got ${result}`);

        result = GetLastPathPartFromUri("http://www.microsoft.com/path1/path2/?code=abc");
        assert(result === null, `Expected null string but got ${result}`)

        result = GetLastPathPartFromUri("http://www.microsoft.com/path1/path2/path3/?code=abc");
        assert(result === null, `Expected null but got ${result}`)
    });
});