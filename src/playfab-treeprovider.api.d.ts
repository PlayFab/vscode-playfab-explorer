//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { Command } from 'vscode';
import { Studio } from './models/PlayFabStudioModels';
import { Title } from './models/PlayFabTitleModels';

export type NodeType = 'Studio' | 'Title' | "Command";

export interface ITreeNode {
    name: string;
    type: NodeType;
    data: Studio | Title | Command;
}