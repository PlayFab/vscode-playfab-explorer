import { ApiContextRequest } from "./PlayFabApiContextModels";

//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

export class Variable {
    Name: string;
    Value: string;
}

export class TreatmentAssignment {
    Variants: string[];
    Variables: Variable[];
}

export class GetTreatmentAssignmentRequest {
    PlayFabId: string;
}

export class GetTreatmentAssignmentRespone {
    TreatmentAssignment: TreatmentAssignment
}

export enum ExperimentType {
    Active,
    Snapshot
}

export enum ExperimentState {
    New,
    Started,
    Stopped,
    Deleted
}

export class Variant {
    Name: string;
    Description: string;
    TrafficPercentage: number; // int
    Variables: Variable[];
    Id: string;
    IsControl: boolean;
}

export class TrafficFilter {
    Dimension: string;
    Values: string[];
}

export class Experiment {
    Name: string;
    Id: string;
    Description: string;
    StartDate: string; // DateTime
    Duration: number; // uint
    SegmentId: number; // ulong
    Variants: Variant[];
    ExperimentType: ExperimentType;
    TrafficFilters: TrafficFilter[];
    State: ExperimentState;
}

export class CreateExperimentRequest extends ApiContextRequest {
    Experiment: Experiment;
}

export class CreateExperimentResponse {
    ExperimentId: string;
}

export class UpdateExperimentRequest extends ApiContextRequest {
    Experiment: Experiment;
}

export class DeleteExperimentRequest extends ApiContextRequest {
    ExperimentId: string;
}

export class StartExperimentRequest extends ApiContextRequest {
    ExperimentId: string;
}

export class StopExperimentRequest extends ApiContextRequest {
    ExperimentId: string;
}

export class GetExperimentsRequest {    
}

export class GetExperimentsResponse {
    Experiments: Experiment[];
}