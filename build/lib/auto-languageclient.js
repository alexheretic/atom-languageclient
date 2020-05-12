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
            return code_action_adapter_1.default.getCodeActions(server.connection, server.capabilities, this.getServerAdapter(server, 'linterPushV2'), editor, range, diagnostics);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sYW5ndWFnZWNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9hdXRvLWxhbmd1YWdlY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBRXBDLHNDQUFzQztBQUN0Qyw2QkFBNkI7QUFHN0IsNkNBQW1DO0FBQ25DLHNFQUE2RDtBQUM3RCwwRUFBa0U7QUFDbEUsd0VBQStEO0FBQy9ELHdFQUErRDtBQUMvRCw4RUFBcUU7QUFDckUsZ0VBQXdEO0FBQ3hELHNFQUE4RDtBQUM5RCw0RUFBbUU7QUFDbkUsZ0ZBQXVFO0FBQ3ZFLDhFQUFvRTtBQUNwRSxnRkFBdUU7QUFDdkUsNEVBQW9FO0FBQ3BFLDBFQUFpRTtBQUNqRSw4REFBc0Q7QUFDdEQsOEVBQXFFO0FBQ3JFLGlDQUFpQztBQUVqQyxxREFBNEQ7QUFvQnJDLG1DQXBCZCx5Q0FBd0IsQ0FvQmM7QUFuQi9DLHFDQUlrQjtBQUNsQiwyREFJNkI7QUFDN0IsK0JBTWM7QUFZZDs7Ozs7Ozs7R0FRRztBQUNILE1BQXFCLGtCQUFrQjtJQUF2QztRQU9VLG9CQUFlLEdBQVksS0FBSyxDQUFDO1FBQ2pDLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQWdDLENBQUM7UUFLNUQsa0JBQWEsR0FBVyxFQUFFLENBQUM7UUFpeUIzQixvQkFBZSxHQUEwQixDQUFPLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwRSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDMUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN6RDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDOUM7UUFDSCxDQUFDLENBQUEsQ0FBQTtRQUVTLDJCQUFzQixHQUEwQixDQUFPLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDdkMsSUFBSSxHQUFHLENBQUM7WUFDUixJQUFJO2dCQUNGLEdBQUcsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDO2FBQ2pCO29CQUFTO2dCQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsS0FBSyxFQUFFLENBQUMsQ0FBQzthQUN6QztZQUNELE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxDQUFBLENBQUE7SUFDSCxDQUFDO0lBdnlCQyxnRkFBZ0Y7SUFDaEYsNEVBQTRFO0lBRTVFLDZFQUE2RTtJQUNuRSxnQkFBZ0I7UUFDeEIsTUFBTSxLQUFLLENBQUMsbUVBQW1FLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRUQscUVBQXFFO0lBQzNELGVBQWU7UUFDdkIsTUFBTSxLQUFLLENBQUMsa0VBQWtFLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQseURBQXlEO0lBQy9DLGFBQWE7UUFDckIsTUFBTSxLQUFLLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQsZ0NBQWdDO0lBQ3RCLGtCQUFrQixDQUFDLFlBQW9CO1FBQy9DLE1BQU0sS0FBSyxDQUFDLHFHQUFxRyxDQUFDLENBQUM7SUFDckgsQ0FBQztJQUVELDBEQUEwRDtJQUMxRCw4RUFBOEU7SUFFOUUsd0dBQXdHO0lBQzlGLG9CQUFvQixDQUFDLE1BQWtCO1FBQy9DLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBRUQseUdBQXlHO0lBQy9GLG1CQUFtQixDQUFDLFdBQW1CLEVBQUUsT0FBOEI7UUFDL0UsT0FBTztZQUNMLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRztZQUN0QixRQUFRLEVBQUUsV0FBVztZQUNyQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO1lBQ3ZDLGdCQUFnQixFQUFFLEVBQUU7WUFDcEIsWUFBWSxFQUFFO2dCQUNaLFNBQVMsRUFBRTtvQkFDVCxTQUFTLEVBQUUsSUFBSTtvQkFDZixhQUFhLEVBQUUsS0FBSztvQkFDcEIsYUFBYSxFQUFFO3dCQUNiLGVBQWUsRUFBRSxJQUFJO3FCQUN0QjtvQkFDRCxnQkFBZ0IsRUFBRSxLQUFLO29CQUN2QixzQkFBc0IsRUFBRTt3QkFDdEIsbUJBQW1CLEVBQUUsS0FBSztxQkFDM0I7b0JBQ0QscUJBQXFCLEVBQUU7d0JBQ3JCLG1CQUFtQixFQUFFLEtBQUs7cUJBQzNCO29CQUNELE1BQU0sRUFBRTt3QkFDTixtQkFBbUIsRUFBRSxLQUFLO3FCQUMzQjtvQkFDRCxjQUFjLEVBQUU7d0JBQ2QsbUJBQW1CLEVBQUUsS0FBSztxQkFDM0I7aUJBQ0Y7Z0JBQ0QsWUFBWSxFQUFFO29CQUNaLGVBQWUsRUFBRTt3QkFDZixtQkFBbUIsRUFBRSxLQUFLO3dCQUMxQixRQUFRLEVBQUUsSUFBSTt3QkFDZCxpQkFBaUIsRUFBRSxJQUFJO3dCQUN2QixPQUFPLEVBQUUsSUFBSTtxQkFDZDtvQkFDRCxVQUFVLEVBQUU7d0JBQ1YsbUJBQW1CLEVBQUUsS0FBSzt3QkFDMUIsY0FBYyxFQUFFOzRCQUNkLGNBQWMsRUFBRSxJQUFJOzRCQUNwQix1QkFBdUIsRUFBRSxLQUFLO3lCQUMvQjt3QkFDRCxjQUFjLEVBQUUsSUFBSTtxQkFDckI7b0JBQ0QsS0FBSyxFQUFFO3dCQUNMLG1CQUFtQixFQUFFLEtBQUs7cUJBQzNCO29CQUNELGFBQWEsRUFBRTt3QkFDYixtQkFBbUIsRUFBRSxLQUFLO3FCQUMzQjtvQkFDRCxVQUFVLEVBQUU7d0JBQ1YsbUJBQW1CLEVBQUUsS0FBSztxQkFDM0I7b0JBQ0QsaUJBQWlCLEVBQUU7d0JBQ2pCLG1CQUFtQixFQUFFLEtBQUs7cUJBQzNCO29CQUNELGNBQWMsRUFBRTt3QkFDZCxtQkFBbUIsRUFBRSxLQUFLO3dCQUMxQixpQ0FBaUMsRUFBRSxJQUFJO3FCQUN4QztvQkFDRCxVQUFVLEVBQUU7d0JBQ1YsbUJBQW1CLEVBQUUsS0FBSztxQkFDM0I7b0JBQ0QsZUFBZSxFQUFFO3dCQUNmLG1CQUFtQixFQUFFLEtBQUs7cUJBQzNCO29CQUNELGdCQUFnQixFQUFFO3dCQUNoQixtQkFBbUIsRUFBRSxLQUFLO3FCQUMzQjtvQkFDRCxVQUFVLEVBQUU7d0JBQ1YsbUJBQW1CLEVBQUUsS0FBSztxQkFDM0I7b0JBQ0QsVUFBVSxFQUFFO3dCQUNWLG1CQUFtQixFQUFFLEtBQUs7d0JBQzFCLHdCQUF3QixFQUFFOzRCQUN4QixjQUFjLEVBQUU7Z0NBQ2QsZ0NBQWdDO2dDQUNoQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUM7NkJBQ2Y7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsUUFBUSxFQUFFO3dCQUNSLG1CQUFtQixFQUFFLEtBQUs7cUJBQzNCO29CQUNELFlBQVksRUFBRTt3QkFDWixtQkFBbUIsRUFBRSxLQUFLO3FCQUMzQjtvQkFDRCxNQUFNLEVBQUU7d0JBQ04sbUJBQW1CLEVBQUUsS0FBSztxQkFDM0I7b0JBRUQsd0NBQXdDO29CQUN4QyxzRUFBc0U7b0JBQ3RFLGNBQWMsRUFBRSxTQUFTO29CQUN6QixjQUFjLEVBQUUsU0FBUztvQkFDekIsYUFBYSxFQUFFLFNBQVM7b0JBQ3hCLFlBQVksRUFBRSxTQUFTO2lCQUN4QjtnQkFDRCxZQUFZLEVBQUUsRUFBRTthQUNqQjtTQUNGLENBQUM7SUFDSixDQUFDO0lBRUQsNkVBQTZFO0lBQ25FLGlCQUFpQixDQUFDLFdBQXFDLElBQVUsQ0FBQztJQUU1RSxpRkFBaUY7SUFDdkUsa0JBQWtCLENBQUMsT0FBcUIsSUFBVSxDQUFDO0lBRTdELHdGQUF3RjtJQUM5RSxpQkFBaUI7UUFDekIsT0FBTyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDbEQsQ0FBQztJQUVELGdFQUFnRTtJQUN0RCx1QkFBdUI7UUFDL0IsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRUQsb0ZBQW9GO0lBQzFFLHNCQUFzQixDQUFDLGFBQWtCO1FBQ2pELE9BQU8sYUFBYSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxrREFBa0Q7SUFDbEQsOEVBQThFO0lBRTlFLDZEQUE2RDtJQUM3QyxzQkFBc0IsQ0FBQyxNQUFrQjs7WUFDdkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRCxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzNDLENBQUM7S0FBQTtJQUVELG9GQUFvRjtJQUNwRSxpQkFBaUI7O1lBQy9CLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ2hELENBQUM7S0FBQTtJQUVELCtEQUErRDtJQUMvRCw4RUFBOEU7SUFFOUUscUdBQXFHO0lBQzlGLFFBQVE7UUFDYixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksMEJBQW1CLEVBQUUsQ0FBQztRQUM3QyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxLQUFLLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxpQ0FBYSxDQUNyQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFDMUIsSUFBSSxDQUFDLE1BQU0sRUFDWCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUNuQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxFQUNyRCxJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsYUFBYSxFQUFFLEVBQ3BCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUNqQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyQyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFTyxXQUFXO1FBQ2pCLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELG9EQUFvRDtJQUN2QyxVQUFVOztZQUNyQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztZQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEMsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzdDLENBQUM7S0FBQTtJQUVTLGNBQWMsQ0FBQyxJQUFjLEVBQUUsVUFBMkIsRUFBRTtRQUNwRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0QsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcsR0FBRyxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsR0FBRyxDQUFDO1NBQzlDO1FBQ0QsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCw0R0FBNEc7SUFDbEcsU0FBUztRQUNqQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDN0MsQ0FBQyxDQUFDLHVCQUFjLENBQUMsb0JBQW9CO1lBQ3JDLENBQUMsQ0FBQyx1QkFBYyxDQUFDLGVBQWUsQ0FBQztRQUNuQyxPQUFPLElBQUksdUJBQWMsQ0FBQyxJQUFJLHNCQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCw2R0FBNkc7SUFDL0YsV0FBVyxDQUFDLFdBQW1COztZQUMzQyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQ3hDLFlBQVksSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFDcEUsR0FBUyxFQUFFLGdEQUFDLE9BQUEsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFBLEdBQUEsQ0FDakQsQ0FBQztZQUNGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDL0MsTUFBTSxVQUFVLEdBQUcsSUFBSSx5Q0FBd0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNuQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDeEUsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxlQUFlLENBQ2xCLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxxQkFBcUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUN4RSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQ3JCLENBQUM7WUFDRixNQUFNLGtCQUFrQixHQUFHLE1BQU0sY0FBYyxDQUFDO1lBQ2hELE1BQU0sU0FBUyxHQUFpQjtnQkFDOUIsV0FBVztnQkFDWCxPQUFPO2dCQUNQLFVBQVU7Z0JBQ1YsWUFBWSxFQUFFLGtCQUFrQixDQUFDLFlBQVk7Z0JBQzdDLFVBQVUsRUFBRSxJQUFJLDBCQUFtQixFQUFFO2dCQUNyQyxlQUFlLEVBQUUsSUFBSSxHQUFHLEVBQUU7Z0JBQzFCLHNCQUFzQixFQUFFLENBQUMsT0FBZSxFQUFRLEVBQUU7b0JBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFO3dCQUNwQyxTQUFTLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ3REO2dCQUNILENBQUM7YUFDRixDQUFDO1lBQ0YsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25DLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN6QixVQUFVLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFO29CQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLEVBQUU7d0JBQ2hFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxTQUFTLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQzt3QkFDdkYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7cUJBQzlDO3lCQUFNO3dCQUNMLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdFQUFnRSxTQUFTLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQzt3QkFDM0csSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRO3dCQUN6QiwyQ0FBMkM7d0JBQzNDLE9BQU8sSUFBSSxDQUFDLElBQUksMkVBQTJFLFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO3FCQUN4SDtpQkFDRjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUN4RCxJQUFJLGdCQUFnQixFQUFFO2dCQUNwQixTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDL0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDL0QsSUFBSSxZQUFZLEVBQUU7d0JBQ2hCLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQzs0QkFDaEMsUUFBUSxFQUFFLFlBQVk7eUJBQ3ZCLENBQUMsQ0FBQztxQkFDSjtnQkFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ1A7WUFFRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkMsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztLQUFBO0lBRU8sbUJBQW1CLENBQUMsWUFBbUMsRUFBRSxXQUFtQjtRQUNsRixZQUFZLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLElBQUksV0FBVyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBYSxFQUFFLEVBQUU7WUFDL0MsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDbEQsd0RBQXdEO1lBQ3hELElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxHQUFHLFdBQVcsQ0FBQztpQkFDcEQsS0FBSyxDQUFDLElBQUksQ0FBQztpQkFDWCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGtCQUFrQixDQUFDLEdBQVE7UUFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQ3pCLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSx3QkFBd0IsSUFBSSxDQUFDLGVBQWUsRUFBRSxrQkFBa0IsRUFDdkY7WUFDRSxXQUFXLEVBQUUsSUFBSTtZQUNqQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRTtTQUM1QixDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQsbUVBQW1FO0lBQzNELG1CQUFtQixDQUFDLE9BQThCO1FBQ3hELElBQUksTUFBeUIsQ0FBQztRQUM5QixJQUFJLE1BQXlCLENBQUM7UUFDOUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDaEQsUUFBUSxjQUFjLEVBQUU7WUFDdEIsS0FBSyxLQUFLO2dCQUNSLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUEwQixDQUFDLENBQUM7Z0JBQzlELE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUEwQixDQUFDLENBQUM7Z0JBQzlELE1BQU07WUFDUixLQUFLLFFBQVE7Z0JBQ1gsTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEQsTUFBTTtZQUNSLEtBQUssT0FBTztnQkFDVixNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNwRCxNQUFNO1lBQ1I7Z0JBQ0UsT0FBTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDbEQ7UUFFRCxPQUFPLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFO1lBQ2pELEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBWSxFQUFFLEVBQUUsR0FBRyxDQUFDO1lBQzdCLElBQUksRUFBRSxDQUFDLEdBQUcsS0FBWSxFQUFFLEVBQUUsR0FBRyxDQUFDO1lBQzlCLElBQUksRUFBRSxDQUFDLEdBQUcsS0FBWSxFQUFFLEVBQUUsR0FBRyxDQUFDO1lBQzlCLEtBQUssRUFBRSxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLENBQUM7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQseURBQXlEO0lBQ2pELHNCQUFzQixDQUFDLE1BQW9CO1FBQ2pELDRCQUFnQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDM0MsK0JBQW9CLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFOUUsSUFBSSwrQkFBbUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQ3JELE1BQU0sY0FBYyxHQUNsQixJQUFJLCtCQUFtQixDQUNyQixNQUFNLENBQUMsVUFBVSxFQUNqQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQ2hFLE1BQU0sQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQ3BDLElBQUksQ0FBQyxlQUFlLENBQ3JCLENBQUM7WUFDSixNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUN2QztRQUVELE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQW1CLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hFLElBQUksSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLEVBQUU7WUFDaEMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7U0FDM0M7UUFDRCxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVwQyxNQUFNLGNBQWMsR0FBRyxJQUFJLGlDQUFxQixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwRSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLEVBQUU7WUFDakMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQy9GO1FBQ0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFdEMsSUFBSSxvQkFBc0QsQ0FBQztRQUMzRCxJQUFJLGdDQUFvQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDdEQsb0JBQW9CLEdBQUcsSUFBSSxnQ0FBb0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztZQUNqRixJQUFJLElBQUksQ0FBQyxzQkFBc0IsSUFBSSxJQUFJLEVBQUU7Z0JBQ3ZDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQzthQUMxRDtZQUNELE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDN0M7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUU7WUFDL0IsWUFBWSxFQUFFLGNBQWMsRUFBRSxvQkFBb0I7U0FDbkQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLG1CQUFtQixDQUFDLE1BQWtCLEVBQUUsV0FBbUI7UUFDaEUsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQUVTLGVBQWUsQ0FBQyxNQUFrQixFQUFFLFdBQW1CO1FBQy9ELE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCx5RUFBeUU7SUFDbEUsbUJBQW1CO1FBQ3hCLE9BQU87WUFDTCxRQUFRLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFO2lCQUM5QixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDekMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNiLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsQ0FBQztZQUNyQixvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDOUMscUJBQXFCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDL0IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEMsQ0FBQztZQUNELDRCQUE0QixFQUFFLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQzNFLENBQUM7SUFDSixDQUFDO0lBRWUsY0FBYyxDQUM1QixPQUFxQzs7WUFFckMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkUsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsOEJBQW1CLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDeEUsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLDhCQUFtQixFQUFFLENBQUM7WUFDbkUsSUFBSSxDQUFDLHdCQUF3QixHQUFHLE9BQU8sQ0FBQztZQUN4QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixFQUNwRixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsQ0FBQztLQUFBO0lBRWUsNEJBQTRCLENBQzFDLFVBQTRCOztZQUU1QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUM7WUFDOUMsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO2dCQUFFLE9BQU8sSUFBSSxDQUFDO2FBQUU7WUFDckMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkUsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsOEJBQW1CLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksRUFBRTtnQkFDdkcsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMxRyxDQUFDO0tBQUE7SUFFUyx3QkFBd0IsQ0FDaEMsZUFBa0MsRUFDbEMsV0FBNkIsRUFDN0IsUUFBc0M7SUFFeEMsQ0FBQztJQUVELGlGQUFpRjtJQUN6RSx5QkFBeUIsQ0FBQyxDQUE2QjtRQUM3RCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsVUFBb0MsQ0FBQztRQUMxRCxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsY0FBYyxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUM7UUFDbkcsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVwQyw0QkFBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLG9CQUFPLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNqRixNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRVMscUJBQXFCLENBQUMsSUFBZ0MsSUFBVSxDQUFDO0lBRTNFLHNFQUFzRTtJQUMvRCxrQkFBa0I7UUFDdkIsT0FBTztZQUNMLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFFBQVEsRUFBRSxFQUFFO1lBQ1osYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUN0QyxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQzdDLENBQUM7SUFDSixDQUFDO0lBRWUsYUFBYSxDQUFDLE1BQWtCLEVBQUUsS0FBWTs7WUFDNUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRCxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyw0QkFBaUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUN0RSxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksNEJBQWlCLEVBQUUsQ0FBQztZQUMvRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FDakQsTUFBTSxDQUFDLFVBQVUsRUFDakIsTUFBTSxDQUFDLFlBQVksRUFDbkIsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUN0QixNQUFNLEVBQ04sS0FBSyxDQUNOLENBQUM7WUFFRixJQUFJLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxFQUFFO2dCQUMvQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQzFCLElBQUksS0FBSyxFQUFFO3dCQUNULEtBQUssTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRTs0QkFDbkMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzt5QkFDekM7cUJBQ0Y7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7YUFDSjtZQUVELE9BQU8sWUFBWSxDQUFDO1FBQ3RCLENBQUM7S0FBQTtJQUVELHNFQUFzRTtJQUMvRCxlQUFlO1FBQ3BCLE9BQU87WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3RDLFFBQVEsRUFBRSxDQUFDO1lBQ1gsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUN2QyxDQUFDO0lBQ0osQ0FBQztJQUVlLFVBQVUsQ0FBQyxNQUFrQjs7WUFDM0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRCxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyw4QkFBa0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUN2RSxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksOEJBQWtCLEVBQUUsQ0FBQztZQUNoRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEUsQ0FBQztLQUFBO0lBRUQsK0NBQStDO0lBQ3hDLGVBQWUsQ0FBQyxhQUFpRTtRQUN0RixJQUFJLENBQUMsZUFBZSxHQUFHLGFBQWEsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUFJLElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxFQUFFO1lBQ2hDLE9BQU87U0FDUjtRQUVELEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1lBQzNELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDbkUsSUFBSSxZQUFZLElBQUksSUFBSSxFQUFFO2dCQUN4QixZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQzthQUMzQztTQUNGO0lBQ0gsQ0FBQztJQUVELHNFQUFzRTtJQUMvRCxxQkFBcUI7UUFDMUIsT0FBTztZQUNMLGlCQUFpQixFQUFFLENBQUMsTUFBa0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxTQUFTLENBQUM7WUFDMUcsY0FBYyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUM5QyxDQUFDO0lBQ0osQ0FBQztJQUVlLGFBQWEsQ0FBQyxNQUFrQixFQUFFLEtBQVk7O1lBQzVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0QsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsaUNBQXFCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDMUUsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLGlDQUFxQixFQUFFLENBQUM7WUFDekUsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pHLENBQUM7S0FBQTtJQUVELHNFQUFzRTtJQUMvRCxjQUFjLENBQUMsT0FBK0I7UUFDbkQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQ2xCLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFDbEIsWUFBWSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ3ZCLFFBQVEsRUFBRSxDQUFDO1lBQ1gsYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUN0QyxhQUFhLEVBQUUsQ0FBQyxTQUFpQixFQUFFLEVBQUU7Z0JBQ25DLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3JELENBQUM7WUFDRCxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3BDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztJQUVlLFVBQVUsQ0FBQyxNQUFrQixFQUFFLEtBQVk7O1lBQ3pELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0QsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMseUJBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNuRSxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUkseUJBQWMsRUFBRSxDQUFDO1lBQ3BELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkUsQ0FBQztLQUFBO0lBRUQsc0VBQXNFO0lBQy9ELGNBQWMsQ0FBQyxhQUFxQztRQUN6RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsYUFBYSxDQUFDO1FBRXRDLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1lBQzNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUN2RSxJQUFJLGNBQWMsRUFBRTtnQkFDbEIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQy9GO1NBQ0Y7UUFFRCxvREFBb0Q7UUFDcEQsT0FBTyxJQUFJLGlCQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELHNFQUFzRTtJQUMvRCxpQkFBaUI7UUFDdEIsT0FBTztZQUNMLGFBQWEsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7WUFDdEMsUUFBUSxFQUFFLENBQUM7WUFDWCxVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQzFDLENBQUM7SUFDSixDQUFDO0lBRWUsYUFBYSxDQUFDLE1BQWtCLEVBQUUsS0FBWTs7WUFDNUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRCxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyw2QkFBaUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUN0RSxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBRUQsT0FBTyw2QkFBaUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RixDQUFDO0tBQUE7SUFFTSxzQkFBc0I7UUFDM0IsT0FBTztZQUNMLGFBQWEsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7WUFDdEMsUUFBUSxFQUFFLENBQUM7WUFDWCxVQUFVLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDL0MsQ0FBQztJQUNKLENBQUM7SUFFZSxrQkFBa0IsQ0FBQyxNQUFrQixFQUFFLEtBQVk7O1lBQ2pFLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0QsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQywrQkFBK0IsRUFBRTtnQkFDMUUsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUVELE9BQU8sNkJBQWlCLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pFLENBQUM7S0FBQTtJQUVNLHFCQUFxQjtRQUMxQixPQUFPO1lBQ0wsYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUN0QyxRQUFRLEVBQUUsQ0FBQztZQUNYLGdCQUFnQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3BELENBQUM7SUFDSixDQUFDO0lBRU0sdUJBQXVCO1FBQzVCLE9BQU87WUFDTCxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3RDLFFBQVEsRUFBRSxDQUFDO1lBQ1gsWUFBWSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2hELENBQUM7SUFDSixDQUFDO0lBRWUsaUJBQWlCLENBQUMsTUFBa0I7O1lBQ2xELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0QsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQywwQkFBMEIsRUFBRTtnQkFDckUsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUVELE9BQU8sNkJBQWlCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckUsQ0FBQztLQUFBO0lBRU0sdUJBQXVCO1FBQzVCLE9BQU87WUFDTCxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3RDLFFBQVEsRUFBRSxDQUFDO1lBQ1gsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDdEQsQ0FBQztJQUNKLENBQUM7SUFFZSxtQkFBbUIsQ0FDakMsTUFBa0IsRUFDbEIsS0FBWSxFQUNaLFNBQWlCOztZQUVqQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNELElBQUksTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLEVBQUU7Z0JBQzNFLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFFRCxPQUFPLDZCQUFpQixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckYsQ0FBQztLQUFBO0lBRU0sb0JBQW9CO1FBQ3pCLE9BQU87WUFDTCxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3RDLFFBQVEsRUFBRSxDQUFDO1lBQ1gsU0FBUyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUM5QixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDakQsQ0FBQztTQUNGLENBQUM7SUFDSixDQUFDO0lBRWUsZ0JBQWdCLENBQUMsTUFBa0IsRUFBRSxRQUFlOztZQUNsRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNELElBQUksTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLGdDQUFvQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQ3pFLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLGdDQUFvQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7S0FBQTtJQUVNLGtCQUFrQjtRQUN2QixPQUFPO1lBQ0wsYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUN0QyxRQUFRLEVBQUUsQ0FBQztZQUNYLGNBQWMsRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEVBQUU7Z0JBQzdDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3pELENBQUM7U0FDRixDQUFDO0lBQ0osQ0FBQztJQUVlLGNBQWMsQ0FBQyxNQUFrQixFQUFFLEtBQVksRUFBRSxXQUFpQzs7WUFDaEcsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRCxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyw2QkFBaUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUN0RSxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyw2QkFBaUIsQ0FBQyxjQUFjLENBQ3JDLE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLE1BQU0sQ0FBQyxZQUFZLEVBQ25CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLEVBQzdDLE1BQU0sRUFDTixLQUFLLEVBQ0wsV0FBVyxDQUNaLENBQUM7UUFDSixDQUFDO0tBQUE7SUFFTSxlQUFlO1FBQ3BCLE9BQU87WUFDTCxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3RDLFFBQVEsRUFBRSxDQUFDO1lBQ1gsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUNsQyxDQUFDO0lBQ0osQ0FBQztJQUVlLFNBQVMsQ0FBQyxNQUFrQixFQUFFLFFBQWUsRUFBRSxPQUFlOztZQUM1RSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNELElBQUksTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLHdCQUFhLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDbEUsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sd0JBQWEsQ0FBQyxTQUFTLENBQzVCLE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLE1BQU0sRUFDTixRQUFRLEVBQ1IsT0FBTyxDQUNSLENBQUM7UUFDSixDQUFDO0tBQUE7SUFFTSxvQkFBb0IsQ0FBQyxRQUF1QztRQUNqRSxJQUFJLENBQUMsc0JBQXNCLEdBQUcsUUFBUSxDQUFDO1FBQ3ZDLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1lBQzNELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1lBQ25GLElBQUksb0JBQW9CLElBQUksSUFBSSxFQUFFO2dCQUNoQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDdkM7U0FDRjtRQUNELE9BQU8sSUFBSSxpQkFBVSxDQUFDLEdBQUcsRUFBRTtZQUN6QixJQUFJLENBQUMsc0JBQXNCLEdBQUcsU0FBUyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLGlCQUFpQixDQUFDLE9BQWtDO1FBQ3pELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUM7UUFDakMsT0FBTyxJQUFJLGlCQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNPLHdCQUF3QixDQUFDLFNBQWlCO1FBQ2xELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELGtGQUFrRjtJQUN4RSx5QkFBeUI7UUFDakMsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQ7OztPQUdHO0lBQ08sa0JBQWtCLENBQUMsTUFBYyxFQUFFLFlBQW9CO1FBQy9ELE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVGLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNPLG9DQUFvQztRQUM1QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdEIsTUFBb0IsRUFBRSxPQUFVO1FBRWhDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELE9BQU8sUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBb0JGO0FBaDBCRCxxQ0FnMEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY3AgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBscyBmcm9tICcuL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCAqIGFzIHJwYyBmcm9tICd2c2NvZGUtanNvbnJwYyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgYXRvbUlkZSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgKiBhcyBsaW50ZXIgZnJvbSAnYXRvbS9saW50ZXInO1xuaW1wb3J0IENvbnZlcnQgZnJvbSAnLi9jb252ZXJ0LmpzJztcbmltcG9ydCBBcHBseUVkaXRBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvYXBwbHktZWRpdC1hZGFwdGVyJztcbmltcG9ydCBBdXRvY29tcGxldGVBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvYXV0b2NvbXBsZXRlLWFkYXB0ZXInO1xuaW1wb3J0IENvZGVBY3Rpb25BZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvY29kZS1hY3Rpb24tYWRhcHRlcic7XG5pbXBvcnQgQ29kZUZvcm1hdEFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9jb2RlLWZvcm1hdC1hZGFwdGVyJztcbmltcG9ydCBDb2RlSGlnaGxpZ2h0QWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2NvZGUtaGlnaGxpZ2h0LWFkYXB0ZXInO1xuaW1wb3J0IERhdGF0aXBBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvZGF0YXRpcC1hZGFwdGVyJztcbmltcG9ydCBEZWZpbml0aW9uQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2RlZmluaXRpb24tYWRhcHRlcic7XG5pbXBvcnQgRG9jdW1lbnRTeW5jQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2RvY3VtZW50LXN5bmMtYWRhcHRlcic7XG5pbXBvcnQgRmluZFJlZmVyZW5jZXNBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvZmluZC1yZWZlcmVuY2VzLWFkYXB0ZXInO1xuaW1wb3J0IExpbnRlclB1c2hWMkFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9saW50ZXItcHVzaC12Mi1hZGFwdGVyJztcbmltcG9ydCBMb2dnaW5nQ29uc29sZUFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9sb2dnaW5nLWNvbnNvbGUtYWRhcHRlcic7XG5pbXBvcnQgTm90aWZpY2F0aW9uc0FkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9ub3RpZmljYXRpb25zLWFkYXB0ZXInO1xuaW1wb3J0IE91dGxpbmVWaWV3QWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL291dGxpbmUtdmlldy1hZGFwdGVyJztcbmltcG9ydCBSZW5hbWVBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvcmVuYW1lLWFkYXB0ZXInO1xuaW1wb3J0IFNpZ25hdHVyZUhlbHBBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvc2lnbmF0dXJlLWhlbHAtYWRhcHRlcic7XG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFNvY2tldCB9IGZyb20gJ25ldCc7XG5pbXBvcnQgeyBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24gfSBmcm9tICcuL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCB7XG4gIENvbnNvbGVMb2dnZXIsXG4gIEZpbHRlcmVkTG9nZ2VyLFxuICBMb2dnZXIsXG59IGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7XG4gIExhbmd1YWdlU2VydmVyUHJvY2VzcyxcbiAgU2VydmVyTWFuYWdlcixcbiAgQWN0aXZlU2VydmVyLFxufSBmcm9tICcuL3NlcnZlci1tYW5hZ2VyLmpzJztcbmltcG9ydCB7XG4gIERpc3Bvc2FibGUsXG4gIENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIFBvaW50LFxuICBSYW5nZSxcbiAgVGV4dEVkaXRvcixcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgKiBhcyBhYyBmcm9tICdhdG9tL2F1dG9jb21wbGV0ZS1wbHVzJztcblxuZXhwb3J0IHsgQWN0aXZlU2VydmVyLCBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sIExhbmd1YWdlU2VydmVyUHJvY2VzcyB9O1xuZXhwb3J0IHR5cGUgQ29ubmVjdGlvblR5cGUgPSAnc3RkaW8nIHwgJ3NvY2tldCcgfCAnaXBjJztcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJBZGFwdGVycyB7XG4gIGxpbnRlclB1c2hWMjogTGludGVyUHVzaFYyQWRhcHRlcjtcbiAgbG9nZ2luZ0NvbnNvbGU6IExvZ2dpbmdDb25zb2xlQWRhcHRlcjtcbiAgc2lnbmF0dXJlSGVscEFkYXB0ZXI/OiBTaWduYXR1cmVIZWxwQWRhcHRlcjtcbn1cblxuLyoqXG4gKiBQdWJsaWM6IEF1dG9MYW5ndWFnZUNsaWVudCBwcm92aWRlcyBhIHNpbXBsZSB3YXkgdG8gaGF2ZSBhbGwgdGhlIHN1cHBvcnRlZFxuICogQXRvbS1JREUgc2VydmljZXMgd2lyZWQgdXAgZW50aXJlbHkgZm9yIHlvdSBieSBqdXN0IHN1YmNsYXNzaW5nIGl0IGFuZFxuICogaW1wbGVtZW50aW5nIGF0IGxlYXN0XG4gKiAtIGBzdGFydFNlcnZlclByb2Nlc3NgXG4gKiAtIGBnZXRHcmFtbWFyU2NvcGVzYFxuICogLSBgZ2V0TGFuZ3VhZ2VOYW1lYFxuICogLSBgZ2V0U2VydmVyTmFtZWBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXV0b0xhbmd1YWdlQ2xpZW50IHtcbiAgcHJpdmF0ZSBfZGlzcG9zYWJsZSE6IENvbXBvc2l0ZURpc3Bvc2FibGU7XG4gIHByaXZhdGUgX3NlcnZlck1hbmFnZXIhOiBTZXJ2ZXJNYW5hZ2VyO1xuICBwcml2YXRlIF9jb25zb2xlRGVsZWdhdGU/OiBhdG9tSWRlLkNvbnNvbGVTZXJ2aWNlO1xuICBwcml2YXRlIF9saW50ZXJEZWxlZ2F0ZT86IGxpbnRlci5JbmRpZURlbGVnYXRlO1xuICBwcml2YXRlIF9zaWduYXR1cmVIZWxwUmVnaXN0cnk/OiBhdG9tSWRlLlNpZ25hdHVyZUhlbHBSZWdpc3RyeTtcbiAgcHJpdmF0ZSBfbGFzdEF1dG9jb21wbGV0ZVJlcXVlc3Q/OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50O1xuICBwcml2YXRlIF9pc0RlYWN0aXZhdGluZzogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIF9zZXJ2ZXJBZGFwdGVycyA9IG5ldyBXZWFrTWFwPEFjdGl2ZVNlcnZlciwgU2VydmVyQWRhcHRlcnM+KCk7XG5cbiAgLyoqIEF2YWlsYWJsZSBpZiBjb25zdW1lQnVzeVNpZ25hbCBpcyBzZXR1cCAqL1xuICBwcm90ZWN0ZWQgYnVzeVNpZ25hbFNlcnZpY2U/OiBhdG9tSWRlLkJ1c3lTaWduYWxTZXJ2aWNlO1xuXG4gIHByb3RlY3RlZCBwcm9jZXNzU3RkRXJyOiBzdHJpbmcgPSAnJztcbiAgcHJvdGVjdGVkIGxvZ2dlciE6IExvZ2dlcjtcbiAgcHJvdGVjdGVkIG5hbWUhOiBzdHJpbmc7XG4gIHByb3RlY3RlZCBzb2NrZXQhOiBTb2NrZXQ7XG5cbiAgLy8gU2hhcmVkIGFkYXB0ZXJzIHRoYXQgY2FuIHRha2UgdGhlIFJQQyBjb25uZWN0aW9uIGFzIHJlcXVpcmVkXG4gIHByb3RlY3RlZCBhdXRvQ29tcGxldGU/OiBBdXRvY29tcGxldGVBZGFwdGVyO1xuICBwcm90ZWN0ZWQgZGF0YXRpcD86IERhdGF0aXBBZGFwdGVyO1xuICBwcm90ZWN0ZWQgZGVmaW5pdGlvbnM/OiBEZWZpbml0aW9uQWRhcHRlcjtcbiAgcHJvdGVjdGVkIGZpbmRSZWZlcmVuY2VzPzogRmluZFJlZmVyZW5jZXNBZGFwdGVyO1xuICBwcm90ZWN0ZWQgb3V0bGluZVZpZXc/OiBPdXRsaW5lVmlld0FkYXB0ZXI7XG5cbiAgLy8gWW91IG11c3QgaW1wbGVtZW50IHRoZXNlIHNvIHdlIGtub3cgaG93IHRvIGRlYWwgd2l0aCB5b3VyIGxhbmd1YWdlIGFuZCBzZXJ2ZXJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKiBSZXR1cm4gYW4gYXJyYXkgb2YgdGhlIGdyYW1tYXIgc2NvcGVzIHlvdSBoYW5kbGUsIGUuZy4gWyAnc291cmNlLmpzJyBdICovXG4gIHByb3RlY3RlZCBnZXRHcmFtbWFyU2NvcGVzKCk6IHN0cmluZ1tdIHtcbiAgICB0aHJvdyBFcnJvcignTXVzdCBpbXBsZW1lbnQgZ2V0R3JhbW1hclNjb3BlcyB3aGVuIGV4dGVuZGluZyBBdXRvTGFuZ3VhZ2VDbGllbnQnKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGxhbmd1YWdlIHlvdSBzdXBwb3J0LCBlLmcuICdKYXZhU2NyaXB0JyAqL1xuICBwcm90ZWN0ZWQgZ2V0TGFuZ3VhZ2VOYW1lKCk6IHN0cmluZyB7XG4gICAgdGhyb3cgRXJyb3IoJ011c3QgaW1wbGVtZW50IGdldExhbmd1YWdlTmFtZSB3aGVuIGV4dGVuZGluZyBBdXRvTGFuZ3VhZ2VDbGllbnQnKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gdGhlIG5hbWUgb2YgeW91ciBzZXJ2ZXIsIGUuZy4gJ0VjbGlwc2UgSkRUJyAqL1xuICBwcm90ZWN0ZWQgZ2V0U2VydmVyTmFtZSgpOiBzdHJpbmcge1xuICAgIHRocm93IEVycm9yKCdNdXN0IGltcGxlbWVudCBnZXRTZXJ2ZXJOYW1lIHdoZW4gZXh0ZW5kaW5nIEF1dG9MYW5ndWFnZUNsaWVudCcpO1xuICB9XG5cbiAgLyoqIFN0YXJ0IHlvdXIgc2VydmVyIHByb2Nlc3MgKi9cbiAgcHJvdGVjdGVkIHN0YXJ0U2VydmVyUHJvY2VzcyhfcHJvamVjdFBhdGg6IHN0cmluZyk6IExhbmd1YWdlU2VydmVyUHJvY2VzcyB8IFByb21pc2U8TGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzPiB7XG4gICAgdGhyb3cgRXJyb3IoJ011c3Qgb3ZlcnJpZGUgc3RhcnRTZXJ2ZXJQcm9jZXNzIHRvIHN0YXJ0IGxhbmd1YWdlIHNlcnZlciBwcm9jZXNzIHdoZW4gZXh0ZW5kaW5nIEF1dG9MYW5ndWFnZUNsaWVudCcpO1xuICB9XG5cbiAgLy8gWW91IG1pZ2h0IHdhbnQgdG8gb3ZlcnJpZGUgdGhlc2UgZm9yIGRpZmZlcmVudCBiZWhhdmlvclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKiogKE9wdGlvbmFsKSBEZXRlcm1pbmUgd2hldGhlciB3ZSBzaG91bGQgc3RhcnQgYSBzZXJ2ZXIgZm9yIGEgZ2l2ZW4gZWRpdG9yIGlmIHdlIGRvbid0IGhhdmUgb25lIHlldCAqL1xuICBwcm90ZWN0ZWQgc2hvdWxkU3RhcnRGb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLmluY2x1ZGVzKGVkaXRvci5nZXRHcmFtbWFyKCkuc2NvcGVOYW1lKTtcbiAgfVxuXG4gIC8qKiAoT3B0aW9uYWwpIFJldHVybiB0aGUgcGFyYW1ldGVycyB1c2VkIHRvIGluaXRpYWxpemUgYSBjbGllbnQgLSB5b3UgbWF5IHdhbnQgdG8gZXh0ZW5kIGNhcGFiaWxpdGllcyAqL1xuICBwcm90ZWN0ZWQgZ2V0SW5pdGlhbGl6ZVBhcmFtcyhwcm9qZWN0UGF0aDogc3RyaW5nLCBwcm9jZXNzOiBMYW5ndWFnZVNlcnZlclByb2Nlc3MpOiBscy5Jbml0aWFsaXplUGFyYW1zIHtcbiAgICByZXR1cm4ge1xuICAgICAgcHJvY2Vzc0lkOiBwcm9jZXNzLnBpZCxcbiAgICAgIHJvb3RQYXRoOiBwcm9qZWN0UGF0aCxcbiAgICAgIHJvb3RVcmk6IENvbnZlcnQucGF0aFRvVXJpKHByb2plY3RQYXRoKSxcbiAgICAgIHdvcmtzcGFjZUZvbGRlcnM6IFtdLFxuICAgICAgY2FwYWJpbGl0aWVzOiB7XG4gICAgICAgIHdvcmtzcGFjZToge1xuICAgICAgICAgIGFwcGx5RWRpdDogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB3b3Jrc3BhY2VFZGl0OiB7XG4gICAgICAgICAgICBkb2N1bWVudENoYW5nZXM6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB3b3Jrc3BhY2VGb2xkZXJzOiBmYWxzZSxcbiAgICAgICAgICBkaWRDaGFuZ2VDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRpZENoYW5nZVdhdGNoZWRGaWxlczoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzeW1ib2w6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZXhlY3V0ZUNvbW1hbmQ6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHRleHREb2N1bWVudDoge1xuICAgICAgICAgIHN5bmNocm9uaXphdGlvbjoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICB3aWxsU2F2ZTogdHJ1ZSxcbiAgICAgICAgICAgIHdpbGxTYXZlV2FpdFVudGlsOiB0cnVlLFxuICAgICAgICAgICAgZGlkU2F2ZTogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbXBsZXRpb246IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgICAgY29tcGxldGlvbkl0ZW06IHtcbiAgICAgICAgICAgICAgc25pcHBldFN1cHBvcnQ6IHRydWUsXG4gICAgICAgICAgICAgIGNvbW1pdENoYXJhY3RlcnNTdXBwb3J0OiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb250ZXh0U3VwcG9ydDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGhvdmVyOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNpZ25hdHVyZUhlbHA6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVmZXJlbmNlczoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkb2N1bWVudEhpZ2hsaWdodDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkb2N1bWVudFN5bWJvbDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWVyYXJjaGljYWxEb2N1bWVudFN5bWJvbFN1cHBvcnQ6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBmb3JtYXR0aW5nOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJhbmdlRm9ybWF0dGluZzoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBvblR5cGVGb3JtYXR0aW5nOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRlZmluaXRpb246IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29kZUFjdGlvbjoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBjb2RlQWN0aW9uTGl0ZXJhbFN1cHBvcnQ6IHtcbiAgICAgICAgICAgICAgY29kZUFjdGlvbktpbmQ6IHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGV4cGxpY2l0bHkgc3VwcG9ydCBtb3JlP1xuICAgICAgICAgICAgICAgIHZhbHVlU2V0OiBbJyddXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZGVMZW5zOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50TGluazoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZW5hbWU6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBXZSBkbyBub3Qgc3VwcG9ydCB0aGVzZSBmZWF0dXJlcyB5ZXQuXG4gICAgICAgICAgLy8gTmVlZCB0byBzZXQgdG8gdW5kZWZpbmVkIHRvIGFwcGVhc2UgVHlwZVNjcmlwdCB3ZWFrIHR5cGUgZGV0ZWN0aW9uLlxuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZURlZmluaXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICBjb2xvclByb3ZpZGVyOiB1bmRlZmluZWQsXG4gICAgICAgICAgZm9sZGluZ1JhbmdlOiB1bmRlZmluZWQsXG4gICAgICAgIH0sXG4gICAgICAgIGV4cGVyaW1lbnRhbDoge30sXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKiogKE9wdGlvbmFsKSBFYXJseSB3aXJlLXVwIG9mIGxpc3RlbmVycyBiZWZvcmUgaW5pdGlhbGl6ZSBtZXRob2QgaXMgc2VudCAqL1xuICBwcm90ZWN0ZWQgcHJlSW5pdGlhbGl6YXRpb24oX2Nvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbik6IHZvaWQgeyB9XG5cbiAgLyoqIChPcHRpb25hbCkgTGF0ZSB3aXJlLXVwIG9mIGxpc3RlbmVycyBhZnRlciBpbml0aWFsaXplIG1ldGhvZCBoYXMgYmVlbiBzZW50ICovXG4gIHByb3RlY3RlZCBwb3N0SW5pdGlhbGl6YXRpb24oX3NlcnZlcjogQWN0aXZlU2VydmVyKTogdm9pZCB7IH1cblxuICAvKiogKE9wdGlvbmFsKSBEZXRlcm1pbmUgd2hldGhlciB0byB1c2UgaXBjLCBzdGRpbyBvciBzb2NrZXQgdG8gY29ubmVjdCB0byB0aGUgc2VydmVyICovXG4gIHByb3RlY3RlZCBnZXRDb25uZWN0aW9uVHlwZSgpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgcmV0dXJuIHRoaXMuc29ja2V0ICE9IG51bGwgPyAnc29ja2V0JyA6ICdzdGRpbyc7XG4gIH1cblxuICAvKiogKE9wdGlvbmFsKSBSZXR1cm4gdGhlIG5hbWUgb2YgeW91ciByb290IGNvbmZpZ3VyYXRpb24ga2V5ICovXG4gIHByb3RlY3RlZCBnZXRSb290Q29uZmlndXJhdGlvbktleSgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIC8qKiAoT3B0aW9uYWwpIFRyYW5zZm9ybSB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgYmVmb3JlIGl0IGlzIHNlbnQgdG8gdGhlIHNlcnZlciAqL1xuICBwcm90ZWN0ZWQgbWFwQ29uZmlndXJhdGlvbk9iamVjdChjb25maWd1cmF0aW9uOiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBjb25maWd1cmF0aW9uO1xuICB9XG5cbiAgLy8gSGVscGVyIG1ldGhvZHMgdGhhdCBhcmUgdXNlZnVsIGZvciBpbXBsZW1lbnRvcnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqIEdldHMgYSBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24gZm9yIGEgZ2l2ZW4gVGV4dEVkaXRvciAqL1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0Q29ubmVjdGlvbkZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIHJldHVybiBzZXJ2ZXIgPyBzZXJ2ZXIuY29ubmVjdGlvbiA6IG51bGw7XG4gIH1cblxuICAvKiogUmVzdGFydCBhbGwgYWN0aXZlIGxhbmd1YWdlIHNlcnZlcnMgZm9yIHRoaXMgbGFuZ3VhZ2UgY2xpZW50IGluIHRoZSB3b3Jrc3BhY2UgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIHJlc3RhcnRBbGxTZXJ2ZXJzKCkge1xuICAgIGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIucmVzdGFydEFsbFNlcnZlcnMoKTtcbiAgfVxuXG4gIC8vIERlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIHJlc3Qgb2YgdGhlIEF1dG9MYW5ndWFnZUNsaWVudFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKiogQWN0aXZhdGUgZG9lcyB2ZXJ5IGxpdHRsZSBmb3IgcGVyZiByZWFzb25zIC0gaG9va3MgaW4gdmlhIFNlcnZlck1hbmFnZXIgZm9yIGxhdGVyICdhY3RpdmF0aW9uJyAqL1xuICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgdGhpcy5fZGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gICAgdGhpcy5uYW1lID0gYCR7dGhpcy5nZXRMYW5ndWFnZU5hbWUoKX0gKCR7dGhpcy5nZXRTZXJ2ZXJOYW1lKCl9KWA7XG4gICAgdGhpcy5sb2dnZXIgPSB0aGlzLmdldExvZ2dlcigpO1xuICAgIHRoaXMuX3NlcnZlck1hbmFnZXIgPSBuZXcgU2VydmVyTWFuYWdlcihcbiAgICAgIChwKSA9PiB0aGlzLnN0YXJ0U2VydmVyKHApLFxuICAgICAgdGhpcy5sb2dnZXIsXG4gICAgICAoZSkgPT4gdGhpcy5zaG91bGRTdGFydEZvckVkaXRvcihlKSxcbiAgICAgIChmaWxlcGF0aCkgPT4gdGhpcy5maWx0ZXJDaGFuZ2VXYXRjaGVkRmlsZXMoZmlsZXBhdGgpLFxuICAgICAgdGhpcy5yZXBvcnRCdXN5V2hpbGUsXG4gICAgICB0aGlzLmdldFNlcnZlck5hbWUoKSxcbiAgICAgIHRoaXMuc2h1dGRvd25TZXJ2ZXJzR3JhY2VmdWxseSgpLFxuICAgICk7XG4gICAgdGhpcy5fc2VydmVyTWFuYWdlci5zdGFydExpc3RlbmluZygpO1xuICAgIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB0aGlzLmV4aXRDbGVhbnVwLmJpbmQodGhpcykpO1xuICB9XG5cbiAgcHJpdmF0ZSBleGl0Q2xlYW51cCgpOiB2b2lkIHtcbiAgICB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnRlcm1pbmF0ZSgpO1xuICB9XG5cbiAgLyoqIERlYWN0aXZhdGUgZGlzcG9zZXMgdGhlIHJlc291cmNlcyB3ZSdyZSB1c2luZyAqL1xuICBwdWJsaWMgYXN5bmMgZGVhY3RpdmF0ZSgpOiBQcm9taXNlPGFueT4ge1xuICAgIHRoaXMuX2lzRGVhY3RpdmF0aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnN0b3BBbGxTZXJ2ZXJzKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgc3Bhd25DaGlsZE5vZGUoYXJnczogc3RyaW5nW10sIG9wdGlvbnM6IGNwLlNwYXduT3B0aW9ucyA9IHt9KTogY3AuQ2hpbGRQcm9jZXNzIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1Zyhgc3RhcnRpbmcgY2hpbGQgTm9kZSBcIiR7YXJncy5qb2luKCcgJyl9XCJgKTtcbiAgICBvcHRpb25zLmVudiA9IG9wdGlvbnMuZW52IHx8IE9iamVjdC5jcmVhdGUocHJvY2Vzcy5lbnYpO1xuICAgIGlmIChvcHRpb25zLmVudikge1xuICAgICAgb3B0aW9ucy5lbnYuRUxFQ1RST05fUlVOX0FTX05PREUgPSAnMSc7XG4gICAgICBvcHRpb25zLmVudi5FTEVDVFJPTl9OT19BVFRBQ0hfQ09OU09MRSA9ICcxJztcbiAgICB9XG4gICAgcmV0dXJuIGNwLnNwYXduKHByb2Nlc3MuZXhlY1BhdGgsIGFyZ3MsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqIExTUCBsb2dnaW5nIGlzIG9ubHkgc2V0IGZvciB3YXJuaW5ncyAmIGVycm9ycyBieSBkZWZhdWx0IHVubGVzcyB5b3UgdHVybiBvbiB0aGUgY29yZS5kZWJ1Z0xTUCBzZXR0aW5nICovXG4gIHByb3RlY3RlZCBnZXRMb2dnZXIoKTogTG9nZ2VyIHtcbiAgICBjb25zdCBmaWx0ZXIgPSBhdG9tLmNvbmZpZy5nZXQoJ2NvcmUuZGVidWdMU1AnKVxuICAgICAgPyBGaWx0ZXJlZExvZ2dlci5EZXZlbG9wZXJMZXZlbEZpbHRlclxuICAgICAgOiBGaWx0ZXJlZExvZ2dlci5Vc2VyTGV2ZWxGaWx0ZXI7XG4gICAgcmV0dXJuIG5ldyBGaWx0ZXJlZExvZ2dlcihuZXcgQ29uc29sZUxvZ2dlcih0aGlzLm5hbWUpLCBmaWx0ZXIpO1xuICB9XG5cbiAgLyoqIFN0YXJ0cyB0aGUgc2VydmVyIGJ5IHN0YXJ0aW5nIHRoZSBwcm9jZXNzLCB0aGVuIGluaXRpYWxpemluZyB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGFuZCBzdGFydGluZyBhZGFwdGVycyAqL1xuICBwcml2YXRlIGFzeW5jIHN0YXJ0U2VydmVyKHByb2plY3RQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFjdGl2ZVNlcnZlcj4ge1xuICAgIGNvbnN0IHByb2Nlc3MgPSBhd2FpdCB0aGlzLnJlcG9ydEJ1c3lXaGlsZShcbiAgICAgIGBTdGFydGluZyAke3RoaXMuZ2V0U2VydmVyTmFtZSgpfSBmb3IgJHtwYXRoLmJhc2VuYW1lKHByb2plY3RQYXRoKX1gLFxuICAgICAgYXN5bmMgKCkgPT4gdGhpcy5zdGFydFNlcnZlclByb2Nlc3MocHJvamVjdFBhdGgpLFxuICAgICk7XG4gICAgdGhpcy5jYXB0dXJlU2VydmVyRXJyb3JzKHByb2Nlc3MsIHByb2plY3RQYXRoKTtcbiAgICBjb25zdCBjb25uZWN0aW9uID0gbmV3IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbih0aGlzLmNyZWF0ZVJwY0Nvbm5lY3Rpb24ocHJvY2VzcyksIHRoaXMubG9nZ2VyKTtcbiAgICB0aGlzLnByZUluaXRpYWxpemF0aW9uKGNvbm5lY3Rpb24pO1xuICAgIGNvbnN0IGluaXRpYWxpemVQYXJhbXMgPSB0aGlzLmdldEluaXRpYWxpemVQYXJhbXMocHJvamVjdFBhdGgsIHByb2Nlc3MpO1xuICAgIGNvbnN0IGluaXRpYWxpemF0aW9uID0gY29ubmVjdGlvbi5pbml0aWFsaXplKGluaXRpYWxpemVQYXJhbXMpO1xuICAgIHRoaXMucmVwb3J0QnVzeVdoaWxlKFxuICAgICAgYCR7dGhpcy5nZXRTZXJ2ZXJOYW1lKCl9IGluaXRpYWxpemluZyBmb3IgJHtwYXRoLmJhc2VuYW1lKHByb2plY3RQYXRoKX1gLFxuICAgICAgKCkgPT4gaW5pdGlhbGl6YXRpb24sXG4gICAgKTtcbiAgICBjb25zdCBpbml0aWFsaXplUmVzcG9uc2UgPSBhd2FpdCBpbml0aWFsaXphdGlvbjtcbiAgICBjb25zdCBuZXdTZXJ2ZXI6IEFjdGl2ZVNlcnZlciA9IHtcbiAgICAgIHByb2plY3RQYXRoLFxuICAgICAgcHJvY2VzcyxcbiAgICAgIGNvbm5lY3Rpb24sXG4gICAgICBjYXBhYmlsaXRpZXM6IGluaXRpYWxpemVSZXNwb25zZS5jYXBhYmlsaXRpZXMsXG4gICAgICBkaXNwb3NhYmxlOiBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpLFxuICAgICAgYWRkaXRpb25hbFBhdGhzOiBuZXcgU2V0KCksXG4gICAgICBjb25zaWRlckRlZmluaXRpb25QYXRoOiAoZGVmUGF0aDogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgICAgIGlmICghZGVmUGF0aC5zdGFydHNXaXRoKHByb2plY3RQYXRoKSkge1xuICAgICAgICAgIG5ld1NlcnZlci5hZGRpdGlvbmFsUGF0aHMuYWRkKHBhdGguZGlybmFtZShkZWZQYXRoKSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfTtcbiAgICB0aGlzLnBvc3RJbml0aWFsaXphdGlvbihuZXdTZXJ2ZXIpO1xuICAgIGNvbm5lY3Rpb24uaW5pdGlhbGl6ZWQoKTtcbiAgICBjb25uZWN0aW9uLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgIGlmICghdGhpcy5faXNEZWFjdGl2YXRpbmcpIHtcbiAgICAgICAgdGhpcy5fc2VydmVyTWFuYWdlci5zdG9wU2VydmVyKG5ld1NlcnZlcik7XG4gICAgICAgIGlmICghdGhpcy5fc2VydmVyTWFuYWdlci5oYXNTZXJ2ZXJSZWFjaGVkUmVzdGFydExpbWl0KG5ld1NlcnZlcikpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUmVzdGFydGluZyBsYW5ndWFnZSBzZXJ2ZXIgZm9yIHByb2plY3QgJyR7bmV3U2VydmVyLnByb2plY3RQYXRofSdgKTtcbiAgICAgICAgICB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnN0YXJ0U2VydmVyKHByb2plY3RQYXRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBMYW5ndWFnZSBzZXJ2ZXIgaGFzIGV4Y2VlZGVkIGF1dG8tcmVzdGFydCBsaW1pdCBmb3IgcHJvamVjdCAnJHtuZXdTZXJ2ZXIucHJvamVjdFBhdGh9J2ApO1xuICAgICAgICAgIGF0b20ubm90aWZpY2F0aW9ucy5hZGRFcnJvcihcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgICAgICAgIGBUaGUgJHt0aGlzLm5hbWV9IGxhbmd1YWdlIHNlcnZlciBoYXMgZXhpdGVkIGFuZCBleGNlZWRlZCB0aGUgcmVzdGFydCBsaW1pdCBmb3IgcHJvamVjdCAnJHtuZXdTZXJ2ZXIucHJvamVjdFBhdGh9J2ApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBjb25maWd1cmF0aW9uS2V5ID0gdGhpcy5nZXRSb290Q29uZmlndXJhdGlvbktleSgpO1xuICAgIGlmIChjb25maWd1cmF0aW9uS2V5KSB7XG4gICAgICBuZXdTZXJ2ZXIuZGlzcG9zYWJsZS5hZGQoXG4gICAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoY29uZmlndXJhdGlvbktleSwgKGNvbmZpZykgPT4ge1xuICAgICAgICAgIGNvbnN0IG1hcHBlZENvbmZpZyA9IHRoaXMubWFwQ29uZmlndXJhdGlvbk9iamVjdChjb25maWcgfHwge30pO1xuICAgICAgICAgIGlmIChtYXBwZWRDb25maWcpIHtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uZGlkQ2hhbmdlQ29uZmlndXJhdGlvbih7XG4gICAgICAgICAgICAgIHNldHRpbmdzOiBtYXBwZWRDb25maWcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXJ0RXhjbHVzaXZlQWRhcHRlcnMobmV3U2VydmVyKTtcbiAgICByZXR1cm4gbmV3U2VydmVyO1xuICB9XG5cbiAgcHJpdmF0ZSBjYXB0dXJlU2VydmVyRXJyb3JzKGNoaWxkUHJvY2VzczogTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzLCBwcm9qZWN0UGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgY2hpbGRQcm9jZXNzLm9uKCdlcnJvcicsIChlcnIpID0+IHRoaXMuaGFuZGxlU3Bhd25GYWlsdXJlKGVycikpO1xuICAgIGNoaWxkUHJvY2Vzcy5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHRoaXMubG9nZ2VyLmRlYnVnKGBleGl0OiBjb2RlICR7Y29kZX0gc2lnbmFsICR7c2lnbmFsfWApKTtcbiAgICBjaGlsZFByb2Nlc3Muc3RkZXJyLnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgY2hpbGRQcm9jZXNzLnN0ZGVyci5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgICBjb25zdCBlcnJvclN0cmluZyA9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICB0aGlzLmhhbmRsZVNlcnZlclN0ZGVycihlcnJvclN0cmluZywgcHJvamVjdFBhdGgpO1xuICAgICAgLy8gS2VlcCB0aGUgbGFzdCA1IGxpbmVzIGZvciBwYWNrYWdlcyB0byB1c2UgaW4gbWVzc2FnZXNcbiAgICAgIHRoaXMucHJvY2Vzc1N0ZEVyciA9ICh0aGlzLnByb2Nlc3NTdGRFcnIgKyBlcnJvclN0cmluZylcbiAgICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgICAuc2xpY2UoLTUpXG4gICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlU3Bhd25GYWlsdXJlKGVycjogYW55KTogdm9pZCB7XG4gICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKFxuICAgICAgYCR7dGhpcy5nZXRTZXJ2ZXJOYW1lKCl9IGxhbmd1YWdlIHNlcnZlciBmb3IgJHt0aGlzLmdldExhbmd1YWdlTmFtZSgpfSB1bmFibGUgdG8gc3RhcnRgLFxuICAgICAge1xuICAgICAgICBkaXNtaXNzYWJsZTogdHJ1ZSxcbiAgICAgICAgZGVzY3JpcHRpb246IGVyci50b1N0cmluZygpLFxuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgLyoqIENyZWF0ZXMgdGhlIFJQQyBjb25uZWN0aW9uIHdoaWNoIGNhbiBiZSBpcGMsIHNvY2tldCBvciBzdGRpbyAqL1xuICBwcml2YXRlIGNyZWF0ZVJwY0Nvbm5lY3Rpb24ocHJvY2VzczogTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzKTogcnBjLk1lc3NhZ2VDb25uZWN0aW9uIHtcbiAgICBsZXQgcmVhZGVyOiBycGMuTWVzc2FnZVJlYWRlcjtcbiAgICBsZXQgd3JpdGVyOiBycGMuTWVzc2FnZVdyaXRlcjtcbiAgICBjb25zdCBjb25uZWN0aW9uVHlwZSA9IHRoaXMuZ2V0Q29ubmVjdGlvblR5cGUoKTtcbiAgICBzd2l0Y2ggKGNvbm5lY3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdpcGMnOlxuICAgICAgICByZWFkZXIgPSBuZXcgcnBjLklQQ01lc3NhZ2VSZWFkZXIocHJvY2VzcyBhcyBjcC5DaGlsZFByb2Nlc3MpO1xuICAgICAgICB3cml0ZXIgPSBuZXcgcnBjLklQQ01lc3NhZ2VXcml0ZXIocHJvY2VzcyBhcyBjcC5DaGlsZFByb2Nlc3MpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NvY2tldCc6XG4gICAgICAgIHJlYWRlciA9IG5ldyBycGMuU29ja2V0TWVzc2FnZVJlYWRlcih0aGlzLnNvY2tldCk7XG4gICAgICAgIHdyaXRlciA9IG5ldyBycGMuU29ja2V0TWVzc2FnZVdyaXRlcih0aGlzLnNvY2tldCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3RkaW8nOlxuICAgICAgICByZWFkZXIgPSBuZXcgcnBjLlN0cmVhbU1lc3NhZ2VSZWFkZXIocHJvY2Vzcy5zdGRvdXQpO1xuICAgICAgICB3cml0ZXIgPSBuZXcgcnBjLlN0cmVhbU1lc3NhZ2VXcml0ZXIocHJvY2Vzcy5zdGRpbik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFV0aWxzLmFzc2VydFVucmVhY2hhYmxlKGNvbm5lY3Rpb25UeXBlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnBjLmNyZWF0ZU1lc3NhZ2VDb25uZWN0aW9uKHJlYWRlciwgd3JpdGVyLCB7XG4gICAgICBsb2c6ICguLi5fYXJnczogYW55W10pID0+IHsgfSxcbiAgICAgIHdhcm46ICguLi5fYXJnczogYW55W10pID0+IHsgfSxcbiAgICAgIGluZm86ICguLi5fYXJnczogYW55W10pID0+IHsgfSxcbiAgICAgIGVycm9yOiAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYXJncyk7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgLyoqIFN0YXJ0IGFkYXB0ZXJzIHRoYXQgYXJlIG5vdCBzaGFyZWQgYmV0d2VlbiBzZXJ2ZXJzICovXG4gIHByaXZhdGUgc3RhcnRFeGNsdXNpdmVBZGFwdGVycyhzZXJ2ZXI6IEFjdGl2ZVNlcnZlcik6IHZvaWQge1xuICAgIEFwcGx5RWRpdEFkYXB0ZXIuYXR0YWNoKHNlcnZlci5jb25uZWN0aW9uKTtcbiAgICBOb3RpZmljYXRpb25zQWRhcHRlci5hdHRhY2goc2VydmVyLmNvbm5lY3Rpb24sIHRoaXMubmFtZSwgc2VydmVyLnByb2plY3RQYXRoKTtcblxuICAgIGlmIChEb2N1bWVudFN5bmNBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICBjb25zdCBkb2NTeW5jQWRhcHRlciA9XG4gICAgICAgIG5ldyBEb2N1bWVudFN5bmNBZGFwdGVyKFxuICAgICAgICAgIHNlcnZlci5jb25uZWN0aW9uLFxuICAgICAgICAgIChlZGl0b3IpID0+IHRoaXMuc2hvdWxkU3luY0ZvckVkaXRvcihlZGl0b3IsIHNlcnZlci5wcm9qZWN0UGF0aCksXG4gICAgICAgICAgc2VydmVyLmNhcGFiaWxpdGllcy50ZXh0RG9jdW1lbnRTeW5jLFxuICAgICAgICAgIHRoaXMucmVwb3J0QnVzeVdoaWxlLFxuICAgICAgICApO1xuICAgICAgc2VydmVyLmRpc3Bvc2FibGUuYWRkKGRvY1N5bmNBZGFwdGVyKTtcbiAgICB9XG5cbiAgICBjb25zdCBsaW50ZXJQdXNoVjIgPSBuZXcgTGludGVyUHVzaFYyQWRhcHRlcihzZXJ2ZXIuY29ubmVjdGlvbik7XG4gICAgaWYgKHRoaXMuX2xpbnRlckRlbGVnYXRlICE9IG51bGwpIHtcbiAgICAgIGxpbnRlclB1c2hWMi5hdHRhY2godGhpcy5fbGludGVyRGVsZWdhdGUpO1xuICAgIH1cbiAgICBzZXJ2ZXIuZGlzcG9zYWJsZS5hZGQobGludGVyUHVzaFYyKTtcblxuICAgIGNvbnN0IGxvZ2dpbmdDb25zb2xlID0gbmV3IExvZ2dpbmdDb25zb2xlQWRhcHRlcihzZXJ2ZXIuY29ubmVjdGlvbik7XG4gICAgaWYgKHRoaXMuX2NvbnNvbGVEZWxlZ2F0ZSAhPSBudWxsKSB7XG4gICAgICBsb2dnaW5nQ29uc29sZS5hdHRhY2godGhpcy5fY29uc29sZURlbGVnYXRlKHsgaWQ6IHRoaXMubmFtZSwgbmFtZTogdGhpcy5nZXRMYW5ndWFnZU5hbWUoKSB9KSk7XG4gICAgfVxuICAgIHNlcnZlci5kaXNwb3NhYmxlLmFkZChsb2dnaW5nQ29uc29sZSk7XG5cbiAgICBsZXQgc2lnbmF0dXJlSGVscEFkYXB0ZXI6IFNpZ25hdHVyZUhlbHBBZGFwdGVyIHwgdW5kZWZpbmVkO1xuICAgIGlmIChTaWduYXR1cmVIZWxwQWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgc2lnbmF0dXJlSGVscEFkYXB0ZXIgPSBuZXcgU2lnbmF0dXJlSGVscEFkYXB0ZXIoc2VydmVyLCB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSk7XG4gICAgICBpZiAodGhpcy5fc2lnbmF0dXJlSGVscFJlZ2lzdHJ5ICE9IG51bGwpIHtcbiAgICAgICAgc2lnbmF0dXJlSGVscEFkYXB0ZXIuYXR0YWNoKHRoaXMuX3NpZ25hdHVyZUhlbHBSZWdpc3RyeSk7XG4gICAgICB9XG4gICAgICBzZXJ2ZXIuZGlzcG9zYWJsZS5hZGQoc2lnbmF0dXJlSGVscEFkYXB0ZXIpO1xuICAgIH1cblxuICAgIHRoaXMuX3NlcnZlckFkYXB0ZXJzLnNldChzZXJ2ZXIsIHtcbiAgICAgIGxpbnRlclB1c2hWMiwgbG9nZ2luZ0NvbnNvbGUsIHNpZ25hdHVyZUhlbHBBZGFwdGVyLFxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIHNob3VsZFN5bmNGb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yLCBwcm9qZWN0UGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNGaWxlSW5Qcm9qZWN0KGVkaXRvciwgcHJvamVjdFBhdGgpICYmIHRoaXMuc2hvdWxkU3RhcnRGb3JFZGl0b3IoZWRpdG9yKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBpc0ZpbGVJblByb2plY3QoZWRpdG9yOiBUZXh0RWRpdG9yLCBwcm9qZWN0UGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIChlZGl0b3IuZ2V0UGF0aCgpIHx8ICcnKS5zdGFydHNXaXRoKHByb2plY3RQYXRoKTtcbiAgfVxuXG4gIC8vIEF1dG9jb21wbGV0ZSsgdmlhIExTIGNvbXBsZXRpb24tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHVibGljIHByb3ZpZGVBdXRvY29tcGxldGUoKTogYWMuQXV0b2NvbXBsZXRlUHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBzZWxlY3RvcjogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKClcbiAgICAgICAgLm1hcCgoZykgPT4gZy5pbmNsdWRlcygnLicpID8gJy4nICsgZyA6IGcpXG4gICAgICAgIC5qb2luKCcsICcpLFxuICAgICAgaW5jbHVzaW9uUHJpb3JpdHk6IDEsXG4gICAgICBzdWdnZXN0aW9uUHJpb3JpdHk6IDIsXG4gICAgICBleGNsdWRlTG93ZXJQcmlvcml0eTogZmFsc2UsXG4gICAgICBnZXRTdWdnZXN0aW9uczogdGhpcy5nZXRTdWdnZXN0aW9ucy5iaW5kKHRoaXMpLFxuICAgICAgb25EaWRJbnNlcnRTdWdnZXN0aW9uOiAoZXZlbnQpID0+IHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGRpdGlvbmFsVGV4dEVkaXRzKGV2ZW50KTtcbiAgICAgICAgdGhpcy5vbkRpZEluc2VydFN1Z2dlc3Rpb24oZXZlbnQpO1xuICAgICAgfSxcbiAgICAgIGdldFN1Z2dlc3Rpb25EZXRhaWxzT25TZWxlY3Q6IHRoaXMuZ2V0U3VnZ2VzdGlvbkRldGFpbHNPblNlbGVjdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0U3VnZ2VzdGlvbnMoXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgKTogUHJvbWlzZTxhYy5BbnlTdWdnZXN0aW9uW10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihyZXF1ZXN0LmVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFBdXRvY29tcGxldGVBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgdGhpcy5hdXRvQ29tcGxldGUgPSB0aGlzLmF1dG9Db21wbGV0ZSB8fCBuZXcgQXV0b2NvbXBsZXRlQWRhcHRlcigpO1xuICAgIHRoaXMuX2xhc3RBdXRvY29tcGxldGVSZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gdGhpcy5hdXRvQ29tcGxldGUuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCByZXF1ZXN0LCB0aGlzLm9uRGlkQ29udmVydEF1dG9jb21wbGV0ZSxcbiAgICAgIGF0b20uY29uZmlnLmdldCgnYXV0b2NvbXBsZXRlLXBsdXMubWluaW11bVdvcmRMZW5ndGgnKSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0U3VnZ2VzdGlvbkRldGFpbHNPblNlbGVjdChcbiAgICBzdWdnZXN0aW9uOiBhYy5BbnlTdWdnZXN0aW9uLFxuICApOiBQcm9taXNlPGFjLkFueVN1Z2dlc3Rpb24gfCBudWxsPiB7XG4gICAgY29uc3QgcmVxdWVzdCA9IHRoaXMuX2xhc3RBdXRvY29tcGxldGVSZXF1ZXN0O1xuICAgIGlmIChyZXF1ZXN0ID09IG51bGwpIHsgcmV0dXJuIG51bGw7IH1cbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihyZXF1ZXN0LmVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFBdXRvY29tcGxldGVBZGFwdGVyLmNhblJlc29sdmUoc2VydmVyLmNhcGFiaWxpdGllcykgfHwgdGhpcy5hdXRvQ29tcGxldGUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYXV0b0NvbXBsZXRlLmNvbXBsZXRlU3VnZ2VzdGlvbihzZXJ2ZXIsIHN1Z2dlc3Rpb24sIHJlcXVlc3QsIHRoaXMub25EaWRDb252ZXJ0QXV0b2NvbXBsZXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBvbkRpZENvbnZlcnRBdXRvY29tcGxldGUoXG4gICAgX2NvbXBsZXRpb25JdGVtOiBscy5Db21wbGV0aW9uSXRlbSxcbiAgICBfc3VnZ2VzdGlvbjogYWMuQW55U3VnZ2VzdGlvbixcbiAgICBfcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgKTogdm9pZCB7XG4gIH1cblxuICAvLyBIYW5kbGUgYWRkaXRpb25hbCBzdHVmZiBhZnRlciBhIHN1Z2dlc3Rpb24gaW5zZXJ0LCBlLmcuIGBhZGRpdGlvbmFsVGV4dEVkaXRzYC5cbiAgcHJpdmF0ZSBoYW5kbGVBZGRpdGlvbmFsVGV4dEVkaXRzKGU6IGFjLlN1Z2dlc3Rpb25JbnNlcnRlZEV2ZW50KTogdm9pZCB7XG4gICAgY29uc3Qgc3VnZ2VzdGlvbiA9IGUuc3VnZ2VzdGlvbiBhcyBhdG9tSWRlLlN1Z2dlc3Rpb25CYXNlO1xuICAgIGNvbnN0IGFkZGl0aW9uYWxFZGl0cyA9IHN1Z2dlc3Rpb24uY29tcGxldGlvbkl0ZW0gJiYgc3VnZ2VzdGlvbi5jb21wbGV0aW9uSXRlbS5hZGRpdGlvbmFsVGV4dEVkaXRzO1xuICAgIGNvbnN0IGJ1ZmZlciA9IGUuZWRpdG9yLmdldEJ1ZmZlcigpO1xuXG4gICAgQXBwbHlFZGl0QWRhcHRlci5hcHBseUVkaXRzKGJ1ZmZlciwgQ29udmVydC5jb252ZXJ0THNUZXh0RWRpdHMoYWRkaXRpb25hbEVkaXRzKSk7XG4gICAgYnVmZmVyLmdyb3VwTGFzdENoYW5nZXMoKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBvbkRpZEluc2VydFN1Z2dlc3Rpb24oX2FyZzogYWMuU3VnZ2VzdGlvbkluc2VydGVkRXZlbnQpOiB2b2lkIHsgfVxuXG4gIC8vIERlZmluaXRpb25zIHZpYSBMUyBkb2N1bWVudEhpZ2hsaWdodCBhbmQgZ290b0RlZmluaXRpb24tLS0tLS0tLS0tLS1cbiAgcHVibGljIHByb3ZpZGVEZWZpbml0aW9ucygpOiBhdG9tSWRlLkRlZmluaXRpb25Qcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHByaW9yaXR5OiAyMCxcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgZ2V0RGVmaW5pdGlvbjogdGhpcy5nZXREZWZpbml0aW9uLmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXREZWZpbml0aW9uKGVkaXRvcjogVGV4dEVkaXRvciwgcG9pbnQ6IFBvaW50KTogUHJvbWlzZTxhdG9tSWRlLkRlZmluaXRpb25RdWVyeVJlc3VsdCB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhRGVmaW5pdGlvbkFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuZGVmaW5pdGlvbnMgPSB0aGlzLmRlZmluaXRpb25zIHx8IG5ldyBEZWZpbml0aW9uQWRhcHRlcigpO1xuICAgIGNvbnN0IHF1ZXJ5UHJvbWlzZSA9IHRoaXMuZGVmaW5pdGlvbnMuZ2V0RGVmaW5pdGlvbihcbiAgICAgIHNlcnZlci5jb25uZWN0aW9uLFxuICAgICAgc2VydmVyLmNhcGFiaWxpdGllcyxcbiAgICAgIHRoaXMuZ2V0TGFuZ3VhZ2VOYW1lKCksXG4gICAgICBlZGl0b3IsXG4gICAgICBwb2ludCxcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuc2VydmVyc1N1cHBvcnREZWZpbml0aW9uRGVzdGluYXRpb25zKCkpIHtcbiAgICAgIHF1ZXJ5UHJvbWlzZS50aGVuKChxdWVyeSkgPT4ge1xuICAgICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGRlZiBvZiBxdWVyeS5kZWZpbml0aW9ucykge1xuICAgICAgICAgICAgc2VydmVyLmNvbnNpZGVyRGVmaW5pdGlvblBhdGgoZGVmLnBhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHF1ZXJ5UHJvbWlzZTtcbiAgfVxuXG4gIC8vIE91dGxpbmUgVmlldyB2aWEgTFMgZG9jdW1lbnRTeW1ib2wtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHVibGljIHByb3ZpZGVPdXRsaW5lcygpOiBhdG9tSWRlLk91dGxpbmVQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBnZXRPdXRsaW5lOiB0aGlzLmdldE91dGxpbmUuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldE91dGxpbmUoZWRpdG9yOiBUZXh0RWRpdG9yKTogUHJvbWlzZTxhdG9tSWRlLk91dGxpbmUgfCBudWxsPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIU91dGxpbmVWaWV3QWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5vdXRsaW5lVmlldyA9IHRoaXMub3V0bGluZVZpZXcgfHwgbmV3IE91dGxpbmVWaWV3QWRhcHRlcigpO1xuICAgIHJldHVybiB0aGlzLm91dGxpbmVWaWV3LmdldE91dGxpbmUoc2VydmVyLmNvbm5lY3Rpb24sIGVkaXRvcik7XG4gIH1cblxuICAvLyBMaW50ZXIgcHVzaCB2MiBBUEkgdmlhIExTIHB1Ymxpc2hEaWFnbm9zdGljc1xuICBwdWJsaWMgY29uc3VtZUxpbnRlclYyKHJlZ2lzdGVySW5kaWU6IChwYXJhbXM6IHsgbmFtZTogc3RyaW5nIH0pID0+IGxpbnRlci5JbmRpZURlbGVnYXRlKTogdm9pZCB7XG4gICAgdGhpcy5fbGludGVyRGVsZWdhdGUgPSByZWdpc3RlckluZGllKHsgbmFtZTogdGhpcy5uYW1lIH0pO1xuICAgIGlmICh0aGlzLl9saW50ZXJEZWxlZ2F0ZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBzZXJ2ZXIgb2YgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRBY3RpdmVTZXJ2ZXJzKCkpIHtcbiAgICAgIGNvbnN0IGxpbnRlclB1c2hWMiA9IHRoaXMuZ2V0U2VydmVyQWRhcHRlcihzZXJ2ZXIsICdsaW50ZXJQdXNoVjInKTtcbiAgICAgIGlmIChsaW50ZXJQdXNoVjIgIT0gbnVsbCkge1xuICAgICAgICBsaW50ZXJQdXNoVjIuYXR0YWNoKHRoaXMuX2xpbnRlckRlbGVnYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIFJlZmVyZW5jZXMgdmlhIExTIGZpbmRSZWZlcmVuY2VzLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHB1YmxpYyBwcm92aWRlRmluZFJlZmVyZW5jZXMoKTogYXRvbUlkZS5GaW5kUmVmZXJlbmNlc1Byb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgaXNFZGl0b3JTdXBwb3J0ZWQ6IChlZGl0b3I6IFRleHRFZGl0b3IpID0+IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLmluY2x1ZGVzKGVkaXRvci5nZXRHcmFtbWFyKCkuc2NvcGVOYW1lKSxcbiAgICAgIGZpbmRSZWZlcmVuY2VzOiB0aGlzLmdldFJlZmVyZW5jZXMuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFJlZmVyZW5jZXMoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb2ludDogUG9pbnQpOiBQcm9taXNlPGF0b21JZGUuRmluZFJlZmVyZW5jZXNSZXR1cm4gfCBudWxsPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIUZpbmRSZWZlcmVuY2VzQWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5maW5kUmVmZXJlbmNlcyA9IHRoaXMuZmluZFJlZmVyZW5jZXMgfHwgbmV3IEZpbmRSZWZlcmVuY2VzQWRhcHRlcigpO1xuICAgIHJldHVybiB0aGlzLmZpbmRSZWZlcmVuY2VzLmdldFJlZmVyZW5jZXMoc2VydmVyLmNvbm5lY3Rpb24sIGVkaXRvciwgcG9pbnQsIHNlcnZlci5wcm9qZWN0UGF0aCk7XG4gIH1cblxuICAvLyBEYXRhdGlwIHZpYSBMUyB0ZXh0RG9jdW1lbnQvaG92ZXItLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHB1YmxpYyBjb25zdW1lRGF0YXRpcChzZXJ2aWNlOiBhdG9tSWRlLkRhdGF0aXBTZXJ2aWNlKTogdm9pZCB7XG4gICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoXG4gICAgICBzZXJ2aWNlLmFkZFByb3ZpZGVyKHtcbiAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgICAgdmFsaWRGb3JTY29wZTogKHNjb3BlTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLmluY2x1ZGVzKHNjb3BlTmFtZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGRhdGF0aXA6IHRoaXMuZ2V0RGF0YXRpcC5iaW5kKHRoaXMpLFxuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXREYXRhdGlwKGVkaXRvcjogVGV4dEVkaXRvciwgcG9pbnQ6IFBvaW50KTogUHJvbWlzZTxhdG9tSWRlLkRhdGF0aXAgfCBudWxsPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIURhdGF0aXBBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmRhdGF0aXAgPSB0aGlzLmRhdGF0aXAgfHwgbmV3IERhdGF0aXBBZGFwdGVyKCk7XG4gICAgcmV0dXJuIHRoaXMuZGF0YXRpcC5nZXREYXRhdGlwKHNlcnZlci5jb25uZWN0aW9uLCBlZGl0b3IsIHBvaW50KTtcbiAgfVxuXG4gIC8vIENvbnNvbGUgdmlhIExTIGxvZ2dpbmctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHVibGljIGNvbnN1bWVDb25zb2xlKGNyZWF0ZUNvbnNvbGU6IGF0b21JZGUuQ29uc29sZVNlcnZpY2UpOiBEaXNwb3NhYmxlIHtcbiAgICB0aGlzLl9jb25zb2xlRGVsZWdhdGUgPSBjcmVhdGVDb25zb2xlO1xuXG4gICAgZm9yIChjb25zdCBzZXJ2ZXIgb2YgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRBY3RpdmVTZXJ2ZXJzKCkpIHtcbiAgICAgIGNvbnN0IGxvZ2dpbmdDb25zb2xlID0gdGhpcy5nZXRTZXJ2ZXJBZGFwdGVyKHNlcnZlciwgJ2xvZ2dpbmdDb25zb2xlJyk7XG4gICAgICBpZiAobG9nZ2luZ0NvbnNvbGUpIHtcbiAgICAgICAgbG9nZ2luZ0NvbnNvbGUuYXR0YWNoKHRoaXMuX2NvbnNvbGVEZWxlZ2F0ZSh7IGlkOiB0aGlzLm5hbWUsIG5hbWU6IHRoaXMuZ2V0TGFuZ3VhZ2VOYW1lKCkgfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5vIHdheSBvZiBkZXRhY2hpbmcgZnJvbSBjbGllbnQgY29ubmVjdGlvbnMgdG9kYXlcbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4geyB9KTtcbiAgfVxuXG4gIC8vIENvZGUgRm9ybWF0IHZpYSBMUyBmb3JtYXREb2N1bWVudCAmIGZvcm1hdERvY3VtZW50UmFuZ2UtLS0tLS0tLS0tLS1cbiAgcHVibGljIHByb3ZpZGVDb2RlRm9ybWF0KCk6IGF0b21JZGUuUmFuZ2VDb2RlRm9ybWF0UHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgZm9ybWF0Q29kZTogdGhpcy5nZXRDb2RlRm9ybWF0LmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRDb2RlRm9ybWF0KGVkaXRvcjogVGV4dEVkaXRvciwgcmFuZ2U6IFJhbmdlKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhQ29kZUZvcm1hdEFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29kZUZvcm1hdEFkYXB0ZXIuZm9ybWF0KHNlcnZlci5jb25uZWN0aW9uLCBzZXJ2ZXIuY2FwYWJpbGl0aWVzLCBlZGl0b3IsIHJhbmdlKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlUmFuZ2VDb2RlRm9ybWF0KCk6IGF0b21JZGUuUmFuZ2VDb2RlRm9ybWF0UHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgZm9ybWF0Q29kZTogdGhpcy5nZXRSYW5nZUNvZGVGb3JtYXQuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFJhbmdlQ29kZUZvcm1hdChlZGl0b3I6IFRleHRFZGl0b3IsIHJhbmdlOiBSYW5nZSk6IFByb21pc2U8YXRvbUlkZS5UZXh0RWRpdFtdPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIXNlcnZlci5jYXBhYmlsaXRpZXMuZG9jdW1lbnRSYW5nZUZvcm1hdHRpbmdQcm92aWRlcikge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXRSYW5nZShzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yLCByYW5nZSk7XG4gIH1cblxuICBwdWJsaWMgcHJvdmlkZUZpbGVDb2RlRm9ybWF0KCk6IGF0b21JZGUuRmlsZUNvZGVGb3JtYXRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBmb3JtYXRFbnRpcmVGaWxlOiB0aGlzLmdldEZpbGVDb2RlRm9ybWF0LmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlT25TYXZlQ29kZUZvcm1hdCgpOiBhdG9tSWRlLk9uU2F2ZUNvZGVGb3JtYXRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBmb3JtYXRPblNhdmU6IHRoaXMuZ2V0RmlsZUNvZGVGb3JtYXQuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldEZpbGVDb2RlRm9ybWF0KGVkaXRvcjogVGV4dEVkaXRvcik6IFByb21pc2U8YXRvbUlkZS5UZXh0RWRpdFtdPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIXNlcnZlci5jYXBhYmlsaXRpZXMuZG9jdW1lbnRGb3JtYXR0aW5nUHJvdmlkZXIpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29kZUZvcm1hdEFkYXB0ZXIuZm9ybWF0RG9jdW1lbnQoc2VydmVyLmNvbm5lY3Rpb24sIGVkaXRvcik7XG4gIH1cblxuICBwdWJsaWMgcHJvdmlkZU9uVHlwZUNvZGVGb3JtYXQoKTogYXRvbUlkZS5PblR5cGVDb2RlRm9ybWF0UHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgZm9ybWF0QXRQb3NpdGlvbjogdGhpcy5nZXRPblR5cGVDb2RlRm9ybWF0LmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRPblR5cGVDb2RlRm9ybWF0KFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBwb2ludDogUG9pbnQsXG4gICAgY2hhcmFjdGVyOiBzdHJpbmcsXG4gICk6IFByb21pc2U8YXRvbUlkZS5UZXh0RWRpdFtdPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIXNlcnZlci5jYXBhYmlsaXRpZXMuZG9jdW1lbnRPblR5cGVGb3JtYXR0aW5nUHJvdmlkZXIpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29kZUZvcm1hdEFkYXB0ZXIuZm9ybWF0T25UeXBlKHNlcnZlci5jb25uZWN0aW9uLCBlZGl0b3IsIHBvaW50LCBjaGFyYWN0ZXIpO1xuICB9XG5cbiAgcHVibGljIHByb3ZpZGVDb2RlSGlnaGxpZ2h0KCk6IGF0b21JZGUuQ29kZUhpZ2hsaWdodFByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGhpZ2hsaWdodDogKGVkaXRvciwgcG9zaXRpb24pID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29kZUhpZ2hsaWdodChlZGl0b3IsIHBvc2l0aW9uKTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRDb2RlSGlnaGxpZ2h0KGVkaXRvcjogVGV4dEVkaXRvciwgcG9zaXRpb246IFBvaW50KTogUHJvbWlzZTxSYW5nZVtdIHwgbnVsbD4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFDb2RlSGlnaGxpZ2h0QWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIENvZGVIaWdobGlnaHRBZGFwdGVyLmhpZ2hsaWdodChzZXJ2ZXIuY29ubmVjdGlvbiwgc2VydmVyLmNhcGFiaWxpdGllcywgZWRpdG9yLCBwb3NpdGlvbik7XG4gIH1cblxuICBwdWJsaWMgcHJvdmlkZUNvZGVBY3Rpb25zKCk6IGF0b21JZGUuQ29kZUFjdGlvblByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGdldENvZGVBY3Rpb25zOiAoZWRpdG9yLCByYW5nZSwgZGlhZ25vc3RpY3MpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29kZUFjdGlvbnMoZWRpdG9yLCByYW5nZSwgZGlhZ25vc3RpY3MpO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldENvZGVBY3Rpb25zKGVkaXRvcjogVGV4dEVkaXRvciwgcmFuZ2U6IFJhbmdlLCBkaWFnbm9zdGljczogYXRvbUlkZS5EaWFnbm9zdGljW10pIHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhQ29kZUFjdGlvbkFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlQWN0aW9uQWRhcHRlci5nZXRDb2RlQWN0aW9ucyhcbiAgICAgIHNlcnZlci5jb25uZWN0aW9uLFxuICAgICAgc2VydmVyLmNhcGFiaWxpdGllcyxcbiAgICAgIHRoaXMuZ2V0U2VydmVyQWRhcHRlcihzZXJ2ZXIsICdsaW50ZXJQdXNoVjInKSxcbiAgICAgIGVkaXRvcixcbiAgICAgIHJhbmdlLFxuICAgICAgZGlhZ25vc3RpY3MsXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlUmVmYWN0b3IoKTogYXRvbUlkZS5SZWZhY3RvclByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIHJlbmFtZTogdGhpcy5nZXRSZW5hbWUuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFJlbmFtZShlZGl0b3I6IFRleHRFZGl0b3IsIHBvc2l0aW9uOiBQb2ludCwgbmV3TmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIVJlbmFtZUFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBSZW5hbWVBZGFwdGVyLmdldFJlbmFtZShcbiAgICAgIHNlcnZlci5jb25uZWN0aW9uLFxuICAgICAgZWRpdG9yLFxuICAgICAgcG9zaXRpb24sXG4gICAgICBuZXdOYW1lLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgY29uc3VtZVNpZ25hdHVyZUhlbHAocmVnaXN0cnk6IGF0b21JZGUuU2lnbmF0dXJlSGVscFJlZ2lzdHJ5KTogRGlzcG9zYWJsZSB7XG4gICAgdGhpcy5fc2lnbmF0dXJlSGVscFJlZ2lzdHJ5ID0gcmVnaXN0cnk7XG4gICAgZm9yIChjb25zdCBzZXJ2ZXIgb2YgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRBY3RpdmVTZXJ2ZXJzKCkpIHtcbiAgICAgIGNvbnN0IHNpZ25hdHVyZUhlbHBBZGFwdGVyID0gdGhpcy5nZXRTZXJ2ZXJBZGFwdGVyKHNlcnZlciwgJ3NpZ25hdHVyZUhlbHBBZGFwdGVyJyk7XG4gICAgICBpZiAoc2lnbmF0dXJlSGVscEFkYXB0ZXIgIT0gbnVsbCkge1xuICAgICAgICBzaWduYXR1cmVIZWxwQWRhcHRlci5hdHRhY2gocmVnaXN0cnkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgdGhpcy5fc2lnbmF0dXJlSGVscFJlZ2lzdHJ5ID0gdW5kZWZpbmVkO1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGNvbnN1bWVCdXN5U2lnbmFsKHNlcnZpY2U6IGF0b21JZGUuQnVzeVNpZ25hbFNlcnZpY2UpOiBEaXNwb3NhYmxlIHtcbiAgICB0aGlzLmJ1c3lTaWduYWxTZXJ2aWNlID0gc2VydmljZTtcbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4gZGVsZXRlIHRoaXMuYnVzeVNpZ25hbFNlcnZpY2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIGBkaWRDaGFuZ2VXYXRjaGVkRmlsZXNgIG1lc3NhZ2UgZmlsdGVyaW5nLCBvdmVycmlkZSBmb3IgY3VzdG9tIGxvZ2ljLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggUGF0aCBvZiBhIGZpbGUgdGhhdCBoYXMgY2hhbmdlZCBpbiB0aGUgcHJvamVjdCBwYXRoXG4gICAqIEByZXR1cm5zIGBmYWxzZWAgPT4gbWVzc2FnZSB3aWxsIG5vdCBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICovXG4gIHByb3RlY3RlZCBmaWx0ZXJDaGFuZ2VXYXRjaGVkRmlsZXMoX2ZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKiBAcmV0dXJuIGZhbHNlID0+IHNlcnZlcnMgd2lsbCBiZSBraWxsZWQgd2l0aG91dCBhd2FpdGluZyBzaHV0ZG93biByZXNwb25zZS4gKi9cbiAgcHJvdGVjdGVkIHNodXRkb3duU2VydmVyc0dyYWNlZnVsbHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIG9uIGxhbmd1YWdlIHNlcnZlciBzdGRlcnIgb3V0cHV0LlxuICAgKiBAcGFyYW0gc3RkZXJyIEEgY2h1bmsgb2Ygc3RkZXJyIGZyb20gYSBsYW5ndWFnZSBzZXJ2ZXIgaW5zdGFuY2VcbiAgICovXG4gIHByb3RlY3RlZCBoYW5kbGVTZXJ2ZXJTdGRlcnIoc3RkZXJyOiBzdHJpbmcsIF9wcm9qZWN0UGF0aDogc3RyaW5nKSB7XG4gICAgc3RkZXJyLnNwbGl0KCdcXG4nKS5maWx0ZXIoKGwpID0+IGwpLmZvckVhY2goKGxpbmUpID0+IHRoaXMubG9nZ2VyLndhcm4oYHN0ZGVyciAke2xpbmV9YCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB0aGF0IHRoZSBsYW5ndWFnZSBzZXJ2ZXIgY2FuIHN1cHBvcnQgTFNQIGZ1bmN0aW9uYWxpdHkgZm9yXG4gICAqIG91dCBvZiBwcm9qZWN0IGZpbGVzIGluZGljYXRlZCBieSBgdGV4dERvY3VtZW50L2RlZmluaXRpb25gIHJlc3BvbnNlcy5cbiAgICpcbiAgICogRGVmYXVsdDogZmFsc2VcbiAgICovXG4gIHByb3RlY3RlZCBzZXJ2ZXJzU3VwcG9ydERlZmluaXRpb25EZXN0aW5hdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTZXJ2ZXJBZGFwdGVyPFQgZXh0ZW5kcyBrZXlvZiBTZXJ2ZXJBZGFwdGVycz4oXG4gICAgc2VydmVyOiBBY3RpdmVTZXJ2ZXIsIGFkYXB0ZXI6IFQsXG4gICk6IFNlcnZlckFkYXB0ZXJzW1RdIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBhZGFwdGVycyA9IHRoaXMuX3NlcnZlckFkYXB0ZXJzLmdldChzZXJ2ZXIpO1xuICAgIHJldHVybiBhZGFwdGVycyAmJiBhZGFwdGVyc1thZGFwdGVyXTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZXBvcnRCdXN5V2hpbGU6IFV0aWxzLlJlcG9ydEJ1c3lXaGlsZSA9IGFzeW5jICh0aXRsZSwgZikgPT4ge1xuICAgIGlmICh0aGlzLmJ1c3lTaWduYWxTZXJ2aWNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5idXN5U2lnbmFsU2VydmljZS5yZXBvcnRCdXN5V2hpbGUodGl0bGUsIGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXBvcnRCdXN5V2hpbGVEZWZhdWx0KHRpdGxlLCBmKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVwb3J0QnVzeVdoaWxlRGVmYXVsdDogVXRpbHMuUmVwb3J0QnVzeVdoaWxlID0gYXN5bmMgKHRpdGxlLCBmKSA9PiB7XG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgW1N0YXJ0ZWRdICR7dGl0bGV9YCk7XG4gICAgbGV0IHJlcztcbiAgICB0cnkge1xuICAgICAgcmVzID0gYXdhaXQgZigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGBbRmluaXNoZWRdICR7dGl0bGV9YCk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cbn1cbiJdfQ==