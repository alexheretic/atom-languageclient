"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VjbGllbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvbGFuZ3VhZ2VjbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUEwQztBQUUxQyxtQ0FBc0M7QUFDdEMscUNBR2tCO0FBRWxCLG9EQUErQztBQXVCL0M7OztHQUdHO0FBQ0gsTUFBYSx3QkFBeUIsU0FBUSxxQkFBWTtJQUt4RCxZQUFZLEdBQThCLEVBQUUsTUFBZTtRQUN6RCxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxJQUFJLElBQUksbUJBQVUsRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFYixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDckIsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7WUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLHdDQUF3QyxDQUFDLENBQUM7WUFDeEUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxZQUFZO1FBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ2pELElBQUksWUFBWSxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksWUFBWSxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUU7Z0JBQzlELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixZQUFZLENBQUMsTUFBTSxFQUFFLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzNGO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQzdEO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzVGLENBQUM7SUFFTSxPQUFPO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLFVBQVUsQ0FBQyxNQUE0QjtRQUM1QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCx5RUFBeUU7SUFDbEUsV0FBVztRQUNoQixJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxnRUFBZ0U7SUFDekQsUUFBUTtRQUNiLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsa0VBQWtFO0lBQzNELElBQUk7UUFDVCxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNJLFFBQVEsQ0FBQyxNQUFjLEVBQUUsUUFBK0I7UUFDN0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLGlCQUFpQixDQUFDLE1BQWMsRUFBRSxNQUF1QjtRQUM5RCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLHNCQUFzQixDQUFDLE1BQWMsRUFBRSxNQUF1QjtRQUNuRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLGFBQWEsQ0FBQyxRQUFpRDtRQUNwRSxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNJLG9CQUFvQixDQUFDLFFBQ2M7UUFDeEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSwyQkFBMkIsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLFlBQVksQ0FBQyxRQUFnRDtRQUNsRSxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksZ0JBQWdCLENBQUMsUUFBa0M7UUFDeEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxXQUFXLENBQUMsUUFDc0I7UUFDdkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksc0JBQXNCLENBQUMsTUFBd0M7UUFDcEUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtDQUFrQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksbUJBQW1CLENBQUMsTUFBcUM7UUFDOUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLHFCQUFxQixDQUFDLE1BQXVDO1FBQ2xFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLG9CQUFvQixDQUFDLE1BQXNDO1FBQ2hFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxvQkFBb0IsQ0FBQyxNQUFzQztRQUNoRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSSw2QkFBNkIsQ0FBQyxNQUFzQztRQUN6RSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxtQkFBbUIsQ0FBQyxNQUFxQztRQUM5RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0kscUJBQXFCLENBQUMsTUFBdUM7UUFDbEUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlDQUFpQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLG9CQUFvQixDQUFDLFFBQXdEO1FBQ2xGLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxNQUFNLEVBQUUsaUNBQWlDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLFVBQVUsQ0FDZixNQUF5RCxFQUN6RCxpQkFBNkM7UUFDN0Msb0NBQW9DO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsRUFBRSxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxxQkFBcUIsQ0FBQyxNQUEwQjtRQUNyRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsd0JBQXdCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksS0FBSyxDQUFDLE1BQXNDO1FBQ2pELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxhQUFhLENBQUMsTUFBc0M7UUFDekQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLDRCQUE0QixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxjQUFjLENBQUMsTUFBc0M7UUFDMUQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxjQUFjLENBQUMsTUFBMkI7UUFDL0MsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxpQkFBaUIsQ0FBQyxNQUFzQztRQUM3RCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNJLGNBQWMsQ0FDbkIsTUFBZ0MsRUFDaEMsa0JBQThDO1FBRTlDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyw2QkFBNkIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0ksZUFBZSxDQUFDLE1BQWlDO1FBQ3RELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0ksVUFBVSxDQUFDLE1BQTRCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0ksUUFBUSxDQUFDLE1BQTBCO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxlQUFlLENBQUMsTUFBb0I7UUFDekMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxZQUFZLENBQUMsTUFBOEI7UUFDaEQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLDJCQUEyQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLG1CQUFtQixDQUFDLE1BQXdCO1FBQ2pELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLGtCQUFrQixDQUFDLE1BQW9DO1FBQzVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLHVCQUF1QixDQUFDLE1BQXlDO1FBQ3RFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLHdCQUF3QixDQUFDLE1BQTBDO1FBQ3hFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQywrQkFBK0IsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSSxNQUFNLENBQUMsTUFBd0I7UUFDcEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksY0FBYyxDQUFDLE1BQWdDO1FBQ3BELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQywwQkFBMEIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRU8sVUFBVSxDQUNoQixJQUFtQixFQUFFLFFBQTRCO1FBRWpELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3ZELE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGVBQWUsQ0FDckIsSUFBbUIsRUFBRSxRQUE4QztRQUVuRSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBVSxFQUFFLEVBQUU7WUFDbkQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM1RCxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8saUJBQWlCLENBQUMsTUFBYyxFQUFFLElBQWE7UUFDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFYSxZQUFZLENBQ3hCLE1BQWMsRUFDZCxJQUFhLEVBQ2IsaUJBQTZDOztZQUU3QyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsTUFBTSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDM0QsSUFBSTtnQkFDRixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ2hDLElBQUksTUFBTSxDQUFDO2dCQUNYLElBQUksaUJBQWlCLEVBQUU7b0JBQ3JCLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztpQkFDdkU7cUJBQU07b0JBQ0wsaUVBQWlFO29CQUNqRSxrRUFBa0U7b0JBQ2xFLG1DQUFtQztvQkFDbkMsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNwRDtnQkFFRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO2dCQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsTUFBTSxjQUFjLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdEYsT0FBTyxNQUFNLENBQUM7YUFDZjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE1BQU0sYUFBYSxHQUFHLENBQStCLENBQUM7Z0JBQ3RELElBQUksaUJBQWlCLElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFO29CQUNuRixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsTUFBTSxnQkFBZ0IsQ0FBQyxDQUFDO2lCQUM1RDtxQkFDSTtvQkFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsTUFBTSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ3ZEO2dCQUVELE1BQU0sQ0FBQyxDQUFDO2FBQ1Q7UUFDSCxDQUFDO0tBQUE7Q0FDRjtBQWhnQkQsNERBZ2dCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGpzb25ycGMgZnJvbSAndnNjb2RlLWpzb25ycGMnO1xuaW1wb3J0ICogYXMgbHNwIGZyb20gJ3ZzY29kZS1sYW5ndWFnZXNlcnZlci1wcm90b2NvbCc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IHtcbiAgTnVsbExvZ2dlcixcbiAgTG9nZ2VyLFxufSBmcm9tICcuL2xvZ2dlcic7XG5cbmV4cG9ydCAqIGZyb20gJ3ZzY29kZS1sYW5ndWFnZXNlcnZlci1wcm90b2NvbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgS25vd25Ob3RpZmljYXRpb25zIHtcbiAgJ3RleHREb2N1bWVudC9wdWJsaXNoRGlhZ25vc3RpY3MnOiBsc3AuUHVibGlzaERpYWdub3N0aWNzUGFyYW1zO1xuICAndGVsZW1ldHJ5L2V2ZW50JzogYW55O1xuICAnd2luZG93L2xvZ01lc3NhZ2UnOiBsc3AuTG9nTWVzc2FnZVBhcmFtcztcbiAgJ3dpbmRvdy9zaG93TWVzc2FnZVJlcXVlc3QnOiBsc3AuU2hvd01lc3NhZ2VSZXF1ZXN0UGFyYW1zO1xuICAnd2luZG93L3Nob3dNZXNzYWdlJzogbHNwLlNob3dNZXNzYWdlUGFyYW1zO1xuICBbY3VzdG9tOiBzdHJpbmddOiBvYmplY3Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgS25vd25SZXF1ZXN0cyB7XG4gICd3aW5kb3cvc2hvd01lc3NhZ2VSZXF1ZXN0JzpcbiAgW2xzcC5TaG93TWVzc2FnZVJlcXVlc3RQYXJhbXMsIGxzcC5NZXNzYWdlQWN0aW9uSXRlbSB8IG51bGxdO1xuICAnd29ya3NwYWNlL2FwcGx5RWRpdCc6XG4gIFtsc3AuQXBwbHlXb3Jrc3BhY2VFZGl0UGFyYW1zLCBsc3AuQXBwbHlXb3Jrc3BhY2VFZGl0UmVzcG9uc2VdO1xufVxuXG5leHBvcnQgdHlwZSBSZXF1ZXN0Q2FsbGJhY2s8VCBleHRlbmRzIGtleW9mIEtub3duUmVxdWVzdHM+ID1cbiAgS25vd25SZXF1ZXN0c1tUXSBleHRlbmRzIFtpbmZlciBVLCBpbmZlciBWXSA/XG4gIChwYXJhbTogVSkgPT4gUHJvbWlzZTxWPiA6XG4gIG5ldmVyO1xuXG4vKipcbiAqIFR5cGVTY3JpcHQgd3JhcHBlciBhcm91bmQgSlNPTlJQQyB0byBpbXBsZW1lbnQgTWljcm9zb2Z0IExhbmd1YWdlIFNlcnZlciBQcm90b2NvbCB2M1xuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9sYW5ndWFnZS1zZXJ2ZXItcHJvdG9jb2wvYmxvYi9tYXN0ZXIvcHJvdG9jb2wubWRcbiAqL1xuZXhwb3J0IGNsYXNzIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIHByaXZhdGUgX3JwYzoganNvbnJwYy5NZXNzYWdlQ29ubmVjdGlvbjtcbiAgcHJpdmF0ZSBfbG9nOiBMb2dnZXI7XG4gIHB1YmxpYyBpc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihycGM6IGpzb25ycGMuTWVzc2FnZUNvbm5lY3Rpb24sIGxvZ2dlcj86IExvZ2dlcikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5fcnBjID0gcnBjO1xuICAgIHRoaXMuX2xvZyA9IGxvZ2dlciB8fCBuZXcgTnVsbExvZ2dlcigpO1xuICAgIHRoaXMuc2V0dXBMb2dnaW5nKCk7XG4gICAgcnBjLmxpc3RlbigpO1xuXG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWU7XG4gICAgdGhpcy5fcnBjLm9uQ2xvc2UoKCkgPT4ge1xuICAgICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5fbG9nLndhcm4oJ3JwYy5vbkNsb3NlJywgJ1RoZSBSUEMgY29ubmVjdGlvbiBjbG9zZWQgdW5leHBlY3RlZGx5Jyk7XG4gICAgICB0aGlzLmVtaXQoJ2Nsb3NlJyk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNldHVwTG9nZ2luZygpOiB2b2lkIHtcbiAgICB0aGlzLl9ycGMub25FcnJvcigoZXJyb3IpID0+IHRoaXMuX2xvZy5lcnJvcihbJ3JwYy5vbkVycm9yJywgZXJyb3JdKSk7XG4gICAgdGhpcy5fcnBjLm9uVW5oYW5kbGVkTm90aWZpY2F0aW9uKChub3RpZmljYXRpb24pID0+IHtcbiAgICAgIGlmIChub3RpZmljYXRpb24ubWV0aG9kICE9IG51bGwgJiYgbm90aWZpY2F0aW9uLnBhcmFtcyAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2xvZy53YXJuKGBycGMub25VbmhhbmRsZWROb3RpZmljYXRpb24gJHtub3RpZmljYXRpb24ubWV0aG9kfWAsIG5vdGlmaWNhdGlvbi5wYXJhbXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fbG9nLndhcm4oJ3JwYy5vblVuaGFuZGxlZE5vdGlmaWNhdGlvbicsIG5vdGlmaWNhdGlvbik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5fcnBjLm9uTm90aWZpY2F0aW9uKCguLi5hcmdzOiBhbnlbXSkgPT4gdGhpcy5fbG9nLmRlYnVnKCdycGMub25Ob3RpZmljYXRpb24nLCBhcmdzKSk7XG4gIH1cblxuICBwdWJsaWMgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9ycGMuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogSW5pdGlhbGl6ZSB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHdpdGggbmVjZXNzYXJ5IHtJbml0aWFsaXplUGFyYW1zfS5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0luaXRpYWxpemVQYXJhbXN9IGNvbnRhaW5pbmcgcHJvY2Vzc0lkLCByb290UGF0aCwgb3B0aW9ucyBhbmRcbiAgICogICBzZXJ2ZXIgY2FwYWJpbGl0aWVzLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIHRoZSB7SW5pdGlhbGl6ZVJlc3VsdH0gd2l0aCBkZXRhaWxzIG9mIHRoZSBzZXJ2ZXInc1xuICAgKiAgIGNhcGFiaWxpdGllcy5cbiAgICovXG4gIHB1YmxpYyBpbml0aWFsaXplKHBhcmFtczogbHNwLkluaXRpYWxpemVQYXJhbXMpOiBQcm9taXNlPGxzcC5Jbml0aWFsaXplUmVzdWx0PiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCdpbml0aWFsaXplJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKiBQdWJsaWM6IFNlbmQgYW4gYGluaXRpYWxpemVkYCBub3RpZmljYXRpb24gdG8gdGhlIGxhbmd1YWdlIHNlcnZlci4gKi9cbiAgcHVibGljIGluaXRpYWxpemVkKCk6IHZvaWQge1xuICAgIHRoaXMuX3NlbmROb3RpZmljYXRpb24oJ2luaXRpYWxpemVkJywge30pO1xuICB9XG5cbiAgLyoqIFB1YmxpYzogU2VuZCBhIGBzaHV0ZG93bmAgcmVxdWVzdCB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyLiAqL1xuICBwdWJsaWMgc2h1dGRvd24oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCdzaHV0ZG93bicpO1xuICB9XG5cbiAgLyoqIFB1YmxpYzogU2VuZCBhbiBgZXhpdGAgbm90aWZpY2F0aW9uIHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuICovXG4gIHB1YmxpYyBleGl0KCk6IHZvaWQge1xuICAgIHRoaXMuX3NlbmROb3RpZmljYXRpb24oJ2V4aXQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFJlZ2lzdGVyIGEgY2FsbGJhY2sgZm9yIGEgY3VzdG9tIG1lc3NhZ2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXRob2QgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgbmFtZSBvZiB0aGUgbWVzc2FnZSB0byBsaXN0ZW4gZm9yLlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBtZXNzYWdlIGlzIHJlY2VpdmVkLlxuICAgKiAgIFRoZSBwYXlsb2FkIGZyb20gdGhlIG1lc3NhZ2UgaXMgcGFzc2VkIHRvIHRoZSBmdW5jdGlvbi5cbiAgICovXG4gIHB1YmxpYyBvbkN1c3RvbShtZXRob2Q6IHN0cmluZywgY2FsbGJhY2s6IChvYmo6IG9iamVjdCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuX29uTm90aWZpY2F0aW9uKHsgbWV0aG9kIH0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBjdXN0b20gcmVxdWVzdFxuICAgKlxuICAgKiBAcGFyYW0gbWV0aG9kIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIG5hbWUgb2YgdGhlIHJlcXVlc3QgbWVzc2FnZS5cbiAgICogQHBhcmFtIHBhcmFtcyBUaGUgbWV0aG9kJ3MgcGFyYW1ldGVyc1xuICAgKi9cbiAgcHVibGljIHNlbmRDdXN0b21SZXF1ZXN0KG1ldGhvZDogc3RyaW5nLCBwYXJhbXM/OiBhbnlbXSB8IG9iamVjdCk6IFByb21pc2U8YW55IHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdChtZXRob2QsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgY3VzdG9tIG5vdGlmaWNhdGlvblxuICAgKlxuICAgKiBAcGFyYW0gbWV0aG9kIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIG5hbWUgb2YgdGhlIG5vdGlmaWNhdGlvbiBtZXNzYWdlLlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSBtZXRob2QncyBwYXJhbWV0ZXJzXG4gICAqL1xuICBwdWJsaWMgc2VuZEN1c3RvbU5vdGlmaWNhdGlvbihtZXRob2Q6IHN0cmluZywgcGFyYW1zPzogYW55W10gfCBvYmplY3QpOiB2b2lkIHtcbiAgICB0aGlzLl9zZW5kTm90aWZpY2F0aW9uKG1ldGhvZCwgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFJlZ2lzdGVyIGEgY2FsbGJhY2sgZm9yIHRoZSBgd2luZG93L3Nob3dNZXNzYWdlYCBtZXNzYWdlLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBgd2luZG93L3Nob3dNZXNzYWdlYCBtZXNzYWdlIGlzXG4gICAqICAgcmVjZWl2ZWQgd2l0aCB7U2hvd01lc3NhZ2VQYXJhbXN9IGJlaW5nIHBhc3NlZC5cbiAgICovXG4gIHB1YmxpYyBvblNob3dNZXNzYWdlKGNhbGxiYWNrOiAocGFyYW1zOiBsc3AuU2hvd01lc3NhZ2VQYXJhbXMpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLl9vbk5vdGlmaWNhdGlvbih7IG1ldGhvZDogJ3dpbmRvdy9zaG93TWVzc2FnZScgfSwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogUmVnaXN0ZXIgYSBjYWxsYmFjayBmb3IgdGhlIGB3aW5kb3cvc2hvd01lc3NhZ2VSZXF1ZXN0YCBtZXNzYWdlLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBgd2luZG93L3Nob3dNZXNzYWdlUmVxdWVzdGAgbWVzc2FnZSBpc1xuICAgKiAgIHJlY2VpdmVkIHdpdGgge1Nob3dNZXNzYWdlUmVxdWVzdFBhcmFtfScgYmVpbmcgcGFzc2VkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIHRoZSB7TWVzc2FnZUFjdGlvbkl0ZW19LlxuICAgKi9cbiAgcHVibGljIG9uU2hvd01lc3NhZ2VSZXF1ZXN0KGNhbGxiYWNrOiAocGFyYW1zOiBsc3AuU2hvd01lc3NhZ2VSZXF1ZXN0UGFyYW1zKVxuICAgID0+IFByb21pc2U8bHNwLk1lc3NhZ2VBY3Rpb25JdGVtIHwgbnVsbD4pOiB2b2lkIHtcbiAgICB0aGlzLl9vblJlcXVlc3QoeyBtZXRob2Q6ICd3aW5kb3cvc2hvd01lc3NhZ2VSZXF1ZXN0JyB9LCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBSZWdpc3RlciBhIGNhbGxiYWNrIGZvciB0aGUgYHdpbmRvdy9sb2dNZXNzYWdlYCBtZXNzYWdlLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBgd2luZG93L2xvZ01lc3NhZ2VgIG1lc3NhZ2UgaXNcbiAgICogICByZWNlaXZlZCB3aXRoIHtMb2dNZXNzYWdlUGFyYW1zfSBiZWluZyBwYXNzZWQuXG4gICAqL1xuICBwdWJsaWMgb25Mb2dNZXNzYWdlKGNhbGxiYWNrOiAocGFyYW1zOiBsc3AuTG9nTWVzc2FnZVBhcmFtcykgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuX29uTm90aWZpY2F0aW9uKHsgbWV0aG9kOiAnd2luZG93L2xvZ01lc3NhZ2UnIH0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFJlZ2lzdGVyIGEgY2FsbGJhY2sgZm9yIHRoZSBgdGVsZW1ldHJ5L2V2ZW50YCBtZXNzYWdlLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBgdGVsZW1ldHJ5L2V2ZW50YCBtZXNzYWdlIGlzXG4gICAqICAgcmVjZWl2ZWQgd2l0aCBhbnkgcGFyYW1ldGVycyByZWNlaXZlZCBiZWluZyBwYXNzZWQgb24uXG4gICAqL1xuICBwdWJsaWMgb25UZWxlbWV0cnlFdmVudChjYWxsYmFjazogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5fb25Ob3RpZmljYXRpb24oeyBtZXRob2Q6ICd0ZWxlbWV0cnkvZXZlbnQnIH0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFJlZ2lzdGVyIGEgY2FsbGJhY2sgZm9yIHRoZSBgd29ya3NwYWNlL2FwcGx5RWRpdGAgbWVzc2FnZS5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYHdvcmtzcGFjZS9hcHBseUVkaXRgIG1lc3NhZ2UgaXNcbiAgICogICByZWNlaXZlZCB3aXRoIHtBcHBseVdvcmtzcGFjZUVkaXRQYXJhbXN9IGJlaW5nIHBhc3NlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyB0aGUge0FwcGx5V29ya3NwYWNlRWRpdFJlc3BvbnNlfS5cbiAgICovXG4gIHB1YmxpYyBvbkFwcGx5RWRpdChjYWxsYmFjazogKHBhcmFtczogbHNwLkFwcGx5V29ya3NwYWNlRWRpdFBhcmFtcykgPT5cbiAgICBQcm9taXNlPGxzcC5BcHBseVdvcmtzcGFjZUVkaXRSZXNwb25zZT4pOiB2b2lkIHtcbiAgICB0aGlzLl9vblJlcXVlc3QoeyBtZXRob2Q6ICd3b3Jrc3BhY2UvYXBwbHlFZGl0JyB9LCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHdvcmtzcGFjZS9kaWRDaGFuZ2VDb25maWd1cmF0aW9uYCBub3RpZmljYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtEaWRDaGFuZ2VDb25maWd1cmF0aW9uUGFyYW1zfSBjb250YWluaW5nIHRoZSBuZXcgY29uZmlndXJhdGlvbi5cbiAgICovXG4gIHB1YmxpYyBkaWRDaGFuZ2VDb25maWd1cmF0aW9uKHBhcmFtczogbHNwLkRpZENoYW5nZUNvbmZpZ3VyYXRpb25QYXJhbXMpOiB2b2lkIHtcbiAgICB0aGlzLl9zZW5kTm90aWZpY2F0aW9uKCd3b3Jrc3BhY2UvZGlkQ2hhbmdlQ29uZmlndXJhdGlvbicsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9kaWRPcGVuYCBub3RpZmljYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtEaWRPcGVuVGV4dERvY3VtZW50UGFyYW1zfSBjb250YWluaW5nIHRoZSBvcGVuZWQgdGV4dCBkb2N1bWVudCBkZXRhaWxzLlxuICAgKi9cbiAgcHVibGljIGRpZE9wZW5UZXh0RG9jdW1lbnQocGFyYW1zOiBsc3AuRGlkT3BlblRleHREb2N1bWVudFBhcmFtcyk6IHZvaWQge1xuICAgIHRoaXMuX3NlbmROb3RpZmljYXRpb24oJ3RleHREb2N1bWVudC9kaWRPcGVuJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2RpZENoYW5nZWAgbm90aWZpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RGlkQ2hhbmdlVGV4dERvY3VtZW50UGFyYW1zfSBjb250YWluaW5nIHRoZSBjaGFuZ2VkIHRleHQgZG9jdW1lbnRcbiAgICogICBkZXRhaWxzIGluY2x1ZGluZyB0aGUgdmVyc2lvbiBudW1iZXIgYW5kIGFjdHVhbCB0ZXh0IGNoYW5nZXMuXG4gICAqL1xuICBwdWJsaWMgZGlkQ2hhbmdlVGV4dERvY3VtZW50KHBhcmFtczogbHNwLkRpZENoYW5nZVRleHREb2N1bWVudFBhcmFtcyk6IHZvaWQge1xuICAgIHRoaXMuX3NlbmROb3RpZmljYXRpb24oJ3RleHREb2N1bWVudC9kaWRDaGFuZ2UnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvZGlkQ2xvc2VgIG5vdGlmaWNhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0RpZENsb3NlVGV4dERvY3VtZW50UGFyYW1zfSBjb250YWluaW5nIHRoZSBvcGVuZWQgdGV4dCBkb2N1bWVudCBkZXRhaWxzLlxuICAgKi9cbiAgcHVibGljIGRpZENsb3NlVGV4dERvY3VtZW50KHBhcmFtczogbHNwLkRpZENsb3NlVGV4dERvY3VtZW50UGFyYW1zKTogdm9pZCB7XG4gICAgdGhpcy5fc2VuZE5vdGlmaWNhdGlvbigndGV4dERvY3VtZW50L2RpZENsb3NlJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L3dpbGxTYXZlYCBub3RpZmljYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtXaWxsU2F2ZVRleHREb2N1bWVudFBhcmFtc30gY29udGFpbmluZyB0aGUgdG8tYmUtc2F2ZWQgdGV4dCBkb2N1bWVudFxuICAgKiAgIGRldGFpbHMgYW5kIHRoZSByZWFzb24gZm9yIHRoZSBzYXZlLlxuICAgKi9cbiAgcHVibGljIHdpbGxTYXZlVGV4dERvY3VtZW50KHBhcmFtczogbHNwLldpbGxTYXZlVGV4dERvY3VtZW50UGFyYW1zKTogdm9pZCB7XG4gICAgdGhpcy5fc2VuZE5vdGlmaWNhdGlvbigndGV4dERvY3VtZW50L3dpbGxTYXZlJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L3dpbGxTYXZlV2FpdFVudGlsYCBub3RpZmljYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtXaWxsU2F2ZVRleHREb2N1bWVudFBhcmFtc30gY29udGFpbmluZyB0aGUgdG8tYmUtc2F2ZWQgdGV4dCBkb2N1bWVudFxuICAgKiAgIGRldGFpbHMgYW5kIHRoZSByZWFzb24gZm9yIHRoZSBzYXZlLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGFuIHtBcnJheX0gb2Yge1RleHRFZGl0fXMgdG8gYmUgYXBwbGllZCB0byB0aGUgdGV4dFxuICAgKiAgIGRvY3VtZW50IGJlZm9yZSBpdCBpcyBzYXZlZC5cbiAgICovXG4gIHB1YmxpYyB3aWxsU2F2ZVdhaXRVbnRpbFRleHREb2N1bWVudChwYXJhbXM6IGxzcC5XaWxsU2F2ZVRleHREb2N1bWVudFBhcmFtcyk6IFByb21pc2U8bHNwLlRleHRFZGl0W10gfCBudWxsPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvd2lsbFNhdmVXYWl0VW50aWwnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvZGlkU2F2ZWAgbm90aWZpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RGlkU2F2ZVRleHREb2N1bWVudFBhcmFtc30gY29udGFpbmluZyB0aGUgc2F2ZWQgdGV4dCBkb2N1bWVudCBkZXRhaWxzLlxuICAgKi9cbiAgcHVibGljIGRpZFNhdmVUZXh0RG9jdW1lbnQocGFyYW1zOiBsc3AuRGlkU2F2ZVRleHREb2N1bWVudFBhcmFtcyk6IHZvaWQge1xuICAgIHRoaXMuX3NlbmROb3RpZmljYXRpb24oJ3RleHREb2N1bWVudC9kaWRTYXZlJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgd29ya3NwYWNlL2RpZENoYW5nZVdhdGNoZWRGaWxlc2Agbm90aWZpY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RGlkQ2hhbmdlV2F0Y2hlZEZpbGVzUGFyYW1zfSBjb250YWluaW5nIHRoZSBhcnJheSBvZiB7RmlsZUV2ZW50fXMgdGhhdFxuICAgKiAgIGhhdmUgYmVlbiBvYnNlcnZlZCB1cG9uIHRoZSB3YXRjaGVkIGZpbGVzLlxuICAgKi9cbiAgcHVibGljIGRpZENoYW5nZVdhdGNoZWRGaWxlcyhwYXJhbXM6IGxzcC5EaWRDaGFuZ2VXYXRjaGVkRmlsZXNQYXJhbXMpOiB2b2lkIHtcbiAgICB0aGlzLl9zZW5kTm90aWZpY2F0aW9uKCd3b3Jrc3BhY2UvZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFJlZ2lzdGVyIGEgY2FsbGJhY2sgZm9yIHRoZSBgdGV4dERvY3VtZW50L3B1Ymxpc2hEaWFnbm9zdGljc2AgbWVzc2FnZS5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgYHRleHREb2N1bWVudC9wdWJsaXNoRGlhZ25vc3RpY3NgIG1lc3NhZ2UgaXNcbiAgICogICByZWNlaXZlZCBhIHtQdWJsaXNoRGlhZ25vc3RpY3NQYXJhbXN9IGNvbnRhaW5pbmcgbmV3IHtEaWFnbm9zdGljfSBtZXNzYWdlcyBmb3IgYSBnaXZlbiB1cmkuXG4gICAqL1xuICBwdWJsaWMgb25QdWJsaXNoRGlhZ25vc3RpY3MoY2FsbGJhY2s6IChwYXJhbXM6IGxzcC5QdWJsaXNoRGlhZ25vc3RpY3NQYXJhbXMpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLl9vbk5vdGlmaWNhdGlvbih7IG1ldGhvZDogJ3RleHREb2N1bWVudC9wdWJsaXNoRGlhZ25vc3RpY3MnIH0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2NvbXBsZXRpb25gIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtUZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtc30gb3Ige0NvbXBsZXRpb25QYXJhbXN9IGZvciB3aGljaFxuICAgKiAgIHtDb21wbGV0aW9uSXRlbX1zIGFyZSBkZXNpcmVkLlxuICAgKiBAcGFyYW0gY2FuY2VsbGF0aW9uVG9rZW4gVGhlIHtDYW5jZWxsYXRpb25Ub2tlbn0gdGhhdCBpcyB1c2VkIHRvIGNhbmNlbCB0aGlzIHJlcXVlc3QgaWYgbmVjZXNzYXJ5LlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGVpdGhlciBhIHtDb21wbGV0aW9uTGlzdH0gb3IgYW4ge0FycmF5fSBvZiB7Q29tcGxldGlvbkl0ZW19cy5cbiAgICovXG4gIHB1YmxpYyBjb21wbGV0aW9uKFxuICAgIHBhcmFtczogbHNwLlRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zIHwgQ29tcGxldGlvblBhcmFtcyxcbiAgICBjYW5jZWxsYXRpb25Ub2tlbj86IGpzb25ycGMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBQcm9taXNlPGxzcC5Db21wbGV0aW9uSXRlbVtdIHwgbHNwLkNvbXBsZXRpb25MaXN0IHwgbnVsbD4ge1xuICAgIC8vIENhbmNlbCBwcmlvciByZXF1ZXN0IGlmIG5lY2Vzc2FyeVxuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L2NvbXBsZXRpb24nLCBwYXJhbXMsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgY29tcGxldGlvbkl0ZW0vcmVzb2x2ZWAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0NvbXBsZXRpb25JdGVtfSBmb3Igd2hpY2ggYSBmdWxseSByZXNvbHZlZCB7Q29tcGxldGlvbkl0ZW19IGlzIGRlc2lyZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYSBmdWxseSByZXNvbHZlZCB7Q29tcGxldGlvbkl0ZW19LlxuICAgKi9cbiAgcHVibGljIGNvbXBsZXRpb25JdGVtUmVzb2x2ZShwYXJhbXM6IGxzcC5Db21wbGV0aW9uSXRlbSk6IFByb21pc2U8bHNwLkNvbXBsZXRpb25JdGVtIHwgbnVsbD4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgnY29tcGxldGlvbkl0ZW0vcmVzb2x2ZScsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9ob3ZlcmAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge1RleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zfSBmb3Igd2hpY2ggYSB7SG92ZXJ9IGlzIGRlc2lyZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYSB7SG92ZXJ9LlxuICAgKi9cbiAgcHVibGljIGhvdmVyKHBhcmFtczogbHNwLlRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKTogUHJvbWlzZTxsc3AuSG92ZXIgfCBudWxsPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvaG92ZXInLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvc2lnbmF0dXJlSGVscGAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge1RleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zfSBmb3Igd2hpY2ggYSB7U2lnbmF0dXJlSGVscH0gaXMgZGVzaXJlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhIHtTaWduYXR1cmVIZWxwfS5cbiAgICovXG4gIHB1YmxpYyBzaWduYXR1cmVIZWxwKHBhcmFtczogbHNwLlRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKTogUHJvbWlzZTxsc3AuU2lnbmF0dXJlSGVscCB8IG51bGw+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3RleHREb2N1bWVudC9zaWduYXR1cmVIZWxwJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2RlZmluaXRpb25gIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtUZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtc30gb2YgYSBzeW1ib2wgZm9yIHdoaWNoIG9uZSBvciBtb3JlIHtMb2NhdGlvbn1zXG4gICAqICAgdGhhdCBkZWZpbmUgdGhhdCBzeW1ib2wgYXJlIHJlcXVpcmVkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGVpdGhlciBhIHNpbmdsZSB7TG9jYXRpb259IG9yIGFuIHtBcnJheX0gb2YgbWFueSB7TG9jYXRpb259cy5cbiAgICovXG4gIHB1YmxpYyBnb3RvRGVmaW5pdGlvbihwYXJhbXM6IGxzcC5UZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyk6IFByb21pc2U8bHNwLkxvY2F0aW9uIHwgbHNwLkxvY2F0aW9uW10+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3RleHREb2N1bWVudC9kZWZpbml0aW9uJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L3JlZmVyZW5jZXNgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtUZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtc30gb2YgYSBzeW1ib2wgZm9yIHdoaWNoIGFsbCByZWZlcnJpbmcge0xvY2F0aW9ufXNcbiAgICogICBhcmUgZGVzaXJlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbiB7QXJyYXl9IG9mIHtMb2NhdGlvbn1zIHRoYXQgcmVmZXJlbmNlIHRoaXMgc3ltYm9sLlxuICAgKi9cbiAgcHVibGljIGZpbmRSZWZlcmVuY2VzKHBhcmFtczogbHNwLlJlZmVyZW5jZVBhcmFtcyk6IFByb21pc2U8bHNwLkxvY2F0aW9uW10+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3RleHREb2N1bWVudC9yZWZlcmVuY2VzJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L2RvY3VtZW50SGlnaGxpZ2h0YCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7VGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXN9IG9mIGEgc3ltYm9sIGZvciB3aGljaCBhbGwgaGlnaGxpZ2h0cyBhcmUgZGVzaXJlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbiB7QXJyYXl9IG9mIHtEb2N1bWVudEhpZ2hsaWdodH1zIHRoYXQgY2FuIGJlIHVzZWQgdG9cbiAgICogICBoaWdobGlnaHQgdGhpcyBzeW1ib2wuXG4gICAqL1xuICBwdWJsaWMgZG9jdW1lbnRIaWdobGlnaHQocGFyYW1zOiBsc3AuVGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMpOiBQcm9taXNlPGxzcC5Eb2N1bWVudEhpZ2hsaWdodFtdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvZG9jdW1lbnRIaWdobGlnaHQnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvZG9jdW1lbnRTeW1ib2xgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtEb2N1bWVudFN5bWJvbFBhcmFtc30gdGhhdCBpZGVudGlmaWVzIHRoZSBkb2N1bWVudCBmb3Igd2hpY2hcbiAgICogICBzeW1ib2xzIGFyZSBkZXNpcmVkLlxuICAgKiBAcGFyYW0gY2FuY2VsbGF0aW9uVG9rZW4gVGhlIHtDYW5jZWxsYXRpb25Ub2tlbn0gdGhhdCBpcyB1c2VkIHRvIGNhbmNlbCB0aGlzIHJlcXVlc3QgaWZcbiAgICogICBuZWNlc3NhcnkuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge0FycmF5fSBvZiB7U3ltYm9sSW5mb3JtYXRpb259cyB0aGF0IGNhbiBiZSB1c2VkIHRvXG4gICAqICAgbmF2aWdhdGUgdGhpcyBkb2N1bWVudC5cbiAgICovXG4gIHB1YmxpYyBkb2N1bWVudFN5bWJvbChcbiAgICBwYXJhbXM6IGxzcC5Eb2N1bWVudFN5bWJvbFBhcmFtcyxcbiAgICBfY2FuY2VsbGF0aW9uVG9rZW4/OiBqc29ucnBjLkNhbmNlbGxhdGlvblRva2VuLFxuICApOiBQcm9taXNlPGxzcC5TeW1ib2xJbmZvcm1hdGlvbltdIHwgbHNwLkRvY3VtZW50U3ltYm9sW10+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3RleHREb2N1bWVudC9kb2N1bWVudFN5bWJvbCcsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHdvcmtzcGFjZS9zeW1ib2xgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtXb3Jrc3BhY2VTeW1ib2xQYXJhbXN9IGNvbnRhaW5pbmcgdGhlIHF1ZXJ5IHN0cmluZyB0byBzZWFyY2ggdGhlIHdvcmtzcGFjZSBmb3IuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge0FycmF5fSBvZiB7U3ltYm9sSW5mb3JtYXRpb259cyB0aGF0IGlkZW50aWZ5IHdoZXJlIHRoZSBxdWVyeVxuICAgKiAgIHN0cmluZyBvY2N1cnMgd2l0aGluIHRoZSB3b3Jrc3BhY2UuXG4gICAqL1xuICBwdWJsaWMgd29ya3NwYWNlU3ltYm9sKHBhcmFtczogbHNwLldvcmtzcGFjZVN5bWJvbFBhcmFtcyk6IFByb21pc2U8bHNwLlN5bWJvbEluZm9ybWF0aW9uW10+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3dvcmtzcGFjZS9zeW1ib2wnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvY29kZUFjdGlvbmAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0NvZGVBY3Rpb25QYXJhbXN9IGlkZW50aWZ5aW5nIHRoZSBkb2N1bWVudCwgcmFuZ2UgYW5kIGNvbnRleHQgZm9yIHRoZSBjb2RlIGFjdGlvbi5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbiB7QXJyYXl9IG9mIHtDb21tYW5kc31zIHRoYXQgY2FuIGJlIHBlcmZvcm1lZCBhZ2FpbnN0IHRoZSBnaXZlblxuICAgKiAgIGRvY3VtZW50cyByYW5nZS5cbiAgICovXG4gIHB1YmxpYyBjb2RlQWN0aW9uKHBhcmFtczogbHNwLkNvZGVBY3Rpb25QYXJhbXMpOiBQcm9taXNlPEFycmF5PGxzcC5Db21tYW5kIHwgbHNwLkNvZGVBY3Rpb24+PiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvY29kZUFjdGlvbicsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9jb2RlTGVuc2AgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0NvZGVMZW5zUGFyYW1zfSBpZGVudGlmeWluZyB0aGUgZG9jdW1lbnQgZm9yIHdoaWNoIGNvZGUgbGVucyBjb21tYW5kcyBhcmUgZGVzaXJlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbiB7QXJyYXl9IG9mIHtDb2RlTGVuc31zIHRoYXQgYXNzb2NpYXRlIGNvbW1hbmRzIGFuZCBkYXRhIHdpdGhcbiAgICogICBzcGVjaWZpZWQgcmFuZ2VzIHdpdGhpbiB0aGUgZG9jdW1lbnQuXG4gICAqL1xuICBwdWJsaWMgY29kZUxlbnMocGFyYW1zOiBsc3AuQ29kZUxlbnNQYXJhbXMpOiBQcm9taXNlPGxzcC5Db2RlTGVuc1tdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvY29kZUxlbnMnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGBjb2RlTGVucy9yZXNvbHZlYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7Q29kZUxlbnN9IGlkZW50aWZ5aW5nIHRoZSBjb2RlIGxlbnMgdG8gYmUgcmVzb2x2ZWQgd2l0aCBmdWxsIGRldGFpbC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyB0aGUge0NvZGVMZW5zfSBmdWxseSByZXNvbHZlZC5cbiAgICovXG4gIHB1YmxpYyBjb2RlTGVuc1Jlc29sdmUocGFyYW1zOiBsc3AuQ29kZUxlbnMpOiBQcm9taXNlPGxzcC5Db2RlTGVucyB8IG51bGw+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ2NvZGVMZW5zL3Jlc29sdmUnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvZG9jdW1lbnRMaW5rYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RG9jdW1lbnRMaW5rUGFyYW1zfSBpZGVudGlmeWluZyB0aGUgZG9jdW1lbnQgZm9yIHdoaWNoIGxpbmtzIHNob3VsZCBiZSBpZGVudGlmaWVkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGFuIHtBcnJheX0gb2Yge0RvY3VtZW50TGlua31zIHJlbGF0aW5nIHVyaSdzIHRvIHNwZWNpZmljIHJhbmdlc1xuICAgKiAgIHdpdGhpbiB0aGUgZG9jdW1lbnQuXG4gICAqL1xuICBwdWJsaWMgZG9jdW1lbnRMaW5rKHBhcmFtczogbHNwLkRvY3VtZW50TGlua1BhcmFtcyk6IFByb21pc2U8bHNwLkRvY3VtZW50TGlua1tdPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvZG9jdW1lbnRMaW5rJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgZG9jdW1lbnRMaW5rL3Jlc29sdmVgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtEb2N1bWVudExpbmt9IGlkZW50aWZ5aW5nIHRoZSBkb2N1bWVudCBsaW5rIHRvIGJlIHJlc29sdmVkIHdpdGggZnVsbCBkZXRhaWwuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgdGhlIHtEb2N1bWVudExpbmt9IGZ1bGx5IHJlc29sdmVkLlxuICAgKi9cbiAgcHVibGljIGRvY3VtZW50TGlua1Jlc29sdmUocGFyYW1zOiBsc3AuRG9jdW1lbnRMaW5rKTogUHJvbWlzZTxsc3AuRG9jdW1lbnRMaW5rPiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCdkb2N1bWVudExpbmsvcmVzb2x2ZScsIHBhcmFtcyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIGEgYHRleHREb2N1bWVudC9mb3JtYXR0aW5nYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RG9jdW1lbnRGb3JtYXR0aW5nUGFyYW1zfSBpZGVudGlmeWluZyB0aGUgZG9jdW1lbnQgdG8gYmUgZm9ybWF0dGVkIGFzIHdlbGwgYXNcbiAgICogICBhZGRpdGlvbmFsIGZvcm1hdHRpbmcgcHJlZmVyZW5jZXMuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge0FycmF5fSBvZiB7VGV4dEVkaXR9cyB0byBiZSBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCB0b1xuICAgKiAgIGNvcnJlY3RseSByZWZvcm1hdCBpdC5cbiAgICovXG4gIHB1YmxpYyBkb2N1bWVudEZvcm1hdHRpbmcocGFyYW1zOiBsc3AuRG9jdW1lbnRGb3JtYXR0aW5nUGFyYW1zKTogUHJvbWlzZTxsc3AuVGV4dEVkaXRbXT4ge1xuICAgIHJldHVybiB0aGlzLl9zZW5kUmVxdWVzdCgndGV4dERvY3VtZW50L2Zvcm1hdHRpbmcnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvcmFuZ2VGb3JtYXR0aW5nYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RG9jdW1lbnRSYW5nZUZvcm1hdHRpbmdQYXJhbXN9IGlkZW50aWZ5aW5nIHRoZSBkb2N1bWVudCBhbmQgcmFuZ2UgdG8gYmUgZm9ybWF0dGVkXG4gICAqICAgYXMgd2VsbCBhcyBhZGRpdGlvbmFsIGZvcm1hdHRpbmcgcHJlZmVyZW5jZXMuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYW4ge0FycmF5fSBvZiB7VGV4dEVkaXR9cyB0byBiZSBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCB0b1xuICAgKiAgIGNvcnJlY3RseSByZWZvcm1hdCBpdC5cbiAgICovXG4gIHB1YmxpYyBkb2N1bWVudFJhbmdlRm9ybWF0dGluZyhwYXJhbXM6IGxzcC5Eb2N1bWVudFJhbmdlRm9ybWF0dGluZ1BhcmFtcyk6IFByb21pc2U8bHNwLlRleHRFZGl0W10+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3RleHREb2N1bWVudC9yYW5nZUZvcm1hdHRpbmcnLCBwYXJhbXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCBhIGB0ZXh0RG9jdW1lbnQvb25UeXBlRm9ybWF0dGluZ2AgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0RvY3VtZW50T25UeXBlRm9ybWF0dGluZ1BhcmFtc30gaWRlbnRpZnlpbmcgdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZCxcbiAgICogICB0aGUgY2hhcmFjdGVyIHRoYXQgd2FzIHR5cGVkIGFuZCBhdCB3aGF0IHBvc2l0aW9uIGFzIHdlbGwgYXMgYWRkaXRpb25hbCBmb3JtYXR0aW5nIHByZWZlcmVuY2VzLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGFuIHtBcnJheX0gb2Yge1RleHRFZGl0fXMgdG8gYmUgYXBwbGllZCB0byB0aGUgZG9jdW1lbnQgdG9cbiAgICogICBjb3JyZWN0bHkgcmVmb3JtYXQgaXQuXG4gICAqL1xuICBwdWJsaWMgZG9jdW1lbnRPblR5cGVGb3JtYXR0aW5nKHBhcmFtczogbHNwLkRvY3VtZW50T25UeXBlRm9ybWF0dGluZ1BhcmFtcyk6IFByb21pc2U8bHNwLlRleHRFZGl0W10+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3RleHREb2N1bWVudC9vblR5cGVGb3JtYXR0aW5nJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgdGV4dERvY3VtZW50L3JlbmFtZWAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge1JlbmFtZVBhcmFtc30gaWRlbnRpZnlpbmcgdGhlIGRvY3VtZW50IGNvbnRhaW5pbmcgdGhlIHN5bWJvbCB0byBiZSByZW5hbWVkLFxuICAgKiAgIGFzIHdlbGwgYXMgdGhlIHBvc2l0aW9uIGFuZCBuZXcgbmFtZS5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyBhbiB7V29ya3NwYWNlRWRpdH0gdGhhdCBjb250YWlucyBhIGxpc3Qgb2Yge1RleHRFZGl0fXMgZWl0aGVyXG4gICAqICAgb24gdGhlIGNoYW5nZXMgcHJvcGVydHkgKGtleWVkIGJ5IHVyaSkgb3IgdGhlIGRvY3VtZW50Q2hhbmdlcyBwcm9wZXJ0eSBjb250YWluaW5nXG4gICAqICAgYW4ge0FycmF5fSBvZiB7VGV4dERvY3VtZW50RWRpdH1zIChwcmVmZXJyZWQpLlxuICAgKi9cbiAgcHVibGljIHJlbmFtZShwYXJhbXM6IGxzcC5SZW5hbWVQYXJhbXMpOiBQcm9taXNlPGxzcC5Xb3Jrc3BhY2VFZGl0PiB7XG4gICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0KCd0ZXh0RG9jdW1lbnQvcmVuYW1lJywgcGFyYW1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgYSBgd29ya3NwYWNlL2V4ZWN1dGVDb21tYW5kYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIFRoZSB7RXhlY3V0ZUNvbW1hbmRQYXJhbXN9IHNwZWNpZnlpbmcgdGhlIGNvbW1hbmQgYW5kIGFyZ3VtZW50c1xuICAgKiAgIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgc2hvdWxkIGV4ZWN1dGUgKHRoZXNlIGNvbW1hbmRzIGFyZSB1c3VhbGx5IGZyb20ge0NvZGVMZW5zfVxuICAgKiAgIG9yIHtDb2RlQWN0aW9ufSByZXNwb25zZXMpLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBjb250YWluaW5nIGFueXRoaW5nLlxuICAgKi9cbiAgcHVibGljIGV4ZWN1dGVDb21tYW5kKHBhcmFtczogbHNwLkV4ZWN1dGVDb21tYW5kUGFyYW1zKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3QoJ3dvcmtzcGFjZS9leGVjdXRlQ29tbWFuZCcsIHBhcmFtcyk7XG4gIH1cblxuICBwcml2YXRlIF9vblJlcXVlc3Q8VCBleHRlbmRzIEV4dHJhY3Q8a2V5b2YgS25vd25SZXF1ZXN0cywgc3RyaW5nPj4oXG4gICAgdHlwZTogeyBtZXRob2Q6IFQgfSwgY2FsbGJhY2s6IFJlcXVlc3RDYWxsYmFjazxUPixcbiAgKTogdm9pZCB7XG4gICAgdGhpcy5fcnBjLm9uUmVxdWVzdCh0eXBlLm1ldGhvZCwgKHZhbHVlKSA9PiB7XG4gICAgICB0aGlzLl9sb2cuZGVidWcoYHJwYy5vblJlcXVlc3QgJHt0eXBlLm1ldGhvZH1gLCB2YWx1ZSk7XG4gICAgICByZXR1cm4gY2FsbGJhY2sodmFsdWUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfb25Ob3RpZmljYXRpb248VCBleHRlbmRzIEV4dHJhY3Q8a2V5b2YgS25vd25Ob3RpZmljYXRpb25zLCBzdHJpbmc+PihcbiAgICB0eXBlOiB7IG1ldGhvZDogVCB9LCBjYWxsYmFjazogKG9iajogS25vd25Ob3RpZmljYXRpb25zW1RdKSA9PiB2b2lkLFxuICApOiB2b2lkIHtcbiAgICB0aGlzLl9ycGMub25Ob3RpZmljYXRpb24odHlwZS5tZXRob2QsICh2YWx1ZTogYW55KSA9PiB7XG4gICAgICB0aGlzLl9sb2cuZGVidWcoYHJwYy5vbk5vdGlmaWNhdGlvbiAke3R5cGUubWV0aG9kfWAsIHZhbHVlKTtcbiAgICAgIGNhbGxiYWNrKHZhbHVlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX3NlbmROb3RpZmljYXRpb24obWV0aG9kOiBzdHJpbmcsIGFyZ3M/OiBvYmplY3QpOiB2b2lkIHtcbiAgICB0aGlzLl9sb2cuZGVidWcoYHJwYy5zZW5kTm90aWZpY2F0aW9uICR7bWV0aG9kfWAsIGFyZ3MpO1xuICAgIHRoaXMuX3JwYy5zZW5kTm90aWZpY2F0aW9uKG1ldGhvZCwgYXJncyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIF9zZW5kUmVxdWVzdChcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBhcmdzPzogb2JqZWN0LFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzoganNvbnJwYy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgKTogUHJvbWlzZTxhbnk+IHtcbiAgICB0aGlzLl9sb2cuZGVidWcoYHJwYy5zZW5kUmVxdWVzdCAke21ldGhvZH0gc2VuZGluZ2AsIGFyZ3MpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgbGV0IHJlc3VsdDtcbiAgICAgIGlmIChjYW5jZWxsYXRpb25Ub2tlbikge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGlzLl9ycGMuc2VuZFJlcXVlc3QobWV0aG9kLCBhcmdzLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiBjYW5jZWxsYXRpb25Ub2tlbiBpcyBudWxsIG9yIHVuZGVmaW5lZCwgZG9uJ3QgYWRkIHRoZSB0aGlyZFxuICAgICAgICAvLyBhcmd1bWVudCBvdGhlcndpc2UgdnNjb2RlLWpzb25ycGMgd2lsbCBzZW5kIGFuIGFkZGl0aW9uYWwsIG51bGxcbiAgICAgICAgLy8gbWVzc2FnZSBwYXJhbWV0ZXIgdG8gdGhlIHJlcXVlc3RcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5fcnBjLnNlbmRSZXF1ZXN0KG1ldGhvZCwgYXJncyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRvb2sgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0O1xuICAgICAgdGhpcy5fbG9nLmRlYnVnKGBycGMuc2VuZFJlcXVlc3QgJHttZXRob2R9IHJlY2VpdmVkICgke01hdGguZmxvb3IodG9vayl9bXMpYCwgcmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc3QgcmVzcG9uc2VFcnJvciA9IGUgYXMganNvbnJwYy5SZXNwb25zZUVycm9yPGFueT47XG4gICAgICBpZiAoY2FuY2VsbGF0aW9uVG9rZW4gJiYgcmVzcG9uc2VFcnJvci5jb2RlID09PSBqc29ucnBjLkVycm9yQ29kZXMuUmVxdWVzdENhbmNlbGxlZCkge1xuICAgICAgICB0aGlzLl9sb2cuZGVidWcoYHJwYy5zZW5kUmVxdWVzdCAke21ldGhvZH0gd2FzIGNhbmNlbGxlZGApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2xvZy5lcnJvcihgcnBjLnNlbmRSZXF1ZXN0ICR7bWV0aG9kfSB0aHJld2AsIGUpO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgdHlwZSBEaWFnbm9zdGljQ29kZSA9IG51bWJlciB8IHN0cmluZztcblxuLyoqXG4gKiBDb250YWlucyBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjb250ZXh0IGluIHdoaWNoIGEgY29tcGxldGlvbiByZXF1ZXN0IGlzIHRyaWdnZXJlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21wbGV0aW9uQ29udGV4dCB7XG4gIC8qKlxuICAgKiBIb3cgdGhlIGNvbXBsZXRpb24gd2FzIHRyaWdnZXJlZC5cbiAgICovXG4gIHRyaWdnZXJLaW5kOiBsc3AuQ29tcGxldGlvblRyaWdnZXJLaW5kO1xuXG4gIC8qKlxuICAgKiBUaGUgdHJpZ2dlciBjaGFyYWN0ZXIgKGEgc2luZ2xlIGNoYXJhY3RlcikgdGhhdCBoYXMgdHJpZ2dlciBjb2RlIGNvbXBsZXRlLlxuICAgKiBJcyB1bmRlZmluZWQgaWYgYHRyaWdnZXJLaW5kICE9PSBDb21wbGV0aW9uVHJpZ2dlcktpbmQuVHJpZ2dlckNoYXJhY3RlcmBcbiAgICovXG4gIHRyaWdnZXJDaGFyYWN0ZXI/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQ29tcGxldGlvbiBwYXJhbWV0ZXJzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGxldGlvblBhcmFtcyBleHRlbmRzIGxzcC5UZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyB7XG5cbiAgLyoqXG4gICAqIFRoZSBjb21wbGV0aW9uIGNvbnRleHQuIFRoaXMgaXMgb25seSBhdmFpbGFibGUgaXQgdGhlIGNsaWVudCBzcGVjaWZpZXNcbiAgICogdG8gc2VuZCB0aGlzIHVzaW5nIGBDbGllbnRDYXBhYmlsaXRpZXMudGV4dERvY3VtZW50LmNvbXBsZXRpb24uY29udGV4dFN1cHBvcnQgPT09IHRydWVgXG4gICAqL1xuICBjb250ZXh0PzogQ29tcGxldGlvbkNvbnRleHQ7XG59XG4iXX0=