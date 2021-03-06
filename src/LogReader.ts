// /********************************************************
// *                                                       *
// *   Copyright (C) Microsoft. All rights reserved.       *
// *                                                       *
// ********************************************************/
import * as path from "path";
import * as sarif from "sarif";
import { Disposable, Progress, ProgressLocation, ProgressOptions, TextDocument, Uri, window, workspace } from "vscode";
import { CodeFlows } from "./CodeFlows";
import { JsonMapping, ResultInfo, RunInfo } from "./common/Interfaces";
import { FileConverter } from "./FileConverter";
import { FileMapper } from "./FileMapper";
import { LocationFactory } from "./LocationFactory";
import { ProgressHelper } from "./ProgressHelper";
import { ResultInfoFactory } from "./ResultInfoFactory";
import { RunInfoFactory } from "./RunInfoFactory";
import { SVDiagnosticCollection } from "./SVDiagnosticCollection";
import { SVDiagnosticFactory } from "./SVDiagnosticFactory";

/**
 * Handles reading Sarif Logs, processes and adds the results to the collection to display in the problems window
 */
export class LogReader {
    private static instance: LogReader;

    /**
     * Helper method to check if the document provided is a sarif file
     * @param doc document to check if it's a sarif file
     */
    private static isSarifFile(doc: TextDocument): boolean {
        return (doc.languageId === "json" && doc.fileName.substring(doc.fileName.lastIndexOf(".")) === ".sarif");
    }

    public sarifJSONMapping: Map<string, JsonMapping>;

    private closeListenerDisposable: Disposable;
    private openListenerDisposable: Disposable;
    private jsonMap;

    public static get Instance(): LogReader {
        if (LogReader.instance === undefined) {
            LogReader.instance = new LogReader();
        }

        return LogReader.instance;
    }

    private constructor() {
        this.sarifJSONMapping = new Map<string, any>();

        this.jsonMap = require("json-source-map");

        FileMapper.Instance.OnMappingChanged(SVDiagnosticCollection.Instance.mappingChanged,
            SVDiagnosticCollection.Instance);

        // Listen for new sarif files to open or close
        this.openListenerDisposable = workspace.onDidOpenTextDocument(this.onDocumentOpened);
        this.closeListenerDisposable = workspace.onDidCloseTextDocument(this.onDocumentClosed);
    }

    /**
     * Clears the all of the issues that get displayed in the problems panel
     */
    public clearList(): void {
        SVDiagnosticCollection.Instance.clear();
    }

    /**
     * For disposing on extension close
     */
    public dispose(): void {
        SVDiagnosticCollection.Instance.dispose();
        this.openListenerDisposable.dispose();
        this.closeListenerDisposable.dispose();
    }

    /**
     * When a sarif document closes we need to clear all of the list of issues and reread the open sarif docs
     * Can't selectivly remove issues becuase the issues don't have a link back to the sarif file it came from
     * @param doc document that was closed
     */
    public onDocumentClosed(doc: TextDocument): void {
        if (LogReader.isSarifFile(doc)) {
            SVDiagnosticCollection.Instance.removeRuns(doc.fileName);
            return;
        }
    }

    /**
     * When a sarif document opens we read it and sync to the list of issues to add it to the problems panel
     * @param doc document that was opened
     */
    public onDocumentOpened(doc: TextDocument): void {
        if (LogReader.isSarifFile(doc)) {
            LogReader.Instance.read(doc, true);
        }
    }

    /**
     * Reads through all of the text documents open in the workspace, syncs the issues with problem panel after
     */
    public async readAll(): Promise<void> {
        // Get all the documents and read them
        const docs = workspace.textDocuments;

        let needsSync = false;
        for (const doc of docs) {
            if (!needsSync && LogReader.isSarifFile(doc)) {
                needsSync = true;
            }
            await this.read(doc);
        }

        if (needsSync) {
            SVDiagnosticCollection.Instance.syncDiagnostics();
        }
    }

