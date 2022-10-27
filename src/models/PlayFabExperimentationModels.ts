//---------------------------------------------------------------------------------------------
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.md in the project root for license information.
//---------------------------------------------------------------------------------------------

import { ApiContextRequest } from "./PlayFabApiContextModels";
import { EntityDescriptorApiContext } from "./PlayFabEntityApiContextModels";

export enum AnalysisTaskState {
    Waiting,
    ReadyForSubmission,
    SubmittingToPipeline,
    Running,
    Completed,
    Failed,
    Canceled
}

export class Experiment {
    Name: string;
    Id: string;
    Description: string;
    StartDate: string; // DateTime
    EndDate: string; // DateTime
    SegmentId: string // Id of the segment
    Variants: Variant[];
    ExperimentType: ExperimentType;
    State: ExperimentState;
    TitlePlayerAccountTestIds: string[];
}

export enum ExperimentState {
    New,
    Started,
    Stopped,
    Deleted
}

export enum ExperimentType {
    Active,
    Snapshot
}

export class MetricData {
    Name: string;
    InternalName: string;
    PValueThreshold: number; // float   
    Value: number; // float
    StdDev: number; // float
    DeltaRelativeChange: number; // float
    DeltaAbsoluteChange: number; // float 
    PValue: number; // float { get; set; }
    PMove: number; // float 
    Movement: string; // enum?
    StatSigLevel: string; // enum?
    ConfidenceIntervalStart: number; // double
    ConfidenceIntervalEnd: number; // double
}

export class Scorecard {
    ExperimentId: string;
    ExperimentName: string;
    DateGenerated: string; // DateTime?
    Duration: string; // uint? units?
    EventsProcessed: number; // uint? 
    SampleRatioMismatch: boolean;
    LatestJobStatus: AnalysisTaskState;
    ScorecardDataRows: ScorecardDataRow[];
}

export class ScorecardDataRow {
    VariantName: string;
    IsControl: boolean;
    PlayerCount: number; // uint
    MetricDataRows: Map<string, MetricData>;
}

export class TreatmentAssignment {
    Variants: string[];
    Variables: Variable[];
}

export class Variable {
    Name: string; // Required, max length 128
    Value: string; // max length 2000
}

export class Variant {
    Name: string; // Required, max length 128
    Description: string; // max length 255
    TrafficPercentage: number; // Required, int 1-100
    Variables: Variable[]; // max of 10 
    TitleDataOverrideLabel: string;
    Id: string;
    IsControl: boolean; // Required
}


// Request/response types
export class CreateExperimentRequest extends ApiContextRequest {
    Name: string; // Required, max length 128
    Description: string; // Max length 255
    StartDate: string; // DateTime
    EndDate: string; // DateTime, nullable
    SegmentId: string; // Id of the segment
    Variants: Variant[]; // Required, max of 10
    ExperimentType: ExperimentType;
    TitlePlayerAccountTestIds: string[]; // max of 64
    ExclusionGroupId: string;
    ExclusionGroupTrafficAllocation: number; // uint, nullable 
}

export class CreateExperimentResponse {
    ExperimentId: string;
}

export class DeleteExperimentRequest extends ApiContextRequest {
    ExperimentId: string;
}

export class DeleteExperimentResponse {
}

export class GetExperimentsRequest extends ApiContextRequest {    
}

export class GetExperimentsResponse {
    Experiments: Experiment[];
}

export class GetLatestScoreCardRequest {
    ExperimentId: string;
}

export class GetLatestScoreCardResponse {
    Scorecard: Scorecard;
}

export class GetTreatmentAssignmentRequest extends EntityDescriptorApiContext {
    PlayFabId: string;
}

export class GetTreatmentAssignmentResponse {
    TreatmentAssignment: TreatmentAssignment
}

export class StartExperimentRequest extends ApiContextRequest {
    ExperimentId: string;
}

export class StopExperimentRequest extends ApiContextRequest {
    ExperimentId: string;
}

export class UpdateExperimentRequest extends ApiContextRequest {
    Name: string; // max 128
    Id: string;
    Description: string; // max 255
    StartDate: string; // DateTime
    Duration: number; // uint in days, 1-21
    SegmentId: string // Id of the segment
    Variants: Variant[];
    ExperimentType: ExperimentType;
    TitlePlayerAccountTestIds: string[];
}