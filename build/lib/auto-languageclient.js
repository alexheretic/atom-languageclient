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
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const rpc = require("vscode-jsonrpc");
const path = require("path");
const convert_js_1 = require("./convert.js");
const apply_edit_adapter_1 = require("./adapters/apply-edit-adapter");
const autocomplete_adapter_1 = require("./adapters/autocomplete-adapter");
const code_action_adapter_1 = require("./adapters/code-action-adapter");
const code_format_adapter_1 = require("./adapters/code-format-adapter");
const code_highlight_adapter_1 = require("./adapters/code-highlight-adapter");
const datatip_adapter_1 = require("./adapters/datatip-adapter");
const definition_adapter_1 = require("./adapters/definition-adapter");
const document_sync_adapter_1 = require("./adapters/document-sync-adapter");
const find_references_adapter_1 = require("./adapters/find-references-adapter");
const linter_push_v2_adapter_1 = require("./adapters/linter-push-v2-adapter");
const logging_console_adapter_1 = require("./adapters/logging-console-adapter");
const notifications_adapter_1 = require("./adapters/notifications-adapter");
const outline_view_adapter_1 = require("./adapters/outline-view-adapter");
const rename_adapter_1 = require("./adapters/rename-adapter");
const signature_help_adapter_1 = require("./adapters/signature-help-adapter");
const Utils = require("./utils");
const languageclient_1 = require("./languageclient");
exports.LanguageClientConnection = languageclient_1.LanguageClientConnection;
const logger_1 = require("./logger");
const server_manager_js_1 = require("./server-manager.js");
const atom_1 = require("atom");
/**
 * Public: AutoLanguageClient provides a simple way to have all the supported
 * Atom-IDE services wired up entirely for you by just subclassing it and
 * implementing at least
 * - `startServerProcess`
 * - `getGrammarScopes`
 * - `getLanguageName`
 * - `getServerName`
 */
