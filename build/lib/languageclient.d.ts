/// <reference types="node" />
import * as jsonrpc from 'vscode-jsonrpc';
import * as lsp from 'vscode-languageserver-protocol';
import { EventEmitter } from 'events';
import { Logger } from './logger';
export * from 'vscode-languageserver-protocol';
export interface KnownNotifications {
    'textDocument/publishDiagnostics': lsp.PublishDiagnosticsParams;
    'telemetry/event': any;
    'window/logMessage': lsp.LogMessageParams;
    'window/showMessageRequest': lsp.ShowMessageRequestParams;
    'window/showMessage': lsp.ShowMessageParams;
    [custom: string]: object;
}
export interface KnownRequests {
    'window/showMessageRequest': [lsp.ShowMessageRequestParams, lsp.MessageActionItem | null];
    'workspace/applyEdit': [lsp.ApplyWorkspaceEditParams, lsp.ApplyWorkspaceEditResponse];
}
export declare type RequestCallback<T extends keyof KnownRequests> = KnownRequests[T] extends [infer U, infer V] ? (param: U) => Promise<V> : never;
export declare class LanguageClientConnection extends EventEmitter {
    private _rpc;
    private _log;
    isConnected: boolean;
    constructor(rpc: jsonrpc.MessageConnection, logger?: Logger);
    private setupLogging;
    dispose(): void;
    initialize(params: lsp.InitializeParams): Promise<lsp.InitializeResult>;
    initialized(): void;
    shutdown(): Promise<void>;
    exit(): void;
    onCustom(method: string, callback: (obj: object) => void): void;
    sendCustomRequest(method: string, params?: any[] | object): Promise<any | null>;
    sendCustomNotification(method: string, params?: any[] | object): void;
    onShowMessage(callback: (params: lsp.ShowMessageParams) => void): void;
    onShowMessageRequest(callback: (params: lsp.ShowMessageRequestParams) => Promise<lsp.MessageActionItem | null>): void;
    onLogMessage(callback: (params: lsp.LogMessageParams) => void): void;
    onTelemetryEvent(callback: (...args: any[]) => void): void;
    onApplyEdit(callback: (params: lsp.ApplyWorkspaceEditParams) => Promise<lsp.ApplyWorkspaceEditResponse>): void;
    didChangeConfiguration(params: lsp.DidChangeConfigurationParams): void;
    didOpenTextDocument(params: lsp.DidOpenTextDocumentParams): void;
    didChangeTextDocument(params: lsp.DidChangeTextDocumentParams): void;
    didCloseTextDocument(params: lsp.DidCloseTextDocumentParams): void;
    willSaveTextDocument(params: lsp.WillSaveTextDocumentParams): void;
    willSaveWaitUntilTextDocument(params: lsp.WillSaveTextDocumentParams): Promise<lsp.TextEdit[] | null>;
    didSaveTextDocument(params: lsp.DidSaveTextDocumentParams): void;
    didChangeWatchedFiles(params: lsp.DidChangeWatchedFilesParams): void;
    onPublishDiagnostics(callback: (params: lsp.PublishDiagnosticsParams) => void): void;
    completion(params: lsp.TextDocumentPositionParams | CompletionParams, cancellationToken?: jsonrpc.CancellationToken): Promise<lsp.CompletionItem[] | lsp.CompletionList>;
    completionItemResolve(params: lsp.CompletionItem): Promise<lsp.CompletionItem | null>;
    hover(params: lsp.TextDocumentPositionParams): Promise<lsp.Hover | null>;
    signatureHelp(params: lsp.TextDocumentPositionParams): Promise<lsp.SignatureHelp | null>;
    gotoDefinition(params: lsp.TextDocumentPositionParams): Promise<lsp.Location | lsp.Location[]>;
    findReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]>;
    documentHighlight(params: lsp.TextDocumentPositionParams): Promise<lsp.DocumentHighlight[]>;
    documentSymbol(params: lsp.DocumentSymbolParams, _cancellationToken?: jsonrpc.CancellationToken): Promise<lsp.SymbolInformation[] | lsp.DocumentSymbol[]>;
    workspaceSymbol(params: lsp.WorkspaceSymbolParams): Promise<lsp.SymbolInformation[]>;
    codeAction(params: lsp.CodeActionParams): Promise<Array<lsp.Command | lsp.CodeAction>>;
    codeLens(params: lsp.CodeLensParams): Promise<lsp.CodeLens[]>;
    codeLensResolve(params: lsp.CodeLens): Promise<lsp.CodeLens | null>;
    documentLink(params: lsp.DocumentLinkParams): Promise<lsp.DocumentLink[]>;
    documentLinkResolve(params: lsp.DocumentLink): Promise<lsp.DocumentLink>;
    documentFormatting(params: lsp.DocumentFormattingParams): Promise<lsp.TextEdit[]>;
    documentRangeFormatting(params: lsp.DocumentRangeFormattingParams): Promise<lsp.TextEdit[]>;
    documentOnTypeFormatting(params: lsp.DocumentOnTypeFormattingParams): Promise<lsp.TextEdit[]>;
    rename(params: lsp.RenameParams): Promise<lsp.WorkspaceEdit>;
    executeCommand(params: lsp.ExecuteCommandParams): Promise<any>;
    private _onRequest;
    private _onNotification;
    private _sendNotification;
    private _sendRequest;
}
export declare type DiagnosticCode = number | string;
/**
 * Contains additional information about the context in which a completion request is triggered.
 */
export interface CompletionContext {
    /**
     * How the completion was triggered.
     */
    triggerKind: lsp.CompletionTriggerKind;
    /**
     * The trigger character (a single character) that has trigger code complete.
     * Is undefined if `triggerKind !== CompletionTriggerKind.TriggerCharacter`
     */
    triggerCharacter?: string;
}
/**
 * Completion parameters
 */
export interface CompletionParams extends lsp.TextDocumentPositionParams {
    /**
     * The completion context. This is only available it the client specifies
     * to send this using `ClientCapabilities.textDocument.completion.contextSupport === true`
     */
    context?: CompletionContext;
}
