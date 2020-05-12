"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const jsonrpc = require("vscode-jsonrpc");
const events_1 = require("events");
const logger_1 = require("./logger");
__export(require("vscode-languageserver-protocol"));
/**
 * TypeScript wrapper around JSONRPC to implement Microsoft Language Server Protocol v3
 * https://github.com/Microsoft/language-server-protocol/blob/master/protocol.md
 */
class LanguageClientConnection extends events_1.EventEmitter {
    constructor(rpc, logger) {
        super();
        this._rpc = rpc;
        this._log = logger || new logger_1.NullLogger();
        this.setupLogging();
        rpc.listen();
        this.isConnected = true;
        this._rpc.onClose(() => {
            this.isConnected = false;
            this._log.warn('rpc.onClose', 'The RPC connection closed unexpectedly');
            this.emit('close');
        });
    }
    setupLogging() {
        this._rpc.onError((error) => this._log.error(['rpc.onError', error]));
        this._rpc.onUnhandledNotification((notification) => {
            if (notification.method != null && notification.params != null) {
                this._log.warn(`rpc.onUnhandledNotification ${notification.method}`, notification.params);
            }
            else {
                this._log.warn('rpc.onUnhandledNotification', notification);
            }
        });
        this._rpc.onNotification((...args) => this._log.debug('rpc.onNotification', args));
    }
    dispose() {
        this._rpc.dispose();
    }
    /**
     * Public: Initialize the language server with necessary {InitializeParams}.
     *
     * @param params The {InitializeParams} containing processId, rootPath, options and
     *   server capabilities.
     * @returns A {Promise} containing the {InitializeResult} with details of the server's
     *   capabilities.
     */
    initialize(params) {
        return this._sendRequest('initialize', params);
    }
    /** Public: Send an `initialized` notification to the language server. */
    initialized() {
        this._sendNotification('initialized', {});
    }
    /** Public: Send a `shutdown` request to the language server. */
    shutdown() {
        return this._sendRequest('shutdown');
    }
    /** Public: Send an `exit` notification to the language server. */
    exit() {
        this._sendNotification('exit');
    }
    /**
     * Public: Register a callback for a custom message.
     *
     * @param method A string containing the name of the message to listen for.
     * @param callback The function to be called when the message is received.
     *   The payload from the message is passed to the function.
     */
    onCustom(method, callback) {
        this._onNotification({ method }, callback);
    }
    /**
     * Public: Send a custom request
     *
     * @param method A string containing the name of the request message.
     * @param params The method's parameters
     */
    sendCustomRequest(method, params) {
        return this._sendRequest(method, params);
    }
    /**
     * Public: Send a custom notification
     *
     * @param method A string containing the name of the notification message.
     * @param params The method's parameters
     */
    sendCustomNotification(method, params) {
        this._sendNotification(method, params);
    }
    /**
     * Public: Register a callback for the `window/showMessage` message.
     *
     * @param callback The function to be called when the `window/showMessage` message is
     *   received with {ShowMessageParams} being passed.
     */
    onShowMessage(callback) {
        this._onNotification({ method: 'window/showMessage' }, callback);
    }
    /**
     * Public: Register a callback for the `window/showMessageRequest` message.
     *
     * @param callback The function to be called when the `window/showMessageRequest` message is
     *   received with {ShowMessageRequestParam}' being passed.
     * @returns A {Promise} containing the {MessageActionItem}.
     */
    onShowMessageRequest(callback) {
        this._onRequest({ method: 'window/showMessageRequest' }, callback);
    }
    /**
     * Public: Register a callback for the `window/logMessage` message.
     *
     * @param callback The function to be called when the `window/logMessage` message is
     *   received with {LogMessageParams} being passed.
     */
    onLogMessage(callback) {
        this._onNotification({ method: 'window/logMessage' }, callback);
    }
    /**
     * Public: Register a callback for the `telemetry/event` message.
     *
     * @param callback The function to be called when the `telemetry/event` message is
     *   received with any parameters received being passed on.
     */
    onTelemetryEvent(callback) {
        this._onNotification({ method: 'telemetry/event' }, callback);
    }
    /**
     * Public: Register a callback for the `workspace/applyEdit` message.
     *
     * @param callback The function to be called when the `workspace/applyEdit` message is
     *   received with {ApplyWorkspaceEditParams} being passed.
     * @returns A {Promise} containing the {ApplyWorkspaceEditResponse}.
     */
    onApplyEdit(callback) {
        this._onRequest({ method: 'workspace/applyEdit' }, callback);
    }
    /**
     * Public: Send a `workspace/didChangeConfiguration` notification.
     *
     * @param params The {DidChangeConfigurationParams} containing the new configuration.
     */
    didChangeConfiguration(params) {
        this._sendNotification('workspace/didChangeConfiguration', params);
    }
    /**
     * Public: Send a `textDocument/didOpen` notification.
     *
     * @param params The {DidOpenTextDocumentParams} containing the opened text document details.
     */
    didOpenTextDocument(params) {
        this._sendNotification('textDocument/didOpen', params);
    }
    /**
     * Public: Send a `textDocument/didChange` notification.
     *
     * @param params The {DidChangeTextDocumentParams} containing the changed text document
     *   details including the version number and actual text changes.
     */
    didChangeTextDocument(params) {
        this._sendNotification('textDocument/didChange', params);
    }
    /**
     * Public: Send a `textDocument/didClose` notification.
     *
     * @param params The {DidCloseTextDocumentParams} containing the opened text document details.
     */
    didCloseTextDocument(params) {
        this._sendNotification('textDocument/didClose', params);
    }
    /**
     * Public: Send a `textDocument/willSave` notification.
     *
     * @param params The {WillSaveTextDocumentParams} containing the to-be-saved text document
     *   details and the reason for the save.
     */
    willSaveTextDocument(params) {
        this._sendNotification('textDocument/willSave', params);
    }
    /**
     * Public: Send a `textDocument/willSaveWaitUntil` notification.
     *
     * @param params The {WillSaveTextDocumentParams} containing the to-be-saved text document
     *   details and the reason for the save.
     * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the text
     *   document before it is saved.
     */
    willSaveWaitUntilTextDocument(params) {
        return this._sendRequest('textDocument/willSaveWaitUntil', params);
    }
    /**
     * Public: Send a `textDocument/didSave` notification.
     *
     * @param params The {DidSaveTextDocumentParams} containing the saved text document details.
     */
    didSaveTextDocument(params) {
        this._sendNotification('textDocument/didSave', params);
    }
    /**
     * Public: Send a `workspace/didChangeWatchedFiles` notification.
     *
     * @param params The {DidChangeWatchedFilesParams} containing the array of {FileEvent}s that
     *   have been observed upon the watched files.
     */
    didChangeWatchedFiles(params) {
        this._sendNotification('workspace/didChangeWatchedFiles', params);
    }
    /**
     * Public: Register a callback for the `textDocument/publishDiagnostics` message.
     *
     * @param callback The function to be called when the `textDocument/publishDiagnostics` message is
     *   received a {PublishDiagnosticsParams} containing new {Diagnostic} messages for a given uri.
     */
    onPublishDiagnostics(callback) {
        this._onNotification({ method: 'textDocument/publishDiagnostics' }, callback);
    }
    /**
     * Public: Send a `textDocument/completion` request.
     *
     * @param params The {TextDocumentPositionParams} or {CompletionParams} for which
     *   {CompletionItem}s are desired.
     * @param cancellationToken The {CancellationToken} that is used to cancel this request if necessary.
     * @returns A {Promise} containing either a {CompletionList} or an {Array} of {CompletionItem}s.
     */
    completion(params, cancellationToken) {
        // Cancel prior request if necessary
        return this._sendRequest('textDocument/completion', params, cancellationToken);
    }
    /**
     * Public: Send a `completionItem/resolve` request.
     *
     * @param params The {CompletionItem} for which a fully resolved {CompletionItem} is desired.
     * @returns A {Promise} containing a fully resolved {CompletionItem}.
     */
    completionItemResolve(params) {
        return this._sendRequest('completionItem/resolve', params);
    }
    /**
     * Public: Send a `textDocument/hover` request.
     *
     * @param params The {TextDocumentPositionParams} for which a {Hover} is desired.
     * @returns A {Promise} containing a {Hover}.
     */
    hover(params) {
        return this._sendRequest('textDocument/hover', params);
    }
    /**
     * Public: Send a `textDocument/signatureHelp` request.
     *
     * @param params The {TextDocumentPositionParams} for which a {SignatureHelp} is desired.
     * @returns A {Promise} containing a {SignatureHelp}.
     */
    signatureHelp(params) {
        return this._sendRequest('textDocument/signatureHelp', params);
    }
    /**
     * Public: Send a `textDocument/definition` request.
     *
     * @param params The {TextDocumentPositionParams} of a symbol for which one or more {Location}s
     *   that define that symbol are required.
     * @returns A {Promise} containing either a single {Location} or an {Array} of many {Location}s.
     */
    gotoDefinition(params) {
        return this._sendRequest('textDocument/definition', params);
    }
    /**
     * Public: Send a `textDocument/references` request.
     *
     * @param params The {TextDocumentPositionParams} of a symbol for which all referring {Location}s
     *   are desired.
     * @returns A {Promise} containing an {Array} of {Location}s that reference this symbol.
     */
    findReferences(params) {
        return this._sendRequest('textDocument/references', params);
    }
    /**
     * Public: Send a `textDocument/documentHighlight` request.
     *
     * @param params The {TextDocumentPositionParams} of a symbol for which all highlights are desired.
     * @returns A {Promise} containing an {Array} of {DocumentHighlight}s that can be used to
     *   highlight this symbol.
     */
    documentHighlight(params) {
        return this._sendRequest('textDocument/documentHighlight', params);
    }
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
    documentSymbol(params, _cancellationToken) {
        return this._sendRequest('textDocument/documentSymbol', params);
    }
    /**
     * Public: Send a `workspace/symbol` request.
     *
     * @param params The {WorkspaceSymbolParams} containing the query string to search the workspace for.
     * @returns A {Promise} containing an {Array} of {SymbolInformation}s that identify where the query
     *   string occurs within the workspace.
     */
    workspaceSymbol(params) {
        return this._sendRequest('workspace/symbol', params);
    }
    /**
     * Public: Send a `textDocument/codeAction` request.
     *
     * @param params The {CodeActionParams} identifying the document, range and context for the code action.
     * @returns A {Promise} containing an {Array} of {Commands}s that can be performed against the given
     *   documents range.
     */
    codeAction(params) {
        return this._sendRequest('textDocument/codeAction', params);
    }
    /**
     * Public: Send a `textDocument/codeLens` request.
     *
     * @param params The {CodeLensParams} identifying the document for which code lens commands are desired.
     * @returns A {Promise} containing an {Array} of {CodeLens}s that associate commands and data with
     *   specified ranges within the document.
     */
    codeLens(params) {
        return this._sendRequest('textDocument/codeLens', params);
    }
    /**
     * Public: Send a `codeLens/resolve` request.
     *
     * @param params The {CodeLens} identifying the code lens to be resolved with full detail.
     * @returns A {Promise} containing the {CodeLens} fully resolved.
     */
    codeLensResolve(params) {
        return this._sendRequest('codeLens/resolve', params);
    }
    /**
     * Public: Send a `textDocument/documentLink` request.
     *
     * @param params The {DocumentLinkParams} identifying the document for which links should be identified.
     * @returns A {Promise} containing an {Array} of {DocumentLink}s relating uri's to specific ranges
     *   within the document.
     */
    documentLink(params) {
        return this._sendRequest('textDocument/documentLink', params);
    }
    /**
     * Public: Send a `documentLink/resolve` request.
     *
     * @param params The {DocumentLink} identifying the document link to be resolved with full detail.
     * @returns A {Promise} containing the {DocumentLink} fully resolved.
     */
    documentLinkResolve(params) {
        return this._sendRequest('documentLink/resolve', params);
    }
    /**
     * Public: Send a `textDocument/formatting` request.
     *
     * @param params The {DocumentFormattingParams} identifying the document to be formatted as well as
     *   additional formatting preferences.
     * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to
     *   correctly reformat it.
     */
    documentFormatting(params) {
        return this._sendRequest('textDocument/formatting', params);
    }
    /**
     * Public: Send a `textDocument/rangeFormatting` request.
     *
     * @param params The {DocumentRangeFormattingParams} identifying the document and range to be formatted
     *   as well as additional formatting preferences.
     * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to
     *   correctly reformat it.
     */
    documentRangeFormatting(params) {
        return this._sendRequest('textDocument/rangeFormatting', params);
    }
    /**
     * Public: Send a `textDocument/onTypeFormatting` request.
     *
     * @param params The {DocumentOnTypeFormattingParams} identifying the document to be formatted,
     *   the character that was typed and at what position as well as additional formatting preferences.
     * @returns A {Promise} containing an {Array} of {TextEdit}s to be applied to the document to
     *   correctly reformat it.
     */
    documentOnTypeFormatting(params) {
        return this._sendRequest('textDocument/onTypeFormatting', params);
    }
    /**
     * Public: Send a `textDocument/rename` request.
     *
     * @param params The {RenameParams} identifying the document containing the symbol to be renamed,
     *   as well as the position and new name.
     * @returns A {Promise} containing an {WorkspaceEdit} that contains a list of {TextEdit}s either
     *   on the changes property (keyed by uri) or the documentChanges property containing
     *   an {Array} of {TextDocumentEdit}s (preferred).
     */
    rename(params) {
        return this._sendRequest('textDocument/rename', params);
    }
    /**
     * Public: Send a `workspace/executeCommand` request.
     *
     * @param params The {ExecuteCommandParams} specifying the command and arguments
     *   the language server should execute (these commands are usually from {CodeLens}
     *   or {CodeAction} responses).
     * @returns A {Promise} containing anything.
     */
    executeCommand(params) {
        return this._sendRequest('workspace/executeCommand', params);
    }
    _onRequest(type, callback) {
        this._rpc.onRequest(type.method, (value) => {
            this._log.debug(`rpc.onRequest ${type.method}`, value);
            return callback(value);
        });
    }
    _onNotification(type, callback) {
        this._rpc.onNotification(type.method, (value) => {
            this._log.debug(`rpc.onNotification ${type.method}`, value);
            callback(value);
        });
    }
    _sendNotification(method, args) {
        this._log.debug(`rpc.sendNotification ${method}`, args);
        this._rpc.sendNotification(method, args);
    }
    _sendRequest(method, args, cancellationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            this._log.debug(`rpc.sendRequest ${method} sending`, args);
            try {
                const start = performance.now();
                let result;
                if (cancellationToken) {
                    result = yield this._rpc.sendRequest(method, args, cancellationToken);
                }
                else {
                    // If cancellationToken is null or undefined, don't add the third
                    // argument otherwise vscode-jsonrpc will send an additional, null
                    // message parameter to the request
                    result = yield this._rpc.sendRequest(method, args);
                }
                const took = performance.now() - start;
                this._log.debug(`rpc.sendRequest ${method} received (${Math.floor(took)}ms)`, result);
                return result;
            }
            catch (e) {
                const responseError = e;
                if (cancellationToken && responseError.code === jsonrpc.ErrorCodes.RequestCancelled) {
                    this._log.debug(`rpc.sendRequest ${method} was cancelled`);
                }
                else {
                    this._log.error(`rpc.sendRequest ${method} threw`, e);
                }
                throw e;
            }
        });
    }
}
exports.LanguageClientConnection = LanguageClientConnection;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VjbGllbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvbGFuZ3VhZ2VjbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwQ0FBMEM7QUFFMUMsbUNBQXNDO0FBQ3RDLHFDQUdrQjtBQUVsQixvREFBK0M7QUF1Qi9DOzs7R0FHRztBQUNILE1BQWEsd0JBQXlCLFNBQVEscUJBQVk7SUFLeEQsWUFBWSxHQUE4QixFQUFFLE1BQWU7UUFDekQsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sSUFBSSxJQUFJLG1CQUFVLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRWIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1lBQ3hFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sWUFBWTtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRTtZQUNqRCxJQUFJLFlBQVksQ0FB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QUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLE1BQU0sUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUN2RDtnQkFFRCxNQUFNLENBQUMsQ0FBQzthQUNUO1FBQ0gsQ0FBQztLQUFBO0NBQ0Y7QUFoZ0JELDREQWdnQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBqc29ucnBjIGZyb20gJ3ZzY29kZS1qc29ucnBjJztcbmltcG9ydCAqIGFzIGxzcCBmcm9tICd2c2NvZGUtbGFuZ3VhZ2VzZXJ2ZXItcHJvdG9jb2wnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCB7XG4gIE51bGxMb2dnZXIsXG4gIExvZ2dlcixcbn0gZnJvbSAnLi9sb2dnZXInO1xuXG5leHBvcnQgKiBmcm9tICd2c2NvZGUtbGFuZ3VhZ2VzZXJ2ZXItcHJvdG9jb2wnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEtub3duTm90aWZpY2F0aW9ucyB7XG4gICd0ZXh0RG9jdW1lbnQvcHVibGlzaERpYWdub3N0aWNzJzogbHNwLlB1Ymxpc2hEaWFnbm9zdGljc1BhcmFtcztcbiAgJ3RlbGVtZXRyeS9ldmVudCc6IGFueTtcbiAgJ3dpbmRvdy9sb2dNZXNzYWdlJzogbHNwLkxvZ01lc3NhZ2VQYXJhbXM7XG4gICd3aW5kb3cvc2hvd01lc3NhZ2VSZXF1ZXN0JzogbHNwLlNob3dNZXNzYWdlUmVxdWVzdFBhcmFtcztcbiAgJ3dpbmRvdy9zaG93TWVzc2FnZSc6IGxzcC5TaG93TWVzc2FnZVBhcmFtcztcbiAgW2N1c3RvbTogc3RyaW5nXTogb2JqZWN0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEtub3duUmVxdWVzdHMge1xuICAnd2luZG93L3Nob3dNZXNzYWdlUmVxdWVzdCc6XG4gIFtsc3AuU2hvd01lc3NhZ2VSZXF1ZXN0UGFyYW1zLCBsc3AuTWVzc2FnZUFjdGlvbkl0ZW0gfCBudWxsXTtcbiAgJ3dvcmtzcGFjZS9hcHBseUVkaXQnOlxuICBbbHNwLkFwcGx5V29ya3NwYWNlRWRpdFBhcmFtcywgbHNwLkFwcGx5V29ya3NwYWNlRWRpdFJlc3BvbnNlXTtcbn1cblxuZXhwb3J0IHR5cGUgUmVxdWVzdENhbGxiYWNrPFQgZXh0ZW5kcyBrZXlvZiBLbm93blJlcXVlc3RzPiA9XG4gIEtub3duUmVxdWVzdHNbVF0gZXh0ZW5kcyBbaW5mZXIgVSwgaW5mZXIgVl0gP1xuICAocGFyYW06IFUpID0+IFByb21pc2U8Vj4gOlxuICBuZXZlcjtcblxuLyoqXG4gKiBUeXBlU2NyaXB0IHdyYXBwZXIgYXJvdW5kIEpTT05SUEMgdG8gaW1wbGVtZW50IE1pY3Jvc29mdCBMYW5ndWFnZSBTZXJ2ZXIgUHJvdG9jb2wgdjNcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvbGFuZ3VhZ2Utc2VydmVyLXByb3RvY29sL2Jsb2IvbWFzdGVyL3Byb3RvY29sLm1kXG4gKi9cbmV4cG9ydCBjbGFzcyBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBwcml2YXRlIF9ycGM6IGpzb25ycGMuTWVzc2FnZUNvbm5lY3Rpb247XG4gIHByaXZhdGUgX2xvZzogTG9nZ2VyO1xuICBwdWJsaWMgaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IocnBjOiBqc29ucnBjLk1lc3NhZ2VDb25uZWN0aW9uLCBsb2dnZXI/OiBMb2dnZXIpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuX3JwYyA9IHJwYztcbiAgICB0aGlzLl9sb2cgPSBsb2dnZXIgfHwgbmV3IE51bGxMb2dnZXIoKTtcbiAgICB0aGlzLnNldHVwTG9nZ2luZygpO1xuICAgIHJwYy5saXN0ZW4oKTtcblxuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlO1xuICAgIHRoaXMuX3JwYy5vbkNsb3NlKCgpID0+IHtcbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuX2xvZy53YXJuKCdycGMub25DbG9zZScsICdUaGUgUlBDIGNvbm5lY3Rpb24gY2xvc2VkIHVuZXhwZWN0ZWRseScpO1xuICAgICAgdGhpcy5lbWl0KCdjbG9zZScpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cExvZ2dpbmcoKTogdm9pZCB7XG4gICAgdGhpcy5fcnBjLm9uRXJyb3IoKGVycm9yKSA9PiB0aGlzLl9sb2cuZXJyb3IoWydycGMub25FcnJvcicsIGVycm9yXSkpO1xuICAgIHRoaXMuX3JwYy5vblVuaGFuZGxlZE5vdGlmaWNhdGlvbigobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICBpZiAobm90aWZpY2F0aW9uLm1ldGhvZCAhPSBudWxsICYmIG5vdGlmaWNhdGlvbi5wYXJhbXMgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9sb2cud2FybihgcnBjLm9uVW5oYW5kbGVkTm90aWZpY2F0aW9uICR7bm90aWZpY2F0aW9uLm1ldGhvZH1gLCBub3RpZmljYXRpb24ucGFyYW1zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2xvZy53YXJuKCdycGMub25VbmhhbmRsZWROb3RpZmljYXRpb24nLCBub3RpZmljYXRpb24pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX3JwYy5vbk5vdGlmaWNhdGlvbigoLi4uYXJnczogYW55W10pID0+IHRoaXMuX2xvZy5kZWJ1ZygncnBjLm9uTm90aWZpY2F0aW9uJywgYXJncykpO1xuICB9XG5cbiAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5fcnBjLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEluaXRpYWxpemUgdGhlIGxhbmd1YWdlIHNlcnZlciB3aXRoIG5lY2Vzc2FyeSB7SW5pdGlhbGl6ZVBhcmFtc30uXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtJbml0aWFsaXplUGFyYW1zfSBjb250YWluaW5nIHByb2Nlc3NJZCwgcm9vdFBhdGgsIG9wdGlvbnMgYW5kXG4gICAqICAgc2VydmVyIGNhcGFiaWxpdGllcy5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyB0aGUge0luaXRpYWxpemVSZXN1bHR9IHdpdGggZGV0YWlscyBvZiB0aGUgc2VydmVyJ3NcbiAgICogICBjYXBhYmlsaXRpZXMuXG4gICAqL1xuICBwdWJsaWMgaW5pdGlhbGl6ZShwYXJhbXM6IGxzcC5Jbml0aWFsaXplUGFyYW1zKTogUHJvbWlzZTxsc3AuSW5pdGlhbGl6ZVJlc3VsdD4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgnaW5pdGlhbGl6ZScsIHBhcmFtcyk7XG4gIH1cblxuICAvKiogUHVibGljOiBTZW5kIGFuIGBpbml0aWFsaXplZGAgbm90aWZpY2F0aW9uIHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuICovXG4gIHB1YmxpYyBpbml0aWFsaXplZCgpOiB2b2lkIHtcbiAgICB0aGlzLl9zZW5kTm90aWZpY2F0aW9uKCdpbml0aWFsaXplZCcsIHt9KTtcbiAgfVxuXG4gIC8qKiBQdWJsaWM6IFNlbmQgYSBgc2h1dGRvd25gIHJlcXVlc3QgdG8gdGhlIGxhbmd1YWdlIHNlcnZlci4gKi9cbiAgcHVibGljIHNodXRkb3duKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgnc2h1dGRvd24nKTtcbiAgfVxuXG4gIC8qKiBQdWJsaWM6IFNlbmQgYW4gYGV4aXRgIG5vdGlmaWNhdGlvbiB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyLiAqL1xuICBwdWJsaWMgZXhpdCgpOiB2b2lkIHtcbiAgICB0aGlzLl9zZW5kTm90aWZpY2F0aW9uKCdleGl0Jyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBSZWdpc3RlciBhIGNhbGxiYWNrIGZvciBhIGN1c3RvbSBtZXNzYWdlLlxuICAgKlxuICAgKiBAcGFyYW0gbWV0aG9kIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIG5hbWUgb2YgdGhlIG1lc3NhZ2UgdG8gbGlzdGVuIGZvci5cbiAgICogQHBhcmFtIGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgbWVzc2FnZSBpcyByZWNlaXZlZC5cbiAgICogICBUaGUgcGF5bG9hZCBmcm9tIHRoZSBtZXNzYWdlIGlzIHBhc3NlZCB0byB0aGUgZnVuY3Rpb24uXG4gICAqL1xuICBwdWJsaWMgb25DdXN0b20obWV0aG9kOiBzdHJpbmcsIGNhbGxiYWNrOiAob2JqOiBvYmplY3QpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLl9vbk5vdGlmaWNhdGlvbih7IG1ldGhvZCB9LCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgY3VzdG9tIHJlcXVlc3RcbiAgICpcbiAgICogQHBhcmFtIG1ldGhvZCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBuYW1lIG9mIHRoZSByZXF1ZXN0IG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIG1ldGhvZCdzIHBhcmFtZXRlcnNcbiAgICovXG4gIHB1YmxpYyBzZW5kQ3VzdG9tUmVxdWVzdChtZXRob2Q6IHN0cmluZywgcGFyYW1zPzogYW55W10gfCBvYmplY3QpOiBQcm9taXNlPGFueSB8IG51bGw+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QobWV0aG9kLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGN1c3RvbSBub3RpZmljYXRpb25cbiAgICpcbiAgICogQHBhcmFtIG1ldGhvZCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBuYW1lIG9mIHRoZSBub3RpZmljYXRpb24gbWVzc2FnZS5cbiAgICogQHBhcmFtIHBhcmFtcyBUaGUgbWV0aG9kJ3MgcGFyYW1ldGVyc1xuICAgKi9cbiAgcHVibGljIHNlbmRDdXN0b21Ob3RpZmljYXRpb24obWV0aG9kOiBzdHJpbmcsIHBhcmFtcz86IGFueVtdIHwgb2JqZWN0KTogdm9pZCB7XG4gICAgdGhpcy5fc2VuZE5vdGlmaWNhdGlvbihtZXRob2QsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBSZWdpc3RlciBhIGNhbGxiYWNrIGZvciB0aGUgYHdpbmRvdy9zaG93TWVzc2FnZWAgbWVzc2FnZS5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYHdpbmRvdy9zaG93TWVzc2FnZWAgbWVzc2FnZSBpc1xuICAgKiAgIHJlY2VpdmVkIHdpdGgge1Nob3dNZXNzYWdlUGFyYW1zfSBiZWluZyBwYXNzZWQuXG4gICAqL1xuICBwdWJsaWMgb25TaG93TWVzc2FnZShjYWxsYmFjazogKHBhcmFtczogbHNwLlNob3dNZXNzYWdlUGFyYW1zKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5fb25Ob3RpZmljYXRpb24oeyBtZXRob2Q6ICd3aW5kb3cvc2hvd01lc3NhZ2UnIH0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFJlZ2lzdGVyIGEgY2FsbGJhY2sgZm9yIHRoZSBgd2luZG93L3Nob3dNZXNzYWdlUmVxdWVzdGAgbWVzc2FnZS5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYHdpbmRvdy9zaG93TWVzc2FnZVJlcXVlc3RgIG1lc3NhZ2UgaXNcbiAgICogICByZWNlaXZlZCB3aXRoIHtTaG93TWVzc2FnZVJlcXVlc3RQYXJhbX0nIGJlaW5nIHBhc3NlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyB0aGUge01lc3NhZ2VBY3Rpb25JdGVtfS5cbiAgICovXG4gIHB1YmxpYyBvblNob3dNZXNzYWdlUmVxdWVzdChjYWxsYmFjazogKHBhcmFtczogbHNwLlNob3dNZXNzYWdlUmVxdWVzdFBhcmFtcylcbiAgICA9PiBQcm9taXNlPGxzcC5NZXNzYWdlQWN0aW9uSXRlbSB8IG51bGw+KTogdm9pZCB7XG4gICAgdGhpcy5fb25SZXF1ZXN0KHsgbWV0aG9kOiAnd2luZG93L3Nob3dNZXNzYWdlUmVxdWVzdCcgfSwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogUmVnaXN0ZXIgYSBjYWxsYmFjayBmb3IgdGhlIGB3aW5kb3cvbG9nTWVzc2FnZWAgbWVzc2FnZS5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYHdpbmRvdy9sb2dNZXNzYWdlYCBtZXNzYWdlIGlzXG4gICAqICAgcmVjZWl2ZWQgd2l0aCB7TG9nTWVzc2FnZVBhcmFtc30gYmVpbmcgcGFzc2VkLlxuICAgKi9cbiAgcHVibGljIG9uTG9nTWVzc2FnZShjYWxsYmFjazogKHBhcmFtczogbHNwLkxvZ01lc3NhZ2VQYXJhbXMpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLl9vbk5vdGlmaWNhdGlvbih7IG1ldGhvZDogJ3dpbmRvdy9sb2dNZXNzYWdlJyB9LCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBSZWdpc3RlciBhIGNhbGxiYWNrIGZvciB0aGUgYHRlbGVtZXRyeS9ldmVudGAgbWVzc2FnZS5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYHRlbGVtZXRyeS9ldmVudGAgbWVzc2FnZSBpc1xuICAgKiAgIHJlY2VpdmVkIHdpdGggYW55IHBhcmFtZXRlcnMgcmVjZWl2ZWQgYmVpbmcgcGFzc2VkIG9uLlxuICAgKi9cbiAgcHVibGljIG9uVGVsZW1ldHJ5RXZlbnQoY2FsbGJhY2s6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuX29uTm90aWZpY2F0aW9uKHsgbWV0aG9kOiAndGVsZW1ldHJ5L2V2ZW50JyB9LCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBSZWdpc3RlciBhIGNhbGxiYWNrIGZvciB0aGUgYHdvcmtzcGFjZS9hcHBseUVkaXRgIG1lc3NhZ2UuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGB3b3Jrc3BhY2UvYXBwbHlFZGl0YCBtZXNzYWdlIGlzXG4gICAqICAgcmVjZWl2ZWQgd2l0aCB7QXBwbHlXb3Jrc3BhY2VFZGl0UGFyYW1zfSBiZWluZyBwYXNzZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgdGhlIHtBcHBseVdvcmtzcGFjZUVkaXRSZXNwb25zZX0uXG4gICAqL1xuICBwdWJsaWMgb25BcHBseUVkaXQoY2FsbGJhY2s6IChwYXJhbXM6IGxzcC5BcHBseVdvcmtzcGFjZUVkaXRQYXJhbXMpID0+XG4gICAgUHJvbWlzZTxsc3AuQXBwbHlXb3Jrc3BhY2VFZGl0UmVzcG9uc2U+KTogdm9pZCB7XG4gICAgdGhpcy5fb25SZXF1ZXN0KHsgbWV0aG9kOiAnd29ya3NwYWNlL2FwcGx5RWRpdCcgfSwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB3b3Jrc3BhY2UvZGlkQ2hhbmdlQ29uZmlndXJhdGlvbmAgbm90aWZpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RGlkQ2hhbmdlQ29uZmlndXJhdGlvblBhcmFtc30gY29udGFpbmluZyB0aGUgbmV3IGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICBwdWJsaWMgZGlkQ2hhbmdlQ29uZmlndXJhdGlvbihwYXJhbXM6IGxzcC5EaWRDaGFuZ2VDb25maWd1cmF0aW9uUGFyYW1zKTogdm9pZCB7XG4gICAgdGhpcy5fc2VuZE5vdGlmaWNhdGlvbignd29ya3NwYWNlL2RpZENoYW5nZUNvbmZpZ3VyYXRpb24nLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvZGlkT3BlbmAgbm90aWZpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RGlkT3BlblRleHREb2N1bWVudFBhcmFtc30gY29udGFpbmluZyB0aGUgb3BlbmVkIHRleHQgZG9jdW1lbnQgZGV0YWlscy5cbiAgICovXG4gIHB1YmxpYyBkaWRPcGVuVGV4dERvY3VtZW50KHBhcmFtczogbHNwLkRpZE9wZW5UZXh0RG9jdW1lbnRQYXJhbXMpOiB2b2lkIHtcbiAgICB0aGlzLl9zZW5kTm90aWZpY2F0aW9uKCd0ZXh0RG9jdW1lbnQvZGlkT3BlbicsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9kaWRDaGFuZ2VgIG5vdGlmaWNhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0RpZENoYW5nZVRleHREb2N1bWVudFBhcmFtc30gY29udGFpbmluZyB0aGUgY2hhbmdlZCB0ZXh0IGRvY3VtZW50XG4gICAqICAgZGV0YWlscyBpbmNsdWRpbmcgdGhlIHZlcnNpb24gbnVtYmVyIGFuZCBhY3R1YWwgdGV4dCBjaGFuZ2VzLlxuICAgKi9cbiAgcHVibGljIGRpZENoYW5nZVRleHREb2N1bWVudChwYXJhbXM6IGxzcC5EaWRDaGFuZ2VUZXh0RG9jdW1lbnRQYXJhbXMpOiB2b2lkIHtcbiAgICB0aGlzLl9zZW5kTm90aWZpY2F0aW9uKCd0ZXh0RG9jdW1lbnQvZGlkQ2hhbmdlJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2RpZENsb3NlYCBub3RpZmljYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtEaWRDbG9zZVRleHREb2N1bWVudFBhcmFtc30gY29udGFpbmluZyB0aGUgb3BlbmVkIHRleHQgZG9jdW1lbnQgZGV0YWlscy5cbiAgICovXG4gIHB1YmxpYyBkaWRDbG9zZVRleHREb2N1bWVudChwYXJhbXM6IGxzcC5EaWRDbG9zZVRleHREb2N1bWVudFBhcmFtcyk6IHZvaWQge1xuICAgIHRoaXMuX3NlbmROb3RpZmljYXRpb24oJ3RleHREb2N1bWVudC9kaWRDbG9zZScsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC93aWxsU2F2ZWAgbm90aWZpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7V2lsbFNhdmVUZXh0RG9jdW1lbnRQYXJhbXN9IGNvbnRhaW5pbmcgdGhlIHRvLWJlLXNhdmVkIHRleHQgZG9jdW1lbnRcbiAgICogICBkZXRhaWxzIGFuZCB0aGUgcmVhc29uIGZvciB0aGUgc2F2ZS5cbiAgICovXG4gIHB1YmxpYyB3aWxsU2F2ZVRleHREb2N1bWVudChwYXJhbXM6IGxzcC5XaWxsU2F2ZVRleHREb2N1bWVudFBhcmFtcyk6IHZvaWQge1xuICAgIHRoaXMuX3NlbmROb3RpZmljYXRpb24oJ3RleHREb2N1bWVudC93aWxsU2F2ZScsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC93aWxsU2F2ZVdhaXRVbnRpbGAgbm90aWZpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7V2lsbFNhdmVUZXh0RG9jdW1lbnRQYXJhbXN9IGNvbnRhaW5pbmcgdGhlIHRvLWJlLXNhdmVkIHRleHQgZG9jdW1lbnRcbiAgICogICBkZXRhaWxzIGFuZCB0aGUgcmVhc29uIGZvciB0aGUgc2F2ZS5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbiB7QXJyYXl9IG9mIHtUZXh0RWRpdH1zIHRvIGJlIGFwcGxpZWQgdG8gdGhlIHRleHRcbiAgICogICBkb2N1bWVudCBiZWZvcmUgaXQgaXMgc2F2ZWQuXG4gICAqL1xuICBwdWJsaWMgd2lsbFNhdmVXYWl0VW50aWxUZXh0RG9jdW1lbnQocGFyYW1zOiBsc3AuV2lsbFNhdmVUZXh0RG9jdW1lbnRQYXJhbXMpOiBQcm9taXNlPGxzcC5UZXh0RWRpdFtdIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L3dpbGxTYXZlV2FpdFVudGlsJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2RpZFNhdmVgIG5vdGlmaWNhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0RpZFNhdmVUZXh0RG9jdW1lbnRQYXJhbXN9IGNvbnRhaW5pbmcgdGhlIHNhdmVkIHRleHQgZG9jdW1lbnQgZGV0YWlscy5cbiAgICovXG4gIHB1YmxpYyBkaWRTYXZlVGV4dERvY3VtZW50KHBhcmFtczogbHNwLkRpZFNhdmVUZXh0RG9jdW1lbnRQYXJhbXMpOiB2b2lkIHtcbiAgICB0aGlzLl9zZW5kTm90aWZpY2F0aW9uKCd0ZXh0RG9jdW1lbnQvZGlkU2F2ZScsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHdvcmtzcGFjZS9kaWRDaGFuZ2VXYXRjaGVkRmlsZXNgIG5vdGlmaWNhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0RpZENoYW5nZVdhdGNoZWRGaWxlc1BhcmFtc30gY29udGFpbmluZyB0aGUgYXJyYXkgb2Yge0ZpbGVFdmVudH1zIHRoYXRcbiAgICogICBoYXZlIGJlZW4gb2JzZXJ2ZWQgdXBvbiB0aGUgd2F0Y2hlZCBmaWxlcy5cbiAgICovXG4gIHB1YmxpYyBkaWRDaGFuZ2VXYXRjaGVkRmlsZXMocGFyYW1zOiBsc3AuRGlkQ2hhbmdlV2F0Y2hlZEZpbGVzUGFyYW1zKTogdm9pZCB7XG4gICAgdGhpcy5fc2VuZE5vdGlmaWNhdGlvbignd29ya3NwYWNlL2RpZENoYW5nZVdhdGNoZWRGaWxlcycsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBSZWdpc3RlciBhIGNhbGxiYWNrIGZvciB0aGUgYHRleHREb2N1bWVudC9wdWJsaXNoRGlhZ25vc3RpY3NgIG1lc3NhZ2UuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGB0ZXh0RG9jdW1lbnQvcHVibGlzaERpYWdub3N0aWNzYCBtZXNzYWdlIGlzXG4gICAqICAgcmVjZWl2ZWQgYSB7UHVibGlzaERpYWdub3N0aWNzUGFyYW1zfSBjb250YWluaW5nIG5ldyB7RGlhZ25vc3RpY30gbWVzc2FnZXMgZm9yIGEgZ2l2ZW4gdXJpLlxuICAgKi9cbiAgcHVibGljIG9uUHVibGlzaERpYWdub3N0aWNzKGNhbGxiYWNrOiAocGFyYW1zOiBsc3AuUHVibGlzaERpYWdub3N0aWNzUGFyYW1zKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5fb25Ob3RpZmljYXRpb24oeyBtZXRob2Q6ICd0ZXh0RG9jdW1lbnQvcHVibGlzaERpYWdub3N0aWNzJyB9LCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9jb21wbGV0aW9uYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7VGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXN9IG9yIHtDb21wbGV0aW9uUGFyYW1zfSBmb3Igd2hpY2hcbiAgICogICB7Q29tcGxldGlvbkl0ZW19cyBhcmUgZGVzaXJlZC5cbiAgICogQHBhcmFtIGNhbmNlbGxhdGlvblRva2VuIFRoZSB7Q2FuY2VsbGF0aW9uVG9rZW59IHRoYXQgaXMgdXNlZCB0byBjYW5jZWwgdGhpcyByZXF1ZXN0IGlmIG5lY2Vzc2FyeS5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBlaXRoZXIgYSB7Q29tcGxldGlvbkxpc3R9IG9yIGFuIHtBcnJheX0gb2Yge0NvbXBsZXRpb25JdGVtfXMuXG4gICAqL1xuICBwdWJsaWMgY29tcGxldGlvbihcbiAgICBwYXJhbXM6IGxzcC5UZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyB8IENvbXBsZXRpb25QYXJhbXMsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiBqc29ucnBjLkNhbmNlbGxhdGlvblRva2VuKTogUHJvbWlzZTxsc3AuQ29tcGxldGlvbkl0ZW1bXSB8IGxzcC5Db21wbGV0aW9uTGlzdCB8IG51bGw+IHtcbiAgICAvLyBDYW5jZWwgcHJpb3IgcmVxdWVzdCBpZiBuZWNlc3NhcnlcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3RleHREb2N1bWVudC9jb21wbGV0aW9uJywgcGFyYW1zLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYGNvbXBsZXRpb25JdGVtL3Jlc29sdmVgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtDb21wbGV0aW9uSXRlbX0gZm9yIHdoaWNoIGEgZnVsbHkgcmVzb2x2ZWQge0NvbXBsZXRpb25JdGVtfSBpcyBkZXNpcmVkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGEgZnVsbHkgcmVzb2x2ZWQge0NvbXBsZXRpb25JdGVtfS5cbiAgICovXG4gIHB1YmxpYyBjb21wbGV0aW9uSXRlbVJlc29sdmUocGFyYW1zOiBsc3AuQ29tcGxldGlvbkl0ZW0pOiBQcm9taXNlPGxzcC5Db21wbGV0aW9uSXRlbSB8IG51bGw+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ2NvbXBsZXRpb25JdGVtL3Jlc29sdmUnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvaG92ZXJgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtUZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtc30gZm9yIHdoaWNoIGEge0hvdmVyfSBpcyBkZXNpcmVkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGEge0hvdmVyfS5cbiAgICovXG4gIHB1YmxpYyBob3ZlcihwYXJhbXM6IGxzcC5UZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyk6IFByb21pc2U8bHNwLkhvdmVyIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L2hvdmVyJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L3NpZ25hdHVyZUhlbHBgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtUZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtc30gZm9yIHdoaWNoIGEge1NpZ25hdHVyZUhlbHB9IGlzIGRlc2lyZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYSB7U2lnbmF0dXJlSGVscH0uXG4gICAqL1xuICBwdWJsaWMgc2lnbmF0dXJlSGVscChwYXJhbXM6IGxzcC5UZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyk6IFByb21pc2U8bHNwLlNpZ25hdHVyZUhlbHAgfCBudWxsPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvc2lnbmF0dXJlSGVscCcsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9kZWZpbml0aW9uYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7VGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXN9IG9mIGEgc3ltYm9sIGZvciB3aGljaCBvbmUgb3IgbW9yZSB7TG9jYXRpb259c1xuICAgKiAgIHRoYXQgZGVmaW5lIHRoYXQgc3ltYm9sIGFyZSByZXF1aXJlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBlaXRoZXIgYSBzaW5nbGUge0xvY2F0aW9ufSBvciBhbiB7QXJyYXl9IG9mIG1hbnkge0xvY2F0aW9ufXMuXG4gICAqL1xuICBwdWJsaWMgZ290b0RlZmluaXRpb24ocGFyYW1zOiBsc3AuVGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMpOiBQcm9taXNlPGxzcC5Mb2NhdGlvbiB8IGxzcC5Mb2NhdGlvbltdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvZGVmaW5pdGlvbicsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9yZWZlcmVuY2VzYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7VGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXN9IG9mIGEgc3ltYm9sIGZvciB3aGljaCBhbGwgcmVmZXJyaW5nIHtMb2NhdGlvbn1zXG4gICAqICAgYXJlIGRlc2lyZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge0FycmF5fSBvZiB7TG9jYXRpb259cyB0aGF0IHJlZmVyZW5jZSB0aGlzIHN5bWJvbC5cbiAgICovXG4gIHB1YmxpYyBmaW5kUmVmZXJlbmNlcyhwYXJhbXM6IGxzcC5SZWZlcmVuY2VQYXJhbXMpOiBQcm9taXNlPGxzcC5Mb2NhdGlvbltdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvcmVmZXJlbmNlcycsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9kb2N1bWVudEhpZ2hsaWdodGAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge1RleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zfSBvZiBhIHN5bWJvbCBmb3Igd2hpY2ggYWxsIGhpZ2hsaWdodHMgYXJlIGRlc2lyZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge0FycmF5fSBvZiB7RG9jdW1lbnRIaWdobGlnaHR9cyB0aGF0IGNhbiBiZSB1c2VkIHRvXG4gICAqICAgaGlnaGxpZ2h0IHRoaXMgc3ltYm9sLlxuICAgKi9cbiAgcHVibGljIGRvY3VtZW50SGlnaGxpZ2h0KHBhcmFtczogbHNwLlRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKTogUHJvbWlzZTxsc3AuRG9jdW1lbnRIaWdobGlnaHRbXT4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L2RvY3VtZW50SGlnaGxpZ2h0JywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2RvY3VtZW50U3ltYm9sYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RG9jdW1lbnRTeW1ib2xQYXJhbXN9IHRoYXQgaWRlbnRpZmllcyB0aGUgZG9jdW1lbnQgZm9yIHdoaWNoXG4gICAqICAgc3ltYm9scyBhcmUgZGVzaXJlZC5cbiAgICogQHBhcmFtIGNhbmNlbGxhdGlvblRva2VuIFRoZSB7Q2FuY2VsbGF0aW9uVG9rZW59IHRoYXQgaXMgdXNlZCB0byBjYW5jZWwgdGhpcyByZXF1ZXN0IGlmXG4gICAqICAgbmVjZXNzYXJ5LlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGFuIHtBcnJheX0gb2Yge1N5bWJvbEluZm9ybWF0aW9ufXMgdGhhdCBjYW4gYmUgdXNlZCB0b1xuICAgKiAgIG5hdmlnYXRlIHRoaXMgZG9jdW1lbnQuXG4gICAqL1xuICBwdWJsaWMgZG9jdW1lbnRTeW1ib2woXG4gICAgcGFyYW1zOiBsc3AuRG9jdW1lbnRTeW1ib2xQYXJhbXMsXG4gICAgX2NhbmNlbGxhdGlvblRva2VuPzoganNvbnJwYy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgKTogUHJvbWlzZTxsc3AuU3ltYm9sSW5mb3JtYXRpb25bXSB8IGxzcC5Eb2N1bWVudFN5bWJvbFtdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvZG9jdW1lbnRTeW1ib2wnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB3b3Jrc3BhY2Uvc3ltYm9sYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7V29ya3NwYWNlU3ltYm9sUGFyYW1zfSBjb250YWluaW5nIHRoZSBxdWVyeSBzdHJpbmcgdG8gc2VhcmNoIHRoZSB3b3Jrc3BhY2UgZm9yLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGFuIHtBcnJheX0gb2Yge1N5bWJvbEluZm9ybWF0aW9ufXMgdGhhdCBpZGVudGlmeSB3aGVyZSB0aGUgcXVlcnlcbiAgICogICBzdHJpbmcgb2NjdXJzIHdpdGhpbiB0aGUgd29ya3NwYWNlLlxuICAgKi9cbiAgcHVibGljIHdvcmtzcGFjZVN5bWJvbChwYXJhbXM6IGxzcC5Xb3Jrc3BhY2VTeW1ib2xQYXJhbXMpOiBQcm9taXNlPGxzcC5TeW1ib2xJbmZvcm1hdGlvbltdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd3b3Jrc3BhY2Uvc3ltYm9sJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2NvZGVBY3Rpb25gIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtDb2RlQWN0aW9uUGFyYW1zfSBpZGVudGlmeWluZyB0aGUgZG9jdW1lbnQsIHJhbmdlIGFuZCBjb250ZXh0IGZvciB0aGUgY29kZSBhY3Rpb24uXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge0FycmF5fSBvZiB7Q29tbWFuZHN9cyB0aGF0IGNhbiBiZSBwZXJmb3JtZWQgYWdhaW5zdCB0aGUgZ2l2ZW5cbiAgICogICBkb2N1bWVudHMgcmFuZ2UuXG4gICAqL1xuICBwdWJsaWMgY29kZUFjdGlvbihwYXJhbXM6IGxzcC5Db2RlQWN0aW9uUGFyYW1zKTogUHJvbWlzZTwobHNwLkNvbW1hbmQgfCBsc3AuQ29kZUFjdGlvbilbXT4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L2NvZGVBY3Rpb24nLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvY29kZUxlbnNgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtDb2RlTGVuc1BhcmFtc30gaWRlbnRpZnlpbmcgdGhlIGRvY3VtZW50IGZvciB3aGljaCBjb2RlIGxlbnMgY29tbWFuZHMgYXJlIGRlc2lyZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge0FycmF5fSBvZiB7Q29kZUxlbnN9cyB0aGF0IGFzc29jaWF0ZSBjb21tYW5kcyBhbmQgZGF0YSB3aXRoXG4gICAqICAgc3BlY2lmaWVkIHJhbmdlcyB3aXRoaW4gdGhlIGRvY3VtZW50LlxuICAgKi9cbiAgcHVibGljIGNvZGVMZW5zKHBhcmFtczogbHNwLkNvZGVMZW5zUGFyYW1zKTogUHJvbWlzZTxsc3AuQ29kZUxlbnNbXT4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L2NvZGVMZW5zJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgY29kZUxlbnMvcmVzb2x2ZWAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0NvZGVMZW5zfSBpZGVudGlmeWluZyB0aGUgY29kZSBsZW5zIHRvIGJlIHJlc29sdmVkIHdpdGggZnVsbCBkZXRhaWwuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgdGhlIHtDb2RlTGVuc30gZnVsbHkgcmVzb2x2ZWQuXG4gICAqL1xuICBwdWJsaWMgY29kZUxlbnNSZXNvbHZlKHBhcmFtczogbHNwLkNvZGVMZW5zKTogUHJvbWlzZTxsc3AuQ29kZUxlbnMgfCBudWxsPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCdjb2RlTGVucy9yZXNvbHZlJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2RvY3VtZW50TGlua2AgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0RvY3VtZW50TGlua1BhcmFtc30gaWRlbnRpZnlpbmcgdGhlIGRvY3VtZW50IGZvciB3aGljaCBsaW5rcyBzaG91bGQgYmUgaWRlbnRpZmllZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbiB7QXJyYXl9IG9mIHtEb2N1bWVudExpbmt9cyByZWxhdGluZyB1cmkncyB0byBzcGVjaWZpYyByYW5nZXNcbiAgICogICB3aXRoaW4gdGhlIGRvY3VtZW50LlxuICAgKi9cbiAgcHVibGljIGRvY3VtZW50TGluayhwYXJhbXM6IGxzcC5Eb2N1bWVudExpbmtQYXJhbXMpOiBQcm9taXNlPGxzcC5Eb2N1bWVudExpbmtbXT4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L2RvY3VtZW50TGluaycsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYGRvY3VtZW50TGluay9yZXNvbHZlYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RG9jdW1lbnRMaW5rfSBpZGVudGlmeWluZyB0aGUgZG9jdW1lbnQgbGluayB0byBiZSByZXNvbHZlZCB3aXRoIGZ1bGwgZGV0YWlsLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIHRoZSB7RG9jdW1lbnRMaW5rfSBmdWxseSByZXNvbHZlZC5cbiAgICovXG4gIHB1YmxpYyBkb2N1bWVudExpbmtSZXNvbHZlKHBhcmFtczogbHNwLkRvY3VtZW50TGluayk6IFByb21pc2U8bHNwLkRvY3VtZW50TGluaz4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgnZG9jdW1lbnRMaW5rL3Jlc29sdmUnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvZm9ybWF0dGluZ2AgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0RvY3VtZW50Rm9ybWF0dGluZ1BhcmFtc30gaWRlbnRpZnlpbmcgdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZCBhcyB3ZWxsIGFzXG4gICAqICAgYWRkaXRpb25hbCBmb3JtYXR0aW5nIHByZWZlcmVuY2VzLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGFuIHtBcnJheX0gb2Yge1RleHRFZGl0fXMgdG8gYmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgdG9cbiAgICogICBjb3JyZWN0bHkgcmVmb3JtYXQgaXQuXG4gICAqL1xuICBwdWJsaWMgZG9jdW1lbnRGb3JtYXR0aW5nKHBhcmFtczogbHNwLkRvY3VtZW50Rm9ybWF0dGluZ1BhcmFtcyk6IFByb21pc2U8bHNwLlRleHRFZGl0W10+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3RleHREb2N1bWVudC9mb3JtYXR0aW5nJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L3JhbmdlRm9ybWF0dGluZ2AgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0RvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUGFyYW1zfSBpZGVudGlmeWluZyB0aGUgZG9jdW1lbnQgYW5kIHJhbmdlIHRvIGJlIGZvcm1hdHRlZFxuICAgKiAgIGFzIHdlbGwgYXMgYWRkaXRpb25hbCBmb3JtYXR0aW5nIHByZWZlcmVuY2VzLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGFuIHtBcnJheX0gb2Yge1RleHRFZGl0fXMgdG8gYmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgdG9cbiAgICogICBjb3JyZWN0bHkgcmVmb3JtYXQgaXQuXG4gICAqL1xuICBwdWJsaWMgZG9jdW1lbnRSYW5nZUZvcm1hdHRpbmcocGFyYW1zOiBsc3AuRG9jdW1lbnRSYW5nZUZvcm1hdHRpbmdQYXJhbXMpOiBQcm9taXNlPGxzcC5UZXh0RWRpdFtdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvcmFuZ2VGb3JtYXR0aW5nJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L29uVHlwZUZvcm1hdHRpbmdgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtEb2N1bWVudE9uVHlwZUZvcm1hdHRpbmdQYXJhbXN9IGlkZW50aWZ5aW5nIHRoZSBkb2N1bWVudCB0byBiZSBmb3JtYXR0ZWQsXG4gICAqICAgdGhlIGNoYXJhY3RlciB0aGF0IHdhcyB0eXBlZCBhbmQgYXQgd2hhdCBwb3NpdGlvbiBhcyB3ZWxsIGFzIGFkZGl0aW9uYWwgZm9ybWF0dGluZyBwcmVmZXJlbmNlcy5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbiB7QXJyYXl9IG9mIHtUZXh0RWRpdH1zIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGRvY3VtZW50IHRvXG4gICAqICAgY29ycmVjdGx5IHJlZm9ybWF0IGl0LlxuICAgKi9cbiAgcHVibGljIGRvY3VtZW50T25UeXBlRm9ybWF0dGluZyhwYXJhbXM6IGxzcC5Eb2N1bWVudE9uVHlwZUZvcm1hdHRpbmdQYXJhbXMpOiBQcm9taXNlPGxzcC5UZXh0RWRpdFtdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvb25UeXBlRm9ybWF0dGluZycsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9yZW5hbWVgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtSZW5hbWVQYXJhbXN9IGlkZW50aWZ5aW5nIHRoZSBkb2N1bWVudCBjb250YWluaW5nIHRoZSBzeW1ib2wgdG8gYmUgcmVuYW1lZCxcbiAgICogICBhcyB3ZWxsIGFzIHRoZSBwb3NpdGlvbiBhbmQgbmV3IG5hbWUuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge1dvcmtzcGFjZUVkaXR9IHRoYXQgY29udGFpbnMgYSBsaXN0IG9mIHtUZXh0RWRpdH1zIGVpdGhlclxuICAgKiAgIG9uIHRoZSBjaGFuZ2VzIHByb3BlcnR5IChrZXllZCBieSB1cmkpIG9yIHRoZSBkb2N1bWVudENoYW5nZXMgcHJvcGVydHkgY29udGFpbmluZ1xuICAgKiAgIGFuIHtBcnJheX0gb2Yge1RleHREb2N1bWVudEVkaXR9cyAocHJlZmVycmVkKS5cbiAgICovXG4gIHB1YmxpYyByZW5hbWUocGFyYW1zOiBsc3AuUmVuYW1lUGFyYW1zKTogUHJvbWlzZTxsc3AuV29ya3NwYWNlRWRpdD4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L3JlbmFtZScsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHdvcmtzcGFjZS9leGVjdXRlQ29tbWFuZGAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0V4ZWN1dGVDb21tYW5kUGFyYW1zfSBzcGVjaWZ5aW5nIHRoZSBjb21tYW5kIGFuZCBhcmd1bWVudHNcbiAgICogICB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHNob3VsZCBleGVjdXRlICh0aGVzZSBjb21tYW5kcyBhcmUgdXN1YWxseSBmcm9tIHtDb2RlTGVuc31cbiAgICogICBvciB7Q29kZUFjdGlvbn0gcmVzcG9uc2VzKS5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbnl0aGluZy5cbiAgICovXG4gIHB1YmxpYyBleGVjdXRlQ29tbWFuZChwYXJhbXM6IGxzcC5FeGVjdXRlQ29tbWFuZFBhcmFtcyk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd3b3Jrc3BhY2UvZXhlY3V0ZUNvbW1hbmQnLCBwYXJhbXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfb25SZXF1ZXN0PFQgZXh0ZW5kcyBFeHRyYWN0PGtleW9mIEtub3duUmVxdWVzdHMsIHN0cmluZz4+KFxuICAgIHR5cGU6IHsgbWV0aG9kOiBUIH0sIGNhbGxiYWNrOiBSZXF1ZXN0Q2FsbGJhY2s8VD4sXG4gICk6IHZvaWQge1xuICAgIHRoaXMuX3JwYy5vblJlcXVlc3QodHlwZS5tZXRob2QsICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5fbG9nLmRlYnVnKGBycGMub25SZXF1ZXN0ICR7dHlwZS5tZXRob2R9YCwgdmFsdWUpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKHZhbHVlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX29uTm90aWZpY2F0aW9uPFQgZXh0ZW5kcyBFeHRyYWN0PGtleW9mIEtub3duTm90aWZpY2F0aW9ucywgc3RyaW5nPj4oXG4gICAgdHlwZTogeyBtZXRob2Q6IFQgfSwgY2FsbGJhY2s6IChvYmo6IEtub3duTm90aWZpY2F0aW9uc1tUXSkgPT4gdm9pZCxcbiAgKTogdm9pZCB7XG4gICAgdGhpcy5fcnBjLm9uTm90aWZpY2F0aW9uKHR5cGUubWV0aG9kLCAodmFsdWU6IGFueSkgPT4ge1xuICAgICAgdGhpcy5fbG9nLmRlYnVnKGBycGMub25Ob3RpZmljYXRpb24gJHt0eXBlLm1ldGhvZH1gLCB2YWx1ZSk7XG4gICAgICBjYWxsYmFjayh2YWx1ZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9zZW5kTm90aWZpY2F0aW9uKG1ldGhvZDogc3RyaW5nLCBhcmdzPzogb2JqZWN0KTogdm9pZCB7XG4gICAgdGhpcy5fbG9nLmRlYnVnKGBycGMuc2VuZE5vdGlmaWNhdGlvbiAke21ldGhvZH1gLCBhcmdzKTtcbiAgICB0aGlzLl9ycGMuc2VuZE5vdGlmaWNhdGlvbihtZXRob2QsIGFyZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfc2VuZFJlcXVlc3QoXG4gICAgbWV0aG9kOiBzdHJpbmcsXG4gICAgYXJncz86IG9iamVjdCxcbiAgICBjYW5jZWxsYXRpb25Ub2tlbj86IGpzb25ycGMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICk6IFByb21pc2U8YW55PiB7XG4gICAgdGhpcy5fbG9nLmRlYnVnKGBycGMuc2VuZFJlcXVlc3QgJHttZXRob2R9IHNlbmRpbmdgLCBhcmdzKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIGxldCByZXN1bHQ7XG4gICAgICBpZiAoY2FuY2VsbGF0aW9uVG9rZW4pIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5fcnBjLnNlbmRSZXF1ZXN0KG1ldGhvZCwgYXJncywgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgY2FuY2VsbGF0aW9uVG9rZW4gaXMgbnVsbCBvciB1bmRlZmluZWQsIGRvbid0IGFkZCB0aGUgdGhpcmRcbiAgICAgICAgLy8gYXJndW1lbnQgb3RoZXJ3aXNlIHZzY29kZS1qc29ucnBjIHdpbGwgc2VuZCBhbiBhZGRpdGlvbmFsLCBudWxsXG4gICAgICAgIC8vIG1lc3NhZ2UgcGFyYW1ldGVyIHRvIHRoZSByZXF1ZXN0XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuX3JwYy5zZW5kUmVxdWVzdChtZXRob2QsIGFyZ3MpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0b29rID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydDtcbiAgICAgIHRoaXMuX2xvZy5kZWJ1ZyhgcnBjLnNlbmRSZXF1ZXN0ICR7bWV0aG9kfSByZWNlaXZlZCAoJHtNYXRoLmZsb29yKHRvb2spfW1zKWAsIHJlc3VsdCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlRXJyb3IgPSBlIGFzIGpzb25ycGMuUmVzcG9uc2VFcnJvcjxhbnk+O1xuICAgICAgaWYgKGNhbmNlbGxhdGlvblRva2VuICYmIHJlc3BvbnNlRXJyb3IuY29kZSA9PT0ganNvbnJwYy5FcnJvckNvZGVzLlJlcXVlc3RDYW5jZWxsZWQpIHtcbiAgICAgICAgdGhpcy5fbG9nLmRlYnVnKGBycGMuc2VuZFJlcXVlc3QgJHttZXRob2R9IHdhcyBjYW5jZWxsZWRgKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9sb2cuZXJyb3IoYHJwYy5zZW5kUmVxdWVzdCAke21ldGhvZH0gdGhyZXdgLCBlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgRGlhZ25vc3RpY0NvZGUgPSBudW1iZXIgfCBzdHJpbmc7XG5cbi8qKlxuICogQ29udGFpbnMgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY29udGV4dCBpbiB3aGljaCBhIGNvbXBsZXRpb24gcmVxdWVzdCBpcyB0cmlnZ2VyZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGxldGlvbkNvbnRleHQge1xuICAvKipcbiAgICogSG93IHRoZSBjb21wbGV0aW9uIHdhcyB0cmlnZ2VyZWQuXG4gICAqL1xuICB0cmlnZ2VyS2luZDogbHNwLkNvbXBsZXRpb25UcmlnZ2VyS2luZDtcblxuICAvKipcbiAgICogVGhlIHRyaWdnZXIgY2hhcmFjdGVyIChhIHNpbmdsZSBjaGFyYWN0ZXIpIHRoYXQgaGFzIHRyaWdnZXIgY29kZSBjb21wbGV0ZS5cbiAgICogSXMgdW5kZWZpbmVkIGlmIGB0cmlnZ2VyS2luZCAhPT0gQ29tcGxldGlvblRyaWdnZXJLaW5kLlRyaWdnZXJDaGFyYWN0ZXJgXG4gICAqL1xuICB0cmlnZ2VyQ2hhcmFjdGVyPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIENvbXBsZXRpb24gcGFyYW1ldGVyc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBsZXRpb25QYXJhbXMgZXh0ZW5kcyBsc3AuVGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMge1xuXG4gIC8qKlxuICAgKiBUaGUgY29tcGxldGlvbiBjb250ZXh0LiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGl0IHRoZSBjbGllbnQgc3BlY2lmaWVzXG4gICAqIHRvIHNlbmQgdGhpcyB1c2luZyBgQ2xpZW50Q2FwYWJpbGl0aWVzLnRleHREb2N1bWVudC5jb21wbGV0aW9uLmNvbnRleHRTdXBwb3J0ID09PSB0cnVlYFxuICAgKi9cbiAgY29udGV4dD86IENvbXBsZXRpb25Db250ZXh0O1xufVxuIl19