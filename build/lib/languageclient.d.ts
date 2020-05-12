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
/**
 * TypeScript wrapper around JSONRPC to implement Microsoft Language Server Protocol v3
 * https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md
 */
export declare class LanguageClientConnection extends EventEmitter {
    private _rpc;
    private _log;
    isConnected: boolean;
    constructor(rpc: jsonrpc.MessageConnection, logger?: Logger);
    private setupLogging;
    dispose(): void;
    /**
     * Public: Initialize the language server with necessary {InitializeParams}.
     *
     * @param params The {InitializeParams} containing processId, rootPath, options and
     *   server capabilities.
     * @returns A {Promise} containing the {InitializeResult} with details of the server's
     *   capabilities.
     */
    initialize(params: lsp.InitializeParams): Promise<lsp.InitializeResult>;
    /** Public: Send an `initialized` notification to the language server. */
    initialized(): void;
    /** Public: Send a `shutdown` request to the language server. */
    shutdown(): Promise<void>;
    /** Public: Send an `exit` notification to the language server. */
    exit(): void;
    /**
     * Public: Register a callback for a custom message.
     *
     * @param method A string containing the name of the message to listen for.
     * @param callback The function to be called when the message is received.
     *   The payload from the message is passed to the function.
     */
    onCustom(method: string, callback: (obj: object) => void): void;
    /**
     * Public: Send a custom request
     *
     * @param method A string containing the name of the request message.
     * @param params The method's parameters
     */
    sendCustomRequest(method: string, params?: any[] | object): Promise<any | null>;
    /**
     * Public: Send a custom notification
     *
     * @param method A string containing the name of the notification message.
     * @param params The method's parameters
     */
    sendCustomNotification(method: string, params?: any[] | object): void;
    /**
     * Public: Register a callback for the `window/showMessage` message.
     *
     * @param callback The function to be called when the `window/showMessage` message is
     *   received with {ShowMessageParams} being passed.
     */
    onShowMessage(callback: (params: lsp.ShowMessageParams) => void): void;
    /**
     * Public: Register a callback for the `window/showMessageRequest` message.
     *
     * @param callback The function to be called when the `window/showMessageRequest` message is
     *   received with {ShowMessageRequestParam}' being passed.
     * @returns A {Promise} containing the {MessageActionItem}.
     */
    onShowMessageRequest(callback: (params: lsp.ShowMessageRequestParams) => Promise<lsp.MessageActionItem | null>): void;
    /**
     * Public: Register a callback for the `window/logMessage` message.
     *
     * @param callback The function to be called when the `window/logMessage` message is
     *   received with {LogMessageParams} being passed.
     */
    onLogMessage(callback: (params: lsp.LogMessageParams) => void): void;
    /**
     * Public: Register a callback for the `telemetry/event` message.
     *
     * @param callback The function to be called when the `telemetry/event` message is
     *   received with any parameters received being passed on.
     */
    onTelemetryEvent(callback: (...args: any[]) => void): void;
    /**
     * Public: Register a callback for the `workspace/applyEdit` message.
     *
     * @param callback The function to be called when the `workspace/applyEdit` message is
     *   received with {ApplyWorkspaceEditParams} being passed.
     * @returns A {Promise} containing the {ApplyWorkspaceEditResponse}.
     */
    onApplyEdit(callback: (params: lsp.ApplyWorkspaceEditParams) => Promise<lsp.ApplyWorkspaceEditResponse>): void;
    /**
     * Public: Send a `workspace/didChangeConfiguration` notification.
     *
     * @param params The {DidChangeConfigurationParams} containing the new configuration.
     */
    didChangeConfiguration(params: lsp.DidChangeConfigurationParams): void;
    /**
     * Public: Send a `textDocument/didOpen` notification.
     *
     * @param params The {DidOpenTextDocumentParams} containing the opened text document details.
     */
    didOpenTextDocument(params: lsp.DidOpenTextDocumentParams): void;
    /**
     * Public: Send a `textDocument/didChange` notification.
     *
     * @param params The {DidChangeTextDocumentParams} containing the changed text document
     *   details including the version number and actual text changes.
     */
    didChangeTextDocument(params: lsp.DidChangeTextDocumentParams): void;
    /**
     * Public: Send a `textDocument/didClose` notification.
     *
     * @param params The {DidCloseTextDocumentParams} containing the opened text document details.
     */
    didCloseTextDocument(params: lsp.DidCloseTextDocumentParams): void;
    /**
     * Public: Send a `textDocument/willSave` notification.
     *
     * @param params The {WillSaveTextDocumentParams} containing the to-be-saved text document
     *   details and the reason for the save.
     */
    willSaveTextDocument(params: lsp.WillSaveTextDocumentParams): void;
    /**
     * Public: Send a `textDocument/willSaveWaitUntil` notification.
     *
     * @param params The {WillSaveTextDocumentParams} containing the to-be-saved text document
     *   details and the reason for the save.
     * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the text
     *   document before it is saved.
     */
    willSaveWaitUntilTextDocument(params: lsp.WillSaveTextDocumentParams): Promise<lsp.TextEdit[] | null>;
    /**
     * Public: Send a `textDocument/didSave` notification.
     *
     * @param params The {DidSaveTextDocumentParams} containing the saved text document details.
     */
    didSaveTextDocument(params: lsp.DidSaveTextDocumentParams): void;
    /**
     * Public: Send a `workspace/didChangeWatchedFiles` notification.
     *
     * @param params The {DidChangeWatchedFilesParams} containing the array of {FileEvent}s that
     *   have been observed upon the watched files.
     */
    didChangeWatchedFiles(params: lsp.DidChangeWatchedFilesParams): void;
    /**
     * Public: Register a callback for the `textDocument/publishDiagnostics` message.
     *
     * @param callback The function to be called when the `textDocument/publishDiagnostics` message is
     *   received a {PublishDiagnosticsParams} containing new {Diagnostic} messages for a given uri.
     */
    onPublishDiagnostics(callback: (params: lsp.PublishDiagnosticsParams) => void): void;
    /**
     * Public: Send a `textDocument/completion` request.
     *
     * @param params The {TextDocumentPositionParams} or {CompletionParams} for which
     *   {CompletionItem}s are desired.
     * @param cancellationToken The {CancellationToken} that is used to cancel this request if necessary.
     * @returns A {Promise} containing either a {CompletionList} or an {Array} of {CompletionItem}s.
     */
    completion(params: lsp.TextDocumentPositionParams | CompletionParams, cancellationToken?: jsonrpc.CancellationToken): Promise<lsp.CompletionItem[] | lsp.CompletionList | null>;
    /**
     * Public: Send a `completionItem/resolve` request.
     *
     * @param params The {CompletionItem} for which a fully resolved {CompletionItem} is desired.
     * @returns A {Promise} containing a fully resolved {CompletionItem}.
     */
    completionItemResolve(params: lsp.CompletionItem): Promise<lsp.CompletionItem | null>;
    /**
     * Public: Send a `textDocument/hover` request.
     *
     * @param params The {TextDocumentPositionParams} for which a {Hover} is desired.
     * @returns A {Promise} containing a {Hover}.
     */
    hover(params: lsp.TextDocumentPositionParams): Promise<lsp.Hover | null>;
    /**
     * Public: Send a `textDocument/signatureHelp` request.
     *
     * @param params The {TextDocumentPositionParams} for which a {SignatureHelp} is desired.
     * @returns A {Promise} containing a {SignatureHelp}.
     */
    signatureHelp(params: lsp.TextDocumentPositionParams): Promise<lsp.SignatureHelp | null>;
    /**
     * Public: Send a `textDocument/definition` request.
     *
     * @param params The {TextDocumentPositionParams} of a symbol for which one or more {Location}s
     *   that define that symbol are required.
     * @returns A {Promise} containing either a single {Location} or an {Array} of many {Location}s.
     */
    gotoDefinition(params: lsp.TextDocumentPositionParams): Promise<lsp.Location | lsp.Location[]>;
    /**
     * Public: Send a `textDocument/references` request.
     *
     * @param params The {TextDocumentPositionParams} of a symbol for which all referring {Location}s
     *   are desired.
     * @returns A {Promise} containing an {Array} of {Location}s that reference this symbol.
     */
    findReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]>;
    /**
     * Public: Send a `textDocument/documentHighlight` request.
     *
     * @param params The {TextDocumentPositionParams} of a symbol for which all highlights are desired.
     * @returns A {Promise} containing an {Array} of {DocumentHighlight}s that can be used to
     *   highlight this symbol.
     */
    documentHighlight(params: lsp.TextDocumentPositionParams): Promise<lsp.DocumentHighlight[]>;
    /**
     * Public: Send a `textDocument/documentSymbol` request.
     *
     * @param params The {DocumentSymbolParams} that identifies the document for which
     *   symbols are desired.
     * @param cancellationToken The {CancellationToken} that is used to cancel this request if
     *   necessary.
     * @returns A {Promise} containing an {Array} of {SymbolInformation}s that can be used to
     *   navigate this document.
     */
    documentSymbol(params: lsp.DocumentSymbolParams, _cancellationToken?: jsonrpc.CancellationToken): Promise<lsp.SymbolInformation[] | lsp.DocumentSymbol[]>;
    /**
     * Public: Send a `workspace/symbol` request.
     *
     * @param params The {WorkspaceSymbolParams} containing the query string to search the workspace for.
     * @returns A {Promise} containing an {Array} of {SymbolInformation}s that identify where the query
     *   string occurs within the workspace.
     */
    workspaceSymbol(params: lsp.WorkspaceSymbolParams): Promise<lsp.SymbolInformation[]>;
    /**
     * Public: Send a `textDocument/codeAction` request.
     *
     * @param params The {CodeActionParams} identifying the document, range and context for the code action.
     * @returns A {Promise} containing an {Array} of {Commands}s that can be performed against the given
     *   documents range.
     */
    codeAction(params: lsp.CodeActionParams): Promise<(lsp.Command | lsp.CodeAction)[]>;
    /**
     * Public: Send a `textDocument/codeLens` request.
     *
     * @param params The {CodeLensParams} identifying the document for which code lens commands are desired.
     * @returns A {Promise} containing an {Array} of {CodeLens}s that associate commands and data with
     *   specified ranges within the document.
     */
    codeLens(params: lsp.CodeLensParams): Promise<lsp.CodeLens[]>;
    /**
     * Public: Send a `codeLens/resolve` request.
     *
     * @param params The {CodeLens} identifying the code lens to be resolved with full detail.
     * @returns A {Promise} containing the {CodeLens} fully resolved.
     */
    codeLensResolve(params: lsp.CodeLens): Promise<lsp.CodeLens | null>;
    /**
     * Public: Send a `textDocument/documentLink` request.
     *
     * @param params The {DocumentLinkParams} identifying the document for which links should be identified.
     * @returns A {Promise} containing an {Array} of {DocumentLink}s relating uri's to specific ranges
     *   within the document.
     */
    documentLink(params: lsp.DocumentLinkParams): Promise<lsp.DocumentLink[]>;
    /**
     * Public: Send a `documentLink/resolve` request.
     *
     * @param params The {DocumentLink} identifying the document link to be resolved with full detail.
     * @returns A {Promise} containing the {DocumentLink} fully resolved.
     */
    documentLinkResolve(params: lsp.DocumentLink): Promise<lsp.DocumentLink>;
    /**
     * Public: Send a `textDocument/formatting` request.
     *
     * @param params The {DocumentFormattingParams} identifying the document to be formatted as well as
     *   additional formatting preferences.
     * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to
     *   correctly reformat it.
     */
    documentFormatting(params: lsp.DocumentFormattingParams): Promise<lsp.TextEdit[]>;
    /**
     * Public: Send a `textDocument/rangeFormatting` request.
     *
     * @param params The {DocumentRangeFormattingParams} identifying the document and range to be formatted
     *   as well as additional formatting preferences.
     * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to
     *   correctly reformat it.
     */
    documentRangeFormatting(params: lsp.DocumentRangeFormattingParams): Promise<lsp.TextEdit[]>;
    /**
     * Public: Send a `textDocument/onTypeFormatting` request.
     *
     * @param params The {DocumentOnTypeFormattingParams} identifying the document to be formatted,
     *   the character that was typed and at what position as well as additional formatting preferences.
     * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to
     *   correctly reformat it.
     */
    documentOnTypeFormatting(params: lsp.DocumentOnTypeFormattingParams): Promise<lsp.TextEdit[]>;
    /**
     * Public: Send a `textDocument/rename` request.
     *
     * @param params The {RenameParams} identifying the document containing the symbol to be renamed,
     *   as well as the position and new name.
     * @returns A {Promise} containing an {WorkspaceEdit} that contains a list of {TextEdit}s either
     *   on the changes property (keyed by uri) or the documentChanges property containing
     *   an {Array} of {TextDocumentEdit}s (preferred).
     */
    rename(params: lsp.RenameParams): Promise<lsp.WorkspaceEdit>;
    /**
     * Public: Send a `workspace/executeCommand` request.
     *
     * @param params The {ExecuteCommandParams} specifying the command and arguments
     *   the language server should execute (these commands are usually from {CodeLens}
     *   or {CodeAction} responses).
     * @returns A {Promise} containing anything.
     */
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