    /**
     * Reads a sarif file, processing the results and adding them to the issues collection for display in problems panel
     * @param doc text document to read
     * @param sync Optional flag to sync the issues after reading this file
     */
    public async read(doc: TextDocument, sync?: boolean): Promise<void> {
        if (LogReader.isSarifFile(doc)) {
            const pOptions = {
                cancellable: false,
                location: ProgressLocation.Notification,
                title: "Processing " + path.basename(doc.fileName),
            } as ProgressOptions;

            return window.withProgress(pOptions,
                async (progress: Progress<{ message?: string; increment?: number; }>, cancleToken): Promise<void> => {
                    ProgressHelper.Instance.Progress = progress;
                    let runInfo: RunInfo;
                    let log: sarif.Log;

                    let docMapping: JsonMapping;
                    await ProgressHelper.Instance.setProgressReport("Parsing Sarif file");
                    try {
                        docMapping = this.jsonMap.parse(doc.getText()) as JsonMapping;
                    } catch (error) {
                        window.showErrorMessage(`Sarif Viewer:
                        Cannot display results for '${doc.fileName}' because: ${error.message}`);
                        return;
                    }

                    this.sarifJSONMapping.set(doc.uri.toString(), docMapping);
                    log = docMapping.data;

                    if (FileConverter.tryUpgradeSarif(log.version, log.$schema, doc)) {
                        return;
                    }

                    for (let runIndex = 0; runIndex < log.runs.length; runIndex++) {
                        const run = log.runs[runIndex];
                        runInfo = RunInfoFactory.Create(run, doc.fileName);
                        const runId = SVDiagnosticCollection.Instance.addRunInfo(runInfo);
                        CodeFlows.mapThreadFlowLocationsFromRun(run.threadFlowLocations, runId);

                        await ProgressHelper.Instance.setProgressReport("Mapping Files");
                        await FileMapper.Instance.mapFiles(run.artifacts, runId);

                        await ProgressHelper.Instance.setProgressReport(`Loading ${run.results.length} Results`);
                        await this.readResults(run.results, run.tool, runId, doc.uri, runIndex);
                    }

                    if (sync) {
                        SVDiagnosticCollection.Instance.syncDiagnostics();
                    }

                    ProgressHelper.Instance.Progress = undefined;
                    return Promise.resolve();
                });
        }
    }

    /**
     * Reads the results from the run, adding a diagnostic for each result
     * @param results Array of results from the run
     * @param tool Tool from the run
     * @param runId Id of the processed run
     * @param docUri Uri of the sarif file
     * @param runIndex Index of the run in the sarif file
     */
    private async readResults(
        results: sarif.Result[], tool: sarif.Tool, runId: number, docUri: Uri, runIndex: number,
    ) {
        const showIncrement = results.length > 1000;
        let percent = 0;
        let interval: number;
        let nextIncrement: number;
        if (showIncrement) {
            interval = Math.floor(results.length / 10);
            nextIncrement = interval;
        }
        for (let resultIndex = 0; resultIndex < results.length; resultIndex++) {
            if (showIncrement && resultIndex >= nextIncrement) {
                nextIncrement = nextIncrement + interval;
                percent = percent + 10;
                const progressMsg = `Loading ${results.length} Results: ${percent}% completed`;
                await ProgressHelper.Instance.setProgressReport(progressMsg, 10);
            }
            const sarifResult = results[resultIndex];
            await ResultInfoFactory.create(sarifResult, runId, tool).then((resultInfo: ResultInfo) => {
                resultInfo.id = resultIndex;
                resultInfo.locationInSarifFile = LocationFactory.mapToSarifFileResult(docUri, runIndex, resultIndex);
                if (resultInfo.assignedLocation === undefined || !resultInfo.assignedLocation.mapped) {
                    resultInfo.assignedLocation = LocationFactory.mapToSarifFileLocation(docUri, runIndex, resultIndex);
                }
                const diagnostic = SVDiagnosticFactory.create(resultInfo, sarifResult);
                SVDiagnosticCollection.Instance.add(diagnostic);
            });
        }
    }
}
