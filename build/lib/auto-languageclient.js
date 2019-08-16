"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
            onDidInsertSuggestion: this.onDidInsertSuggestion.bind(this),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sYW5ndWFnZWNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9hdXRvLWxhbmd1YWdlY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFFcEMsc0NBQXNDO0FBQ3RDLDZCQUE2QjtBQUc3Qiw2Q0FBbUM7QUFDbkMsc0VBQTZEO0FBQzdELDBFQUFrRTtBQUNsRSx3RUFBK0Q7QUFDL0Qsd0VBQStEO0FBQy9ELDhFQUFxRTtBQUNyRSxnRUFBd0Q7QUFDeEQsc0VBQThEO0FBQzlELDRFQUFtRTtBQUNuRSxnRkFBdUU7QUFDdkUsOEVBQW9FO0FBQ3BFLGdGQUF1RTtBQUN2RSw0RUFBb0U7QUFDcEUsMEVBQWlFO0FBQ2pFLDhEQUFzRDtBQUN0RCw4RUFBcUU7QUFDckUsaUNBQWlDO0FBRWpDLHFEQUE0RDtBQW9CckMsbUNBcEJkLHlDQUF3QixDQW9CYztBQW5CL0MscUNBSWtCO0FBQ2xCLDJEQUk2QjtBQUM3QiwrQkFNYztBQVlkOzs7Ozs7OztHQVFHO0FBQ0gsTUFBcUIsa0JBQWtCO0lBQXZDO1FBT1Usb0JBQWUsR0FBWSxLQUFLLENBQUM7UUFDakMsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBZ0MsQ0FBQztRQUs1RCxrQkFBYSxHQUFXLEVBQUUsQ0FBQztRQTh3QjNCLG9CQUFlLEdBQTBCLENBQU8sS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BFLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFO2dCQUMxQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQzthQUM5QztRQUNILENBQUMsQ0FBQSxDQUFBO1FBRVMsMkJBQXNCLEdBQTBCLENBQU8sS0FBSyxFQUFFLENBQUMsRUFB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aUIsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRDs7OztPQUlHO0lBQ08sd0JBQXdCLENBQUMsU0FBaUI7UUFDbEQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsa0ZBQWtGO0lBQ3hFLHlCQUF5QjtRQUNqQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7O09BR0c7SUFDTyxrQkFBa0IsQ0FBQyxNQUFjLEVBQUUsWUFBb0I7UUFDL0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ08sb0NBQW9DO1FBQzVDLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVPLGdCQUFnQixDQUN0QixNQUFvQixFQUFFLE9BQVU7UUFFaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEQsT0FBTyxRQUFRLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7Q0FvQkY7QUE3eUJELHFDQTZ5QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjcCBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGxzIGZyb20gJy4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0ICogYXMgcnBjIGZyb20gJ3ZzY29kZS1qc29ucnBjJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBhdG9tSWRlIGZyb20gJ2F0b20taWRlJztcbmltcG9ydCAqIGFzIGxpbnRlciBmcm9tICdhdG9tL2xpbnRlcic7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuL2NvbnZlcnQuanMnO1xuaW1wb3J0IEFwcGx5RWRpdEFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9hcHBseS1lZGl0LWFkYXB0ZXInO1xuaW1wb3J0IEF1dG9jb21wbGV0ZUFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9hdXRvY29tcGxldGUtYWRhcHRlcic7XG5pbXBvcnQgQ29kZUFjdGlvbkFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9jb2RlLWFjdGlvbi1hZGFwdGVyJztcbmltcG9ydCBDb2RlRm9ybWF0QWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2NvZGUtZm9ybWF0LWFkYXB0ZXInO1xuaW1wb3J0IENvZGVIaWdobGlnaHRBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvY29kZS1oaWdobGlnaHQtYWRhcHRlcic7XG5pbXBvcnQgRGF0YXRpcEFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9kYXRhdGlwLWFkYXB0ZXInO1xuaW1wb3J0IERlZmluaXRpb25BZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvZGVmaW5pdGlvbi1hZGFwdGVyJztcbmltcG9ydCBEb2N1bWVudFN5bmNBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvZG9jdW1lbnQtc3luYy1hZGFwdGVyJztcbmltcG9ydCBGaW5kUmVmZXJlbmNlc0FkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9maW5kLXJlZmVyZW5jZXMtYWRhcHRlcic7XG5pbXBvcnQgTGludGVyUHVzaFYyQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2xpbnRlci1wdXNoLXYyLWFkYXB0ZXInO1xuaW1wb3J0IExvZ2dpbmdDb25zb2xlQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2xvZ2dpbmctY29uc29sZS1hZGFwdGVyJztcbmltcG9ydCBOb3RpZmljYXRpb25zQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL25vdGlmaWNhdGlvbnMtYWRhcHRlcic7XG5pbXBvcnQgT3V0bGluZVZpZXdBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvb3V0bGluZS12aWV3LWFkYXB0ZXInO1xuaW1wb3J0IFJlbmFtZUFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9yZW5hbWUtYWRhcHRlcic7XG5pbXBvcnQgU2lnbmF0dXJlSGVscEFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9zaWduYXR1cmUtaGVscC1hZGFwdGVyJztcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSAnbmV0JztcbmltcG9ydCB7IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiB9IGZyb20gJy4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IHtcbiAgQ29uc29sZUxvZ2dlcixcbiAgRmlsdGVyZWRMb2dnZXIsXG4gIExvZ2dlcixcbn0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHtcbiAgTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzLFxuICBTZXJ2ZXJNYW5hZ2VyLFxuICBBY3RpdmVTZXJ2ZXIsXG59IGZyb20gJy4vc2VydmVyLW1hbmFnZXIuanMnO1xuaW1wb3J0IHtcbiAgRGlzcG9zYWJsZSxcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgUG9pbnQsXG4gIFJhbmdlLFxuICBUZXh0RWRpdG9yLFxufSBmcm9tICdhdG9tJztcbmltcG9ydCAqIGFzIGFjIGZyb20gJ2F0b20vYXV0b2NvbXBsZXRlLXBsdXMnO1xuXG5leHBvcnQgeyBBY3RpdmVTZXJ2ZXIsIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiwgTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzIH07XG5leHBvcnQgdHlwZSBDb25uZWN0aW9uVHlwZSA9ICdzdGRpbycgfCAnc29ja2V0JyB8ICdpcGMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlckFkYXB0ZXJzIHtcbiAgbGludGVyUHVzaFYyOiBMaW50ZXJQdXNoVjJBZGFwdGVyO1xuICBsb2dnaW5nQ29uc29sZTogTG9nZ2luZ0NvbnNvbGVBZGFwdGVyO1xuICBzaWduYXR1cmVIZWxwQWRhcHRlcj86IFNpZ25hdHVyZUhlbHBBZGFwdGVyO1xufVxuXG4vKipcbiAqIFB1YmxpYzogQXV0b0xhbmd1YWdlQ2xpZW50IHByb3ZpZGVzIGEgc2ltcGxlIHdheSB0byBoYXZlIGFsbCB0aGUgc3VwcG9ydGVkXG4gKiBBdG9tLUlERSBzZXJ2aWNlcyB3aXJlZCB1cCBlbnRpcmVseSBmb3IgeW91IGJ5IGp1c3Qgc3ViY2xhc3NpbmcgaXQgYW5kXG4gKiBpbXBsZW1lbnRpbmcgYXQgbGVhc3RcbiAqIC0gYHN0YXJ0U2VydmVyUHJvY2Vzc2BcbiAqIC0gYGdldEdyYW1tYXJTY29wZXNgXG4gKiAtIGBnZXRMYW5ndWFnZU5hbWVgXG4gKiAtIGBnZXRTZXJ2ZXJOYW1lYFxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBdXRvTGFuZ3VhZ2VDbGllbnQge1xuICBwcml2YXRlIF9kaXNwb3NhYmxlITogQ29tcG9zaXRlRGlzcG9zYWJsZTtcbiAgcHJpdmF0ZSBfc2VydmVyTWFuYWdlciE6IFNlcnZlck1hbmFnZXI7XG4gIHByaXZhdGUgX2NvbnNvbGVEZWxlZ2F0ZT86IGF0b21JZGUuQ29uc29sZVNlcnZpY2U7XG4gIHByaXZhdGUgX2xpbnRlckRlbGVnYXRlPzogbGludGVyLkluZGllRGVsZWdhdGU7XG4gIHByaXZhdGUgX3NpZ25hdHVyZUhlbHBSZWdpc3RyeT86IGF0b21JZGUuU2lnbmF0dXJlSGVscFJlZ2lzdHJ5O1xuICBwcml2YXRlIF9sYXN0QXV0b2NvbXBsZXRlUmVxdWVzdD86IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQ7XG4gIHByaXZhdGUgX2lzRGVhY3RpdmF0aW5nOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgX3NlcnZlckFkYXB0ZXJzID0gbmV3IFdlYWtNYXA8QWN0aXZlU2VydmVyLCBTZXJ2ZXJBZGFwdGVycz4oKTtcblxuICAvKiogQXZhaWxhYmxlIGlmIGNvbnN1bWVCdXN5U2lnbmFsIGlzIHNldHVwICovXG4gIHByb3RlY3RlZCBidXN5U2lnbmFsU2VydmljZT86IGF0b21JZGUuQnVzeVNpZ25hbFNlcnZpY2U7XG5cbiAgcHJvdGVjdGVkIHByb2Nlc3NTdGRFcnI6IHN0cmluZyA9ICcnO1xuICBwcm90ZWN0ZWQgbG9nZ2VyITogTG9nZ2VyO1xuICBwcm90ZWN0ZWQgbmFtZSE6IHN0cmluZztcbiAgcHJvdGVjdGVkIHNvY2tldCE6IFNvY2tldDtcblxuICAvLyBTaGFyZWQgYWRhcHRlcnMgdGhhdCBjYW4gdGFrZSB0aGUgUlBDIGNvbm5lY3Rpb24gYXMgcmVxdWlyZWRcbiAgcHJvdGVjdGVkIGF1dG9Db21wbGV0ZT86IEF1dG9jb21wbGV0ZUFkYXB0ZXI7XG4gIHByb3RlY3RlZCBkYXRhdGlwPzogRGF0YXRpcEFkYXB0ZXI7XG4gIHByb3RlY3RlZCBkZWZpbml0aW9ucz86IERlZmluaXRpb25BZGFwdGVyO1xuICBwcm90ZWN0ZWQgZmluZFJlZmVyZW5jZXM/OiBGaW5kUmVmZXJlbmNlc0FkYXB0ZXI7XG4gIHByb3RlY3RlZCBvdXRsaW5lVmlldz86IE91dGxpbmVWaWV3QWRhcHRlcjtcblxuICAvLyBZb3UgbXVzdCBpbXBsZW1lbnQgdGhlc2Ugc28gd2Uga25vdyBob3cgdG8gZGVhbCB3aXRoIHlvdXIgbGFuZ3VhZ2UgYW5kIHNlcnZlclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqIFJldHVybiBhbiBhcnJheSBvZiB0aGUgZ3JhbW1hciBzY29wZXMgeW91IGhhbmRsZSwgZS5nLiBbICdzb3VyY2UuanMnIF0gKi9cbiAgcHJvdGVjdGVkIGdldEdyYW1tYXJTY29wZXMoKTogc3RyaW5nW10ge1xuICAgIHRocm93IEVycm9yKCdNdXN0IGltcGxlbWVudCBnZXRHcmFtbWFyU2NvcGVzIHdoZW4gZXh0ZW5kaW5nIEF1dG9MYW5ndWFnZUNsaWVudCcpO1xuICB9XG5cbiAgLyoqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgbGFuZ3VhZ2UgeW91IHN1cHBvcnQsIGUuZy4gJ0phdmFTY3JpcHQnICovXG4gIHByb3RlY3RlZCBnZXRMYW5ndWFnZU5hbWUoKTogc3RyaW5nIHtcbiAgICB0aHJvdyBFcnJvcignTXVzdCBpbXBsZW1lbnQgZ2V0TGFuZ3VhZ2VOYW1lIHdoZW4gZXh0ZW5kaW5nIEF1dG9MYW5ndWFnZUNsaWVudCcpO1xuICB9XG5cbiAgLyoqIFJldHVybiB0aGUgbmFtZSBvZiB5b3VyIHNlcnZlciwgZS5nLiAnRWNsaXBzZSBKRFQnICovXG4gIHByb3RlY3RlZCBnZXRTZXJ2ZXJOYW1lKCk6IHN0cmluZyB7XG4gICAgdGhyb3cgRXJyb3IoJ011c3QgaW1wbGVtZW50IGdldFNlcnZlck5hbWUgd2hlbiBleHRlbmRpbmcgQXV0b0xhbmd1YWdlQ2xpZW50Jyk7XG4gIH1cblxuICAvKiogU3RhcnQgeW91ciBzZXJ2ZXIgcHJvY2VzcyAqL1xuICBwcm90ZWN0ZWQgc3RhcnRTZXJ2ZXJQcm9jZXNzKF9wcm9qZWN0UGF0aDogc3RyaW5nKTogTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzIHwgUHJvbWlzZTxMYW5ndWFnZVNlcnZlclByb2Nlc3M+IHtcbiAgICB0aHJvdyBFcnJvcignTXVzdCBvdmVycmlkZSBzdGFydFNlcnZlclByb2Nlc3MgdG8gc3RhcnQgbGFuZ3VhZ2Ugc2VydmVyIHByb2Nlc3Mgd2hlbiBleHRlbmRpbmcgQXV0b0xhbmd1YWdlQ2xpZW50Jyk7XG4gIH1cblxuICAvLyBZb3UgbWlnaHQgd2FudCB0byBvdmVycmlkZSB0aGVzZSBmb3IgZGlmZmVyZW50IGJlaGF2aW9yXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKiAoT3B0aW9uYWwpIERldGVybWluZSB3aGV0aGVyIHdlIHNob3VsZCBzdGFydCBhIHNlcnZlciBmb3IgYSBnaXZlbiBlZGl0b3IgaWYgd2UgZG9uJ3QgaGF2ZSBvbmUgeWV0ICovXG4gIHByb3RlY3RlZCBzaG91bGRTdGFydEZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCkuaW5jbHVkZXMoZWRpdG9yLmdldEdyYW1tYXIoKS5zY29wZU5hbWUpO1xuICB9XG5cbiAgLyoqIChPcHRpb25hbCkgUmV0dXJuIHRoZSBwYXJhbWV0ZXJzIHVzZWQgdG8gaW5pdGlhbGl6ZSBhIGNsaWVudCAtIHlvdSBtYXkgd2FudCB0byBleHRlbmQgY2FwYWJpbGl0aWVzICovXG4gIHByb3RlY3RlZCBnZXRJbml0aWFsaXplUGFyYW1zKHByb2plY3RQYXRoOiBzdHJpbmcsIHByb2Nlc3M6IExhbmd1YWdlU2VydmVyUHJvY2Vzcyk6IGxzLkluaXRpYWxpemVQYXJhbXMge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9jZXNzSWQ6IHByb2Nlc3MucGlkLFxuICAgICAgcm9vdFBhdGg6IHByb2plY3RQYXRoLFxuICAgICAgcm9vdFVyaTogQ29udmVydC5wYXRoVG9VcmkocHJvamVjdFBhdGgpLFxuICAgICAgd29ya3NwYWNlRm9sZGVyczogW10sXG4gICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgd29ya3NwYWNlOiB7XG4gICAgICAgICAgYXBwbHlFZGl0OiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb246IGZhbHNlLFxuICAgICAgICAgIHdvcmtzcGFjZUVkaXQ6IHtcbiAgICAgICAgICAgIGRvY3VtZW50Q2hhbmdlczogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHdvcmtzcGFjZUZvbGRlcnM6IGZhbHNlLFxuICAgICAgICAgIGRpZENoYW5nZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN5bWJvbDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBleGVjdXRlQ29tbWFuZDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdGV4dERvY3VtZW50OiB7XG4gICAgICAgICAgc3luY2hyb25pemF0aW9uOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHdpbGxTYXZlOiB0cnVlLFxuICAgICAgICAgICAgd2lsbFNhdmVXYWl0VW50aWw6IHRydWUsXG4gICAgICAgICAgICBkaWRTYXZlOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29tcGxldGlvbjoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBjb21wbGV0aW9uSXRlbToge1xuICAgICAgICAgICAgICBzbmlwcGV0U3VwcG9ydDogdHJ1ZSxcbiAgICAgICAgICAgICAgY29tbWl0Q2hhcmFjdGVyc1N1cHBvcnQ6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRleHRTdXBwb3J0OiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2lnbmF0dXJlSGVscDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZWZlcmVuY2VzOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50SGlnaGxpZ2h0OiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50U3ltYm9sOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGhpZXJhcmNoaWNhbERvY3VtZW50U3ltYm9sU3VwcG9ydDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZvcm1hdHRpbmc6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmFuZ2VGb3JtYXR0aW5nOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uVHlwZUZvcm1hdHRpbmc6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGVmaW5pdGlvbjoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2RlQWN0aW9uOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZGVMZW5zOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50TGluazoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZW5hbWU6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBXZSBkbyBub3Qgc3VwcG9ydCB0aGVzZSBmZWF0dXJlcyB5ZXQuXG4gICAgICAgICAgLy8gTmVlZCB0byBzZXQgdG8gdW5kZWZpbmVkIHRvIGFwcGVhc2UgVHlwZVNjcmlwdCB3ZWFrIHR5cGUgZGV0ZWN0aW9uLlxuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZURlZmluaXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICBjb2xvclByb3ZpZGVyOiB1bmRlZmluZWQsXG4gICAgICAgICAgZm9sZGluZ1JhbmdlOiB1bmRlZmluZWQsXG4gICAgICAgIH0sXG4gICAgICAgIGV4cGVyaW1lbnRhbDoge30sXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKiogKE9wdGlvbmFsKSBFYXJseSB3aXJlLXVwIG9mIGxpc3RlbmVycyBiZWZvcmUgaW5pdGlhbGl6ZSBtZXRob2QgaXMgc2VudCAqL1xuICBwcm90ZWN0ZWQgcHJlSW5pdGlhbGl6YXRpb24oX2Nvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbik6IHZvaWQgeyB9XG5cbiAgLyoqIChPcHRpb25hbCkgTGF0ZSB3aXJlLXVwIG9mIGxpc3RlbmVycyBhZnRlciBpbml0aWFsaXplIG1ldGhvZCBoYXMgYmVlbiBzZW50ICovXG4gIHByb3RlY3RlZCBwb3N0SW5pdGlhbGl6YXRpb24oX3NlcnZlcjogQWN0aXZlU2VydmVyKTogdm9pZCB7IH1cblxuICAvKiogKE9wdGlvbmFsKSBEZXRlcm1pbmUgd2hldGhlciB0byB1c2UgaXBjLCBzdGRpbyBvciBzb2NrZXQgdG8gY29ubmVjdCB0byB0aGUgc2VydmVyICovXG4gIHByb3RlY3RlZCBnZXRDb25uZWN0aW9uVHlwZSgpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgcmV0dXJuIHRoaXMuc29ja2V0ICE9IG51bGwgPyAnc29ja2V0JyA6ICdzdGRpbyc7XG4gIH1cblxuICAvKiogKE9wdGlvbmFsKSBSZXR1cm4gdGhlIG5hbWUgb2YgeW91ciByb290IGNvbmZpZ3VyYXRpb24ga2V5ICovXG4gIHByb3RlY3RlZCBnZXRSb290Q29uZmlndXJhdGlvbktleSgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIC8qKiAoT3B0aW9uYWwpIFRyYW5zZm9ybSB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgYmVmb3JlIGl0IGlzIHNlbnQgdG8gdGhlIHNlcnZlciAqL1xuICBwcm90ZWN0ZWQgbWFwQ29uZmlndXJhdGlvbk9iamVjdChjb25maWd1cmF0aW9uOiBhbnkpOiBhbnkge1xuICAgIHJldHVybiBjb25maWd1cmF0aW9uO1xuICB9XG5cbiAgLy8gSGVscGVyIG1ldGhvZHMgdGhhdCBhcmUgdXNlZnVsIGZvciBpbXBsZW1lbnRvcnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqIEdldHMgYSBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24gZm9yIGEgZ2l2ZW4gVGV4dEVkaXRvciAqL1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0Q29ubmVjdGlvbkZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIHJldHVybiBzZXJ2ZXIgPyBzZXJ2ZXIuY29ubmVjdGlvbiA6IG51bGw7XG4gIH1cblxuICAvKiogUmVzdGFydCBhbGwgYWN0aXZlIGxhbmd1YWdlIHNlcnZlcnMgZm9yIHRoaXMgbGFuZ3VhZ2UgY2xpZW50IGluIHRoZSB3b3Jrc3BhY2UgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIHJlc3RhcnRBbGxTZXJ2ZXJzKCkge1xuICAgIGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIucmVzdGFydEFsbFNlcnZlcnMoKTtcbiAgfVxuXG4gIC8vIERlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIHJlc3Qgb2YgdGhlIEF1dG9MYW5ndWFnZUNsaWVudFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKiogQWN0aXZhdGUgZG9lcyB2ZXJ5IGxpdHRsZSBmb3IgcGVyZiByZWFzb25zIC0gaG9va3MgaW4gdmlhIFNlcnZlck1hbmFnZXIgZm9yIGxhdGVyICdhY3RpdmF0aW9uJyAqL1xuICBwdWJsaWMgYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgdGhpcy5fZGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gICAgdGhpcy5uYW1lID0gYCR7dGhpcy5nZXRMYW5ndWFnZU5hbWUoKX0gKCR7dGhpcy5nZXRTZXJ2ZXJOYW1lKCl9KWA7XG4gICAgdGhpcy5sb2dnZXIgPSB0aGlzLmdldExvZ2dlcigpO1xuICAgIHRoaXMuX3NlcnZlck1hbmFnZXIgPSBuZXcgU2VydmVyTWFuYWdlcihcbiAgICAgIChwKSA9PiB0aGlzLnN0YXJ0U2VydmVyKHApLFxuICAgICAgdGhpcy5sb2dnZXIsXG4gICAgICAoZSkgPT4gdGhpcy5zaG91bGRTdGFydEZvckVkaXRvcihlKSxcbiAgICAgIChmaWxlcGF0aCkgPT4gdGhpcy5maWx0ZXJDaGFuZ2VXYXRjaGVkRmlsZXMoZmlsZXBhdGgpLFxuICAgICAgdGhpcy5yZXBvcnRCdXN5V2hpbGUsXG4gICAgICB0aGlzLmdldFNlcnZlck5hbWUoKSxcbiAgICAgIHRoaXMuc2h1dGRvd25TZXJ2ZXJzR3JhY2VmdWxseSgpLFxuICAgICk7XG4gICAgdGhpcy5fc2VydmVyTWFuYWdlci5zdGFydExpc3RlbmluZygpO1xuICAgIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB0aGlzLmV4aXRDbGVhbnVwLmJpbmQodGhpcykpO1xuICB9XG5cbiAgcHJpdmF0ZSBleGl0Q2xlYW51cCgpOiB2b2lkIHtcbiAgICB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnRlcm1pbmF0ZSgpO1xuICB9XG5cbiAgLyoqIERlYWN0aXZhdGUgZGlzcG9zZXMgdGhlIHJlc291cmNlcyB3ZSdyZSB1c2luZyAqL1xuICBwdWJsaWMgYXN5bmMgZGVhY3RpdmF0ZSgpOiBQcm9taXNlPGFueT4ge1xuICAgIHRoaXMuX2lzRGVhY3RpdmF0aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnN0b3BBbGxTZXJ2ZXJzKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgc3Bhd25DaGlsZE5vZGUoYXJnczogc3RyaW5nW10sIG9wdGlvbnM6IGNwLlNwYXduT3B0aW9ucyA9IHt9KTogY3AuQ2hpbGRQcm9jZXNzIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1Zyhgc3RhcnRpbmcgY2hpbGQgTm9kZSBcIiR7YXJncy5qb2luKCcgJyl9XCJgKTtcbiAgICBvcHRpb25zLmVudiA9IG9wdGlvbnMuZW52IHx8IE9iamVjdC5jcmVhdGUocHJvY2Vzcy5lbnYpO1xuICAgIGlmIChvcHRpb25zLmVudikge1xuICAgICAgb3B0aW9ucy5lbnYuRUxFQ1RST05fUlVOX0FTX05PREUgPSAnMSc7XG4gICAgICBvcHRpb25zLmVudi5FTEVDVFJPTl9OT19BVFRBQ0hfQ09OU09MRSA9ICcxJztcbiAgICB9XG4gICAgcmV0dXJuIGNwLnNwYXduKHByb2Nlc3MuZXhlY1BhdGgsIGFyZ3MsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqIExTUCBsb2dnaW5nIGlzIG9ubHkgc2V0IGZvciB3YXJuaW5ncyAmIGVycm9ycyBieSBkZWZhdWx0IHVubGVzcyB5b3UgdHVybiBvbiB0aGUgY29yZS5kZWJ1Z0xTUCBzZXR0aW5nICovXG4gIHByb3RlY3RlZCBnZXRMb2dnZXIoKTogTG9nZ2VyIHtcbiAgICBjb25zdCBmaWx0ZXIgPSBhdG9tLmNvbmZpZy5nZXQoJ2NvcmUuZGVidWdMU1AnKVxuICAgICAgPyBGaWx0ZXJlZExvZ2dlci5EZXZlbG9wZXJMZXZlbEZpbHRlclxuICAgICAgOiBGaWx0ZXJlZExvZ2dlci5Vc2VyTGV2ZWxGaWx0ZXI7XG4gICAgcmV0dXJuIG5ldyBGaWx0ZXJlZExvZ2dlcihuZXcgQ29uc29sZUxvZ2dlcih0aGlzLm5hbWUpLCBmaWx0ZXIpO1xuICB9XG5cbiAgLyoqIFN0YXJ0cyB0aGUgc2VydmVyIGJ5IHN0YXJ0aW5nIHRoZSBwcm9jZXNzLCB0aGVuIGluaXRpYWxpemluZyB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGFuZCBzdGFydGluZyBhZGFwdGVycyAqL1xuICBwcml2YXRlIGFzeW5jIHN0YXJ0U2VydmVyKHByb2plY3RQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFjdGl2ZVNlcnZlcj4ge1xuICAgIGNvbnN0IHByb2Nlc3MgPSBhd2FpdCB0aGlzLnJlcG9ydEJ1c3lXaGlsZShcbiAgICAgIGBTdGFydGluZyAke3RoaXMuZ2V0U2VydmVyTmFtZSgpfSBmb3IgJHtwYXRoLmJhc2VuYW1lKHByb2plY3RQYXRoKX1gLFxuICAgICAgYXN5bmMgKCkgPT4gdGhpcy5zdGFydFNlcnZlclByb2Nlc3MocHJvamVjdFBhdGgpLFxuICAgICk7XG4gICAgdGhpcy5jYXB0dXJlU2VydmVyRXJyb3JzKHByb2Nlc3MsIHByb2plY3RQYXRoKTtcbiAgICBjb25zdCBjb25uZWN0aW9uID0gbmV3IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbih0aGlzLmNyZWF0ZVJwY0Nvbm5lY3Rpb24ocHJvY2VzcyksIHRoaXMubG9nZ2VyKTtcbiAgICB0aGlzLnByZUluaXRpYWxpemF0aW9uKGNvbm5lY3Rpb24pO1xuICAgIGNvbnN0IGluaXRpYWxpemVQYXJhbXMgPSB0aGlzLmdldEluaXRpYWxpemVQYXJhbXMocHJvamVjdFBhdGgsIHByb2Nlc3MpO1xuICAgIGNvbnN0IGluaXRpYWxpemF0aW9uID0gY29ubmVjdGlvbi5pbml0aWFsaXplKGluaXRpYWxpemVQYXJhbXMpO1xuICAgIHRoaXMucmVwb3J0QnVzeVdoaWxlKFxuICAgICAgYCR7dGhpcy5nZXRTZXJ2ZXJOYW1lKCl9IGluaXRpYWxpemluZyBmb3IgJHtwYXRoLmJhc2VuYW1lKHByb2plY3RQYXRoKX1gLFxuICAgICAgKCkgPT4gaW5pdGlhbGl6YXRpb24sXG4gICAgKTtcbiAgICBjb25zdCBpbml0aWFsaXplUmVzcG9uc2UgPSBhd2FpdCBpbml0aWFsaXphdGlvbjtcbiAgICBjb25zdCBuZXdTZXJ2ZXIgPSB7XG4gICAgICBwcm9qZWN0UGF0aCxcbiAgICAgIHByb2Nlc3MsXG4gICAgICBjb25uZWN0aW9uLFxuICAgICAgY2FwYWJpbGl0aWVzOiBpbml0aWFsaXplUmVzcG9uc2UuY2FwYWJpbGl0aWVzLFxuICAgICAgZGlzcG9zYWJsZTogbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKSxcbiAgICAgIGFkZGl0aW9uYWxQYXRoczogbmV3IFNldCgpLFxuICAgICAgY29uc2lkZXJEZWZpbml0aW9uUGF0aDogKGRlZlBhdGg6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoIWRlZlBhdGguc3RhcnRzV2l0aChwcm9qZWN0UGF0aCkpIHtcbiAgICAgICAgICBuZXdTZXJ2ZXIuYWRkaXRpb25hbFBhdGhzLmFkZChwYXRoLmRpcm5hbWUoZGVmUGF0aCkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH07XG4gICAgdGhpcy5wb3N0SW5pdGlhbGl6YXRpb24obmV3U2VydmVyKTtcbiAgICBjb25uZWN0aW9uLmluaXRpYWxpemVkKCk7XG4gICAgY29ubmVjdGlvbi5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuX2lzRGVhY3RpdmF0aW5nKSB7XG4gICAgICAgIHRoaXMuX3NlcnZlck1hbmFnZXIuc3RvcFNlcnZlcihuZXdTZXJ2ZXIpO1xuICAgICAgICBpZiAoIXRoaXMuX3NlcnZlck1hbmFnZXIuaGFzU2VydmVyUmVhY2hlZFJlc3RhcnRMaW1pdChuZXdTZXJ2ZXIpKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoYFJlc3RhcnRpbmcgbGFuZ3VhZ2Ugc2VydmVyIGZvciBwcm9qZWN0ICcke25ld1NlcnZlci5wcm9qZWN0UGF0aH0nYCk7XG4gICAgICAgICAgdGhpcy5fc2VydmVyTWFuYWdlci5zdGFydFNlcnZlcihwcm9qZWN0UGF0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgTGFuZ3VhZ2Ugc2VydmVyIGhhcyBleGNlZWRlZCBhdXRvLXJlc3RhcnQgbGltaXQgZm9yIHByb2plY3QgJyR7bmV3U2VydmVyLnByb2plY3RQYXRofSdgKTtcbiAgICAgICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoXG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgICBgVGhlICR7dGhpcy5uYW1lfSBsYW5ndWFnZSBzZXJ2ZXIgaGFzIGV4aXRlZCBhbmQgZXhjZWVkZWQgdGhlIHJlc3RhcnQgbGltaXQgZm9yIHByb2plY3QgJyR7bmV3U2VydmVyLnByb2plY3RQYXRofSdgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgY29uZmlndXJhdGlvbktleSA9IHRoaXMuZ2V0Um9vdENvbmZpZ3VyYXRpb25LZXkoKTtcbiAgICBpZiAoY29uZmlndXJhdGlvbktleSkge1xuICAgICAgbmV3U2VydmVyLmRpc3Bvc2FibGUuYWRkKFxuICAgICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKGNvbmZpZ3VyYXRpb25LZXksIChjb25maWcpID0+IHtcbiAgICAgICAgICBjb25zdCBtYXBwZWRDb25maWcgPSB0aGlzLm1hcENvbmZpZ3VyYXRpb25PYmplY3QoY29uZmlnIHx8IHt9KTtcbiAgICAgICAgICBpZiAobWFwcGVkQ29uZmlnKSB7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmRpZENoYW5nZUNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgICAgICBzZXR0aW5nczogbWFwcGVkQ29uZmlnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGFydEV4Y2x1c2l2ZUFkYXB0ZXJzKG5ld1NlcnZlcik7XG4gICAgcmV0dXJuIG5ld1NlcnZlcjtcbiAgfVxuXG4gIHByaXZhdGUgY2FwdHVyZVNlcnZlckVycm9ycyhjaGlsZFByb2Nlc3M6IExhbmd1YWdlU2VydmVyUHJvY2VzcywgcHJvamVjdFBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIGNoaWxkUHJvY2Vzcy5vbignZXJyb3InLCAoZXJyKSA9PiB0aGlzLmhhbmRsZVNwYXduRmFpbHVyZShlcnIpKTtcbiAgICBjaGlsZFByb2Nlc3Mub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB0aGlzLmxvZ2dlci5kZWJ1ZyhgZXhpdDogY29kZSAke2NvZGV9IHNpZ25hbCAke3NpZ25hbH1gKSk7XG4gICAgY2hpbGRQcm9jZXNzLnN0ZGVyci5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgIGNoaWxkUHJvY2Vzcy5zdGRlcnIub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgY29uc3QgZXJyb3JTdHJpbmcgPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgdGhpcy5oYW5kbGVTZXJ2ZXJTdGRlcnIoZXJyb3JTdHJpbmcsIHByb2plY3RQYXRoKTtcbiAgICAgIC8vIEtlZXAgdGhlIGxhc3QgNSBsaW5lcyBmb3IgcGFja2FnZXMgdG8gdXNlIGluIG1lc3NhZ2VzXG4gICAgICB0aGlzLnByb2Nlc3NTdGRFcnIgPSAodGhpcy5wcm9jZXNzU3RkRXJyICsgZXJyb3JTdHJpbmcpXG4gICAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgICAgLnNsaWNlKC01KVxuICAgICAgICAuam9pbignXFxuJyk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZVNwYXduRmFpbHVyZShlcnI6IGFueSk6IHZvaWQge1xuICAgIGF0b20ubm90aWZpY2F0aW9ucy5hZGRFcnJvcihcbiAgICAgIGAke3RoaXMuZ2V0U2VydmVyTmFtZSgpfSBsYW5ndWFnZSBzZXJ2ZXIgZm9yICR7dGhpcy5nZXRMYW5ndWFnZU5hbWUoKX0gdW5hYmxlIHRvIHN0YXJ0YCxcbiAgICAgIHtcbiAgICAgICAgZGlzbWlzc2FibGU6IHRydWUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBlcnIudG9TdHJpbmcoKSxcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBDcmVhdGVzIHRoZSBSUEMgY29ubmVjdGlvbiB3aGljaCBjYW4gYmUgaXBjLCBzb2NrZXQgb3Igc3RkaW8gKi9cbiAgcHJpdmF0ZSBjcmVhdGVScGNDb25uZWN0aW9uKHByb2Nlc3M6IExhbmd1YWdlU2VydmVyUHJvY2Vzcyk6IHJwYy5NZXNzYWdlQ29ubmVjdGlvbiB7XG4gICAgbGV0IHJlYWRlcjogcnBjLk1lc3NhZ2VSZWFkZXI7XG4gICAgbGV0IHdyaXRlcjogcnBjLk1lc3NhZ2VXcml0ZXI7XG4gICAgY29uc3QgY29ubmVjdGlvblR5cGUgPSB0aGlzLmdldENvbm5lY3Rpb25UeXBlKCk7XG4gICAgc3dpdGNoIChjb25uZWN0aW9uVHlwZSkge1xuICAgICAgY2FzZSAnaXBjJzpcbiAgICAgICAgcmVhZGVyID0gbmV3IHJwYy5JUENNZXNzYWdlUmVhZGVyKHByb2Nlc3MgYXMgY3AuQ2hpbGRQcm9jZXNzKTtcbiAgICAgICAgd3JpdGVyID0gbmV3IHJwYy5JUENNZXNzYWdlV3JpdGVyKHByb2Nlc3MgYXMgY3AuQ2hpbGRQcm9jZXNzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzb2NrZXQnOlxuICAgICAgICByZWFkZXIgPSBuZXcgcnBjLlNvY2tldE1lc3NhZ2VSZWFkZXIodGhpcy5zb2NrZXQpO1xuICAgICAgICB3cml0ZXIgPSBuZXcgcnBjLlNvY2tldE1lc3NhZ2VXcml0ZXIodGhpcy5zb2NrZXQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3N0ZGlvJzpcbiAgICAgICAgcmVhZGVyID0gbmV3IHJwYy5TdHJlYW1NZXNzYWdlUmVhZGVyKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICAgICAgd3JpdGVyID0gbmV3IHJwYy5TdHJlYW1NZXNzYWdlV3JpdGVyKHByb2Nlc3Muc3RkaW4pO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBVdGlscy5hc3NlcnRVbnJlYWNoYWJsZShjb25uZWN0aW9uVHlwZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJwYy5jcmVhdGVNZXNzYWdlQ29ubmVjdGlvbihyZWFkZXIsIHdyaXRlciwge1xuICAgICAgbG9nOiAoLi4uX2FyZ3M6IGFueVtdKSA9PiB7IH0sXG4gICAgICB3YXJuOiAoLi4uX2FyZ3M6IGFueVtdKSA9PiB7IH0sXG4gICAgICBpbmZvOiAoLi4uX2FyZ3M6IGFueVtdKSA9PiB7IH0sXG4gICAgICBlcnJvcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGFyZ3MpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBTdGFydCBhZGFwdGVycyB0aGF0IGFyZSBub3Qgc2hhcmVkIGJldHdlZW4gc2VydmVycyAqL1xuICBwcml2YXRlIHN0YXJ0RXhjbHVzaXZlQWRhcHRlcnMoc2VydmVyOiBBY3RpdmVTZXJ2ZXIpOiB2b2lkIHtcbiAgICBBcHBseUVkaXRBZGFwdGVyLmF0dGFjaChzZXJ2ZXIuY29ubmVjdGlvbik7XG4gICAgTm90aWZpY2F0aW9uc0FkYXB0ZXIuYXR0YWNoKHNlcnZlci5jb25uZWN0aW9uLCB0aGlzLm5hbWUsIHNlcnZlci5wcm9qZWN0UGF0aCk7XG5cbiAgICBpZiAoRG9jdW1lbnRTeW5jQWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgY29uc3QgZG9jU3luY0FkYXB0ZXIgPVxuICAgICAgICBuZXcgRG9jdW1lbnRTeW5jQWRhcHRlcihcbiAgICAgICAgICBzZXJ2ZXIuY29ubmVjdGlvbixcbiAgICAgICAgICAoZWRpdG9yKSA9PiB0aGlzLnNob3VsZFN5bmNGb3JFZGl0b3IoZWRpdG9yLCBzZXJ2ZXIucHJvamVjdFBhdGgpLFxuICAgICAgICAgIHNlcnZlci5jYXBhYmlsaXRpZXMudGV4dERvY3VtZW50U3luYyxcbiAgICAgICAgICB0aGlzLnJlcG9ydEJ1c3lXaGlsZSxcbiAgICAgICAgKTtcbiAgICAgIHNlcnZlci5kaXNwb3NhYmxlLmFkZChkb2NTeW5jQWRhcHRlcik7XG4gICAgfVxuXG4gICAgY29uc3QgbGludGVyUHVzaFYyID0gbmV3IExpbnRlclB1c2hWMkFkYXB0ZXIoc2VydmVyLmNvbm5lY3Rpb24pO1xuICAgIGlmICh0aGlzLl9saW50ZXJEZWxlZ2F0ZSAhPSBudWxsKSB7XG4gICAgICBsaW50ZXJQdXNoVjIuYXR0YWNoKHRoaXMuX2xpbnRlckRlbGVnYXRlKTtcbiAgICB9XG4gICAgc2VydmVyLmRpc3Bvc2FibGUuYWRkKGxpbnRlclB1c2hWMik7XG5cbiAgICBjb25zdCBsb2dnaW5nQ29uc29sZSA9IG5ldyBMb2dnaW5nQ29uc29sZUFkYXB0ZXIoc2VydmVyLmNvbm5lY3Rpb24pO1xuICAgIGlmICh0aGlzLl9jb25zb2xlRGVsZWdhdGUgIT0gbnVsbCkge1xuICAgICAgbG9nZ2luZ0NvbnNvbGUuYXR0YWNoKHRoaXMuX2NvbnNvbGVEZWxlZ2F0ZSh7IGlkOiB0aGlzLm5hbWUsIG5hbWU6IHRoaXMuZ2V0TGFuZ3VhZ2VOYW1lKCkgfSkpO1xuICAgIH1cbiAgICBzZXJ2ZXIuZGlzcG9zYWJsZS5hZGQobG9nZ2luZ0NvbnNvbGUpO1xuXG4gICAgbGV0IHNpZ25hdHVyZUhlbHBBZGFwdGVyOiBTaWduYXR1cmVIZWxwQWRhcHRlciB8IHVuZGVmaW5lZDtcbiAgICBpZiAoU2lnbmF0dXJlSGVscEFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHNpZ25hdHVyZUhlbHBBZGFwdGVyID0gbmV3IFNpZ25hdHVyZUhlbHBBZGFwdGVyKHNlcnZlciwgdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCkpO1xuICAgICAgaWYgKHRoaXMuX3NpZ25hdHVyZUhlbHBSZWdpc3RyeSAhPSBudWxsKSB7XG4gICAgICAgIHNpZ25hdHVyZUhlbHBBZGFwdGVyLmF0dGFjaCh0aGlzLl9zaWduYXR1cmVIZWxwUmVnaXN0cnkpO1xuICAgICAgfVxuICAgICAgc2VydmVyLmRpc3Bvc2FibGUuYWRkKHNpZ25hdHVyZUhlbHBBZGFwdGVyKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZXJ2ZXJBZGFwdGVycy5zZXQoc2VydmVyLCB7XG4gICAgICBsaW50ZXJQdXNoVjIsIGxvZ2dpbmdDb25zb2xlLCBzaWduYXR1cmVIZWxwQWRhcHRlcixcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBzaG91bGRTeW5jRm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvciwgcHJvamVjdFBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzRmlsZUluUHJvamVjdChlZGl0b3IsIHByb2plY3RQYXRoKSAmJiB0aGlzLnNob3VsZFN0YXJ0Rm9yRWRpdG9yKGVkaXRvcik7XG4gIH1cblxuICBwcm90ZWN0ZWQgaXNGaWxlSW5Qcm9qZWN0KGVkaXRvcjogVGV4dEVkaXRvciwgcHJvamVjdFBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoZWRpdG9yLmdldFBhdGgoKSB8fCAnJykuc3RhcnRzV2l0aChwcm9qZWN0UGF0aCk7XG4gIH1cblxuICAvLyBBdXRvY29tcGxldGUrIHZpYSBMUyBjb21wbGV0aW9uLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHB1YmxpYyBwcm92aWRlQXV0b2NvbXBsZXRlKCk6IGFjLkF1dG9jb21wbGV0ZVByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2VsZWN0b3I6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpXG4gICAgICAgIC5tYXAoKGcpID0+IGcuaW5jbHVkZXMoJy4nKSA/ICcuJyArIGcgOiBnKVxuICAgICAgICAuam9pbignLCAnKSxcbiAgICAgIGluY2x1c2lvblByaW9yaXR5OiAxLFxuICAgICAgc3VnZ2VzdGlvblByaW9yaXR5OiAyLFxuICAgICAgZXhjbHVkZUxvd2VyUHJpb3JpdHk6IGZhbHNlLFxuICAgICAgZ2V0U3VnZ2VzdGlvbnM6IHRoaXMuZ2V0U3VnZ2VzdGlvbnMuYmluZCh0aGlzKSxcbiAgICAgIG9uRGlkSW5zZXJ0U3VnZ2VzdGlvbjogdGhpcy5vbkRpZEluc2VydFN1Z2dlc3Rpb24uYmluZCh0aGlzKSxcbiAgICAgIGdldFN1Z2dlc3Rpb25EZXRhaWxzT25TZWxlY3Q6IHRoaXMuZ2V0U3VnZ2VzdGlvbkRldGFpbHNPblNlbGVjdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0U3VnZ2VzdGlvbnMoXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgKTogUHJvbWlzZTxhYy5BbnlTdWdnZXN0aW9uW10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihyZXF1ZXN0LmVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFBdXRvY29tcGxldGVBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgdGhpcy5hdXRvQ29tcGxldGUgPSB0aGlzLmF1dG9Db21wbGV0ZSB8fCBuZXcgQXV0b2NvbXBsZXRlQWRhcHRlcigpO1xuICAgIHRoaXMuX2xhc3RBdXRvY29tcGxldGVSZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gdGhpcy5hdXRvQ29tcGxldGUuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCByZXF1ZXN0LCB0aGlzLm9uRGlkQ29udmVydEF1dG9jb21wbGV0ZSxcbiAgICAgIGF0b20uY29uZmlnLmdldCgnYXV0b2NvbXBsZXRlLXBsdXMubWluaW11bVdvcmRMZW5ndGgnKSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0U3VnZ2VzdGlvbkRldGFpbHNPblNlbGVjdChcbiAgICBzdWdnZXN0aW9uOiBhYy5BbnlTdWdnZXN0aW9uLFxuICApOiBQcm9taXNlPGFjLkFueVN1Z2dlc3Rpb24gfCBudWxsPiB7XG4gICAgY29uc3QgcmVxdWVzdCA9IHRoaXMuX2xhc3RBdXRvY29tcGxldGVSZXF1ZXN0O1xuICAgIGlmIChyZXF1ZXN0ID09IG51bGwpIHsgcmV0dXJuIG51bGw7IH1cbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihyZXF1ZXN0LmVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFBdXRvY29tcGxldGVBZGFwdGVyLmNhblJlc29sdmUoc2VydmVyLmNhcGFiaWxpdGllcykgfHwgdGhpcy5hdXRvQ29tcGxldGUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYXV0b0NvbXBsZXRlLmNvbXBsZXRlU3VnZ2VzdGlvbihzZXJ2ZXIsIHN1Z2dlc3Rpb24sIHJlcXVlc3QsIHRoaXMub25EaWRDb252ZXJ0QXV0b2NvbXBsZXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBvbkRpZENvbnZlcnRBdXRvY29tcGxldGUoXG4gICAgX2NvbXBsZXRpb25JdGVtOiBscy5Db21wbGV0aW9uSXRlbSxcbiAgICBfc3VnZ2VzdGlvbjogYWMuQW55U3VnZ2VzdGlvbixcbiAgICBfcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgKTogdm9pZCB7XG4gIH1cblxuICBwcm90ZWN0ZWQgb25EaWRJbnNlcnRTdWdnZXN0aW9uKF9hcmc6IGFjLlN1Z2dlc3Rpb25JbnNlcnRlZEV2ZW50KTogdm9pZCB7IH1cblxuICAvLyBEZWZpbml0aW9ucyB2aWEgTFMgZG9jdW1lbnRIaWdobGlnaHQgYW5kIGdvdG9EZWZpbml0aW9uLS0tLS0tLS0tLS0tXG4gIHB1YmxpYyBwcm92aWRlRGVmaW5pdGlvbnMoKTogYXRvbUlkZS5EZWZpbml0aW9uUHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICBwcmlvcml0eTogMjAsXG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIGdldERlZmluaXRpb246IHRoaXMuZ2V0RGVmaW5pdGlvbi5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0RGVmaW5pdGlvbihlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50OiBQb2ludCk6IFByb21pc2U8YXRvbUlkZS5EZWZpbml0aW9uUXVlcnlSZXN1bHQgfCBudWxsPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIURlZmluaXRpb25BZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmRlZmluaXRpb25zID0gdGhpcy5kZWZpbml0aW9ucyB8fCBuZXcgRGVmaW5pdGlvbkFkYXB0ZXIoKTtcbiAgICBjb25zdCBxdWVyeVByb21pc2UgPSB0aGlzLmRlZmluaXRpb25zLmdldERlZmluaXRpb24oXG4gICAgICBzZXJ2ZXIuY29ubmVjdGlvbixcbiAgICAgIHNlcnZlci5jYXBhYmlsaXRpZXMsXG4gICAgICB0aGlzLmdldExhbmd1YWdlTmFtZSgpLFxuICAgICAgZWRpdG9yLFxuICAgICAgcG9pbnQsXG4gICAgKTtcblxuICAgIGlmICh0aGlzLnNlcnZlcnNTdXBwb3J0RGVmaW5pdGlvbkRlc3RpbmF0aW9ucygpKSB7XG4gICAgICBxdWVyeVByb21pc2UudGhlbigocXVlcnkpID0+IHtcbiAgICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgICAgZm9yIChjb25zdCBkZWYgb2YgcXVlcnkuZGVmaW5pdGlvbnMpIHtcbiAgICAgICAgICAgIHNlcnZlci5jb25zaWRlckRlZmluaXRpb25QYXRoKGRlZi5wYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBxdWVyeVByb21pc2U7XG4gIH1cblxuICAvLyBPdXRsaW5lIFZpZXcgdmlhIExTIGRvY3VtZW50U3ltYm9sLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHB1YmxpYyBwcm92aWRlT3V0bGluZXMoKTogYXRvbUlkZS5PdXRsaW5lUHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgZ2V0T3V0bGluZTogdGhpcy5nZXRPdXRsaW5lLmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRPdXRsaW5lKGVkaXRvcjogVGV4dEVkaXRvcik6IFByb21pc2U8YXRvbUlkZS5PdXRsaW5lIHwgbnVsbD4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFPdXRsaW5lVmlld0FkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHRoaXMub3V0bGluZVZpZXcgPSB0aGlzLm91dGxpbmVWaWV3IHx8IG5ldyBPdXRsaW5lVmlld0FkYXB0ZXIoKTtcbiAgICByZXR1cm4gdGhpcy5vdXRsaW5lVmlldy5nZXRPdXRsaW5lKHNlcnZlci5jb25uZWN0aW9uLCBlZGl0b3IpO1xuICB9XG5cbiAgLy8gTGludGVyIHB1c2ggdjIgQVBJIHZpYSBMUyBwdWJsaXNoRGlhZ25vc3RpY3NcbiAgcHVibGljIGNvbnN1bWVMaW50ZXJWMihyZWdpc3RlckluZGllOiAocGFyYW1zOiB7IG5hbWU6IHN0cmluZyB9KSA9PiBsaW50ZXIuSW5kaWVEZWxlZ2F0ZSk6IHZvaWQge1xuICAgIHRoaXMuX2xpbnRlckRlbGVnYXRlID0gcmVnaXN0ZXJJbmRpZSh7IG5hbWU6IHRoaXMubmFtZSB9KTtcbiAgICBpZiAodGhpcy5fbGludGVyRGVsZWdhdGUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qgc2VydmVyIG9mIHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0QWN0aXZlU2VydmVycygpKSB7XG4gICAgICBjb25zdCBsaW50ZXJQdXNoVjIgPSB0aGlzLmdldFNlcnZlckFkYXB0ZXIoc2VydmVyLCAnbGludGVyUHVzaFYyJyk7XG4gICAgICBpZiAobGludGVyUHVzaFYyICE9IG51bGwpIHtcbiAgICAgICAgbGludGVyUHVzaFYyLmF0dGFjaCh0aGlzLl9saW50ZXJEZWxlZ2F0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gRmluZCBSZWZlcmVuY2VzIHZpYSBMUyBmaW5kUmVmZXJlbmNlcy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZUZpbmRSZWZlcmVuY2VzKCk6IGF0b21JZGUuRmluZFJlZmVyZW5jZXNQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlzRWRpdG9yU3VwcG9ydGVkOiAoZWRpdG9yOiBUZXh0RWRpdG9yKSA9PiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKS5pbmNsdWRlcyhlZGl0b3IuZ2V0R3JhbW1hcigpLnNjb3BlTmFtZSksXG4gICAgICBmaW5kUmVmZXJlbmNlczogdGhpcy5nZXRSZWZlcmVuY2VzLmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRSZWZlcmVuY2VzKGVkaXRvcjogVGV4dEVkaXRvciwgcG9pbnQ6IFBvaW50KTogUHJvbWlzZTxhdG9tSWRlLkZpbmRSZWZlcmVuY2VzUmV0dXJuIHwgbnVsbD4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFGaW5kUmVmZXJlbmNlc0FkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuZmluZFJlZmVyZW5jZXMgPSB0aGlzLmZpbmRSZWZlcmVuY2VzIHx8IG5ldyBGaW5kUmVmZXJlbmNlc0FkYXB0ZXIoKTtcbiAgICByZXR1cm4gdGhpcy5maW5kUmVmZXJlbmNlcy5nZXRSZWZlcmVuY2VzKHNlcnZlci5jb25uZWN0aW9uLCBlZGl0b3IsIHBvaW50LCBzZXJ2ZXIucHJvamVjdFBhdGgpO1xuICB9XG5cbiAgLy8gRGF0YXRpcCB2aWEgTFMgdGV4dERvY3VtZW50L2hvdmVyLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgY29uc3VtZURhdGF0aXAoc2VydmljZTogYXRvbUlkZS5EYXRhdGlwU2VydmljZSk6IHZvaWQge1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKFxuICAgICAgc2VydmljZS5hZGRQcm92aWRlcih7XG4gICAgICAgIHByb3ZpZGVyTmFtZTogdGhpcy5uYW1lLFxuICAgICAgICBwcmlvcml0eTogMSxcbiAgICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICAgIHZhbGlkRm9yU2NvcGU6IChzY29wZU5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKS5pbmNsdWRlcyhzY29wZU5hbWUpO1xuICAgICAgICB9LFxuICAgICAgICBkYXRhdGlwOiB0aGlzLmdldERhdGF0aXAuYmluZCh0aGlzKSxcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0RGF0YXRpcChlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50OiBQb2ludCk6IFByb21pc2U8YXRvbUlkZS5EYXRhdGlwIHwgbnVsbD4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFEYXRhdGlwQWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5kYXRhdGlwID0gdGhpcy5kYXRhdGlwIHx8IG5ldyBEYXRhdGlwQWRhcHRlcigpO1xuICAgIHJldHVybiB0aGlzLmRhdGF0aXAuZ2V0RGF0YXRpcChzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yLCBwb2ludCk7XG4gIH1cblxuICAvLyBDb25zb2xlIHZpYSBMUyBsb2dnaW5nLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHB1YmxpYyBjb25zdW1lQ29uc29sZShjcmVhdGVDb25zb2xlOiBhdG9tSWRlLkNvbnNvbGVTZXJ2aWNlKTogRGlzcG9zYWJsZSB7XG4gICAgdGhpcy5fY29uc29sZURlbGVnYXRlID0gY3JlYXRlQ29uc29sZTtcblxuICAgIGZvciAoY29uc3Qgc2VydmVyIG9mIHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0QWN0aXZlU2VydmVycygpKSB7XG4gICAgICBjb25zdCBsb2dnaW5nQ29uc29sZSA9IHRoaXMuZ2V0U2VydmVyQWRhcHRlcihzZXJ2ZXIsICdsb2dnaW5nQ29uc29sZScpO1xuICAgICAgaWYgKGxvZ2dpbmdDb25zb2xlKSB7XG4gICAgICAgIGxvZ2dpbmdDb25zb2xlLmF0dGFjaCh0aGlzLl9jb25zb2xlRGVsZWdhdGUoeyBpZDogdGhpcy5uYW1lLCBuYW1lOiB0aGlzLmdldExhbmd1YWdlTmFtZSgpIH0pKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBObyB3YXkgb2YgZGV0YWNoaW5nIGZyb20gY2xpZW50IGNvbm5lY3Rpb25zIHRvZGF5XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHsgfSk7XG4gIH1cblxuICAvLyBDb2RlIEZvcm1hdCB2aWEgTFMgZm9ybWF0RG9jdW1lbnQgJiBmb3JtYXREb2N1bWVudFJhbmdlLS0tLS0tLS0tLS0tXG4gIHB1YmxpYyBwcm92aWRlQ29kZUZvcm1hdCgpOiBhdG9tSWRlLlJhbmdlQ29kZUZvcm1hdFByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGZvcm1hdENvZGU6IHRoaXMuZ2V0Q29kZUZvcm1hdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0Q29kZUZvcm1hdChlZGl0b3I6IFRleHRFZGl0b3IsIHJhbmdlOiBSYW5nZSk6IFByb21pc2U8YXRvbUlkZS5UZXh0RWRpdFtdPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIUNvZGVGb3JtYXRBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIENvZGVGb3JtYXRBZGFwdGVyLmZvcm1hdChzZXJ2ZXIuY29ubmVjdGlvbiwgc2VydmVyLmNhcGFiaWxpdGllcywgZWRpdG9yLCByYW5nZSk7XG4gIH1cblxuICBwdWJsaWMgcHJvdmlkZVJhbmdlQ29kZUZvcm1hdCgpOiBhdG9tSWRlLlJhbmdlQ29kZUZvcm1hdFByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGZvcm1hdENvZGU6IHRoaXMuZ2V0UmFuZ2VDb2RlRm9ybWF0LmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRSYW5nZUNvZGVGb3JtYXQoZWRpdG9yOiBUZXh0RWRpdG9yLCByYW5nZTogUmFuZ2UpOiBQcm9taXNlPGF0b21JZGUuVGV4dEVkaXRbXT4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFzZXJ2ZXIuY2FwYWJpbGl0aWVzLmRvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUHJvdmlkZXIpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29kZUZvcm1hdEFkYXB0ZXIuZm9ybWF0UmFuZ2Uoc2VydmVyLmNvbm5lY3Rpb24sIGVkaXRvciwgcmFuZ2UpO1xuICB9XG5cbiAgcHVibGljIHByb3ZpZGVGaWxlQ29kZUZvcm1hdCgpOiBhdG9tSWRlLkZpbGVDb2RlRm9ybWF0UHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgZm9ybWF0RW50aXJlRmlsZTogdGhpcy5nZXRGaWxlQ29kZUZvcm1hdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwdWJsaWMgcHJvdmlkZU9uU2F2ZUNvZGVGb3JtYXQoKTogYXRvbUlkZS5PblNhdmVDb2RlRm9ybWF0UHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgZm9ybWF0T25TYXZlOiB0aGlzLmdldEZpbGVDb2RlRm9ybWF0LmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRGaWxlQ29kZUZvcm1hdChlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPGF0b21JZGUuVGV4dEVkaXRbXT4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFzZXJ2ZXIuY2FwYWJpbGl0aWVzLmRvY3VtZW50Rm9ybWF0dGluZ1Byb3ZpZGVyKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIENvZGVGb3JtYXRBZGFwdGVyLmZvcm1hdERvY3VtZW50KHNlcnZlci5jb25uZWN0aW9uLCBlZGl0b3IpO1xuICB9XG5cbiAgcHVibGljIHByb3ZpZGVPblR5cGVDb2RlRm9ybWF0KCk6IGF0b21JZGUuT25UeXBlQ29kZUZvcm1hdFByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGZvcm1hdEF0UG9zaXRpb246IHRoaXMuZ2V0T25UeXBlQ29kZUZvcm1hdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0T25UeXBlQ29kZUZvcm1hdChcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcG9pbnQ6IFBvaW50LFxuICAgIGNoYXJhY3Rlcjogc3RyaW5nLFxuICApOiBQcm9taXNlPGF0b21JZGUuVGV4dEVkaXRbXT4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFzZXJ2ZXIuY2FwYWJpbGl0aWVzLmRvY3VtZW50T25UeXBlRm9ybWF0dGluZ1Byb3ZpZGVyKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIENvZGVGb3JtYXRBZGFwdGVyLmZvcm1hdE9uVHlwZShzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yLCBwb2ludCwgY2hhcmFjdGVyKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlQ29kZUhpZ2hsaWdodCgpOiBhdG9tSWRlLkNvZGVIaWdobGlnaHRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBoaWdobGlnaHQ6IChlZGl0b3IsIHBvc2l0aW9uKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldENvZGVIaWdobGlnaHQoZWRpdG9yLCBwb3NpdGlvbik7XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0Q29kZUhpZ2hsaWdodChlZGl0b3I6IFRleHRFZGl0b3IsIHBvc2l0aW9uOiBQb2ludCk6IFByb21pc2U8UmFuZ2VbXSB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhQ29kZUhpZ2hsaWdodEFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlSGlnaGxpZ2h0QWRhcHRlci5oaWdobGlnaHQoc2VydmVyLmNvbm5lY3Rpb24sIHNlcnZlci5jYXBhYmlsaXRpZXMsIGVkaXRvciwgcG9zaXRpb24pO1xuICB9XG5cbiAgcHVibGljIHByb3ZpZGVDb2RlQWN0aW9ucygpOiBhdG9tSWRlLkNvZGVBY3Rpb25Qcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBnZXRDb2RlQWN0aW9uczogKGVkaXRvciwgcmFuZ2UsIGRpYWdub3N0aWNzKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldENvZGVBY3Rpb25zKGVkaXRvciwgcmFuZ2UsIGRpYWdub3N0aWNzKTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRDb2RlQWN0aW9ucyhlZGl0b3I6IFRleHRFZGl0b3IsIHJhbmdlOiBSYW5nZSwgZGlhZ25vc3RpY3M6IGF0b21JZGUuRGlhZ25vc3RpY1tdKSB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIUNvZGVBY3Rpb25BZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29kZUFjdGlvbkFkYXB0ZXIuZ2V0Q29kZUFjdGlvbnMoXG4gICAgICBzZXJ2ZXIuY29ubmVjdGlvbixcbiAgICAgIHNlcnZlci5jYXBhYmlsaXRpZXMsXG4gICAgICB0aGlzLmdldFNlcnZlckFkYXB0ZXIoc2VydmVyLCAnbGludGVyUHVzaFYyJyksXG4gICAgICBlZGl0b3IsXG4gICAgICByYW5nZSxcbiAgICAgIGRpYWdub3N0aWNzLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgcHJvdmlkZVJlZmFjdG9yKCk6IGF0b21JZGUuUmVmYWN0b3JQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICByZW5hbWU6IHRoaXMuZ2V0UmVuYW1lLmJpbmQodGhpcyksXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBnZXRSZW5hbWUoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb3NpdGlvbjogUG9pbnQsIG5ld05hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFSZW5hbWVBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gUmVuYW1lQWRhcHRlci5nZXRSZW5hbWUoXG4gICAgICBzZXJ2ZXIuY29ubmVjdGlvbixcbiAgICAgIGVkaXRvcixcbiAgICAgIHBvc2l0aW9uLFxuICAgICAgbmV3TmFtZSxcbiAgICApO1xuICB9XG5cbiAgcHVibGljIGNvbnN1bWVTaWduYXR1cmVIZWxwKHJlZ2lzdHJ5OiBhdG9tSWRlLlNpZ25hdHVyZUhlbHBSZWdpc3RyeSk6IERpc3Bvc2FibGUge1xuICAgIHRoaXMuX3NpZ25hdHVyZUhlbHBSZWdpc3RyeSA9IHJlZ2lzdHJ5O1xuICAgIGZvciAoY29uc3Qgc2VydmVyIG9mIHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0QWN0aXZlU2VydmVycygpKSB7XG4gICAgICBjb25zdCBzaWduYXR1cmVIZWxwQWRhcHRlciA9IHRoaXMuZ2V0U2VydmVyQWRhcHRlcihzZXJ2ZXIsICdzaWduYXR1cmVIZWxwQWRhcHRlcicpO1xuICAgICAgaWYgKHNpZ25hdHVyZUhlbHBBZGFwdGVyICE9IG51bGwpIHtcbiAgICAgICAgc2lnbmF0dXJlSGVscEFkYXB0ZXIuYXR0YWNoKHJlZ2lzdHJ5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIHRoaXMuX3NpZ25hdHVyZUhlbHBSZWdpc3RyeSA9IHVuZGVmaW5lZDtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBjb25zdW1lQnVzeVNpZ25hbChzZXJ2aWNlOiBhdG9tSWRlLkJ1c3lTaWduYWxTZXJ2aWNlKTogRGlzcG9zYWJsZSB7XG4gICAgdGhpcy5idXN5U2lnbmFsU2VydmljZSA9IHNlcnZpY2U7XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IGRlbGV0ZSB0aGlzLmJ1c3lTaWduYWxTZXJ2aWNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBgZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzYCBtZXNzYWdlIGZpbHRlcmluZywgb3ZlcnJpZGUgZm9yIGN1c3RvbSBsb2dpYy5cbiAgICogQHBhcmFtIGZpbGVQYXRoIFBhdGggb2YgYSBmaWxlIHRoYXQgaGFzIGNoYW5nZWQgaW4gdGhlIHByb2plY3QgcGF0aFxuICAgKiBAcmV0dXJucyBgZmFsc2VgID0+IG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2VudCB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqL1xuICBwcm90ZWN0ZWQgZmlsdGVyQ2hhbmdlV2F0Y2hlZEZpbGVzKF9maWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKiogQHJldHVybiBmYWxzZSA9PiBzZXJ2ZXJzIHdpbGwgYmUga2lsbGVkIHdpdGhvdXQgYXdhaXRpbmcgc2h1dGRvd24gcmVzcG9uc2UuICovXG4gIHByb3RlY3RlZCBzaHV0ZG93blNlcnZlcnNHcmFjZWZ1bGx5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBvbiBsYW5ndWFnZSBzZXJ2ZXIgc3RkZXJyIG91dHB1dC5cbiAgICogQHBhcmFtIHN0ZGVyciBBIGNodW5rIG9mIHN0ZGVyciBmcm9tIGEgbGFuZ3VhZ2Ugc2VydmVyIGluc3RhbmNlXG4gICAqL1xuICBwcm90ZWN0ZWQgaGFuZGxlU2VydmVyU3RkZXJyKHN0ZGVycjogc3RyaW5nLCBfcHJvamVjdFBhdGg6IHN0cmluZykge1xuICAgIHN0ZGVyci5zcGxpdCgnXFxuJykuZmlsdGVyKChsKSA9PiBsKS5mb3JFYWNoKChsaW5lKSA9PiB0aGlzLmxvZ2dlci53YXJuKGBzdGRlcnIgJHtsaW5lfWApKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGNhbiBzdXBwb3J0IExTUCBmdW5jdGlvbmFsaXR5IGZvclxuICAgKiBvdXQgb2YgcHJvamVjdCBmaWxlcyBpbmRpY2F0ZWQgYnkgYHRleHREb2N1bWVudC9kZWZpbml0aW9uYCByZXNwb25zZXMuXG4gICAqXG4gICAqIERlZmF1bHQ6IGZhbHNlXG4gICAqL1xuICBwcm90ZWN0ZWQgc2VydmVyc1N1cHBvcnREZWZpbml0aW9uRGVzdGluYXRpb25zKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2VydmVyQWRhcHRlcjxUIGV4dGVuZHMga2V5b2YgU2VydmVyQWRhcHRlcnM+KFxuICAgIHNlcnZlcjogQWN0aXZlU2VydmVyLCBhZGFwdGVyOiBULFxuICApOiBTZXJ2ZXJBZGFwdGVyc1tUXSB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWRhcHRlcnMgPSB0aGlzLl9zZXJ2ZXJBZGFwdGVycy5nZXQoc2VydmVyKTtcbiAgICByZXR1cm4gYWRhcHRlcnMgJiYgYWRhcHRlcnNbYWRhcHRlcl07XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVwb3J0QnVzeVdoaWxlOiBVdGlscy5SZXBvcnRCdXN5V2hpbGUgPSBhc3luYyAodGl0bGUsIGYpID0+IHtcbiAgICBpZiAodGhpcy5idXN5U2lnbmFsU2VydmljZSkge1xuICAgICAgcmV0dXJuIHRoaXMuYnVzeVNpZ25hbFNlcnZpY2UucmVwb3J0QnVzeVdoaWxlKHRpdGxlLCBmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMucmVwb3J0QnVzeVdoaWxlRGVmYXVsdCh0aXRsZSwgZik7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIHJlcG9ydEJ1c3lXaGlsZURlZmF1bHQ6IFV0aWxzLlJlcG9ydEJ1c3lXaGlsZSA9IGFzeW5jICh0aXRsZSwgZikgPT4ge1xuICAgIHRoaXMubG9nZ2VyLmluZm8oYFtTdGFydGVkXSAke3RpdGxlfWApO1xuICAgIGxldCByZXM7XG4gICAgdHJ5IHtcbiAgICAgIHJlcyA9IGF3YWl0IGYoKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgW0ZpbmlzaGVkXSAke3RpdGxlfWApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG59XG4iXX0=