class AutoLanguageClient {
    constructor() {
        this._isDeactivating = false;
        this._serverAdapters = new WeakMap();
        this.processStdErr = '';
        this.reportBusyWhile = (title, f) => __awaiter(this, void 0, void 0, function* () {
            if (this.busySignalService) {
                return this.busySignalService.reportBusyWhile(title, f);
            }
            else {
                return this.reportBusyWhileDefault(title, f);
            }
        });
        this.reportBusyWhileDefault = (title, f) => __awaiter(this, void 0, void 0, function* () {
            this.logger.info(`[Started] ${title}`);
            let res;
            try {
                res = yield f();
            }
            finally {
                this.logger.info(`[Finished] ${title}`);
            }
            return res;
        });
    }
    // You must implement these so we know how to deal with your language and server
    // -------------------------------------------------------------------------
    /** Return an array of the grammar scopes you handle, e.g. [ 'source.js' ] */
    getGrammarScopes() {
        throw Error('Must implement getGrammarScopes when extending AutoLanguageClient');
    }
    /** Return the name of the language you support, e.g. 'JavaScript' */
    getLanguageName() {
        throw Error('Must implement getLanguageName when extending AutoLanguageClient');
    }
    /** Return the name of your server, e.g. 'Eclipse JDT' */
    getServerName() {
        throw Error('Must implement getServerName when extending AutoLanguageClient');
    }
    /** Start your server process */
    startServerProcess(_projectPath) {
        throw Error('Must override startServerProcess to start language server process when extending AutoLanguageClient');
    }
    // You might want to override these for different behavior
    // ---------------------------------------------------------------------------
    /** (Optional) Determine whether we should start a server for a given editor if we don't have one yet */
    shouldStartForEditor(editor) {
        return this.getGrammarScopes().includes(editor.getGrammar().scopeName);
    }
    /** (Optional) Return the parameters used to initialize a client - you may want to extend capabilities */
    getInitializeParams(projectPath, process) {
        return {
            processId: process.pid,
            rootPath: projectPath,
            rootUri: convert_js_1.default.pathToUri(projectPath),
            workspaceFolders: [],
            capabilities: {
                workspace: {
                    applyEdit: true,
                    configuration: false,
                    workspaceEdit: {
                        documentChanges: true,
                    },
                    workspaceFolders: false,
                    didChangeConfiguration: {
                        dynamicRegistration: false,
                    },
                    didChangeWatchedFiles: {
                        dynamicRegistration: false,
                    },
                    symbol: {
                        dynamicRegistration: false,
                    },
                    executeCommand: {
                        dynamicRegistration: false,
                    },
                },
                textDocument: {
                    synchronization: {
                        dynamicRegistration: false,
                        willSave: true,
                        willSaveWaitUntil: true,
                        didSave: true,
                    },
                    completion: {
                        dynamicRegistration: false,
                        completionItem: {
                            snippetSupport: true,
                            commitCharactersSupport: false,
                        },
                        contextSupport: true,
                    },
                    hover: {
                        dynamicRegistration: false,
                    },
                    signatureHelp: {
                        dynamicRegistration: false,
                    },
                    references: {
                        dynamicRegistration: false,
                    },
                    documentHighlight: {
                        dynamicRegistration: false,
                    },
                    documentSymbol: {
                        dynamicRegistration: false,
                        hierarchicalDocumentSymbolSupport: true,
                    },
                    formatting: {
                        dynamicRegistration: false,
                    },
                    rangeFormatting: {
                        dynamicRegistration: false,
                    },
                    onTypeFormatting: {
                        dynamicRegistration: false,
                    },
                    definition: {
                        dynamicRegistration: false,
                    },
                    codeAction: {
                        dynamicRegistration: false,
                        codeActionLiteralSupport: {
                            codeActionKind: {
                                // TODO explicitly support more?
                                valueSet: ['']
                            }
                        }
                    },
                    codeLens: {
                        dynamicRegistration: false,
                    },
                    documentLink: {
                        dynamicRegistration: false,
                    },
                    rename: {
                        dynamicRegistration: false,
                    },
                    // We do not support these features yet.
                    // Need to set to undefined to appease TypeScript weak type detection.
                    implementation: undefined,
                    typeDefinition: undefined,
                    colorProvider: undefined,
                    foldingRange: undefined,
                },
                experimental: {},
            },
        };
    }
    /** (Optional) Early wire-up of listeners before initialize method is sent */
    preInitialization(_connection) { }
    /** (Optional) Late wire-up of listeners after initialize method has been sent */
    postInitialization(_server) { }
    /** (Optional) Determine whether to use ipc, stdio or socket to connect to the server */
    getConnectionType() {
        return this.socket != null ? 'socket' : 'stdio';
    }
    /** (Optional) Return the name of your root configuration key */
    getRootConfigurationKey() {
        return '';
    }
    /** (Optional) Transform the configuration object before it is sent to the server */
    mapConfigurationObject(configuration) {
        return configuration;
    }
    // Helper methods that are useful for implementors
    // ---------------------------------------------------------------------------
    /** Gets a LanguageClientConnection for a given TextEditor */
    getConnectionForEditor(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            return server ? server.connection : null;
        });
    }
    /** Restart all active language servers for this language client in the workspace */
    restartAllServers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._serverManager.restartAllServers();
        });
    }
    // Default implementation of the rest of the AutoLanguageClient
    // ---------------------------------------------------------------------------
    /** Activate does very little for perf reasons - hooks in via ServerManager for later 'activation' */
    activate() {
        this._disposable = new atom_1.CompositeDisposable();
        this.name = `${this.getLanguageName()} (${this.getServerName()})`;
        this.logger = this.getLogger();
        this._serverManager = new server_manager_js_1.ServerManager((p) => this.startServer(p), this.logger, (e) => this.shouldStartForEditor(e), (filepath) => this.filterChangeWatchedFiles(filepath), this.reportBusyWhile, this.getServerName(), this.shutdownServersGracefully());
        this._serverManager.startListening();
        process.on('exit', () => this.exitCleanup.bind(this));
    }
    exitCleanup() {
        this._serverManager.terminate();
    }
    /** Deactivate disposes the resources we're using */
    deactivate() {
        return __awaiter(this, void 0, void 0, function* () {
            this._isDeactivating = true;
            this._disposable.dispose();
            this._serverManager.stopListening();
            yield this._serverManager.stopAllServers();
        });
    }
    spawnChildNode(args, options = {}) {
        this.logger.debug(`starting child Node "${args.join(' ')}"`);
        options.env = options.env || Object.create(process.env);
        if (options.env) {
            options.env.ELECTRON_RUN_AS_NODE = '1';
            options.env.ELECTRON_NO_ATTACH_CONSOLE = '1';
        }
        return cp.spawn(process.execPath, args, options);
    }
    /** LSP logging is only set for warnings & errors by default unless you turn on the core.debugLSP setting */
    getLogger() {
        const filter = atom.config.get('core.debugLSP')
            ? logger_1.FilteredLogger.DeveloperLevelFilter
            : logger_1.FilteredLogger.UserLevelFilter;
        return new logger_1.FilteredLogger(new logger_1.ConsoleLogger(this.name), filter);
    }
    /** Starts the server by starting the process, then initializing the language server and starting adapters */
    startServer(projectPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const process = yield this.reportBusyWhile(`Starting ${this.getServerName()} for ${path.basename(projectPath)}`, () => __awaiter(this, void 0, void 0, function* () { return this.startServerProcess(projectPath); }));
            this.captureServerErrors(process, projectPath);
            const connection = new languageclient_1.LanguageClientConnection(this.createRpcConnection(process), this.logger);
            this.preInitialization(connection);
            const initializeParams = this.getInitializeParams(projectPath, process);
            const initialization = connection.initialize(initializeParams);
            this.reportBusyWhile(`${this.getServerName()} initializing for ${path.basename(projectPath)}`, () => initialization);
            const initializeResponse = yield initialization;
            const newServer = {
                projectPath,
                process,
                connection,
                capabilities: initializeResponse.capabilities,
                disposable: new atom_1.CompositeDisposable(),
                additionalPaths: new Set(),
                considerDefinitionPath: (defPath) => {
                    if (!defPath.startsWith(projectPath)) {
                        newServer.additionalPaths.add(path.dirname(defPath));
                    }
                },
            };
            this.postInitialization(newServer);
            connection.initialized();
            connection.on('close', () => {
                if (!this._isDeactivating) {
                    this._serverManager.stopServer(newServer);
                    if (!this._serverManager.hasServerReachedRestartLimit(newServer)) {
                        this.logger.debug(`Restarting language server for project '${newServer.projectPath}'`);
                        this._serverManager.startServer(projectPath);
                    }
                    else {
                        this.logger.warn(`Language server has exceeded auto-restart limit for project '${newServer.projectPath}'`);
                        atom.notifications.addError(
                        // tslint:disable-next-line:max-line-length
                        `The ${this.name} language server has exited and exceeded the restart limit for project '${newServer.projectPath}'`);
                    }
                }
            });
            const configurationKey = this.getRootConfigurationKey();
            if (configurationKey) {
                newServer.disposable.add(atom.config.observe(configurationKey, (config) => {
                    const mappedConfig = this.mapConfigurationObject(config || {});
                    if (mappedConfig) {
                        connection.didChangeConfiguration({
                            settings: mappedConfig,
                        });
                    }
                }));
            }
            this.startExclusiveAdapters(newServer);
            return newServer;
        });
    }
    captureServerErrors(childProcess, projectPath) {
        childProcess.on('error', (err) => this.handleSpawnFailure(err));
        childProcess.on('exit', (code, signal) => this.logger.debug(`exit: code ${code} signal ${signal}`));
        childProcess.stderr.setEncoding('utf8');
        childProcess.stderr.on('data', (chunk) => {
            const errorString = chunk.toString();
            this.handleServerStderr(errorString, projectPath);
            // Keep the last 5 lines for packages to use in messages
            this.processStdErr = (this.processStdErr + errorString)
                .split('\n')
                .slice(-5)
                .join('\n');
        });
    }
    handleSpawnFailure(err) {
        atom.notifications.addError(`${this.getServerName()} language server for ${this.getLanguageName()} unable to start`, {
            dismissable: true,
            description: err.toString(),
        });
    }
    /** Creates the RPC connection which can be ipc, socket or stdio */
    createRpcConnection(process) {
        let reader;
        let writer;
        const connectionType = this.getConnectionType();
        switch (connectionType) {
            case 'ipc':
                reader = new rpc.IPCMessageReader(process);
                writer = new rpc.IPCMessageWriter(process);
                break;
            case 'socket':
                reader = new rpc.SocketMessageReader(this.socket);
                writer = new rpc.SocketMessageWriter(this.socket);
                break;
            case 'stdio':
                reader = new rpc.StreamMessageReader(process.stdout);
                writer = new rpc.StreamMessageWriter(process.stdin);
                break;
            default:
                return Utils.assertUnreachable(connectionType);
        }
        return rpc.createMessageConnection(reader, writer, {
            log: (..._args) => { },
            warn: (..._args) => { },
            info: (..._args) => { },
            error: (...args) => {
                this.logger.error(args);
            },
        });
    }
    /** Start adapters that are not shared between servers */
    startExclusiveAdapters(server) {
        apply_edit_adapter_1.default.attach(server.connection);
        notifications_adapter_1.default.attach(server.connection, this.name, server.projectPath);
        if (document_sync_adapter_1.default.canAdapt(server.capabilities)) {
            const docSyncAdapter = new document_sync_adapter_1.default(server.connection, (editor) => this.shouldSyncForEditor(editor, server.projectPath), server.capabilities.textDocumentSync, this.reportBusyWhile);
            server.disposable.add(docSyncAdapter);
        }
        const linterPushV2 = new linter_push_v2_adapter_1.default(server.connection);
        if (this._linterDelegate != null) {
            linterPushV2.attach(this._linterDelegate);
        }
        server.disposable.add(linterPushV2);
        const loggingConsole = new logging_console_adapter_1.default(server.connection);
        if (this._consoleDelegate != null) {
            loggingConsole.attach(this._consoleDelegate({ id: this.name, name: this.getLanguageName() }));
        }
        server.disposable.add(loggingConsole);
        let signatureHelpAdapter;
        if (signature_help_adapter_1.default.canAdapt(server.capabilities)) {
            signatureHelpAdapter = new signature_help_adapter_1.default(server, this.getGrammarScopes());
            if (this._signatureHelpRegistry != null) {
                signatureHelpAdapter.attach(this._signatureHelpRegistry);
            }
            server.disposable.add(signatureHelpAdapter);
        }
        this._serverAdapters.set(server, {
            linterPushV2, loggingConsole, signatureHelpAdapter,
        });
    }
    shouldSyncForEditor(editor, projectPath) {
        return this.isFileInProject(editor, projectPath) && this.shouldStartForEditor(editor);
    }
    isFileInProject(editor, projectPath) {
        return (editor.getPath() || '').startsWith(projectPath);
    }
    // Autocomplete+ via LS completion---------------------------------------
    provideAutocomplete() {
        return {
            selector: this.getGrammarScopes()
                .map((g) => g.includes('.') ? '.' + g : g)
                .join(', '),
            inclusionPriority: 1,
            suggestionPriority: 2,
            excludeLowerPriority: false,
            getSuggestions: this.getSuggestions.bind(this),
            onDidInsertSuggestion: (event) => {
                this.handleAdditionalTextEdits(event);
                this.onDidInsertSuggestion(event);
            },
            getSuggestionDetailsOnSelect: this.getSuggestionDetailsOnSelect.bind(this),
        };
    }
    getSuggestions(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(request.editor);
            if (server == null || !autocomplete_adapter_1.default.canAdapt(server.capabilities)) {
                return [];
            }
            this.autoComplete = this.autoComplete || new autocomplete_adapter_1.default();
            this._lastAutocompleteRequest = request;
            return this.autoComplete.getSuggestions(server, request, this.onDidConvertAutocomplete, atom.config.get('autocomplete-plus.minimumWordLength'));
        });
    }
    getSuggestionDetailsOnSelect(suggestion) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = this._lastAutocompleteRequest;
            if (request == null) {
                return null;
            }
            const server = yield this._serverManager.getServer(request.editor);
            if (server == null || !autocomplete_adapter_1.default.canResolve(server.capabilities) || this.autoComplete == null) {
                return null;
            }
            return this.autoComplete.completeSuggestion(server, suggestion, request, this.onDidConvertAutocomplete);
        });
    }
    onDidConvertAutocomplete(_completionItem, _suggestion, _request) {
    }
    // Handle additional stuff after a suggestion insert, e.g. `additionalTextEdits`.
    handleAdditionalTextEdits(e) {
        const suggestion = e.suggestion;
        const additionalEdits = suggestion.completionItem && suggestion.completionItem.additionalTextEdits;
        const buffer = e.editor.getBuffer();
        apply_edit_adapter_1.default.applyEdits(buffer, convert_js_1.default.convertLsTextEdits(additionalEdits));
        buffer.groupLastChanges();
    }
    onDidInsertSuggestion(_arg) { }
    // Definitions via LS documentHighlight and gotoDefinition------------
    provideDefinitions() {
        return {
            name: this.name,
            priority: 20,
            grammarScopes: this.getGrammarScopes(),
            getDefinition: this.getDefinition.bind(this),
        };
    }
    getDefinition(editor, point) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !definition_adapter_1.default.canAdapt(server.capabilities)) {
                return null;
            }
            this.definitions = this.definitions || new definition_adapter_1.default();
            const queryPromise = this.definitions.getDefinition(server.connection, server.capabilities, this.getLanguageName(), editor, point);
            if (this.serversSupportDefinitionDestinations()) {
                queryPromise.then((query) => {
                    if (query) {
                        for (const def of query.definitions) {
                            server.considerDefinitionPath(def.path);
                        }
                    }
                });
            }
            return queryPromise;
        });
    }
    // Outline View via LS documentSymbol---------------------------------
    provideOutlines() {
        return {
            name: this.name,
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            getOutline: this.getOutline.bind(this),
        };
    }
    getOutline(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !outline_view_adapter_1.default.canAdapt(server.capabilities)) {
                return null;
            }
            this.outlineView = this.outlineView || new outline_view_adapter_1.default();
            return this.outlineView.getOutline(server.connection, editor);
        });
    }
    // Linter push v2 API via LS publishDiagnostics
    consumeLinterV2(registerIndie) {
        this._linterDelegate = registerIndie({ name: this.name });
        if (this._linterDelegate == null) {
            return;
        }
        for (const server of this._serverManager.getActiveServers()) {
            const linterPushV2 = this.getServerAdapter(server, 'linterPushV2');
            if (linterPushV2 != null) {
                linterPushV2.attach(this._linterDelegate);
            }
        }
    }
    // Find References via LS findReferences------------------------------
    provideFindReferences() {
        return {
            isEditorSupported: (editor) => this.getGrammarScopes().includes(editor.getGrammar().scopeName),
            findReferences: this.getReferences.bind(this),
        };
    }
    getReferences(editor, point) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !find_references_adapter_1.default.canAdapt(server.capabilities)) {
                return null;
            }
            this.findReferences = this.findReferences || new find_references_adapter_1.default();
            return this.findReferences.getReferences(server.connection, editor, point, server.projectPath);
        });
    }
    // Datatip via LS textDocument/hover----------------------------------
    consumeDatatip(service) {
        this._disposable.add(service.addProvider({
            providerName: this.name,
            priority: 1,
            grammarScopes: this.getGrammarScopes(),
            validForScope: (scopeName) => {
                return this.getGrammarScopes().includes(scopeName);
            },
            datatip: this.getDatatip.bind(this),
        }));
    }
    getDatatip(editor, point) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !datatip_adapter_1.default.canAdapt(server.capabilities)) {
                return null;
            }
            this.datatip = this.datatip || new datatip_adapter_1.default();
            return this.datatip.getDatatip(server.connection, editor, point);
        });
    }
    // Console via LS logging---------------------------------------------
    consumeConsole(createConsole) {
        this._consoleDelegate = createConsole;
        for (const server of this._serverManager.getActiveServers()) {
            const loggingConsole = this.getServerAdapter(server, 'loggingConsole');
            if (loggingConsole) {
                loggingConsole.attach(this._consoleDelegate({ id: this.name, name: this.getLanguageName() }));
            }
        }
        // No way of detaching from client connections today
        return new atom_1.Disposable(() => { });
    }
    // Code Format via LS formatDocument & formatDocumentRange------------
    provideCodeFormat() {
        return {
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            formatCode: this.getCodeFormat.bind(this),
        };
    }
    getCodeFormat(editor, range) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !code_format_adapter_1.default.canAdapt(server.capabilities)) {
                return [];
            }
            return code_format_adapter_1.default.format(server.connection, server.capabilities, editor, range);
        });
    }
    provideRangeCodeFormat() {
        return {
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            formatCode: this.getRangeCodeFormat.bind(this),
        };
    }
    getRangeCodeFormat(editor, range) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !server.capabilities.documentRangeFormattingProvider) {
                return [];
            }
            return code_format_adapter_1.default.formatRange(server.connection, editor, range);
        });
    }
    provideFileCodeFormat() {
        return {
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            formatEntireFile: this.getFileCodeFormat.bind(this),
        };
    }
    provideOnSaveCodeFormat() {
        return {
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            formatOnSave: this.getFileCodeFormat.bind(this),
        };
    }
    getFileCodeFormat(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !server.capabilities.documentFormattingProvider) {
                return [];
            }
            return code_format_adapter_1.default.formatDocument(server.connection, editor);
        });
    }
    provideOnTypeCodeFormat() {
        return {
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            formatAtPosition: this.getOnTypeCodeFormat.bind(this),
        };
    }
    getOnTypeCodeFormat(editor, point, character) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !server.capabilities.documentOnTypeFormattingProvider) {
                return [];
            }
            return code_format_adapter_1.default.formatOnType(server.connection, editor, point, character);
        });
    }
    provideCodeHighlight() {
        return {
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            highlight: (editor, position) => {
                return this.getCodeHighlight(editor, position);
            },
        };
    }
    getCodeHighlight(editor, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !code_highlight_adapter_1.default.canAdapt(server.capabilities)) {
                return null;
            }
            return code_highlight_adapter_1.default.highlight(server.connection, server.capabilities, editor, position);
        });
    }
    provideCodeActions() {
        return {
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            getCodeActions: (editor, range, diagnostics) => {
                return this.getCodeActions(editor, range, diagnostics);
            },
        };
    }
    getCodeActions(editor, range, diagnostics) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !code_action_adapter_1.default.canAdapt(server.capabilities)) {
                return null;
            }
            return code_action_adapter_1.default.getCodeActions(server.connection, server.capabilities, this.getServerAdapter(server, 'linterPushV2'), editor, range, diagnostics, this.filterCodeActions.bind(this), this.onApplyCodeActions.bind(this));
        });
    }
    /** Optionally filter code action before they're displayed */
    filterCodeActions(actions) {
        return actions;
    }
    /**
     * Optionally handle a code action before default handling.
     * Return false to prevent default handling, true to continue with default handling.
     */
    onApplyCodeActions(_action) {
        return __awaiter(this, void 0, void 0, function* () {
            return true;
        });
    }
    provideRefactor() {
        return {
            grammarScopes: this.getGrammarScopes(),
            priority: 1,
            rename: this.getRename.bind(this),
        };
    }
    getRename(editor, position, newName) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            if (server == null || !rename_adapter_1.default.canAdapt(server.capabilities)) {
                return null;
            }
            return rename_adapter_1.default.getRename(server.connection, editor, position, newName);
        });
    }
    consumeSignatureHelp(registry) {
        this._signatureHelpRegistry = registry;
        for (const server of this._serverManager.getActiveServers()) {
            const signatureHelpAdapter = this.getServerAdapter(server, 'signatureHelpAdapter');
            if (signatureHelpAdapter != null) {
                signatureHelpAdapter.attach(registry);
            }
        }
        return new atom_1.Disposable(() => {
            this._signatureHelpRegistry = undefined;
        });
    }
    consumeBusySignal(service) {
        this.busySignalService = service;
        return new atom_1.Disposable(() => delete this.busySignalService);
    }
    /**
     * `didChangeWatchedFiles` message filtering, override for custom logic.
     * @param filePath Path of a file that has changed in the project path
     * @returns `false` => message will not be sent to the language server
     */
    filterChangeWatchedFiles(_filePath) {
        return true;
    }
    /** @return false => servers will be killed without awaiting shutdown response. */
    shutdownServersGracefully() {
        return true;
    }
    /**
     * Called on language server stderr output.
     * @param stderr A chunk of stderr from a language server instance
     */
    handleServerStderr(stderr, _projectPath) {
        stderr.split('\n').filter((l) => l).forEach((line) => this.logger.warn(`stderr ${line}`));
    }
    /**
     * Indicates that the language server can support LSP functionality for
     * out of project files indicated by `textDocument/definition` responses.
     *
     * Default: false
     */
    serversSupportDefinitionDestinations() {
        return false;
    }
    getServerAdapter(server, adapter) {
        const adapters = this._serverAdapters.get(server);
        return adapters && adapters[adapter];
    }
}
exports.default = AutoLanguageClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sYW5ndWFnZWNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9hdXRvLWxhbmd1YWdlY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBRXBDLHNDQUFzQztBQUN0Qyw2QkFBNkI7QUFHN0IsNkNBQW1DO0FBQ25DLHNFQUE2RDtBQUM3RCwwRUFBa0U7QUFDbEUsd0VBQStEO0FBQy9ELHdFQUErRDtBQUMvRCw4RUFBcUU7QUFDckUsZ0VBQXdEO0FBQ3hELHNFQUE4RDtBQUM5RCw0RUFBbUU7QUFDbkUsZ0ZBQXVFO0FBQ3ZFLDhFQUFvRTtBQUNwRSxnRkFBdUU7QUFDdkUsNEVBQW9FO0FBQ3BFLDBFQUFpRTtBQUNqRSw4REFBc0Q7QUFDdEQsOEVBQXFFO0FBQ3JFLGlDQUFpQztBQUVqQyxxREFBNEQ7QUFvQnJDLG1DQXBCZCx5Q0FBd0IsQ0FvQmM7QUFuQi9DLHFDQUlrQjtBQUNsQiwyREFJNkI7QUFDN0IsK0JBTWM7QUFZZDs7Ozs7Ozs7R0FRRztBQUNILE1BQXFCLGtCQUFrQjtJQUF2QztRQU9VLG9CQUFlLEdBQVksS0FBSyxDQUFDO1FBQ2pDLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQWdDLENBQUM7UUFLNUQsa0JBQWEsR0FBVyxFQUFFLENBQUM7UUFnekIzQixvQkFBZSxHQUEwQixDQUFPLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwRSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDMUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN6RDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDOUM7UUFDSCxDQUFDLENBQUEsQ0FBQTtRQUVTLDJCQUFzQixHQUEwQixDQUFPLEtBQUssRUFBRSxDQUFDLEVB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TyxrQkFBa0IsQ0FBQyxNQUFjLEVBQUUsWUFBb0I7UUFDL0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ08sb0NBQW9DO1FBQzVDLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVPLGdCQUFnQixDQUN0QixNQUFvQixFQUFFLE9BQVU7UUFFaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEQsT0FBTyxRQUFRLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7Q0FvQkY7QUEvMEJELHFDQSswQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjcCBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGxzIGZyb20gJy4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0ICogYXMgcnBjIGZyb20gJ3ZzY29kZS1qc29ucnBjJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBhdG9tSWRlIGZyb20gJ2F0b20taWRlJztcbmltcG9ydCAqIGFzIGxpbnRlciBmcm9tICdhdG9tL2xpbnRlcic7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuL2NvbnZlcnQuanMnO1xuaW1wb3J0IEFwcGx5RWRpdEFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9hcHBseS1lZGl0LWFkYXB0ZXInO1xuaW1wb3J0IEF1dG9jb21wbGV0ZUFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9hdXRvY29tcGxldGUtYWRhcHRlcic7XG5pbXBvcnQgQ29kZUFjdGlvbkFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9jb2RlLWFjdGlvbi1hZGFwdGVyJztcbmltcG9ydCBDb2RlRm9ybWF0QWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2NvZGUtZm9ybWF0LWFkYXB0ZXInO1xuaW1wb3J0IENvZGVIaWdobGlnaHRBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvY29kZS1oaWdobGlnaHQtYWRhcHRlcic7XG5pbXBvcnQgRGF0YXRpcEFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9kYXRhdGlwLWFkYXB0ZXInO1xuaW1wb3J0IERlZmluaXRpb25BZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvZGVmaW5pdGlvbi1hZGFwdGVyJztcbmltcG9ydCBEb2N1bWVudFN5bmNBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvZG9jdW1lbnQtc3luYy1hZGFwdGVyJztcbmltcG9ydCBGaW5kUmVmZXJlbmNlc0FkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9maW5kLXJlZmVyZW5jZXMtYWRhcHRlcic7XG5pbXBvcnQgTGludGVyUHVzaFYyQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2xpbnRlci1wdXNoLXYyLWFkYXB0ZXInO1xuaW1wb3J0IExvZ2dpbmdDb25zb2xlQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2xvZ2dpbmctY29uc29sZS1hZGFwdGVyJztcbmltcG9ydCBOb3RpZmljYXRpb25zQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL25vdGlmaWNhdGlvbnMtYWRhcHRlcic7XG5pbXBvcnQgT3V0bGluZVZpZXdBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvb3V0bGluZS12aWV3LWFkYXB0ZXInO1xuaW1wb3J0IFJlbmFtZUFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9yZW5hbWUtYWRhcHRlcic7XG5pbXBvcnQgU2lnbmF0dXJlSGVscEFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9zaWduYXR1cmUtaGVscC1hZGFwdGVyJztcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSAnbmV0JztcbmltcG9ydCB7IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiB9IGZyb20gJy4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IHtcbiAgQ29uc29sZUxvZ2dlcixcbiAgRmlsdGVyZWRMb2dnZXIsXG4gIExvZ2dlcixcbn0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHtcbiAgTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzLFxuICBTZXJ2ZXJNYW5hZ2VyLFxuICBBY3RpdmVTZXJ2ZXIsXG59IGZyb20gJy4vc2VydmVyLW1hbmFnZXIuanMnO1xuaW1wb3J0IHtcbiAgRGlzcG9zYWJsZSxcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgUG9pbnQsXG4gIFJhbmdlLFxuICBUZXh0RWRpdG9yLFxufSBmcm9tICdhdG9tJztcbmltcG9ydCAqIGFzIGFjIGZyb20gJ2F0b20vYXV0b2NvbXBsZXRlLXBsdXMnO1xuXG5leHBvcnQgeyBBY3RpdmVTZXJ2ZXIsIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiwgTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzIH07XG5leHBvcnQgdHlwZSBDb25uZWN0aW9uVHlwZSA9ICdzdGRpbycgfCAnc29ja2V0JyB8ICdpcGMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlckFkYXB0ZXJzIHtcbiAgbGludGVyUHVzaFYyOiBMaW50ZXJQdXNoVjJBZGFwdGVyO1xuICBsb2dnaW5nQ29uc29sZTogTG9nZ2luZ0NvbnNvbGVBZGFwdGVyO1xuICBzaWduYXR1cmVIZWxwQWRhcHRlcj86IFNpZ25hdHVyZUhlbHBBZGFwdGVyO1xufVxuXG4vKipcbiAqIFB1YmxpYzogQXV0b0xhbmd1YWdlQ2xpZW50IHByb3ZpZGVzIGEgc2ltcGxlIHdheSB0byBoYXZlIGFsbCB0aGUgc3VwcG9ydGVkXG4gKiBBdG9tLUlERSBzZXJ2aWNlcyB3aXJlZCB1cCBlbnRpcmVseSBmb3IgeW91IGJ5IGp1c3Qgc3ViY2xhc3NpbmcgaXQgYW5kXG4gKiBpbXBsZW1lbnRpbmcgYXQgbGVhc3RcbiAqIC0gYHN0YXJ0U2VydmVyUHJvY2Vzc2BcbiAqIC0gYGdldEdyYW1tYXJTY29wZXNgXG4gKiAtIGBnZXRMYW5ndWFnZU5hbWVgXG4gKiAtIGBnZXRTZXJ2ZXJOYW1lYFxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBdXRvTGFuZ3VhZ2VDbGllbnQge1xuICBwcml2YXRlIF9kaXNwb3NhYmxlITogQ29tcG9zaXRlRGlzcG9zYWJsZTtcbiAgcHJpdmF0ZSBfc2VydmVyTWFuYWdlciE6IFNlcnZlck1hbmFnZXI7XG4gIHByaXZhdGUgX2NvbnNvbGVEZWxlZ2F0ZT86IGF0b21JZGUuQ29uc29sZVNlcnZpY2U7XG4gIHByaXZhdGUgX2xpbnRlckRlbGVnYXRlPzogbGludGVyLkluZGllRGVsZWdhdGU7XG4gIHByaXZhdGUgX3NpZ25hdHVyZUhlbHBSZWdpc3RyeT86IGF0b21JZGUuU2lnbmF0dXJlSGVscFJlZ2lzdHJ5O1xuICBwcml2YXRlIF9sYXN0QXV0b2NvbXBsZXRlUmVxdWVzdD86IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQ7XG4gIHByaXZhdGUgX2lzRGVhY3RpdmF0aW5nOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgX3NlcnZlckFkYXB0ZXJzID0gbmV3IFdlYWtNYXA8QWN0aXZlU2VydmVyLCBTZXJ2ZXJBZGFwdGVycz4oKTtcblxuICAvKiogQXZhaWxhYmxlIGlmIGNvbnN1bWVCdXN5U2lnbmFsIGlzIHNldHVwICovXG4gIHByb3RlY3RlZCBidXN5U2lnbmFsU2VydmljZT86IGF0b21JZGUuQnVzeVNpZ25hbFNlcnZpY2U7XG5cbiAgcHJvdGVjdGVkIHByb2Nlc3NTdGRFcnI6IHN0cmluZyA9ICcnO1xuICBwcm90ZWN0ZWQgbG9nZ2VyITogTG9nZ2VyO1xuICBwcm90ZWN0ZWQgbmFtZSE6IHN0cmluZztcbiAgcHJvdGVjdGVkIHNvY2tldCE6IFNvY2tldDtcblxuICAvLyBTaGFyZWQgYWRhcHRlcnMgdGhhdCBjYW4gdGFrZSB0aGUgUlBDIGNvbm5lY3Rpb24gYXMgcmVxdWlyZWRcbiAgcHJvdGVjdGVkIGF1dG9Db21wbGV0ZT86IEF1dG9jb21wbGV0ZUFkYXB0ZXI7XG4gIHByb3RlY3RlZCBkYXRhdGlwPzogRGF0YXRpcEFkYXB0ZXI7XG4gIHByb3RlY3RlZCBkZWZpbml0aW9ucz86IERlZmluaXRpb25BZGFwdGVyO1xuICBwcm90ZWN0ZWQgZmluZFJlZmVyZW5jZXM/OiBGaW5kUmVmZXJlbmNlc0FkYXB0ZXI7XG4gIHByb3RlY3RlZCBvdXRsaW5lVmlldz86IE91dGxpbmVWaWV3QWRhcHRlcjtcblxuICAvLyBZb3UgbXVzdCBpbXBsZW1lbnQgdGhlc2Ugc28gd2Uga25vdyBob3cgdG8gZGVhbCB3aXRoIHlvdXIgbGFuZ3VhZ2UgYW5kIHNlcnZlclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqIFJldHVybiBhbiBhcnJheSBvZiB0aGUgZ3JhbW1hciBzY29wZXMgeW91IGhhbmRsZSwgZS5nLiBbICdzb3VyY2UuanMnIF0gKi9cbiAgcHJvdGVjdGVkIGdldEdyYW1tYXJTY29wZXMoKTogc3RyaW5nW10ge1xuICAgIHRocm93IEVycm9yKCdNdXN0IGltcGxlbWVudCBnZXRHcmFtbWFyU2NvcGVzIHdoZW4gZXh0ZW5kaW5nIEF1dG9MYW5ndWFnZUNsaWVudCcpO1xuICB9XG5cbiAgLyoqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgbGFuZ3VhZ2UgeW91IHN1cHBvcnQsIGUuZy4gJ0phdmFTY3JpcHQnICovXG4gIHByb3RlY3RlZCBnZXRMYW5ndWFnZU5hbWUoKTogc3RyaW5nIHtcbiAgICB0aHJvdyBFcnJvcignTXVzdCBpbXBsZW1lbnQgZ2V0TGFuZ3VhZ2VOYW1lIHdoZW4gZXh0ZW5kaW5nIEF1dG9MYW5ndWFnZUNsaWVudCcpO1xuICB9XG5cbiAgLyoqIFJldHVybiB0aGUgbmFtZSBvZiB5b3VyIHNlcnZlciwgZS5nLiAnRWNsaXBzZSBKRFQnICovXG4gIHByb3RlY3RlZCBnZXRTZXJ2ZXJOYW1lKCk6IHN0cmluZyB7XG4gICAgdGhyb3cgRXJyb3IoJ011c3QgaW1wbGVtZW50IGdldFNlcnZlck5hbWUgd2hlbiBleHRlbmRpbmcgQXV0b0xhbmd1YWdlQ2xpZW50Jyk7XG4gIH1cblxuICAvKiogU3RhcnQgeW91ciBzZXJ2ZXIgcHJvY2VzcyAqL1xuICBwcm90ZWN0ZWQgc3RhcnRTZXJ2ZXJQcm9jZXNzKF9wcm9qZWN0UGF0aDogc3RyaW5nKTogTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzIHwgUHJvbWlzZTxMYW5ndWFnZVNlcnZlclByb2Nlc3M+IHtcbiAgICB0aHJvdyBFcnJvcignTXVzdCBvdmVycmlkZSBzdGFydFNlcnZlclByb2Nlc3MgdG8gc3RhcnQgbGFuZ3VhZ2Ugc2VydmVyIHByb2Nlc3Mgd2hlbiBleHRlbmRpbmcgQXV0b0xhbmd1YWdlQ2xpZW50Jyk7XG4gIH1cblxuICAvLyBZb3UgbWlnaHQgd2FudCB0byBvdmVycmlkZSB0aGVzZSBmb3IgZGlmZmVyZW50IGJlaGF2aW9yXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKiAoT3B0aW9uYWwpIERldGVybWluZSB3aGV0aGVyIHdlIHNob3VsZCBzdGFydCBhIHNlcnZlciBmb3IgYSBnaXZlbiBlZGl0b3IgaWYgd2UgZG9uJ3QgaGF2ZSBvbmUgeWV0ICovXG4gIHByb3RlY3RlZCBzaG91bGRTdGFydEZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCkuaW5jbHVkZXMoZWRpdG9yLmdldEdyYW1tYXIoKS5zY29wZU5hbWUpO1xuICB9XG5cbiAgLyoqIChPcHRpb25hbCkgUmV0dXJuIHRoZSBwYXJhbWV0ZXJzIHVzZWQgdG8gaW5pdGlhbGl6ZSBhIGNsaWVudCAtIHlvdSBtYXkgd2FudCB0byBleHRlbmQgY2FwYWJpbGl0aWVzICovXG4gIHByb3RlY3RlZCBnZXRJbml0aWFsaXplUGFyYW1zKHByb2plY3RQYXRoOiBzdHJpbmcsIHByb2Nlc3M6IExhbmd1YWdlU2VydmVyUHJvY2Vzcyk6IGxzLkluaXRpYWxpemVQYXJhbXMge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9jZXNzSWQ6IHByb2Nlc3MucGlkLFxuICAgICAgcm9vdFBhdGg6IHByb2plY3RQYXRoLFxuICAgICAgcm9vdFVyaTogQ29udmVydC5wYXRoVG9VcmkocHJvamVjdFBhdGgpLFxuICAgICAgd29ya3NwYWNlRm9sZGVyczogW10sXG4gICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgd29ya3NwYWNlOiB7XG4gICAgICAgICAgYXBwbHlFZGl0OiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb246IGZhbHNlLFxuICAgICAgICAgIHdvcmtzcGFjZUVkaXQ6IHtcbiAgICAgICAgICAgIGRvY3VtZW50Q2hhbmdlczogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHdvcmtzcGFjZUZvbGRlcnM6IGZhbHNlLFxuICAgICAgICAgIGRpZENoYW5nZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN5bWJvbDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBleGVjdXRlQ29tbWFuZDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdGV4dERvY3VtZW50OiB7XG4gICAgICAgICAgc3luY2hyb25pemF0aW9uOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHdpbGxTYXZlOiB0cnVlLFxuICAgICAgICAgICAgd2lsbFNhdmVXYWl0VW50aWw6IHRydWUsXG4gICAgICAgICAgICBkaWRTYXZlOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29tcGxldGlvbjoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBjb21wbGV0aW9uSXRlbToge1xuICAgICAgICAgICAgICBzbmlwcGV0U3VwcG9ydDogdHJ1ZSxcbiAgICAgICAgICAgICAgY29tbWl0Q2hhcmFjdGVyc1N1cHBvcnQ6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRleHRTdXBwb3J0OiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2lnbmF0dXJlSGVscDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZWZlcmVuY2VzOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50SGlnaGxpZ2h0OiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50U3ltYm9sOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGhpZXJhcmNoaWNhbERvY3VtZW50U3ltYm9sU3VwcG9ydDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZvcm1hdHRpbmc6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmFuZ2VGb3JtYXR0aW5nOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uVHlwZUZvcm1hdHRpbmc6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGVmaW5pdGlvbjoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2RlQWN0aW9uOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGNvZGVBY3Rpb25MaXRlcmFsU3VwcG9ydDoge1xuICAgICAgICAgICAgICBjb2RlQWN0aW9uS2luZDoge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXhwbGljaXRseSBzdXBwb3J0IG1vcmU/XG4gICAgICAgICAgICAgICAgdmFsdWVTZXQ6IFsnJ11cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29kZUxlbnM6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZG9jdW1lbnRMaW5rOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJlbmFtZToge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcblxuICAgICAgICAgIC8vIFdlIGRvIG5vdCBzdXBwb3J0IHRoZXNlIGZlYXR1cmVzIHlldC5cbiAgICAgICAgICAvLyBOZWVkIHRvIHNldCB0byB1bmRlZmluZWQgdG8gYXBwZWFzZSBUeXBlU2NyaXB0IHdlYWsgdHlwZSBkZXRlY3Rpb24uXG4gICAgICAgICAgaW1wbGVtZW50YXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlRGVmaW5pdGlvbjogdW5kZWZpbmVkLFxuICAgICAgICAgIGNvbG9yUHJvdmlkZXI6IHVuZGVmaW5lZCxcbiAgICAgICAgICBmb2xkaW5nUmFuZ2U6IHVuZGVmaW5lZCxcbiAgICAgICAgfSxcbiAgICAgICAgZXhwZXJpbWVudGFsOiB7fSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKiAoT3B0aW9uYWwpIEVhcmx5IHdpcmUtdXAgb2YgbGlzdGVuZXJzIGJlZm9yZSBpbml0aWFsaXplIG1ldGhvZCBpcyBzZW50ICovXG4gIHByb3RlY3RlZCBwcmVJbml0aWFsaXphdGlvbihfY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uKTogdm9pZCB7IH1cblxuICAvKiogKE9wdGlvbmFsKSBMYXRlIHdpcmUtdXAgb2YgbGlzdGVuZXJzIGFmdGVyIGluaXRpYWxpemUgbWV0aG9kIGhhcyBiZWVuIHNlbnQgKi9cbiAgcHJvdGVjdGVkIHBvc3RJbml0aWFsaXphdGlvbihfc2VydmVyOiBBY3RpdmVTZXJ2ZXIpOiB2b2lkIHsgfVxuXG4gIC8qKiAoT3B0aW9uYWwpIERldGVybWluZSB3aGV0aGVyIHRvIHVzZSBpcGMsIHN0ZGlvIG9yIHNvY2tldCB0byBjb25uZWN0IHRvIHRoZSBzZXJ2ZXIgKi9cbiAgcHJvdGVjdGVkIGdldENvbm5lY3Rpb25UeXBlKCk6IENvbm5lY3Rpb25UeXBlIHtcbiAgICByZXR1cm4gdGhpcy5zb2NrZXQgIT0gbnVsbCA/ICdzb2NrZXQnIDogJ3N0ZGlvJztcbiAgfVxuXG4gIC8qKiAoT3B0aW9uYWwpIFJldHVybiB0aGUgbmFtZSBvZiB5b3VyIHJvb3QgY29uZmlndXJhdGlvbiBrZXkgKi9cbiAgcHJvdGVjdGVkIGdldFJvb3RDb25maWd1cmF0aW9uS2V5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgLyoqIChPcHRpb25hbCkgVHJhbnNmb3JtIHRoZSBjb25maWd1cmF0aW9uIG9iamVjdCBiZWZvcmUgaXQgaXMgc2VudCB0byB0aGUgc2VydmVyICovXG4gIHByb3RlY3RlZCBtYXBDb25maWd1cmF0aW9uT2JqZWN0KGNvbmZpZ3VyYXRpb246IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIGNvbmZpZ3VyYXRpb247XG4gIH1cblxuICAvLyBIZWxwZXIgbWV0aG9kcyB0aGF0IGFyZSB1c2VmdWwgZm9yIGltcGxlbWVudG9yc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKiogR2V0cyBhIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiBmb3IgYSBnaXZlbiBUZXh0RWRpdG9yICovXG4gIHByb3RlY3RlZCBhc3luYyBnZXRDb25uZWN0aW9uRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcik6IFByb21pc2U8TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uIHwgbnVsbD4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgcmV0dXJuIHNlcnZlciA/IHNlcnZlci5jb25uZWN0aW9uIDogbnVsbDtcbiAgfVxuXG4gIC8qKiBSZXN0YXJ0IGFsbCBhY3RpdmUgbGFuZ3VhZ2Ugc2VydmVycyBmb3IgdGhpcyBsYW5ndWFnZSBjbGllbnQgaW4gdGhlIHdvcmtzcGFjZSAqL1xuICBwcm90ZWN0ZWQgYXN5bmMgcmVzdGFydEFsbFNlcnZlcnMoKSB7XG4gICAgYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5yZXN0YXJ0QWxsU2VydmVycygpO1xuICB9XG5cbiAgLy8gRGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgcmVzdCBvZiB0aGUgQXV0b0xhbmd1YWdlQ2xpZW50XG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKiBBY3RpdmF0ZSBkb2VzIHZlcnkgbGl0dGxlIGZvciBwZXJmIHJlYXNvbnMgLSBob29rcyBpbiB2aWEgU2VydmVyTWFuYWdlciBmb3IgbGF0ZXIgJ2FjdGl2YXRpb24nICovXG4gIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9kaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICB0aGlzLm5hbWUgPSBgJHt0aGlzLmdldExhbmd1YWdlTmFtZSgpfSAoJHt0aGlzLmdldFNlcnZlck5hbWUoKX0pYDtcbiAgICB0aGlzLmxvZ2dlciA9IHRoaXMuZ2V0TG9nZ2VyKCk7XG4gICAgdGhpcy5fc2VydmVyTWFuYWdlciA9IG5ldyBTZXJ2ZXJNYW5hZ2VyKFxuICAgICAgKHApID0+IHRoaXMuc3RhcnRTZXJ2ZXIocCksXG4gICAgICB0aGlzLmxvZ2dlcixcbiAgICAgIChlKSA9PiB0aGlzLnNob3VsZFN0YXJ0Rm9yRWRpdG9yKGUpLFxuICAgICAgKGZpbGVwYXRoKSA9PiB0aGlzLmZpbHRlckNoYW5nZVdhdGNoZWRGaWxlcyhmaWxlcGF0aCksXG4gICAgICB0aGlzLnJlcG9ydEJ1c3lXaGlsZSxcbiAgICAgIHRoaXMuZ2V0U2VydmVyTmFtZSgpLFxuICAgICAgdGhpcy5zaHV0ZG93blNlcnZlcnNHcmFjZWZ1bGx5KCksXG4gICAgKTtcbiAgICB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnN0YXJ0TGlzdGVuaW5nKCk7XG4gICAgcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHRoaXMuZXhpdENsZWFudXAuYmluZCh0aGlzKSk7XG4gIH1cblxuICBwcml2YXRlIGV4aXRDbGVhbnVwKCk6IHZvaWQge1xuICAgIHRoaXMuX3NlcnZlck1hbmFnZXIudGVybWluYXRlKCk7XG4gIH1cblxuICAvKiogRGVhY3RpdmF0ZSBkaXNwb3NlcyB0aGUgcmVzb3VyY2VzIHdlJ3JlIHVzaW5nICovXG4gIHB1YmxpYyBhc3luYyBkZWFjdGl2YXRlKCk6IFByb21pc2U8YW55PiB7XG4gICAgdGhpcy5faXNEZWFjdGl2YXRpbmcgPSB0cnVlO1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICAgIHRoaXMuX3NlcnZlck1hbmFnZXIuc3RvcExpc3RlbmluZygpO1xuICAgIGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuc3RvcEFsbFNlcnZlcnMoKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzcGF3bkNoaWxkTm9kZShhcmdzOiBzdHJpbmdbXSwgb3B0aW9uczogY3AuU3Bhd25PcHRpb25zID0ge30pOiBjcC5DaGlsZFByb2Nlc3Mge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBzdGFydGluZyBjaGlsZCBOb2RlIFwiJHthcmdzLmpvaW4oJyAnKX1cImApO1xuICAgIG9wdGlvbnMuZW52ID0gb3B0aW9ucy5lbnYgfHwgT2JqZWN0LmNyZWF0ZShwcm9jZXNzLmVudik7XG4gICAgaWYgKG9wdGlvbnMuZW52KSB7XG4gICAgICBvcHRpb25zLmVudi5FTEVDVFJPTl9SVU5fQVNfTk9ERSA9ICcxJztcbiAgICAgIG9wdGlvbnMuZW52LkVMRUNUUk9OX05PX0FUVEFDSF9DT05TT0xFID0gJzEnO1xuICAgIH1cbiAgICByZXR1cm4gY3Auc3Bhd24ocHJvY2Vzcy5leGVjUGF0aCwgYXJncywgb3B0aW9ucyk7XG4gIH1cblxuICAvKiogTFNQIGxvZ2dpbmcgaXMgb25seSBzZXQgZm9yIHdhcm5pbmdzICYgZXJyb3JzIGJ5IGRlZmF1bHQgdW5sZXNzIHlvdSB0dXJuIG9uIHRoZSBjb3JlLmRlYnVnTFNQIHNldHRpbmcgKi9cbiAgcHJvdGVjdGVkIGdldExvZ2dlcigpOiBMb2dnZXIge1xuICAgIGNvbnN0IGZpbHRlciA9IGF0b20uY29uZmlnLmdldCgnY29yZS5kZWJ1Z0xTUCcpXG4gICAgICA/IEZpbHRlcmVkTG9nZ2VyLkRldmVsb3BlckxldmVsRmlsdGVyXG4gICAgICA6IEZpbHRlcmVkTG9nZ2VyLlVzZXJMZXZlbEZpbHRlcjtcbiAgICByZXR1cm4gbmV3IEZpbHRlcmVkTG9nZ2VyKG5ldyBDb25zb2xlTG9nZ2VyKHRoaXMubmFtZSksIGZpbHRlcik7XG4gIH1cblxuICAvKiogU3RhcnRzIHRoZSBzZXJ2ZXIgYnkgc3RhcnRpbmcgdGhlIHByb2Nlc3MsIHRoZW4gaW5pdGlhbGl6aW5nIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgYW5kIHN0YXJ0aW5nIGFkYXB0ZXJzICovXG4gIHByaXZhdGUgYXN5bmMgc3RhcnRTZXJ2ZXIocHJvamVjdFBhdGg6IHN0cmluZyk6IFByb21pc2U8QWN0aXZlU2VydmVyPiB7XG4gICAgY29uc3QgcHJvY2VzcyA9IGF3YWl0IHRoaXMucmVwb3J0QnVzeVdoaWxlKFxuICAgICAgYFN0YXJ0aW5nICR7dGhpcy5nZXRTZXJ2ZXJOYW1lKCl9IGZvciAke3BhdGguYmFzZW5hbWUocHJvamVjdFBhdGgpfWAsXG4gICAgICBhc3luYyAoKSA9PiB0aGlzLnN0YXJ0U2VydmVyUHJvY2Vzcyhwcm9qZWN0UGF0aCksXG4gICAgKTtcbiAgICB0aGlzLmNhcHR1cmVTZXJ2ZXJFcnJvcnMocHJvY2VzcywgcHJvamVjdFBhdGgpO1xuICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBuZXcgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uKHRoaXMuY3JlYXRlUnBjQ29ubmVjdGlvbihwcm9jZXNzKSwgdGhpcy5sb2dnZXIpO1xuICAgIHRoaXMucHJlSW5pdGlhbGl6YXRpb24oY29ubmVjdGlvbik7XG4gICAgY29uc3QgaW5pdGlhbGl6ZVBhcmFtcyA9IHRoaXMuZ2V0SW5pdGlhbGl6ZVBhcmFtcyhwcm9qZWN0UGF0aCwgcHJvY2Vzcyk7XG4gICAgY29uc3QgaW5pdGlhbGl6YXRpb24gPSBjb25uZWN0aW9uLmluaXRpYWxpemUoaW5pdGlhbGl6ZVBhcmFtcyk7XG4gICAgdGhpcy5yZXBvcnRCdXN5V2hpbGUoXG4gICAgICBgJHt0aGlzLmdldFNlcnZlck5hbWUoKX0gaW5pdGlhbGl6aW5nIGZvciAke3BhdGguYmFzZW5hbWUocHJvamVjdFBhdGgpfWAsXG4gICAgICAoKSA9PiBpbml0aWFsaXphdGlvbixcbiAgICApO1xuICAgIGNvbnN0IGluaXRpYWxpemVSZXNwb25zZSA9IGF3YWl0IGluaXRpYWxpemF0aW9uO1xuICAgIGNvbnN0IG5ld1NlcnZlcjogQWN0aXZlU2VydmVyID0ge1xuICAgICAgcHJvamVjdFBhdGgsXG4gICAgICBwcm9jZXNzLFxuICAgICAgY29ubmVjdGlvbixcbiAgICAgIGNhcGFiaWxpdGllczogaW5pdGlhbGl6ZVJlc3BvbnNlLmNhcGFiaWxpdGllcyxcbiAgICAgIGRpc3Bvc2FibGU6IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCksXG4gICAgICBhZGRpdGlvbmFsUGF0aHM6IG5ldyBTZXQoKSxcbiAgICAgIGNvbnNpZGVyRGVmaW5pdGlvblBhdGg6IChkZWZQYXRoOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICAgICAgaWYgKCFkZWZQYXRoLnN0YXJ0c1dpdGgocHJvamVjdFBhdGgpKSB7XG4gICAgICAgICAgbmV3U2VydmVyLmFkZGl0aW9uYWxQYXRocy5hZGQocGF0aC5kaXJuYW1lKGRlZlBhdGgpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9O1xuICAgIHRoaXMucG9zdEluaXRpYWxpemF0aW9uKG5ld1NlcnZlcik7XG4gICAgY29ubmVjdGlvbi5pbml0aWFsaXplZCgpO1xuICAgIGNvbm5lY3Rpb24ub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLl9pc0RlYWN0aXZhdGluZykge1xuICAgICAgICB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnN0b3BTZXJ2ZXIobmV3U2VydmVyKTtcbiAgICAgICAgaWYgKCF0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmhhc1NlcnZlclJlYWNoZWRSZXN0YXJ0TGltaXQobmV3U2VydmVyKSkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBSZXN0YXJ0aW5nIGxhbmd1YWdlIHNlcnZlciBmb3IgcHJvamVjdCAnJHtuZXdTZXJ2ZXIucHJvamVjdFBhdGh9J2ApO1xuICAgICAgICAgIHRoaXMuX3NlcnZlck1hbmFnZXIuc3RhcnRTZXJ2ZXIocHJvamVjdFBhdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYExhbmd1YWdlIHNlcnZlciBoYXMgZXhjZWVkZWQgYXV0by1yZXN0YXJ0IGxpbWl0IGZvciBwcm9qZWN0ICcke25ld1NlcnZlci5wcm9qZWN0UGF0aH0nYCk7XG4gICAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKFxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuICAgICAgICAgICAgYFRoZSAke3RoaXMubmFtZX0gbGFuZ3VhZ2Ugc2VydmVyIGhhcyBleGl0ZWQgYW5kIGV4Y2VlZGVkIHRoZSByZXN0YXJ0IGxpbWl0IGZvciBwcm9qZWN0ICcke25ld1NlcnZlci5wcm9qZWN0UGF0aH0nYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25LZXkgPSB0aGlzLmdldFJvb3RDb25maWd1cmF0aW9uS2V5KCk7XG4gICAgaWYgKGNvbmZpZ3VyYXRpb25LZXkpIHtcbiAgICAgIG5ld1NlcnZlci5kaXNwb3NhYmxlLmFkZChcbiAgICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShjb25maWd1cmF0aW9uS2V5LCAoY29uZmlnKSA9PiB7XG4gICAgICAgICAgY29uc3QgbWFwcGVkQ29uZmlnID0gdGhpcy5tYXBDb25maWd1cmF0aW9uT2JqZWN0KGNvbmZpZyB8fCB7fSk7XG4gICAgICAgICAgaWYgKG1hcHBlZENvbmZpZykge1xuICAgICAgICAgICAgY29ubmVjdGlvbi5kaWRDaGFuZ2VDb25maWd1cmF0aW9uKHtcbiAgICAgICAgICAgICAgc2V0dGluZ3M6IG1hcHBlZENvbmZpZyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhcnRFeGNsdXNpdmVBZGFwdGVycyhuZXdTZXJ2ZXIpO1xuICAgIHJldHVybiBuZXdTZXJ2ZXI7XG4gIH1cblxuICBwcml2YXRlIGNhcHR1cmVTZXJ2ZXJFcnJvcnMoY2hpbGRQcm9jZXNzOiBMYW5ndWFnZVNlcnZlclByb2Nlc3MsIHByb2plY3RQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjaGlsZFByb2Nlc3Mub24oJ2Vycm9yJywgKGVycikgPT4gdGhpcy5oYW5kbGVTcGF3bkZhaWx1cmUoZXJyKSk7XG4gICAgY2hpbGRQcm9jZXNzLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4gdGhpcy5sb2dnZXIuZGVidWcoYGV4aXQ6IGNvZGUgJHtjb2RlfSBzaWduYWwgJHtzaWduYWx9YCkpO1xuICAgIGNoaWxkUHJvY2Vzcy5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbiAgICBjaGlsZFByb2Nlc3Muc3RkZXJyLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgIGNvbnN0IGVycm9yU3RyaW5nID0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgIHRoaXMuaGFuZGxlU2VydmVyU3RkZXJyKGVycm9yU3RyaW5nLCBwcm9qZWN0UGF0aCk7XG4gICAgICAvLyBLZWVwIHRoZSBsYXN0IDUgbGluZXMgZm9yIHBhY2thZ2VzIHRvIHVzZSBpbiBtZXNzYWdlc1xuICAgICAgdGhpcy5wcm9jZXNzU3RkRXJyID0gKHRoaXMucHJvY2Vzc1N0ZEVyciArIGVycm9yU3RyaW5nKVxuICAgICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAgIC5zbGljZSgtNSlcbiAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVTcGF3bkZhaWx1cmUoZXJyOiBhbnkpOiB2b2lkIHtcbiAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoXG4gICAgICBgJHt0aGlzLmdldFNlcnZlck5hbWUoKX0gbGFuZ3VhZ2Ugc2VydmVyIGZvciAke3RoaXMuZ2V0TGFuZ3VhZ2VOYW1lKCl9IHVuYWJsZSB0byBzdGFydGAsXG4gICAgICB7XG4gICAgICAgIGRpc21pc3NhYmxlOiB0cnVlLFxuICAgICAgICBkZXNjcmlwdGlvbjogZXJyLnRvU3RyaW5nKCksXG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICAvKiogQ3JlYXRlcyB0aGUgUlBDIGNvbm5lY3Rpb24gd2hpY2ggY2FuIGJlIGlwYywgc29ja2V0IG9yIHN0ZGlvICovXG4gIHByaXZhdGUgY3JlYXRlUnBjQ29ubmVjdGlvbihwcm9jZXNzOiBMYW5ndWFnZVNlcnZlclByb2Nlc3MpOiBycGMuTWVzc2FnZUNvbm5lY3Rpb24ge1xuICAgIGxldCByZWFkZXI6IHJwYy5NZXNzYWdlUmVhZGVyO1xuICAgIGxldCB3cml0ZXI6IHJwYy5NZXNzYWdlV3JpdGVyO1xuICAgIGNvbnN0IGNvbm5lY3Rpb25UeXBlID0gdGhpcy5nZXRDb25uZWN0aW9uVHlwZSgpO1xuICAgIHN3aXRjaCAoY29ubmVjdGlvblR5cGUpIHtcbiAgICAgIGNhc2UgJ2lwYyc6XG4gICAgICAgIHJlYWRlciA9IG5ldyBycGMuSVBDTWVzc2FnZVJlYWRlcihwcm9jZXNzIGFzIGNwLkNoaWxkUHJvY2Vzcyk7XG4gICAgICAgIHdyaXRlciA9IG5ldyBycGMuSVBDTWVzc2FnZVdyaXRlcihwcm9jZXNzIGFzIGNwLkNoaWxkUHJvY2Vzcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc29ja2V0JzpcbiAgICAgICAgcmVhZGVyID0gbmV3IHJwYy5Tb2NrZXRNZXNzYWdlUmVhZGVyKHRoaXMuc29ja2V0KTtcbiAgICAgICAgd3JpdGVyID0gbmV3IHJwYy5Tb2NrZXRNZXNzYWdlV3JpdGVyKHRoaXMuc29ja2V0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdGRpbyc6XG4gICAgICAgIHJlYWRlciA9IG5ldyBycGMuU3RyZWFtTWVzc2FnZVJlYWRlcihwcm9jZXNzLnN0ZG91dCk7XG4gICAgICAgIHdyaXRlciA9IG5ldyBycGMuU3RyZWFtTWVzc2FnZVdyaXRlcihwcm9jZXNzLnN0ZGluKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gVXRpbHMuYXNzZXJ0VW5yZWFjaGFibGUoY29ubmVjdGlvblR5cGUpO1xuICAgIH1cblxuICAgIHJldHVybiBycGMuY3JlYXRlTWVzc2FnZUNvbm5lY3Rpb24ocmVhZGVyLCB3cml0ZXIsIHtcbiAgICAgIGxvZzogKC4uLl9hcmdzOiBhbnlbXSkgPT4geyB9LFxuICAgICAgd2FybjogKC4uLl9hcmdzOiBhbnlbXSkgPT4geyB9LFxuICAgICAgaW5mbzogKC4uLl9hcmdzOiBhbnlbXSkgPT4geyB9LFxuICAgICAgZXJyb3I6ICguLi5hcmdzOiBhbnlbXSkgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihhcmdzKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICAvKiogU3RhcnQgYWRhcHRlcnMgdGhhdCBhcmUgbm90IHNoYXJlZCBiZXR3ZWVuIHNlcnZlcnMgKi9cbiAgcHJpdmF0ZSBzdGFydEV4Y2x1c2l2ZUFkYXB0ZXJzKHNlcnZlcjogQWN0aXZlU2VydmVyKTogdm9pZCB7XG4gICAgQXBwbHlFZGl0QWRhcHRlci5hdHRhY2goc2VydmVyLmNvbm5lY3Rpb24pO1xuICAgIE5vdGlmaWNhdGlvbnNBZGFwdGVyLmF0dGFjaChzZXJ2ZXIuY29ubmVjdGlvbiwgdGhpcy5uYW1lLCBzZXJ2ZXIucHJvamVjdFBhdGgpO1xuXG4gICAgaWYgKERvY3VtZW50U3luY0FkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIGNvbnN0IGRvY1N5bmNBZGFwdGVyID1cbiAgICAgICAgbmV3IERvY3VtZW50U3luY0FkYXB0ZXIoXG4gICAgICAgICAgc2VydmVyLmNvbm5lY3Rpb24sXG4gICAgICAgICAgKGVkaXRvcikgPT4gdGhpcy5zaG91bGRTeW5jRm9yRWRpdG9yKGVkaXRvciwgc2VydmVyLnByb2plY3RQYXRoKSxcbiAgICAgICAgICBzZXJ2ZXIuY2FwYWJpbGl0aWVzLnRleHREb2N1bWVudFN5bmMsXG4gICAgICAgICAgdGhpcy5yZXBvcnRCdXN5V2hpbGUsXG4gICAgICAgICk7XG4gICAgICBzZXJ2ZXIuZGlzcG9zYWJsZS5hZGQoZG9jU3luY0FkYXB0ZXIpO1xuICAgIH1cblxuICAgIGNvbnN0IGxpbnRlclB1c2hWMiA9IG5ldyBMaW50ZXJQdXNoVjJBZGFwdGVyKHNlcnZlci5jb25uZWN0aW9uKTtcbiAgICBpZiAodGhpcy5fbGludGVyRGVsZWdhdGUgIT0gbnVsbCkge1xuICAgICAgbGludGVyUHVzaFYyLmF0dGFjaCh0aGlzLl9saW50ZXJEZWxlZ2F0ZSk7XG4gICAgfVxuICAgIHNlcnZlci5kaXNwb3NhYmxlLmFkZChsaW50ZXJQdXNoVjIpO1xuXG4gICAgY29uc3QgbG9nZ2luZ0NvbnNvbGUgPSBuZXcgTG9nZ2luZ0NvbnNvbGVBZGFwdGVyKHNlcnZlci5jb25uZWN0aW9uKTtcbiAgICBpZiAodGhpcy5fY29uc29sZURlbGVnYXRlICE9IG51bGwpIHtcbiAgICAgIGxvZ2dpbmdDb25zb2xlLmF0dGFjaCh0aGlzLl9jb25zb2xlRGVsZWdhdGUoeyBpZDogdGhpcy5uYW1lLCBuYW1lOiB0aGlzLmdldExhbmd1YWdlTmFtZSgpIH0pKTtcbiAgICB9XG4gICAgc2VydmVyLmRpc3Bvc2FibGUuYWRkKGxvZ2dpbmdDb25zb2xlKTtcblxuICAgIGxldCBzaWduYXR1cmVIZWxwQWRhcHRlcjogU2lnbmF0dXJlSGVscEFkYXB0ZXIgfCB1bmRlZmluZWQ7XG4gICAgaWYgKFNpZ25hdHVyZUhlbHBBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICBzaWduYXR1cmVIZWxwQWRhcHRlciA9IG5ldyBTaWduYXR1cmVIZWxwQWRhcHRlcihzZXJ2ZXIsIHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpKTtcbiAgICAgIGlmICh0aGlzLl9zaWduYXR1cmVIZWxwUmVnaXN0cnkgIT0gbnVsbCkge1xuICAgICAgICBzaWduYXR1cmVIZWxwQWRhcHRlci5hdHRhY2godGhpcy5fc2lnbmF0dXJlSGVscFJlZ2lzdHJ5KTtcbiAgICAgIH1cbiAgICAgIHNlcnZlci5kaXNwb3NhYmxlLmFkZChzaWduYXR1cmVIZWxwQWRhcHRlcik7XG4gICAgfVxuXG4gICAgdGhpcy5fc2VydmVyQWRhcHRlcnMuc2V0KHNlcnZlciwge1xuICAgICAgbGludGVyUHVzaFYyLCBsb2dnaW5nQ29uc29sZSwgc2lnbmF0dXJlSGVscEFkYXB0ZXIsXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgc2hvdWxkU3luY0ZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IsIHByb2plY3RQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc0ZpbGVJblByb2plY3QoZWRpdG9yLCBwcm9qZWN0UGF0aCkgJiYgdGhpcy5zaG91bGRTdGFydEZvckVkaXRvcihlZGl0b3IpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGlzRmlsZUluUHJvamVjdChlZGl0b3I6IFRleHRFZGl0b3IsIHByb2plY3RQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKGVkaXRvci5nZXRQYXRoKCkgfHwgJycpLnN0YXJ0c1dpdGgocHJvamVjdFBhdGgpO1xuICB9XG5cbiAgLy8gQXV0b2NvbXBsZXRlKyB2aWEgTFMgY29tcGxldGlvbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZUF1dG9jb21wbGV0ZSgpOiBhYy5BdXRvY29tcGxldGVQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNlbGVjdG9yOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKVxuICAgICAgICAubWFwKChnKSA9PiBnLmluY2x1ZGVzKCcuJykgPyAnLicgKyBnIDogZylcbiAgICAgICAgLmpvaW4oJywgJyksXG4gICAgICBpbmNsdXNpb25Qcmlvcml0eTogMSxcbiAgICAgIHN1Z2dlc3Rpb25Qcmlvcml0eTogMixcbiAgICAgIGV4Y2x1ZGVMb3dlclByaW9yaXR5OiBmYWxzZSxcbiAgICAgIGdldFN1Z2dlc3Rpb25zOiB0aGlzLmdldFN1Z2dlc3Rpb25zLmJpbmQodGhpcyksXG4gICAgICBvbkRpZEluc2VydFN1Z2dlc3Rpb246IChldmVudCkgPT4ge1xuICAgICAgICB0aGlzLmhhbmRsZUFkZGl0aW9uYWxUZXh0RWRpdHMoZXZlbnQpO1xuICAgICAgICB0aGlzLm9uRGlkSW5zZXJ0U3VnZ2VzdGlvbihldmVudCk7XG4gICAgICB9LFxuICAgICAgZ2V0U3VnZ2VzdGlvbkRldGFpbHNPblNlbGVjdDogdGhpcy5nZXRTdWdnZXN0aW9uRGV0YWlsc09uU2VsZWN0LmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRTdWdnZXN0aW9ucyhcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICApOiBQcm9taXNlPGFjLkFueVN1Z2dlc3Rpb25bXT4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKHJlcXVlc3QuZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIUF1dG9jb21wbGV0ZUFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICB0aGlzLmF1dG9Db21wbGV0ZSA9IHRoaXMuYXV0b0NvbXBsZXRlIHx8IG5ldyBBdXRvY29tcGxldGVBZGFwdGVyKCk7XG4gICAgdGhpcy5fbGFzdEF1dG9jb21wbGV0ZVJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIHJldHVybiB0aGlzLmF1dG9Db21wbGV0ZS5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIHJlcXVlc3QsIHRoaXMub25EaWRDb252ZXJ0QXV0b2NvbXBsZXRlLFxuICAgICAgYXRvbS5jb25maWcuZ2V0KCdhdXRvY29tcGxldGUtcGx1cy5taW5pbXVtV29yZExlbmd0aCcpKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRTdWdnZXN0aW9uRGV0YWlsc09uU2VsZWN0KFxuICAgIHN1Z2dlc3Rpb246IGFjLkFueVN1Z2dlc3Rpb24sXG4gICk6IFByb21pc2U8YWMuQW55U3VnZ2VzdGlvbiB8IG51bGw+IHtcbiAgICBjb25zdCByZXF1ZXN0ID0gdGhpcy5fbGFzdEF1dG9jb21wbGV0ZVJlcXVlc3Q7XG4gICAgaWYgKHJlcXVlc3QgPT0gbnVsbCkgeyByZXR1cm4gbnVsbDsgfVxuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKHJlcXVlc3QuZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIUF1dG9jb21wbGV0ZUFkYXB0ZXIuY2FuUmVzb2x2ZShzZXJ2ZXIuY2FwYWJpbGl0aWVzKSB8fCB0aGlzLmF1dG9Db21wbGV0ZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hdXRvQ29tcGxldGUuY29tcGxldGVTdWdnZXN0aW9uKHNlcnZlciwgc3VnZ2VzdGlvbiwgcmVxdWVzdCwgdGhpcy5vbkRpZENvbnZlcnRBdXRvY29tcGxldGUpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG9uRGlkQ29udmVydEF1dG9jb21wbGV0ZShcbiAgICBfY29tcGxldGlvbkl0ZW06IGxzLkNvbXBsZXRpb25JdGVtLFxuICAgIF9zdWdnZXN0aW9uOiBhYy5BbnlTdWdnZXN0aW9uLFxuICAgIF9yZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICApOiB2b2lkIHtcbiAgfVxuXG4gIC8vIEhhbmRsZSBhZGRpdGlvbmFsIHN0dWZmIGFmdGVyIGEgc3VnZ2VzdGlvbiBpbnNlcnQsIGUuZy4gYGFkZGl0aW9uYWxUZXh0RWRpdHNgLlxuICBwcml2YXRlIGhhbmRsZUFkZGl0aW9uYWxUZXh0RWRpdHMoZTogYWMuU3VnZ2VzdGlvbkluc2VydGVkRXZlbnQpOiB2b2lkIHtcbiAgICBjb25zdCBzdWdnZXN0aW9uID0gZS5zdWdnZXN0aW9uIGFzIGF0b21JZGUuU3VnZ2VzdGlvbkJhc2U7XG4gICAgY29uc3QgYWRkaXRpb25hbEVkaXRzID0gc3VnZ2VzdGlvbi5jb21wbGV0aW9uSXRlbSAmJiBzdWdnZXN0aW9uLmNvbXBsZXRpb25JdGVtLmFkZGl0aW9uYWxUZXh0RWRpdHM7XG4gICAgY29uc3QgYnVmZmVyID0gZS5lZGl0b3IuZ2V0QnVmZmVyKCk7XG5cbiAgICBBcHBseUVkaXRBZGFwdGVyLmFwcGx5RWRpdHMoYnVmZmVyLCBDb252ZXJ0LmNvbnZlcnRMc1RleHRFZGl0cyhhZGRpdGlvbmFsRWRpdHMpKTtcbiAgICBidWZmZXIuZ3JvdXBMYXN0Q2hhbmdlcygpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG9uRGlkSW5zZXJ0U3VnZ2VzdGlvbihfYXJnOiBhYy5TdWdnZXN0aW9uSW5zZXJ0ZWRFdmVudCk6IHZvaWQgeyB9XG5cbiAgLy8gRGVmaW5pdGlvbnMgdmlhIExTIGRvY3VtZW50SGlnaGxpZ2h0IGFuZCBnb3RvRGVmaW5pdGlvbi0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZURlZmluaXRpb25zKCk6IGF0b21JZGUuRGVmaW5pdGlvblByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgcHJpb3JpdHk6IDIwLFxuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBnZXREZWZpbml0aW9uOiB0aGlzLmdldERlZmluaXRpb24uYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldERlZmluaXRpb24oZWRpdG9yOiBUZXh0RWRpdG9yLCBwb2ludDogUG9pbnQpOiBQcm9taXNlPGF0b21JZGUuRGVmaW5pdGlvblF1ZXJ5UmVzdWx0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFEZWZpbml0aW9uQWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5kZWZpbml0aW9ucyA9IHRoaXMuZGVmaW5pdGlvbnMgfHwgbmV3IERlZmluaXRpb25BZGFwdGVyKCk7XG4gICAgY29uc3QgcXVlcnlQcm9taXNlID0gdGhpcy5kZWZpbml0aW9ucy5nZXREZWZpbml0aW9uKFxuICAgICAgc2VydmVyLmNvbm5lY3Rpb24sXG4gICAgICBzZXJ2ZXIuY2FwYWJpbGl0aWVzLFxuICAgICAgdGhpcy5nZXRMYW5ndWFnZU5hbWUoKSxcbiAgICAgIGVkaXRvcixcbiAgICAgIHBvaW50LFxuICAgICk7XG5cbiAgICBpZiAodGhpcy5zZXJ2ZXJzU3VwcG9ydERlZmluaXRpb25EZXN0aW5hdGlvbnMoKSkge1xuICAgICAgcXVlcnlQcm9taXNlLnRoZW4oKHF1ZXJ5KSA9PiB7XG4gICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZGVmIG9mIHF1ZXJ5LmRlZmluaXRpb25zKSB7XG4gICAgICAgICAgICBzZXJ2ZXIuY29uc2lkZXJEZWZpbml0aW9uUGF0aChkZWYucGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcXVlcnlQcm9taXNlO1xuICB9XG5cbiAgLy8gT3V0bGluZSBWaWV3IHZpYSBMUyBkb2N1bWVudFN5bWJvbC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZU91dGxpbmVzKCk6IGF0b21JZGUuT3V0bGluZVByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGdldE91dGxpbmU6IHRoaXMuZ2V0T3V0bGluZS5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0T3V0bGluZShlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPGF0b21JZGUuT3V0bGluZSB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhT3V0bGluZVZpZXdBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLm91dGxpbmVWaWV3ID0gdGhpcy5vdXRsaW5lVmlldyB8fCBuZXcgT3V0bGluZVZpZXdBZGFwdGVyKCk7XG4gICAgcmV0dXJuIHRoaXMub3V0bGluZVZpZXcuZ2V0T3V0bGluZShzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yKTtcbiAgfVxuXG4gIC8vIExpbnRlciBwdXNoIHYyIEFQSSB2aWEgTFMgcHVibGlzaERpYWdub3N0aWNzXG4gIHB1YmxpYyBjb25zdW1lTGludGVyVjIocmVnaXN0ZXJJbmRpZTogKHBhcmFtczogeyBuYW1lOiBzdHJpbmcgfSkgPT4gbGludGVyLkluZGllRGVsZWdhdGUpOiB2b2lkIHtcbiAgICB0aGlzLl9saW50ZXJEZWxlZ2F0ZSA9IHJlZ2lzdGVySW5kaWUoeyBuYW1lOiB0aGlzLm5hbWUgfSk7XG4gICAgaWYgKHRoaXMuX2xpbnRlckRlbGVnYXRlID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHNlcnZlciBvZiB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldEFjdGl2ZVNlcnZlcnMoKSkge1xuICAgICAgY29uc3QgbGludGVyUHVzaFYyID0gdGhpcy5nZXRTZXJ2ZXJBZGFwdGVyKHNlcnZlciwgJ2xpbnRlclB1c2hWMicpO1xuICAgICAgaWYgKGxpbnRlclB1c2hWMiAhPSBudWxsKSB7XG4gICAgICAgIGxpbnRlclB1c2hWMi5hdHRhY2godGhpcy5fbGludGVyRGVsZWdhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgUmVmZXJlbmNlcyB2aWEgTFMgZmluZFJlZmVyZW5jZXMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHVibGljIHByb3ZpZGVGaW5kUmVmZXJlbmNlcygpOiBhdG9tSWRlLkZpbmRSZWZlcmVuY2VzUHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBpc0VkaXRvclN1cHBvcnRlZDogKGVkaXRvcjogVGV4dEVkaXRvcikgPT4gdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCkuaW5jbHVkZXMoZWRpdG9yLmdldEdyYW1tYXIoKS5zY29wZU5hbWUpLFxuICAgICAgZmluZFJlZmVyZW5jZXM6IHRoaXMuZ2V0UmVmZXJlbmNlcy5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50OiBQb2ludCk6IFByb21pc2U8YXRvbUlkZS5GaW5kUmVmZXJlbmNlc1JldHVybiB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhRmluZFJlZmVyZW5jZXNBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmZpbmRSZWZlcmVuY2VzID0gdGhpcy5maW5kUmVmZXJlbmNlcyB8fCBuZXcgRmluZFJlZmVyZW5jZXNBZGFwdGVyKCk7XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXMuZ2V0UmVmZXJlbmNlcyhzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yLCBwb2ludCwgc2VydmVyLnByb2plY3RQYXRoKTtcbiAgfVxuXG4gIC8vIERhdGF0aXAgdmlhIExTIHRleHREb2N1bWVudC9ob3Zlci0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHVibGljIGNvbnN1bWVEYXRhdGlwKHNlcnZpY2U6IGF0b21JZGUuRGF0YXRpcFNlcnZpY2UpOiB2b2lkIHtcbiAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChcbiAgICAgIHNlcnZpY2UuYWRkUHJvdmlkZXIoe1xuICAgICAgICBwcm92aWRlck5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgICB2YWxpZEZvclNjb3BlOiAoc2NvcGVOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCkuaW5jbHVkZXMoc2NvcGVOYW1lKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YXRpcDogdGhpcy5nZXREYXRhdGlwLmJpbmQodGhpcyksXG4gICAgICB9KSxcbiAgICApO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldERhdGF0aXAoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb2ludDogUG9pbnQpOiBQcm9taXNlPGF0b21JZGUuRGF0YXRpcCB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhRGF0YXRpcEFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuZGF0YXRpcCA9IHRoaXMuZGF0YXRpcCB8fCBuZXcgRGF0YXRpcEFkYXB0ZXIoKTtcbiAgICByZXR1cm4gdGhpcy5kYXRhdGlwLmdldERhdGF0aXAoc2VydmVyLmNvbm5lY3Rpb24sIGVkaXRvciwgcG9pbnQpO1xuICB9XG5cbiAgLy8gQ29uc29sZSB2aWEgTFMgbG9nZ2luZy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgY29uc3VtZUNvbnNvbGUoY3JlYXRlQ29uc29sZTogYXRvbUlkZS5Db25zb2xlU2VydmljZSk6IERpc3Bvc2FibGUge1xuICAgIHRoaXMuX2NvbnNvbGVEZWxlZ2F0ZSA9IGNyZWF0ZUNvbnNvbGU7XG5cbiAgICBmb3IgKGNvbnN0IHNlcnZlciBvZiB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldEFjdGl2ZVNlcnZlcnMoKSkge1xuICAgICAgY29uc3QgbG9nZ2luZ0NvbnNvbGUgPSB0aGlzLmdldFNlcnZlckFkYXB0ZXIoc2VydmVyLCAnbG9nZ2luZ0NvbnNvbGUnKTtcbiAgICAgIGlmIChsb2dnaW5nQ29uc29sZSkge1xuICAgICAgICBsb2dnaW5nQ29uc29sZS5hdHRhY2godGhpcy5fY29uc29sZURlbGVnYXRlKHsgaWQ6IHRoaXMubmFtZSwgbmFtZTogdGhpcy5nZXRMYW5ndWFnZU5hbWUoKSB9KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm8gd2F5IG9mIGRldGFjaGluZyBmcm9tIGNsaWVudCBjb25uZWN0aW9ucyB0b2RheVxuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7IH0pO1xuICB9XG5cbiAgLy8gQ29kZSBGb3JtYXQgdmlhIExTIGZvcm1hdERvY3VtZW50ICYgZm9ybWF0RG9jdW1lbnRSYW5nZS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZUNvZGVGb3JtYXQoKTogYXRvbUlkZS5SYW5nZUNvZGVGb3JtYXRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBmb3JtYXRDb2RlOiB0aGlzLmdldENvZGVGb3JtYXQuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldENvZGVGb3JtYXQoZWRpdG9yOiBUZXh0RWRpdG9yLCByYW5nZTogUmFuZ2UpOiBQcm9taXNlPGF0b21JZGUuVGV4dEVkaXRbXT4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFDb2RlRm9ybWF0QWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXQoc2VydmVyLmNvbm5lY3Rpb24sIHNlcnZlci5jYXBhYmlsaXRpZXMsIGVkaXRvciwgcmFuZ2UpO1xuICB9XG5cbiAgcHVibGljIHByb3ZpZGVSYW5nZUNvZGVGb3JtYXQoKTogYXRvbUlkZS5SYW5nZUNvZGVGb3JtYXRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBmb3JtYXRDb2RlOiB0aGlzLmdldFJhbmdlQ29kZUZvcm1hdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0UmFuZ2VDb2RlRm9ybWF0KGVkaXRvcjogVGV4dEVkaXRvciwgcmFuZ2U6IFJhbmdlKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhc2VydmVyLmNhcGFiaWxpdGllcy5kb2N1bWVudFJhbmdlRm9ybWF0dGluZ1Byb3ZpZGVyKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIENvZGVGb3JtYXRBZGFwdGVyLmZvcm1hdFJhbmdlKHNlcnZlci5jb25uZWN0aW9uLCBlZGl0b3IsIHJhbmdlKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlRmlsZUNvZGVGb3JtYXQoKTogYXRvbUlkZS5GaWxlQ29kZUZvcm1hdFByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGZvcm1hdEVudGlyZUZpbGU6IHRoaXMuZ2V0RmlsZUNvZGVGb3JtYXQuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHVibGljIHByb3ZpZGVPblNhdmVDb2RlRm9ybWF0KCk6IGF0b21JZGUuT25TYXZlQ29kZUZvcm1hdFByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGZvcm1hdE9uU2F2ZTogdGhpcy5nZXRGaWxlQ29kZUZvcm1hdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0RmlsZUNvZGVGb3JtYXQoZWRpdG9yOiBUZXh0RWRpdG9yKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhc2VydmVyLmNhcGFiaWxpdGllcy5kb2N1bWVudEZvcm1hdHRpbmdQcm92aWRlcikge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXREb2N1bWVudChzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlT25UeXBlQ29kZUZvcm1hdCgpOiBhdG9tSWRlLk9uVHlwZUNvZGVGb3JtYXRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBmb3JtYXRBdFBvc2l0aW9uOiB0aGlzLmdldE9uVHlwZUNvZGVGb3JtYXQuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldE9uVHlwZUNvZGVGb3JtYXQoXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHBvaW50OiBQb2ludCxcbiAgICBjaGFyYWN0ZXI6IHN0cmluZyxcbiAgKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhc2VydmVyLmNhcGFiaWxpdGllcy5kb2N1bWVudE9uVHlwZUZvcm1hdHRpbmdQcm92aWRlcikge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXRPblR5cGUoc2VydmVyLmNvbm5lY3Rpb24sIGVkaXRvciwgcG9pbnQsIGNoYXJhY3Rlcik7XG4gIH1cblxuICBwdWJsaWMgcHJvdmlkZUNvZGVIaWdobGlnaHQoKTogYXRvbUlkZS5Db2RlSGlnaGxpZ2h0UHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgaGlnaGxpZ2h0OiAoZWRpdG9yLCBwb3NpdGlvbikgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRDb2RlSGlnaGxpZ2h0KGVkaXRvciwgcG9zaXRpb24pO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldENvZGVIaWdobGlnaHQoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb3NpdGlvbjogUG9pbnQpOiBQcm9taXNlPFJhbmdlW10gfCBudWxsPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIUNvZGVIaWdobGlnaHRBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29kZUhpZ2hsaWdodEFkYXB0ZXIuaGlnaGxpZ2h0KHNlcnZlci5jb25uZWN0aW9uLCBzZXJ2ZXIuY2FwYWJpbGl0aWVzLCBlZGl0b3IsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlQ29kZUFjdGlvbnMoKTogYXRvbUlkZS5Db2RlQWN0aW9uUHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgZ2V0Q29kZUFjdGlvbnM6IChlZGl0b3IsIHJhbmdlLCBkaWFnbm9zdGljcykgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRDb2RlQWN0aW9ucyhlZGl0b3IsIHJhbmdlLCBkaWFnbm9zdGljcyk7XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0Q29kZUFjdGlvbnMoZWRpdG9yOiBUZXh0RWRpdG9yLCByYW5nZTogUmFuZ2UsIGRpYWdub3N0aWNzOiBhdG9tSWRlLkRpYWdub3N0aWNbXSk6IFByb21pc2U8YXRvbUlkZS5Db2RlQWN0aW9uW10gfCBudWxsPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIUNvZGVBY3Rpb25BZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29kZUFjdGlvbkFkYXB0ZXIuZ2V0Q29kZUFjdGlvbnMoXG4gICAgICBzZXJ2ZXIuY29ubmVjdGlvbixcbiAgICAgIHNlcnZlci5jYXBhYmlsaXRpZXMsXG4gICAgICB0aGlzLmdldFNlcnZlckFkYXB0ZXIoc2VydmVyLCAnbGludGVyUHVzaFYyJyksXG4gICAgICBlZGl0b3IsXG4gICAgICByYW5nZSxcbiAgICAgIGRpYWdub3N0aWNzLFxuICAgICAgdGhpcy5maWx0ZXJDb2RlQWN0aW9ucy5iaW5kKHRoaXMpLFxuICAgICAgdGhpcy5vbkFwcGx5Q29kZUFjdGlvbnMuYmluZCh0aGlzKSxcbiAgICApO1xuICB9XG5cbiAgLyoqIE9wdGlvbmFsbHkgZmlsdGVyIGNvZGUgYWN0aW9uIGJlZm9yZSB0aGV5J3JlIGRpc3BsYXllZCAqL1xuICBwcm90ZWN0ZWQgZmlsdGVyQ29kZUFjdGlvbnMoYWN0aW9uczogKGxzLkNvbW1hbmQgfCBscy5Db2RlQWN0aW9uKVtdKTogKGxzLkNvbW1hbmQgfCBscy5Db2RlQWN0aW9uKVtdIHtcbiAgICByZXR1cm4gYWN0aW9ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBPcHRpb25hbGx5IGhhbmRsZSBhIGNvZGUgYWN0aW9uIGJlZm9yZSBkZWZhdWx0IGhhbmRsaW5nLlxuICAgKiBSZXR1cm4gZmFsc2UgdG8gcHJldmVudCBkZWZhdWx0IGhhbmRsaW5nLCB0cnVlIHRvIGNvbnRpbnVlIHdpdGggZGVmYXVsdCBoYW5kbGluZy5cbiAgICovXG4gIHByb3RlY3RlZCBhc3luYyBvbkFwcGx5Q29kZUFjdGlvbnMoX2FjdGlvbjogbHMuQ29tbWFuZCB8IGxzLkNvZGVBY3Rpb24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlUmVmYWN0b3IoKTogYXRvbUlkZS5SZWZhY3RvclByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIHJlbmFtZTogdGhpcy5nZXRSZW5hbWUuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFJlbmFtZShlZGl0b3I6IFRleHRFZGl0b3IsIHBvc2l0aW9uOiBQb2ludCwgbmV3TmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIVJlbmFtZUFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBSZW5hbWVBZGFwdGVyLmdldFJlbmFtZShcbiAgICAgIHNlcnZlci5jb25uZWN0aW9uLFxuICAgICAgZWRpdG9yLFxuICAgICAgcG9zaXRpb24sXG4gICAgICBuZXdOYW1lLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgY29uc3VtZVNpZ25hdHVyZUhlbHAocmVnaXN0cnk6IGF0b21JZGUuU2lnbmF0dXJlSGVscFJlZ2lzdHJ5KTogRGlzcG9zYWJsZSB7XG4gICAgdGhpcy5fc2lnbmF0dXJlSGVscFJlZ2lzdHJ5ID0gcmVnaXN0cnk7XG4gICAgZm9yIChjb25zdCBzZXJ2ZXIgb2YgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRBY3RpdmVTZXJ2ZXJzKCkpIHtcbiAgICAgIGNvbnN0IHNpZ25hdHVyZUhlbHBBZGFwdGVyID0gdGhpcy5nZXRTZXJ2ZXJBZGFwdGVyKHNlcnZlciwgJ3NpZ25hdHVyZUhlbHBBZGFwdGVyJyk7XG4gICAgICBpZiAoc2lnbmF0dXJlSGVscEFkYXB0ZXIgIT0gbnVsbCkge1xuICAgICAgICBzaWduYXR1cmVIZWxwQWRhcHRlci5hdHRhY2gocmVnaXN0cnkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgdGhpcy5fc2lnbmF0dXJlSGVscFJlZ2lzdHJ5ID0gdW5kZWZpbmVkO1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGNvbnN1bWVCdXN5U2lnbmFsKHNlcnZpY2U6IGF0b21JZGUuQnVzeVNpZ25hbFNlcnZpY2UpOiBEaXNwb3NhYmxlIHtcbiAgICB0aGlzLmJ1c3lTaWduYWxTZXJ2aWNlID0gc2VydmljZTtcbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4gZGVsZXRlIHRoaXMuYnVzeVNpZ25hbFNlcnZpY2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIGBkaWRDaGFuZ2VXYXRjaGVkRmlsZXNgIG1lc3NhZ2UgZmlsdGVyaW5nLCBvdmVycmlkZSBmb3IgY3VzdG9tIGxvZ2ljLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggUGF0aCBvZiBhIGZpbGUgdGhhdCBoYXMgY2hhbmdlZCBpbiB0aGUgcHJvamVjdCBwYXRoXG4gICAqIEByZXR1cm5zIGBmYWxzZWAgPT4gbWVzc2FnZSB3aWxsIG5vdCBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICovXG4gIHByb3RlY3RlZCBmaWx0ZXJDaGFuZ2VXYXRjaGVkRmlsZXMoX2ZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKiBAcmV0dXJuIGZhbHNlID0+IHNlcnZlcnMgd2lsbCBiZSBraWxsZWQgd2l0aG91dCBhd2FpdGluZyBzaHV0ZG93biByZXNwb25zZS4gKi9cbiAgcHJvdGVjdGVkIHNodXRkb3duU2VydmVyc0dyYWNlZnVsbHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIG9uIGxhbmd1YWdlIHNlcnZlciBzdGRlcnIgb3V0cHV0LlxuICAgKiBAcGFyYW0gc3RkZXJyIEEgY2h1bmsgb2Ygc3RkZXJyIGZyb20gYSBsYW5ndWFnZSBzZXJ2ZXIgaW5zdGFuY2VcbiAgICovXG4gIHByb3RlY3RlZCBoYW5kbGVTZXJ2ZXJTdGRlcnIoc3RkZXJyOiBzdHJpbmcsIF9wcm9qZWN0UGF0aDogc3RyaW5nKSB7XG4gICAgc3RkZXJyLnNwbGl0KCdcXG4nKS5maWx0ZXIoKGwpID0+IGwpLmZvckVhY2goKGxpbmUpID0+IHRoaXMubG9nZ2VyLndhcm4oYHN0ZGVyciAke2xpbmV9YCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB0aGF0IHRoZSBsYW5ndWFnZSBzZXJ2ZXIgY2FuIHN1cHBvcnQgTFNQIGZ1bmN0aW9uYWxpdHkgZm9yXG4gICAqIG91dCBvZiBwcm9qZWN0IGZpbGVzIGluZGljYXRlZCBieSBgdGV4dERvY3VtZW50L2RlZmluaXRpb25gIHJlc3BvbnNlcy5cbiAgICpcbiAgICogRGVmYXVsdDogZmFsc2VcbiAgICovXG4gIHByb3RlY3RlZCBzZXJ2ZXJzU3VwcG9ydERlZmluaXRpb25EZXN0aW5hdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTZXJ2ZXJBZGFwdGVyPFQgZXh0ZW5kcyBrZXlvZiBTZXJ2ZXJBZGFwdGVycz4oXG4gICAgc2VydmVyOiBBY3RpdmVTZXJ2ZXIsIGFkYXB0ZXI6IFQsXG4gICk6IFNlcnZlckFkYXB0ZXJzW1RdIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBhZGFwdGVycyA9IHRoaXMuX3NlcnZlckFkYXB0ZXJzLmdldChzZXJ2ZXIpO1xuICAgIHJldHVybiBhZGFwdGVycyAmJiBhZGFwdGVyc1thZGFwdGVyXTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZXBvcnRCdXN5V2hpbGU6IFV0aWxzLlJlcG9ydEJ1c3lXaGlsZSA9IGFzeW5jICh0aXRsZSwgZikgPT4ge1xuICAgIGlmICh0aGlzLmJ1c3lTaWduYWxTZXJ2aWNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5idXN5U2lnbmFsU2VydmljZS5yZXBvcnRCdXN5V2hpbGUodGl0bGUsIGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXBvcnRCdXN5V2hpbGVEZWZhdWx0KHRpdGxlLCBmKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVwb3J0QnVzeVdoaWxlRGVmYXVsdDogVXRpbHMuUmVwb3J0QnVzeVdoaWxlID0gYXN5bmMgKHRpdGxlLCBmKSA9PiB7XG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgW1N0YXJ0ZWRdICR7dGl0bGV9YCk7XG4gICAgbGV0IHJlcztcbiAgICB0cnkge1xuICAgICAgcmVzID0gYXdhaXQgZigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGBbRmluaXNoZWRdICR7dGl0bGV9YCk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cbn1cbiJdfQ==