// /********************************************************
// *                                                       *
// *   Copyright (C) Microsoft. All rights reserved.       *
// *                                                       *
// ********************************************************/
import * as sarif from "sarif";
import { Command, Diagnostic, DiagnosticCollection, Position, Range, Uri } from "vscode";
import { MessageType, SeverityLevelOrder, KindOrder, BaselineOrder } from "./Enums";

/**
* Interface for options to set while creating an html element
*/
export interface HTMLElementOptions {
    /**
    *  The id to set on the element
    */
    id?: string;

    /**
    *  The text to set on the element
    */
    text?: string;

    /**
     *  The class name to set on the element
     */
    className?: string;

    /**
     * The tooltip to set on the element
     */
    tooltip?: string;

    /**
     * object filled with any attributes to set on the element
     */
    attributes?: object;
}

export interface Location {
    id: number;
    endOfLine: boolean;
    fileName: string;
    logicalLocations: string[];
    mapped: boolean;
    message: Message;
    range: Range;
    uri: Uri;
    uriBase: string;
}

export interface SarifViewerDiagnostic extends Diagnostic {
    resultInfo: ResultInfo;
    rawResult: sarif.Result;
}

export interface RunInfo {
    additionalProperties: { [key: string]: string };
    automationCategory: string;
    automationIdentifier: string;
    cmdLine: string;
    id: number;
    sarifFileFullPath: string;
    sarifFileName: string;
    startUtc: string;
    timeDuration: string;
    toolFileName: string;
    toolFullName: string;
    toolName: string;
    uriBaseIds: { [key: string]: string };
    workingDir: string;
}

export interface ResultInfo {
    additionalProperties: { [key: string]: string };
    assignedLocation: Location;
    attachments: Attachment[];
    baselineState: sarif.Result.baselineState;
    codeFlows: CodeFlow[];
    fixes: Fix[];
    id: number;
    kind: sarif.Result.kind;
    locationInSarifFile: Location;
    locations: Location[];
    message: Message;
    messageHTML: HTMLLabelElement;
    rank: number;
    relatedLocs: Location[];
    ruleHelpUri: string;
    ruleId: string;
    ruleName: string;
    ruleDescription: Message;
    runId: number;
    severityLevel: sarif.Result.level;
    stacks: Stacks;
}

export interface CodeFlow {
    message: string;
    threads: ThreadFlow[];
}

export interface ThreadFlow {
    message: string;
    lvlsFirstStepIsNested: number;
    id: string;
    steps: CodeFlowStep[];
}

export interface CodeFlowStepId {
    cFId: number,
    tFId: number,
    stepId: number
}

export interface CodeFlowStep {
    beforeIcon: string;
    codeLensCommand: Command;
    importance: sarif.ThreadFlowLocation.importance,
    isLastChild: boolean;
    isParent: boolean;
    location: Location;
    message: string;
    messageWithStep: string;
    nestingLevel: number;
    state: object;
    stepId: number;
    traversalId: string;
}

export interface Stacks {
    columnsWithContent: boolean[];
    stacks: Stack[];
}

export interface Stack {
    frames: Frame[];
    message: Message;
}

export interface Frame {
    location: Location;
    message: Message;
    name: string;
    parameters: string[];
    threadId: number;
}

export interface Message {
    html: string,
    text: string,
}

export interface Attachment {
    description: Message,
    file: Location,
    regionsOfInterest: Location[]
}

export interface Fix {
    description: Message,
    files: FixFile[]
}

export interface FixFile {
    location: Location,
    changes: FixChange[]
}

export interface FixChange {
    delete: Range,
    insert: string
}

export interface TreeNodeOptions {
    isParent: boolean,
    liClass: string,
    location?: Location,
    locationLine?: string,
    locationText?: string,
    logicalLocation?: string,
    message?: string,
    requestId: string,
    tooltip?: string,
}

export interface WebviewMessage {
    type: MessageType,
    data: string
}

export interface DiagnosticData {
    activeTab?: any,
    resultInfo: ResultInfo,
    runInfo: RunInfo,
    selectedRow?: string,
    selectedVerbosity?: any
}

export interface LocationData {
    eCol: string,
    eLine: string,
    file: string,
    sCol: string,
    sLine: string,
}

export interface ResultsListData {
    columns: { [key: string]: ResultsListColumn },
    filterCaseMatch: boolean,
    filterText: string,
    groupBy: string,
    groups: ResultsListGroup[],
    resultCount: number,
    sortBy: ResultsListSortBy,
}

export interface ResultsListGroup {
    rows: ResultsListRow[],
    text: string,
    tooltip?: string,
}

export interface ResultsListRow {
    automationCat: ResultsListStringValue,
    automationId: ResultsListStringValue,
    baselineState: ResultsListBaselineValue,
    kind: ResultsListKindValue,
    logicalLocation: ResultsListStringValue,
    message: ResultsListStringValue,
    rank: ResultsListNumberValue,
    resultFile: ResultsListStringValue,
    resultId: ResultsListNumberValue,
    resultStartPos: ResultsListPositionValue,
    ruleId: ResultsListStringValue,
    ruleName: ResultsListStringValue,
    runId: ResultsListNumberValue,
    sarifFile: ResultsListStringValue,
    severityLevel: ResultsListSeverityValue,
    tool: ResultsListStringValue,
}

export interface ResultsListValue {
    value: any,
    tooltip?: string,
}

export interface ResultsListStringValue extends ResultsListValue {
    value: string,
}

export interface ResultsListNumberValue extends ResultsListValue {
    value: number
}

export interface ResultsListPositionValue extends ResultsListValue {
    pos: Position,
    value: string,
}

export interface ResultsListCustomOrderValue extends ResultsListValue {
    order: BaselineOrder | KindOrder | SeverityLevelOrder,
    value: sarif.Result.baselineState | sarif.Result.kind | sarif.Result.level,
}

export interface ResultsListBaselineValue extends ResultsListCustomOrderValue {
    isBaseLine: boolean,
    order: BaselineOrder,
    value: sarif.Result.baselineState,
}

export interface ResultsListKindValue extends ResultsListCustomOrderValue {
    isKind: boolean,
    order: KindOrder,
    value: sarif.Result.kind,
}

export interface ResultsListSeverityValue extends ResultsListCustomOrderValue {
    isSeverity: boolean,
    order: SeverityLevelOrder,
    value: sarif.Result.level,
}

export interface ResultsListColumn {
    description: string,
    hide: boolean,
    title: string
}

export interface ResultsListSortBy {
    column: string,
    ascending: boolean
}

export interface SarifVersion {
    original: string,
    csd?: number,
    csdDate?: Date,
    rtm?: number,
    major: number,
    minor: number,
    sub: number,
}

export interface JsonMapping {
    data: sarif.Log,
    pointers: any,
}
