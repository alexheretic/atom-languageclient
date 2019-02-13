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
const signature_help_adapter_1 = require("./adapters/signature-help-adapter");
const Utils = require("./utils");
const languageclient_1 = require("./languageclient");
exports.LanguageClientConnection = languageclient_1.LanguageClientConnection;
const logger_1 = require("./logger");
const server_manager_js_1 = require("./server-manager.js");
const atom_1 = require("atom");
// Public: AutoLanguageClient provides a simple way to have all the supported
// Atom-IDE services wired up entirely for you by just subclassing it and
// implementing startServerProcess/getGrammarScopes/getLanguageName and
// getServerName.
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
    // Return an array of the grammar scopes you handle, e.g. [ 'source.js' ]
    getGrammarScopes() {
        throw Error('Must implement getGrammarScopes when extending AutoLanguageClient');
    }
    // Return the name of the language you support, e.g. 'JavaScript'
    getLanguageName() {
        throw Error('Must implement getLanguageName when extending AutoLanguageClient');
    }
    // Return the name of your server, e.g. 'Eclipse JDT'
    getServerName() {
        throw Error('Must implement getServerName when extending AutoLanguageClient');
    }
    // Start your server process
    startServerProcess(_projectPath) {
        throw Error('Must override startServerProcess to start language server process when extending AutoLanguageClient');
    }
    // You might want to override these for different behavior
    // ---------------------------------------------------------------------------
    // Determine whether we should start a server for a given editor if we don't have one yet
    shouldStartForEditor(editor) {
        return this.getGrammarScopes().includes(editor.getGrammar().scopeName);
    }
    // Return the parameters used to initialize a client - you may want to extend capabilities
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
    // Early wire-up of listeners before initialize method is sent
    preInitialization(_connection) { }
    // Late wire-up of listeners after initialize method has been sent
    postInitialization(_server) { }
    // Determine whether to use ipc, stdio or socket to connect to the server
    getConnectionType() {
        return this.socket != null ? 'socket' : 'stdio';
    }
    // Return the name of your root configuration key
    getRootConfigurationKey() {
        return '';
    }
    // Optionally transform the configuration object before it is sent to the server
    mapConfigurationObject(configuration) {
        return configuration;
    }
    // Helper methods that are useful for implementors
    // ---------------------------------------------------------------------------
    // Gets a LanguageClientConnection for a given TextEditor
    getConnectionForEditor(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield this._serverManager.getServer(editor);
            return server ? server.connection : null;
        });
    }
    // Restart all active language servers for this language client in the workspace
    restartAllServers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._serverManager.restartAllServers();
        });
    }
    // Default implementation of the rest of the AutoLanguageClient
    // ---------------------------------------------------------------------------
    // Activate does very little for perf reasons - hooks in via ServerManager for later 'activation'
    activate() {
        this._disposable = new atom_1.CompositeDisposable();
        this.name = `${this.getLanguageName()} (${this.getServerName()})`;
        this.logger = this.getLogger();
        this._serverManager = new server_manager_js_1.ServerManager((p) => this.startServer(p), this.logger, (e) => this.shouldStartForEditor(e), (filepath) => this.filterChangeWatchedFiles(filepath), this.reportBusyWhile, this.getServerName());
        this._serverManager.startListening();
        process.on('exit', () => this.exitCleanup.bind(this));
    }
    exitCleanup() {
        this._serverManager.terminate();
    }
    // Deactivate disposes the resources we're using
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
    // LSP logging is only set for warnings & errors by default unless you turn on the core.debugLSP setting
    getLogger() {
        const filter = atom.config.get('core.debugLSP')
            ? logger_1.FilteredLogger.DeveloperLevelFilter
            : logger_1.FilteredLogger.UserLevelFilter;
        return new logger_1.FilteredLogger(new logger_1.ConsoleLogger(this.name), filter);
    }
    // Starts the server by starting the process, then initializing the language server and starting adapters
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
    // Creates the RPC connection which can be ipc, socket or stdio
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
    // Start adapters that are not shared between servers
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
     * @param filePath path of a file that has changed in the project path
     * @return false => message will not be sent to the language server
     */
    filterChangeWatchedFiles(_filePath) {
        return true;
    }
    /**
     * Called on language server stderr output.
     * @param stderr a chunk of stderr from a language server instance
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sYW5ndWFnZWNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9hdXRvLWxhbmd1YWdlY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFFcEMsc0NBQXNDO0FBQ3RDLDZCQUE2QjtBQUc3Qiw2Q0FBbUM7QUFDbkMsc0VBQTZEO0FBQzdELDBFQUFrRTtBQUNsRSx3RUFBK0Q7QUFDL0Qsd0VBQStEO0FBQy9ELDhFQUFxRTtBQUNyRSxnRUFBd0Q7QUFDeEQsc0VBQThEO0FBQzlELDRFQUFtRTtBQUNuRSxnRkFBdUU7QUFDdkUsOEVBQW9FO0FBQ3BFLGdGQUF1RTtBQUN2RSw0RUFBb0U7QUFDcEUsMEVBQWlFO0FBQ2pFLDhFQUFxRTtBQUNyRSxpQ0FBaUM7QUFFakMscURBQTREO0FBb0JyQyxtQ0FwQmQseUNBQXdCLENBb0JjO0FBbkIvQyxxQ0FJa0I7QUFDbEIsMkRBSTZCO0FBQzdCLCtCQU1jO0FBWWQsNkVBQTZFO0FBQzdFLHlFQUF5RTtBQUN6RSx1RUFBdUU7QUFDdkUsaUJBQWlCO0FBQ2pCLE1BQXFCLGtCQUFrQjtJQUF2QztRQU9VLG9CQUFlLEdBQVksS0FBSyxDQUFDO1FBQ2pDLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQWdDLENBQUM7UUFLNUQsa0JBQWEsR0FBVyxFQUFFLENBQUM7UUFrdkIzQixvQkFBZSxHQUEwQixDQUFPLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwRSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDMUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN6RDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDOUM7UUFDSCxDQUFDLENBQUEsQ0FBQTtRQUVTLDJCQUFzQixHQUEwQixD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QUFDO1FBQ2xELE9BQU8sUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBb0JGO0FBanhCRCxxQ0FpeEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY3AgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBscyBmcm9tICcuL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCAqIGFzIHJwYyBmcm9tICd2c2NvZGUtanNvbnJwYyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgYXRvbUlkZSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgKiBhcyBsaW50ZXIgZnJvbSAnYXRvbS9saW50ZXInO1xuaW1wb3J0IENvbnZlcnQgZnJvbSAnLi9jb252ZXJ0LmpzJztcbmltcG9ydCBBcHBseUVkaXRBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvYXBwbHktZWRpdC1hZGFwdGVyJztcbmltcG9ydCBBdXRvY29tcGxldGVBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvYXV0b2NvbXBsZXRlLWFkYXB0ZXInO1xuaW1wb3J0IENvZGVBY3Rpb25BZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvY29kZS1hY3Rpb24tYWRhcHRlcic7XG5pbXBvcnQgQ29kZUZvcm1hdEFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9jb2RlLWZvcm1hdC1hZGFwdGVyJztcbmltcG9ydCBDb2RlSGlnaGxpZ2h0QWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2NvZGUtaGlnaGxpZ2h0LWFkYXB0ZXInO1xuaW1wb3J0IERhdGF0aXBBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvZGF0YXRpcC1hZGFwdGVyJztcbmltcG9ydCBEZWZpbml0aW9uQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2RlZmluaXRpb24tYWRhcHRlcic7XG5pbXBvcnQgRG9jdW1lbnRTeW5jQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL2RvY3VtZW50LXN5bmMtYWRhcHRlcic7XG5pbXBvcnQgRmluZFJlZmVyZW5jZXNBZGFwdGVyIGZyb20gJy4vYWRhcHRlcnMvZmluZC1yZWZlcmVuY2VzLWFkYXB0ZXInO1xuaW1wb3J0IExpbnRlclB1c2hWMkFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9saW50ZXItcHVzaC12Mi1hZGFwdGVyJztcbmltcG9ydCBMb2dnaW5nQ29uc29sZUFkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9sb2dnaW5nLWNvbnNvbGUtYWRhcHRlcic7XG5pbXBvcnQgTm90aWZpY2F0aW9uc0FkYXB0ZXIgZnJvbSAnLi9hZGFwdGVycy9ub3RpZmljYXRpb25zLWFkYXB0ZXInO1xuaW1wb3J0IE91dGxpbmVWaWV3QWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL291dGxpbmUtdmlldy1hZGFwdGVyJztcbmltcG9ydCBTaWduYXR1cmVIZWxwQWRhcHRlciBmcm9tICcuL2FkYXB0ZXJzL3NpZ25hdHVyZS1oZWxwLWFkYXB0ZXInO1xuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tICduZXQnO1xuaW1wb3J0IHsgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uIH0gZnJvbSAnLi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQge1xuICBDb25zb2xlTG9nZ2VyLFxuICBGaWx0ZXJlZExvZ2dlcixcbiAgTG9nZ2VyLFxufSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQge1xuICBMYW5ndWFnZVNlcnZlclByb2Nlc3MsXG4gIFNlcnZlck1hbmFnZXIsXG4gIEFjdGl2ZVNlcnZlcixcbn0gZnJvbSAnLi9zZXJ2ZXItbWFuYWdlci5qcyc7XG5pbXBvcnQge1xuICBEaXNwb3NhYmxlLFxuICBDb21wb3NpdGVEaXNwb3NhYmxlLFxuICBQb2ludCxcbiAgUmFuZ2UsXG4gIFRleHRFZGl0b3IsXG59IGZyb20gJ2F0b20nO1xuaW1wb3J0ICogYXMgYWMgZnJvbSAnYXRvbS9hdXRvY29tcGxldGUtcGx1cyc7XG5cbmV4cG9ydCB7IEFjdGl2ZVNlcnZlciwgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLCBMYW5ndWFnZVNlcnZlclByb2Nlc3MgfTtcbmV4cG9ydCB0eXBlIENvbm5lY3Rpb25UeXBlID0gJ3N0ZGlvJyB8ICdzb2NrZXQnIHwgJ2lwYyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyQWRhcHRlcnMge1xuICBsaW50ZXJQdXNoVjI6IExpbnRlclB1c2hWMkFkYXB0ZXI7XG4gIGxvZ2dpbmdDb25zb2xlOiBMb2dnaW5nQ29uc29sZUFkYXB0ZXI7XG4gIHNpZ25hdHVyZUhlbHBBZGFwdGVyPzogU2lnbmF0dXJlSGVscEFkYXB0ZXI7XG59XG5cbi8vIFB1YmxpYzogQXV0b0xhbmd1YWdlQ2xpZW50IHByb3ZpZGVzIGEgc2ltcGxlIHdheSB0byBoYXZlIGFsbCB0aGUgc3VwcG9ydGVkXG4vLyBBdG9tLUlERSBzZXJ2aWNlcyB3aXJlZCB1cCBlbnRpcmVseSBmb3IgeW91IGJ5IGp1c3Qgc3ViY2xhc3NpbmcgaXQgYW5kXG4vLyBpbXBsZW1lbnRpbmcgc3RhcnRTZXJ2ZXJQcm9jZXNzL2dldEdyYW1tYXJTY29wZXMvZ2V0TGFuZ3VhZ2VOYW1lIGFuZFxuLy8gZ2V0U2VydmVyTmFtZS5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEF1dG9MYW5ndWFnZUNsaWVudCB7XG4gIHByaXZhdGUgX2Rpc3Bvc2FibGUhOiBDb21wb3NpdGVEaXNwb3NhYmxlO1xuICBwcml2YXRlIF9zZXJ2ZXJNYW5hZ2VyITogU2VydmVyTWFuYWdlcjtcbiAgcHJpdmF0ZSBfY29uc29sZURlbGVnYXRlPzogYXRvbUlkZS5Db25zb2xlU2VydmljZTtcbiAgcHJpdmF0ZSBfbGludGVyRGVsZWdhdGU/OiBsaW50ZXIuSW5kaWVEZWxlZ2F0ZTtcbiAgcHJpdmF0ZSBfc2lnbmF0dXJlSGVscFJlZ2lzdHJ5PzogYXRvbUlkZS5TaWduYXR1cmVIZWxwUmVnaXN0cnk7XG4gIHByaXZhdGUgX2xhc3RBdXRvY29tcGxldGVSZXF1ZXN0PzogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudDtcbiAgcHJpdmF0ZSBfaXNEZWFjdGl2YXRpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBfc2VydmVyQWRhcHRlcnMgPSBuZXcgV2Vha01hcDxBY3RpdmVTZXJ2ZXIsIFNlcnZlckFkYXB0ZXJzPigpO1xuXG4gIC8vIEF2YWlsYWJsZSBpZiBjb25zdW1lQnVzeVNpZ25hbCBpcyBzZXR1cFxuICBwcm90ZWN0ZWQgYnVzeVNpZ25hbFNlcnZpY2U/OiBhdG9tSWRlLkJ1c3lTaWduYWxTZXJ2aWNlO1xuXG4gIHByb3RlY3RlZCBwcm9jZXNzU3RkRXJyOiBzdHJpbmcgPSAnJztcbiAgcHJvdGVjdGVkIGxvZ2dlciE6IExvZ2dlcjtcbiAgcHJvdGVjdGVkIG5hbWUhOiBzdHJpbmc7XG4gIHByb3RlY3RlZCBzb2NrZXQhOiBTb2NrZXQ7XG5cbiAgLy8gU2hhcmVkIGFkYXB0ZXJzIHRoYXQgY2FuIHRha2UgdGhlIFJQQyBjb25uZWN0aW9uIGFzIHJlcXVpcmVkXG4gIHByb3RlY3RlZCBhdXRvQ29tcGxldGU/OiBBdXRvY29tcGxldGVBZGFwdGVyO1xuICBwcm90ZWN0ZWQgZGF0YXRpcD86IERhdGF0aXBBZGFwdGVyO1xuICBwcm90ZWN0ZWQgZGVmaW5pdGlvbnM/OiBEZWZpbml0aW9uQWRhcHRlcjtcbiAgcHJvdGVjdGVkIGZpbmRSZWZlcmVuY2VzPzogRmluZFJlZmVyZW5jZXNBZGFwdGVyO1xuICBwcm90ZWN0ZWQgb3V0bGluZVZpZXc/OiBPdXRsaW5lVmlld0FkYXB0ZXI7XG5cbiAgLy8gWW91IG11c3QgaW1wbGVtZW50IHRoZXNlIHNvIHdlIGtub3cgaG93IHRvIGRlYWwgd2l0aCB5b3VyIGxhbmd1YWdlIGFuZCBzZXJ2ZXJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldHVybiBhbiBhcnJheSBvZiB0aGUgZ3JhbW1hciBzY29wZXMgeW91IGhhbmRsZSwgZS5nLiBbICdzb3VyY2UuanMnIF1cbiAgcHJvdGVjdGVkIGdldEdyYW1tYXJTY29wZXMoKTogc3RyaW5nW10ge1xuICAgIHRocm93IEVycm9yKCdNdXN0IGltcGxlbWVudCBnZXRHcmFtbWFyU2NvcGVzIHdoZW4gZXh0ZW5kaW5nIEF1dG9MYW5ndWFnZUNsaWVudCcpO1xuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBsYW5ndWFnZSB5b3Ugc3VwcG9ydCwgZS5nLiAnSmF2YVNjcmlwdCdcbiAgcHJvdGVjdGVkIGdldExhbmd1YWdlTmFtZSgpOiBzdHJpbmcge1xuICAgIHRocm93IEVycm9yKCdNdXN0IGltcGxlbWVudCBnZXRMYW5ndWFnZU5hbWUgd2hlbiBleHRlbmRpbmcgQXV0b0xhbmd1YWdlQ2xpZW50Jyk7XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIG5hbWUgb2YgeW91ciBzZXJ2ZXIsIGUuZy4gJ0VjbGlwc2UgSkRUJ1xuICBwcm90ZWN0ZWQgZ2V0U2VydmVyTmFtZSgpOiBzdHJpbmcge1xuICAgIHRocm93IEVycm9yKCdNdXN0IGltcGxlbWVudCBnZXRTZXJ2ZXJOYW1lIHdoZW4gZXh0ZW5kaW5nIEF1dG9MYW5ndWFnZUNsaWVudCcpO1xuICB9XG5cbiAgLy8gU3RhcnQgeW91ciBzZXJ2ZXIgcHJvY2Vzc1xuICBwcm90ZWN0ZWQgc3RhcnRTZXJ2ZXJQcm9jZXNzKF9wcm9qZWN0UGF0aDogc3RyaW5nKTogTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzIHwgUHJvbWlzZTxMYW5ndWFnZVNlcnZlclByb2Nlc3M+IHtcbiAgICB0aHJvdyBFcnJvcignTXVzdCBvdmVycmlkZSBzdGFydFNlcnZlclByb2Nlc3MgdG8gc3RhcnQgbGFuZ3VhZ2Ugc2VydmVyIHByb2Nlc3Mgd2hlbiBleHRlbmRpbmcgQXV0b0xhbmd1YWdlQ2xpZW50Jyk7XG4gIH1cblxuICAvLyBZb3UgbWlnaHQgd2FudCB0byBvdmVycmlkZSB0aGVzZSBmb3IgZGlmZmVyZW50IGJlaGF2aW9yXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIHdlIHNob3VsZCBzdGFydCBhIHNlcnZlciBmb3IgYSBnaXZlbiBlZGl0b3IgaWYgd2UgZG9uJ3QgaGF2ZSBvbmUgeWV0XG4gIHByb3RlY3RlZCBzaG91bGRTdGFydEZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCkuaW5jbHVkZXMoZWRpdG9yLmdldEdyYW1tYXIoKS5zY29wZU5hbWUpO1xuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBwYXJhbWV0ZXJzIHVzZWQgdG8gaW5pdGlhbGl6ZSBhIGNsaWVudCAtIHlvdSBtYXkgd2FudCB0byBleHRlbmQgY2FwYWJpbGl0aWVzXG4gIHByb3RlY3RlZCBnZXRJbml0aWFsaXplUGFyYW1zKHByb2plY3RQYXRoOiBzdHJpbmcsIHByb2Nlc3M6IExhbmd1YWdlU2VydmVyUHJvY2Vzcyk6IGxzLkluaXRpYWxpemVQYXJhbXMge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9jZXNzSWQ6IHByb2Nlc3MucGlkLFxuICAgICAgcm9vdFBhdGg6IHByb2plY3RQYXRoLFxuICAgICAgcm9vdFVyaTogQ29udmVydC5wYXRoVG9VcmkocHJvamVjdFBhdGgpLFxuICAgICAgd29ya3NwYWNlRm9sZGVyczogW10sXG4gICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgd29ya3NwYWNlOiB7XG4gICAgICAgICAgYXBwbHlFZGl0OiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb246IGZhbHNlLFxuICAgICAgICAgIHdvcmtzcGFjZUVkaXQ6IHtcbiAgICAgICAgICAgIGRvY3VtZW50Q2hhbmdlczogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHdvcmtzcGFjZUZvbGRlcnM6IGZhbHNlLFxuICAgICAgICAgIGRpZENoYW5nZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN5bWJvbDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBleGVjdXRlQ29tbWFuZDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdGV4dERvY3VtZW50OiB7XG4gICAgICAgICAgc3luY2hyb25pemF0aW9uOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHdpbGxTYXZlOiB0cnVlLFxuICAgICAgICAgICAgd2lsbFNhdmVXYWl0VW50aWw6IHRydWUsXG4gICAgICAgICAgICBkaWRTYXZlOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29tcGxldGlvbjoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBjb21wbGV0aW9uSXRlbToge1xuICAgICAgICAgICAgICBzbmlwcGV0U3VwcG9ydDogdHJ1ZSxcbiAgICAgICAgICAgICAgY29tbWl0Q2hhcmFjdGVyc1N1cHBvcnQ6IGZhbHNlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRleHRTdXBwb3J0OiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2lnbmF0dXJlSGVscDoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZWZlcmVuY2VzOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50SGlnaGxpZ2h0OiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50U3ltYm9sOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGhpZXJhcmNoaWNhbERvY3VtZW50U3ltYm9sU3VwcG9ydDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZvcm1hdHRpbmc6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcmFuZ2VGb3JtYXR0aW5nOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uVHlwZUZvcm1hdHRpbmc6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGVmaW5pdGlvbjoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2RlQWN0aW9uOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvZGVMZW5zOiB7XG4gICAgICAgICAgICBkeW5hbWljUmVnaXN0cmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRvY3VtZW50TGluazoge1xuICAgICAgICAgICAgZHluYW1pY1JlZ2lzdHJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZW5hbWU6IHtcbiAgICAgICAgICAgIGR5bmFtaWNSZWdpc3RyYXRpb246IGZhbHNlLFxuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBXZSBkbyBub3Qgc3VwcG9ydCB0aGVzZSBmZWF0dXJlcyB5ZXQuXG4gICAgICAgICAgLy8gTmVlZCB0byBzZXQgdG8gdW5kZWZpbmVkIHRvIGFwcGVhc2UgVHlwZVNjcmlwdCB3ZWFrIHR5cGUgZGV0ZWN0aW9uLlxuICAgICAgICAgIGltcGxlbWVudGF0aW9uOiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZURlZmluaXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgICBjb2xvclByb3ZpZGVyOiB1bmRlZmluZWQsXG4gICAgICAgICAgZm9sZGluZ1JhbmdlOiB1bmRlZmluZWQsXG4gICAgICAgIH0sXG4gICAgICAgIGV4cGVyaW1lbnRhbDoge30sXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvLyBFYXJseSB3aXJlLXVwIG9mIGxpc3RlbmVycyBiZWZvcmUgaW5pdGlhbGl6ZSBtZXRob2QgaXMgc2VudFxuICBwcm90ZWN0ZWQgcHJlSW5pdGlhbGl6YXRpb24oX2Nvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbik6IHZvaWQgeyB9XG5cbiAgLy8gTGF0ZSB3aXJlLXVwIG9mIGxpc3RlbmVycyBhZnRlciBpbml0aWFsaXplIG1ldGhvZCBoYXMgYmVlbiBzZW50XG4gIHByb3RlY3RlZCBwb3N0SW5pdGlhbGl6YXRpb24oX3NlcnZlcjogQWN0aXZlU2VydmVyKTogdm9pZCB7IH1cblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciB0byB1c2UgaXBjLCBzdGRpbyBvciBzb2NrZXQgdG8gY29ubmVjdCB0byB0aGUgc2VydmVyXG4gIHByb3RlY3RlZCBnZXRDb25uZWN0aW9uVHlwZSgpOiBDb25uZWN0aW9uVHlwZSB7XG4gICAgcmV0dXJuIHRoaXMuc29ja2V0ICE9IG51bGwgPyAnc29ja2V0JyA6ICdzdGRpbyc7XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIG5hbWUgb2YgeW91ciByb290IGNvbmZpZ3VyYXRpb24ga2V5XG4gIHByb3RlY3RlZCBnZXRSb290Q29uZmlndXJhdGlvbktleSgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIC8vIE9wdGlvbmFsbHkgdHJhbnNmb3JtIHRoZSBjb25maWd1cmF0aW9uIG9iamVjdCBiZWZvcmUgaXQgaXMgc2VudCB0byB0aGUgc2VydmVyXG4gIHByb3RlY3RlZCBtYXBDb25maWd1cmF0aW9uT2JqZWN0KGNvbmZpZ3VyYXRpb246IGFueSk6IGFueSB7XG4gICAgcmV0dXJuIGNvbmZpZ3VyYXRpb247XG4gIH1cblxuICAvLyBIZWxwZXIgbWV0aG9kcyB0aGF0IGFyZSB1c2VmdWwgZm9yIGltcGxlbWVudG9yc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXRzIGEgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uIGZvciBhIGdpdmVuIFRleHRFZGl0b3JcbiAgcHJvdGVjdGVkIGFzeW5jIGdldENvbm5lY3Rpb25Gb3JFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogUHJvbWlzZTxMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24gfCBudWxsPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICByZXR1cm4gc2VydmVyID8gc2VydmVyLmNvbm5lY3Rpb24gOiBudWxsO1xuICB9XG5cbiAgLy8gUmVzdGFydCBhbGwgYWN0aXZlIGxhbmd1YWdlIHNlcnZlcnMgZm9yIHRoaXMgbGFuZ3VhZ2UgY2xpZW50IGluIHRoZSB3b3Jrc3BhY2VcbiAgcHJvdGVjdGVkIGFzeW5jIHJlc3RhcnRBbGxTZXJ2ZXJzKCkge1xuICAgIGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIucmVzdGFydEFsbFNlcnZlcnMoKTtcbiAgfVxuXG4gIC8vIERlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIHJlc3Qgb2YgdGhlIEF1dG9MYW5ndWFnZUNsaWVudFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBBY3RpdmF0ZSBkb2VzIHZlcnkgbGl0dGxlIGZvciBwZXJmIHJlYXNvbnMgLSBob29rcyBpbiB2aWEgU2VydmVyTWFuYWdlciBmb3IgbGF0ZXIgJ2FjdGl2YXRpb24nXG4gIHB1YmxpYyBhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9kaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICB0aGlzLm5hbWUgPSBgJHt0aGlzLmdldExhbmd1YWdlTmFtZSgpfSAoJHt0aGlzLmdldFNlcnZlck5hbWUoKX0pYDtcbiAgICB0aGlzLmxvZ2dlciA9IHRoaXMuZ2V0TG9nZ2VyKCk7XG4gICAgdGhpcy5fc2VydmVyTWFuYWdlciA9IG5ldyBTZXJ2ZXJNYW5hZ2VyKFxuICAgICAgKHApID0+IHRoaXMuc3RhcnRTZXJ2ZXIocCksXG4gICAgICB0aGlzLmxvZ2dlcixcbiAgICAgIChlKSA9PiB0aGlzLnNob3VsZFN0YXJ0Rm9yRWRpdG9yKGUpLFxuICAgICAgKGZpbGVwYXRoKSA9PiB0aGlzLmZpbHRlckNoYW5nZVdhdGNoZWRGaWxlcyhmaWxlcGF0aCksXG4gICAgICB0aGlzLnJlcG9ydEJ1c3lXaGlsZSxcbiAgICAgIHRoaXMuZ2V0U2VydmVyTmFtZSgpLFxuICAgICk7XG4gICAgdGhpcy5fc2VydmVyTWFuYWdlci5zdGFydExpc3RlbmluZygpO1xuICAgIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB0aGlzLmV4aXRDbGVhbnVwLmJpbmQodGhpcykpO1xuICB9XG5cbiAgcHJpdmF0ZSBleGl0Q2xlYW51cCgpOiB2b2lkIHtcbiAgICB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLnRlcm1pbmF0ZSgpO1xuICB9XG5cbiAgLy8gRGVhY3RpdmF0ZSBkaXNwb3NlcyB0aGUgcmVzb3VyY2VzIHdlJ3JlIHVzaW5nXG4gIHB1YmxpYyBhc3luYyBkZWFjdGl2YXRlKCk6IFByb21pc2U8YW55PiB7XG4gICAgdGhpcy5faXNEZWFjdGl2YXRpbmcgPSB0cnVlO1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICAgIHRoaXMuX3NlcnZlck1hbmFnZXIuc3RvcExpc3RlbmluZygpO1xuICAgIGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuc3RvcEFsbFNlcnZlcnMoKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzcGF3bkNoaWxkTm9kZShhcmdzOiBzdHJpbmdbXSwgb3B0aW9uczogY3AuU3Bhd25PcHRpb25zID0ge30pOiBjcC5DaGlsZFByb2Nlc3Mge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBzdGFydGluZyBjaGlsZCBOb2RlIFwiJHthcmdzLmpvaW4oJyAnKX1cImApO1xuICAgIG9wdGlvbnMuZW52ID0gb3B0aW9ucy5lbnYgfHwgT2JqZWN0LmNyZWF0ZShwcm9jZXNzLmVudik7XG4gICAgaWYgKG9wdGlvbnMuZW52KSB7XG4gICAgICBvcHRpb25zLmVudi5FTEVDVFJPTl9SVU5fQVNfTk9ERSA9ICcxJztcbiAgICAgIG9wdGlvbnMuZW52LkVMRUNUUk9OX05PX0FUVEFDSF9DT05TT0xFID0gJzEnO1xuICAgIH1cbiAgICByZXR1cm4gY3Auc3Bhd24ocHJvY2Vzcy5leGVjUGF0aCwgYXJncywgb3B0aW9ucyk7XG4gIH1cblxuICAvLyBMU1AgbG9nZ2luZyBpcyBvbmx5IHNldCBmb3Igd2FybmluZ3MgJiBlcnJvcnMgYnkgZGVmYXVsdCB1bmxlc3MgeW91IHR1cm4gb24gdGhlIGNvcmUuZGVidWdMU1Agc2V0dGluZ1xuICBwcm90ZWN0ZWQgZ2V0TG9nZ2VyKCk6IExvZ2dlciB7XG4gICAgY29uc3QgZmlsdGVyID0gYXRvbS5jb25maWcuZ2V0KCdjb3JlLmRlYnVnTFNQJylcbiAgICAgID8gRmlsdGVyZWRMb2dnZXIuRGV2ZWxvcGVyTGV2ZWxGaWx0ZXJcbiAgICAgIDogRmlsdGVyZWRMb2dnZXIuVXNlckxldmVsRmlsdGVyO1xuICAgIHJldHVybiBuZXcgRmlsdGVyZWRMb2dnZXIobmV3IENvbnNvbGVMb2dnZXIodGhpcy5uYW1lKSwgZmlsdGVyKTtcbiAgfVxuXG4gIC8vIFN0YXJ0cyB0aGUgc2VydmVyIGJ5IHN0YXJ0aW5nIHRoZSBwcm9jZXNzLCB0aGVuIGluaXRpYWxpemluZyB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGFuZCBzdGFydGluZyBhZGFwdGVyc1xuICBwcml2YXRlIGFzeW5jIHN0YXJ0U2VydmVyKHByb2plY3RQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFjdGl2ZVNlcnZlcj4ge1xuICAgIGNvbnN0IHByb2Nlc3MgPSBhd2FpdCB0aGlzLnJlcG9ydEJ1c3lXaGlsZShcbiAgICAgIGBTdGFydGluZyAke3RoaXMuZ2V0U2VydmVyTmFtZSgpfSBmb3IgJHtwYXRoLmJhc2VuYW1lKHByb2plY3RQYXRoKX1gLFxuICAgICAgYXN5bmMgKCkgPT4gdGhpcy5zdGFydFNlcnZlclByb2Nlc3MocHJvamVjdFBhdGgpLFxuICAgICk7XG4gICAgdGhpcy5jYXB0dXJlU2VydmVyRXJyb3JzKHByb2Nlc3MsIHByb2plY3RQYXRoKTtcbiAgICBjb25zdCBjb25uZWN0aW9uID0gbmV3IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbih0aGlzLmNyZWF0ZVJwY0Nvbm5lY3Rpb24ocHJvY2VzcyksIHRoaXMubG9nZ2VyKTtcbiAgICB0aGlzLnByZUluaXRpYWxpemF0aW9uKGNvbm5lY3Rpb24pO1xuICAgIGNvbnN0IGluaXRpYWxpemVQYXJhbXMgPSB0aGlzLmdldEluaXRpYWxpemVQYXJhbXMocHJvamVjdFBhdGgsIHByb2Nlc3MpO1xuICAgIGNvbnN0IGluaXRpYWxpemF0aW9uID0gY29ubmVjdGlvbi5pbml0aWFsaXplKGluaXRpYWxpemVQYXJhbXMpO1xuICAgIHRoaXMucmVwb3J0QnVzeVdoaWxlKFxuICAgICAgYCR7dGhpcy5nZXRTZXJ2ZXJOYW1lKCl9IGluaXRpYWxpemluZyBmb3IgJHtwYXRoLmJhc2VuYW1lKHByb2plY3RQYXRoKX1gLFxuICAgICAgKCkgPT4gaW5pdGlhbGl6YXRpb24sXG4gICAgKTtcbiAgICBjb25zdCBpbml0aWFsaXplUmVzcG9uc2UgPSBhd2FpdCBpbml0aWFsaXphdGlvbjtcbiAgICBjb25zdCBuZXdTZXJ2ZXIgPSB7XG4gICAgICBwcm9qZWN0UGF0aCxcbiAgICAgIHByb2Nlc3MsXG4gICAgICBjb25uZWN0aW9uLFxuICAgICAgY2FwYWJpbGl0aWVzOiBpbml0aWFsaXplUmVzcG9uc2UuY2FwYWJpbGl0aWVzLFxuICAgICAgZGlzcG9zYWJsZTogbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKSxcbiAgICAgIGFkZGl0aW9uYWxQYXRoczogbmV3IFNldCgpLFxuICAgICAgY29uc2lkZXJEZWZpbml0aW9uUGF0aDogKGRlZlBhdGg6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoIWRlZlBhdGguc3RhcnRzV2l0aChwcm9qZWN0UGF0aCkpIHtcbiAgICAgICAgICBuZXdTZXJ2ZXIuYWRkaXRpb25hbFBhdGhzLmFkZChwYXRoLmRpcm5hbWUoZGVmUGF0aCkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH07XG4gICAgdGhpcy5wb3N0SW5pdGlhbGl6YXRpb24obmV3U2VydmVyKTtcbiAgICBjb25uZWN0aW9uLmluaXRpYWxpemVkKCk7XG4gICAgY29ubmVjdGlvbi5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuX2lzRGVhY3RpdmF0aW5nKSB7XG4gICAgICAgIHRoaXMuX3NlcnZlck1hbmFnZXIuc3RvcFNlcnZlcihuZXdTZXJ2ZXIpO1xuICAgICAgICBpZiAoIXRoaXMuX3NlcnZlck1hbmFnZXIuaGFzU2VydmVyUmVhY2hlZFJlc3RhcnRMaW1pdChuZXdTZXJ2ZXIpKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoYFJlc3RhcnRpbmcgbGFuZ3VhZ2Ugc2VydmVyIGZvciBwcm9qZWN0ICcke25ld1NlcnZlci5wcm9qZWN0UGF0aH0nYCk7XG4gICAgICAgICAgdGhpcy5fc2VydmVyTWFuYWdlci5zdGFydFNlcnZlcihwcm9qZWN0UGF0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgTGFuZ3VhZ2Ugc2VydmVyIGhhcyBleGNlZWRlZCBhdXRvLXJlc3RhcnQgbGltaXQgZm9yIHByb2plY3QgJyR7bmV3U2VydmVyLnByb2plY3RQYXRofSdgKTtcbiAgICAgICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoXG4gICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgICBgVGhlICR7dGhpcy5uYW1lfSBsYW5ndWFnZSBzZXJ2ZXIgaGFzIGV4aXRlZCBhbmQgZXhjZWVkZWQgdGhlIHJlc3RhcnQgbGltaXQgZm9yIHByb2plY3QgJyR7bmV3U2VydmVyLnByb2plY3RQYXRofSdgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgY29uZmlndXJhdGlvbktleSA9IHRoaXMuZ2V0Um9vdENvbmZpZ3VyYXRpb25LZXkoKTtcbiAgICBpZiAoY29uZmlndXJhdGlvbktleSkge1xuICAgICAgbmV3U2VydmVyLmRpc3Bvc2FibGUuYWRkKFxuICAgICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKGNvbmZpZ3VyYXRpb25LZXksIChjb25maWcpID0+IHtcbiAgICAgICAgICBjb25zdCBtYXBwZWRDb25maWcgPSB0aGlzLm1hcENvbmZpZ3VyYXRpb25PYmplY3QoY29uZmlnIHx8IHt9KTtcbiAgICAgICAgICBpZiAobWFwcGVkQ29uZmlnKSB7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmRpZENoYW5nZUNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgICAgICBzZXR0aW5nczogbWFwcGVkQ29uZmlnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGFydEV4Y2x1c2l2ZUFkYXB0ZXJzKG5ld1NlcnZlcik7XG4gICAgcmV0dXJuIG5ld1NlcnZlcjtcbiAgfVxuXG4gIHByaXZhdGUgY2FwdHVyZVNlcnZlckVycm9ycyhjaGlsZFByb2Nlc3M6IExhbmd1YWdlU2VydmVyUHJvY2VzcywgcHJvamVjdFBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIGNoaWxkUHJvY2Vzcy5vbignZXJyb3InLCAoZXJyKSA9PiB0aGlzLmhhbmRsZVNwYXduRmFpbHVyZShlcnIpKTtcbiAgICBjaGlsZFByb2Nlc3Mub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB0aGlzLmxvZ2dlci5kZWJ1ZyhgZXhpdDogY29kZSAke2NvZGV9IHNpZ25hbCAke3NpZ25hbH1gKSk7XG4gICAgY2hpbGRQcm9jZXNzLnN0ZGVyci5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgIGNoaWxkUHJvY2Vzcy5zdGRlcnIub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgY29uc3QgZXJyb3JTdHJpbmcgPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgdGhpcy5oYW5kbGVTZXJ2ZXJTdGRlcnIoZXJyb3JTdHJpbmcsIHByb2plY3RQYXRoKTtcbiAgICAgIC8vIEtlZXAgdGhlIGxhc3QgNSBsaW5lcyBmb3IgcGFja2FnZXMgdG8gdXNlIGluIG1lc3NhZ2VzXG4gICAgICB0aGlzLnByb2Nlc3NTdGRFcnIgPSAodGhpcy5wcm9jZXNzU3RkRXJyICsgZXJyb3JTdHJpbmcpXG4gICAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgICAgLnNsaWNlKC01KVxuICAgICAgICAuam9pbignXFxuJyk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZVNwYXduRmFpbHVyZShlcnI6IGFueSk6IHZvaWQge1xuICAgIGF0b20ubm90aWZpY2F0aW9ucy5hZGRFcnJvcihcbiAgICAgIGAke3RoaXMuZ2V0U2VydmVyTmFtZSgpfSBsYW5ndWFnZSBzZXJ2ZXIgZm9yICR7dGhpcy5nZXRMYW5ndWFnZU5hbWUoKX0gdW5hYmxlIHRvIHN0YXJ0YCxcbiAgICAgIHtcbiAgICAgICAgZGlzbWlzc2FibGU6IHRydWUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBlcnIudG9TdHJpbmcoKSxcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxuXG4gIC8vIENyZWF0ZXMgdGhlIFJQQyBjb25uZWN0aW9uIHdoaWNoIGNhbiBiZSBpcGMsIHNvY2tldCBvciBzdGRpb1xuICBwcml2YXRlIGNyZWF0ZVJwY0Nvbm5lY3Rpb24ocHJvY2VzczogTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzKTogcnBjLk1lc3NhZ2VDb25uZWN0aW9uIHtcbiAgICBsZXQgcmVhZGVyOiBycGMuTWVzc2FnZVJlYWRlcjtcbiAgICBsZXQgd3JpdGVyOiBycGMuTWVzc2FnZVdyaXRlcjtcbiAgICBjb25zdCBjb25uZWN0aW9uVHlwZSA9IHRoaXMuZ2V0Q29ubmVjdGlvblR5cGUoKTtcbiAgICBzd2l0Y2ggKGNvbm5lY3Rpb25UeXBlKSB7XG4gICAgICBjYXNlICdpcGMnOlxuICAgICAgICByZWFkZXIgPSBuZXcgcnBjLklQQ01lc3NhZ2VSZWFkZXIocHJvY2VzcyBhcyBjcC5DaGlsZFByb2Nlc3MpO1xuICAgICAgICB3cml0ZXIgPSBuZXcgcnBjLklQQ01lc3NhZ2VXcml0ZXIocHJvY2VzcyBhcyBjcC5DaGlsZFByb2Nlc3MpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3NvY2tldCc6XG4gICAgICAgIHJlYWRlciA9IG5ldyBycGMuU29ja2V0TWVzc2FnZVJlYWRlcih0aGlzLnNvY2tldCk7XG4gICAgICAgIHdyaXRlciA9IG5ldyBycGMuU29ja2V0TWVzc2FnZVdyaXRlcih0aGlzLnNvY2tldCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3RkaW8nOlxuICAgICAgICByZWFkZXIgPSBuZXcgcnBjLlN0cmVhbU1lc3NhZ2VSZWFkZXIocHJvY2Vzcy5zdGRvdXQpO1xuICAgICAgICB3cml0ZXIgPSBuZXcgcnBjLlN0cmVhbU1lc3NhZ2VXcml0ZXIocHJvY2Vzcy5zdGRpbik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFV0aWxzLmFzc2VydFVucmVhY2hhYmxlKGNvbm5lY3Rpb25UeXBlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnBjLmNyZWF0ZU1lc3NhZ2VDb25uZWN0aW9uKHJlYWRlciwgd3JpdGVyLCB7XG4gICAgICBsb2c6ICguLi5fYXJnczogYW55W10pID0+IHsgfSxcbiAgICAgIHdhcm46ICguLi5fYXJnczogYW55W10pID0+IHsgfSxcbiAgICAgIGluZm86ICguLi5fYXJnczogYW55W10pID0+IHsgfSxcbiAgICAgIGVycm9yOiAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYXJncyk7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gU3RhcnQgYWRhcHRlcnMgdGhhdCBhcmUgbm90IHNoYXJlZCBiZXR3ZWVuIHNlcnZlcnNcbiAgcHJpdmF0ZSBzdGFydEV4Y2x1c2l2ZUFkYXB0ZXJzKHNlcnZlcjogQWN0aXZlU2VydmVyKTogdm9pZCB7XG4gICAgQXBwbHlFZGl0QWRhcHRlci5hdHRhY2goc2VydmVyLmNvbm5lY3Rpb24pO1xuICAgIE5vdGlmaWNhdGlvbnNBZGFwdGVyLmF0dGFjaChzZXJ2ZXIuY29ubmVjdGlvbiwgdGhpcy5uYW1lLCBzZXJ2ZXIucHJvamVjdFBhdGgpO1xuXG4gICAgaWYgKERvY3VtZW50U3luY0FkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIGNvbnN0IGRvY1N5bmNBZGFwdGVyID1cbiAgICAgICAgbmV3IERvY3VtZW50U3luY0FkYXB0ZXIoXG4gICAgICAgICAgc2VydmVyLmNvbm5lY3Rpb24sXG4gICAgICAgICAgKGVkaXRvcikgPT4gdGhpcy5zaG91bGRTeW5jRm9yRWRpdG9yKGVkaXRvciwgc2VydmVyLnByb2plY3RQYXRoKSxcbiAgICAgICAgICBzZXJ2ZXIuY2FwYWJpbGl0aWVzLnRleHREb2N1bWVudFN5bmMsXG4gICAgICAgICAgdGhpcy5yZXBvcnRCdXN5V2hpbGUsXG4gICAgICAgICk7XG4gICAgICBzZXJ2ZXIuZGlzcG9zYWJsZS5hZGQoZG9jU3luY0FkYXB0ZXIpO1xuICAgIH1cblxuICAgIGNvbnN0IGxpbnRlclB1c2hWMiA9IG5ldyBMaW50ZXJQdXNoVjJBZGFwdGVyKHNlcnZlci5jb25uZWN0aW9uKTtcbiAgICBpZiAodGhpcy5fbGludGVyRGVsZWdhdGUgIT0gbnVsbCkge1xuICAgICAgbGludGVyUHVzaFYyLmF0dGFjaCh0aGlzLl9saW50ZXJEZWxlZ2F0ZSk7XG4gICAgfVxuICAgIHNlcnZlci5kaXNwb3NhYmxlLmFkZChsaW50ZXJQdXNoVjIpO1xuXG4gICAgY29uc3QgbG9nZ2luZ0NvbnNvbGUgPSBuZXcgTG9nZ2luZ0NvbnNvbGVBZGFwdGVyKHNlcnZlci5jb25uZWN0aW9uKTtcbiAgICBpZiAodGhpcy5fY29uc29sZURlbGVnYXRlICE9IG51bGwpIHtcbiAgICAgIGxvZ2dpbmdDb25zb2xlLmF0dGFjaCh0aGlzLl9jb25zb2xlRGVsZWdhdGUoeyBpZDogdGhpcy5uYW1lLCBuYW1lOiB0aGlzLmdldExhbmd1YWdlTmFtZSgpIH0pKTtcbiAgICB9XG4gICAgc2VydmVyLmRpc3Bvc2FibGUuYWRkKGxvZ2dpbmdDb25zb2xlKTtcblxuICAgIGxldCBzaWduYXR1cmVIZWxwQWRhcHRlcjogU2lnbmF0dXJlSGVscEFkYXB0ZXIgfCB1bmRlZmluZWQ7XG4gICAgaWYgKFNpZ25hdHVyZUhlbHBBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICBzaWduYXR1cmVIZWxwQWRhcHRlciA9IG5ldyBTaWduYXR1cmVIZWxwQWRhcHRlcihzZXJ2ZXIsIHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpKTtcbiAgICAgIGlmICh0aGlzLl9zaWduYXR1cmVIZWxwUmVnaXN0cnkgIT0gbnVsbCkge1xuICAgICAgICBzaWduYXR1cmVIZWxwQWRhcHRlci5hdHRhY2godGhpcy5fc2lnbmF0dXJlSGVscFJlZ2lzdHJ5KTtcbiAgICAgIH1cbiAgICAgIHNlcnZlci5kaXNwb3NhYmxlLmFkZChzaWduYXR1cmVIZWxwQWRhcHRlcik7XG4gICAgfVxuXG4gICAgdGhpcy5fc2VydmVyQWRhcHRlcnMuc2V0KHNlcnZlciwge1xuICAgICAgbGludGVyUHVzaFYyLCBsb2dnaW5nQ29uc29sZSwgc2lnbmF0dXJlSGVscEFkYXB0ZXIsXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgc2hvdWxkU3luY0ZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IsIHByb2plY3RQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc0ZpbGVJblByb2plY3QoZWRpdG9yLCBwcm9qZWN0UGF0aCkgJiYgdGhpcy5zaG91bGRTdGFydEZvckVkaXRvcihlZGl0b3IpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGlzRmlsZUluUHJvamVjdChlZGl0b3I6IFRleHRFZGl0b3IsIHByb2plY3RQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKGVkaXRvci5nZXRQYXRoKCkgfHwgJycpLnN0YXJ0c1dpdGgocHJvamVjdFBhdGgpO1xuICB9XG5cbiAgLy8gQXV0b2NvbXBsZXRlKyB2aWEgTFMgY29tcGxldGlvbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZUF1dG9jb21wbGV0ZSgpOiBhYy5BdXRvY29tcGxldGVQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNlbGVjdG9yOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKVxuICAgICAgICAubWFwKChnKSA9PiBnLmluY2x1ZGVzKCcuJykgPyAnLicgKyBnIDogZylcbiAgICAgICAgLmpvaW4oJywgJyksXG4gICAgICBpbmNsdXNpb25Qcmlvcml0eTogMSxcbiAgICAgIHN1Z2dlc3Rpb25Qcmlvcml0eTogMixcbiAgICAgIGV4Y2x1ZGVMb3dlclByaW9yaXR5OiBmYWxzZSxcbiAgICAgIGdldFN1Z2dlc3Rpb25zOiB0aGlzLmdldFN1Z2dlc3Rpb25zLmJpbmQodGhpcyksXG4gICAgICBvbkRpZEluc2VydFN1Z2dlc3Rpb246IHRoaXMub25EaWRJbnNlcnRTdWdnZXN0aW9uLmJpbmQodGhpcyksXG4gICAgICBnZXRTdWdnZXN0aW9uRGV0YWlsc09uU2VsZWN0OiB0aGlzLmdldFN1Z2dlc3Rpb25EZXRhaWxzT25TZWxlY3QuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFN1Z2dlc3Rpb25zKFxuICAgIHJlcXVlc3Q6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQsXG4gICk6IFByb21pc2U8YWMuQW55U3VnZ2VzdGlvbltdPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIocmVxdWVzdC5lZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhQXV0b2NvbXBsZXRlQWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHRoaXMuYXV0b0NvbXBsZXRlID0gdGhpcy5hdXRvQ29tcGxldGUgfHwgbmV3IEF1dG9jb21wbGV0ZUFkYXB0ZXIoKTtcbiAgICB0aGlzLl9sYXN0QXV0b2NvbXBsZXRlUmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgcmV0dXJuIHRoaXMuYXV0b0NvbXBsZXRlLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgcmVxdWVzdCwgdGhpcy5vbkRpZENvbnZlcnRBdXRvY29tcGxldGUsXG4gICAgICBhdG9tLmNvbmZpZy5nZXQoJ2F1dG9jb21wbGV0ZS1wbHVzLm1pbmltdW1Xb3JkTGVuZ3RoJykpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldFN1Z2dlc3Rpb25EZXRhaWxzT25TZWxlY3QoXG4gICAgc3VnZ2VzdGlvbjogYWMuQW55U3VnZ2VzdGlvbixcbiAgKTogUHJvbWlzZTxhYy5BbnlTdWdnZXN0aW9uIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJlcXVlc3QgPSB0aGlzLl9sYXN0QXV0b2NvbXBsZXRlUmVxdWVzdDtcbiAgICBpZiAocmVxdWVzdCA9PSBudWxsKSB7IHJldHVybiBudWxsOyB9XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIocmVxdWVzdC5lZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhQXV0b2NvbXBsZXRlQWRhcHRlci5jYW5SZXNvbHZlKHNlcnZlci5jYXBhYmlsaXRpZXMpIHx8IHRoaXMuYXV0b0NvbXBsZXRlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmF1dG9Db21wbGV0ZS5jb21wbGV0ZVN1Z2dlc3Rpb24oc2VydmVyLCBzdWdnZXN0aW9uLCByZXF1ZXN0LCB0aGlzLm9uRGlkQ29udmVydEF1dG9jb21wbGV0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgb25EaWRDb252ZXJ0QXV0b2NvbXBsZXRlKFxuICAgIF9jb21wbGV0aW9uSXRlbTogbHMuQ29tcGxldGlvbkl0ZW0sXG4gICAgX3N1Z2dlc3Rpb246IGFjLkFueVN1Z2dlc3Rpb24sXG4gICAgX3JlcXVlc3Q6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQsXG4gICk6IHZvaWQge1xuICB9XG5cbiAgcHJvdGVjdGVkIG9uRGlkSW5zZXJ0U3VnZ2VzdGlvbihfYXJnOiBhYy5TdWdnZXN0aW9uSW5zZXJ0ZWRFdmVudCk6IHZvaWQgeyB9XG5cbiAgLy8gRGVmaW5pdGlvbnMgdmlhIExTIGRvY3VtZW50SGlnaGxpZ2h0IGFuZCBnb3RvRGVmaW5pdGlvbi0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZURlZmluaXRpb25zKCk6IGF0b21JZGUuRGVmaW5pdGlvblByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgcHJpb3JpdHk6IDIwLFxuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBnZXREZWZpbml0aW9uOiB0aGlzLmdldERlZmluaXRpb24uYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldERlZmluaXRpb24oZWRpdG9yOiBUZXh0RWRpdG9yLCBwb2ludDogUG9pbnQpOiBQcm9taXNlPGF0b21JZGUuRGVmaW5pdGlvblF1ZXJ5UmVzdWx0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFEZWZpbml0aW9uQWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5kZWZpbml0aW9ucyA9IHRoaXMuZGVmaW5pdGlvbnMgfHwgbmV3IERlZmluaXRpb25BZGFwdGVyKCk7XG4gICAgY29uc3QgcXVlcnlQcm9taXNlID0gdGhpcy5kZWZpbml0aW9ucy5nZXREZWZpbml0aW9uKFxuICAgICAgc2VydmVyLmNvbm5lY3Rpb24sXG4gICAgICBzZXJ2ZXIuY2FwYWJpbGl0aWVzLFxuICAgICAgdGhpcy5nZXRMYW5ndWFnZU5hbWUoKSxcbiAgICAgIGVkaXRvcixcbiAgICAgIHBvaW50LFxuICAgICk7XG5cbiAgICBpZiAodGhpcy5zZXJ2ZXJzU3VwcG9ydERlZmluaXRpb25EZXN0aW5hdGlvbnMoKSkge1xuICAgICAgcXVlcnlQcm9taXNlLnRoZW4oKHF1ZXJ5KSA9PiB7XG4gICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZGVmIG9mIHF1ZXJ5LmRlZmluaXRpb25zKSB7XG4gICAgICAgICAgICBzZXJ2ZXIuY29uc2lkZXJEZWZpbml0aW9uUGF0aChkZWYucGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcXVlcnlQcm9taXNlO1xuICB9XG5cbiAgLy8gT3V0bGluZSBWaWV3IHZpYSBMUyBkb2N1bWVudFN5bWJvbC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZU91dGxpbmVzKCk6IGF0b21JZGUuT3V0bGluZVByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGdldE91dGxpbmU6IHRoaXMuZ2V0T3V0bGluZS5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0T3V0bGluZShlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPGF0b21JZGUuT3V0bGluZSB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhT3V0bGluZVZpZXdBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLm91dGxpbmVWaWV3ID0gdGhpcy5vdXRsaW5lVmlldyB8fCBuZXcgT3V0bGluZVZpZXdBZGFwdGVyKCk7XG4gICAgcmV0dXJuIHRoaXMub3V0bGluZVZpZXcuZ2V0T3V0bGluZShzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yKTtcbiAgfVxuXG4gIC8vIExpbnRlciBwdXNoIHYyIEFQSSB2aWEgTFMgcHVibGlzaERpYWdub3N0aWNzXG4gIHB1YmxpYyBjb25zdW1lTGludGVyVjIocmVnaXN0ZXJJbmRpZTogKHBhcmFtczogeyBuYW1lOiBzdHJpbmcgfSkgPT4gbGludGVyLkluZGllRGVsZWdhdGUpOiB2b2lkIHtcbiAgICB0aGlzLl9saW50ZXJEZWxlZ2F0ZSA9IHJlZ2lzdGVySW5kaWUoeyBuYW1lOiB0aGlzLm5hbWUgfSk7XG4gICAgaWYgKHRoaXMuX2xpbnRlckRlbGVnYXRlID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHNlcnZlciBvZiB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldEFjdGl2ZVNlcnZlcnMoKSkge1xuICAgICAgY29uc3QgbGludGVyUHVzaFYyID0gdGhpcy5nZXRTZXJ2ZXJBZGFwdGVyKHNlcnZlciwgJ2xpbnRlclB1c2hWMicpO1xuICAgICAgaWYgKGxpbnRlclB1c2hWMiAhPSBudWxsKSB7XG4gICAgICAgIGxpbnRlclB1c2hWMi5hdHRhY2godGhpcy5fbGludGVyRGVsZWdhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgUmVmZXJlbmNlcyB2aWEgTFMgZmluZFJlZmVyZW5jZXMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHVibGljIHByb3ZpZGVGaW5kUmVmZXJlbmNlcygpOiBhdG9tSWRlLkZpbmRSZWZlcmVuY2VzUHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBpc0VkaXRvclN1cHBvcnRlZDogKGVkaXRvcjogVGV4dEVkaXRvcikgPT4gdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCkuaW5jbHVkZXMoZWRpdG9yLmdldEdyYW1tYXIoKS5zY29wZU5hbWUpLFxuICAgICAgZmluZFJlZmVyZW5jZXM6IHRoaXMuZ2V0UmVmZXJlbmNlcy5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0UmVmZXJlbmNlcyhlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50OiBQb2ludCk6IFByb21pc2U8YXRvbUlkZS5GaW5kUmVmZXJlbmNlc1JldHVybiB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhRmluZFJlZmVyZW5jZXNBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmZpbmRSZWZlcmVuY2VzID0gdGhpcy5maW5kUmVmZXJlbmNlcyB8fCBuZXcgRmluZFJlZmVyZW5jZXNBZGFwdGVyKCk7XG4gICAgcmV0dXJuIHRoaXMuZmluZFJlZmVyZW5jZXMuZ2V0UmVmZXJlbmNlcyhzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yLCBwb2ludCwgc2VydmVyLnByb2plY3RQYXRoKTtcbiAgfVxuXG4gIC8vIERhdGF0aXAgdmlhIExTIHRleHREb2N1bWVudC9ob3Zlci0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHVibGljIGNvbnN1bWVEYXRhdGlwKHNlcnZpY2U6IGF0b21JZGUuRGF0YXRpcFNlcnZpY2UpOiB2b2lkIHtcbiAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChcbiAgICAgIHNlcnZpY2UuYWRkUHJvdmlkZXIoe1xuICAgICAgICBwcm92aWRlck5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgICB2YWxpZEZvclNjb3BlOiAoc2NvcGVOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCkuaW5jbHVkZXMoc2NvcGVOYW1lKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YXRpcDogdGhpcy5nZXREYXRhdGlwLmJpbmQodGhpcyksXG4gICAgICB9KSxcbiAgICApO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldERhdGF0aXAoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb2ludDogUG9pbnQpOiBQcm9taXNlPGF0b21JZGUuRGF0YXRpcCB8IG51bGw+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhRGF0YXRpcEFkYXB0ZXIuY2FuQWRhcHQoc2VydmVyLmNhcGFiaWxpdGllcykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuZGF0YXRpcCA9IHRoaXMuZGF0YXRpcCB8fCBuZXcgRGF0YXRpcEFkYXB0ZXIoKTtcbiAgICByZXR1cm4gdGhpcy5kYXRhdGlwLmdldERhdGF0aXAoc2VydmVyLmNvbm5lY3Rpb24sIGVkaXRvciwgcG9pbnQpO1xuICB9XG5cbiAgLy8gQ29uc29sZSB2aWEgTFMgbG9nZ2luZy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgY29uc3VtZUNvbnNvbGUoY3JlYXRlQ29uc29sZTogYXRvbUlkZS5Db25zb2xlU2VydmljZSk6IERpc3Bvc2FibGUge1xuICAgIHRoaXMuX2NvbnNvbGVEZWxlZ2F0ZSA9IGNyZWF0ZUNvbnNvbGU7XG5cbiAgICBmb3IgKGNvbnN0IHNlcnZlciBvZiB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldEFjdGl2ZVNlcnZlcnMoKSkge1xuICAgICAgY29uc3QgbG9nZ2luZ0NvbnNvbGUgPSB0aGlzLmdldFNlcnZlckFkYXB0ZXIoc2VydmVyLCAnbG9nZ2luZ0NvbnNvbGUnKTtcbiAgICAgIGlmIChsb2dnaW5nQ29uc29sZSkge1xuICAgICAgICBsb2dnaW5nQ29uc29sZS5hdHRhY2godGhpcy5fY29uc29sZURlbGVnYXRlKHsgaWQ6IHRoaXMubmFtZSwgbmFtZTogdGhpcy5nZXRMYW5ndWFnZU5hbWUoKSB9KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm8gd2F5IG9mIGRldGFjaGluZyBmcm9tIGNsaWVudCBjb25uZWN0aW9ucyB0b2RheVxuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7IH0pO1xuICB9XG5cbiAgLy8gQ29kZSBGb3JtYXQgdmlhIExTIGZvcm1hdERvY3VtZW50ICYgZm9ybWF0RG9jdW1lbnRSYW5nZS0tLS0tLS0tLS0tLVxuICBwdWJsaWMgcHJvdmlkZUNvZGVGb3JtYXQoKTogYXRvbUlkZS5SYW5nZUNvZGVGb3JtYXRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBmb3JtYXRDb2RlOiB0aGlzLmdldENvZGVGb3JtYXQuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldENvZGVGb3JtYXQoZWRpdG9yOiBUZXh0RWRpdG9yLCByYW5nZTogUmFuZ2UpOiBQcm9taXNlPGF0b21JZGUuVGV4dEVkaXRbXT4ge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFDb2RlRm9ybWF0QWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXQoc2VydmVyLmNvbm5lY3Rpb24sIHNlcnZlci5jYXBhYmlsaXRpZXMsIGVkaXRvciwgcmFuZ2UpO1xuICB9XG5cbiAgcHVibGljIHByb3ZpZGVSYW5nZUNvZGVGb3JtYXQoKTogYXRvbUlkZS5SYW5nZUNvZGVGb3JtYXRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBmb3JtYXRDb2RlOiB0aGlzLmdldFJhbmdlQ29kZUZvcm1hdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0UmFuZ2VDb2RlRm9ybWF0KGVkaXRvcjogVGV4dEVkaXRvciwgcmFuZ2U6IFJhbmdlKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhc2VydmVyLmNhcGFiaWxpdGllcy5kb2N1bWVudFJhbmdlRm9ybWF0dGluZ1Byb3ZpZGVyKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIENvZGVGb3JtYXRBZGFwdGVyLmZvcm1hdFJhbmdlKHNlcnZlci5jb25uZWN0aW9uLCBlZGl0b3IsIHJhbmdlKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlRmlsZUNvZGVGb3JtYXQoKTogYXRvbUlkZS5GaWxlQ29kZUZvcm1hdFByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGZvcm1hdEVudGlyZUZpbGU6IHRoaXMuZ2V0RmlsZUNvZGVGb3JtYXQuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHVibGljIHByb3ZpZGVPblNhdmVDb2RlRm9ybWF0KCk6IGF0b21JZGUuT25TYXZlQ29kZUZvcm1hdFByb3ZpZGVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgZ3JhbW1hclNjb3BlczogdGhpcy5nZXRHcmFtbWFyU2NvcGVzKCksXG4gICAgICBwcmlvcml0eTogMSxcbiAgICAgIGZvcm1hdE9uU2F2ZTogdGhpcy5nZXRGaWxlQ29kZUZvcm1hdC5iaW5kKHRoaXMpLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0RmlsZUNvZGVGb3JtYXQoZWRpdG9yOiBUZXh0RWRpdG9yKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhc2VydmVyLmNhcGFiaWxpdGllcy5kb2N1bWVudEZvcm1hdHRpbmdQcm92aWRlcikge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXREb2N1bWVudChzZXJ2ZXIuY29ubmVjdGlvbiwgZWRpdG9yKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlT25UeXBlQ29kZUZvcm1hdCgpOiBhdG9tSWRlLk9uVHlwZUNvZGVGb3JtYXRQcm92aWRlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdyYW1tYXJTY29wZXM6IHRoaXMuZ2V0R3JhbW1hclNjb3BlcygpLFxuICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICBmb3JtYXRBdFBvc2l0aW9uOiB0aGlzLmdldE9uVHlwZUNvZGVGb3JtYXQuYmluZCh0aGlzKSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldE9uVHlwZUNvZGVGb3JtYXQoXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHBvaW50OiBQb2ludCxcbiAgICBjaGFyYWN0ZXI6IHN0cmluZyxcbiAgKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLl9zZXJ2ZXJNYW5hZ2VyLmdldFNlcnZlcihlZGl0b3IpO1xuICAgIGlmIChzZXJ2ZXIgPT0gbnVsbCB8fCAhc2VydmVyLmNhcGFiaWxpdGllcy5kb2N1bWVudE9uVHlwZUZvcm1hdHRpbmdQcm92aWRlcikge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXRPblR5cGUoc2VydmVyLmNvbm5lY3Rpb24sIGVkaXRvciwgcG9pbnQsIGNoYXJhY3Rlcik7XG4gIH1cblxuICBwdWJsaWMgcHJvdmlkZUNvZGVIaWdobGlnaHQoKTogYXRvbUlkZS5Db2RlSGlnaGxpZ2h0UHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgaGlnaGxpZ2h0OiAoZWRpdG9yLCBwb3NpdGlvbikgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRDb2RlSGlnaGxpZ2h0KGVkaXRvciwgcG9zaXRpb24pO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGdldENvZGVIaWdobGlnaHQoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb3NpdGlvbjogUG9pbnQpOiBQcm9taXNlPFJhbmdlW10gfCBudWxsPiB7XG4gICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5fc2VydmVyTWFuYWdlci5nZXRTZXJ2ZXIoZWRpdG9yKTtcbiAgICBpZiAoc2VydmVyID09IG51bGwgfHwgIUNvZGVIaWdobGlnaHRBZGFwdGVyLmNhbkFkYXB0KHNlcnZlci5jYXBhYmlsaXRpZXMpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gQ29kZUhpZ2hsaWdodEFkYXB0ZXIuaGlnaGxpZ2h0KHNlcnZlci5jb25uZWN0aW9uLCBzZXJ2ZXIuY2FwYWJpbGl0aWVzLCBlZGl0b3IsIHBvc2l0aW9uKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm92aWRlQ29kZUFjdGlvbnMoKTogYXRvbUlkZS5Db2RlQWN0aW9uUHJvdmlkZXIge1xuICAgIHJldHVybiB7XG4gICAgICBncmFtbWFyU2NvcGVzOiB0aGlzLmdldEdyYW1tYXJTY29wZXMoKSxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgZ2V0Q29kZUFjdGlvbnM6IChlZGl0b3IsIHJhbmdlLCBkaWFnbm9zdGljcykgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRDb2RlQWN0aW9ucyhlZGl0b3IsIHJhbmdlLCBkaWFnbm9zdGljcyk7XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0Q29kZUFjdGlvbnMoZWRpdG9yOiBUZXh0RWRpdG9yLCByYW5nZTogUmFuZ2UsIGRpYWdub3N0aWNzOiBhdG9tSWRlLkRpYWdub3N0aWNbXSkge1xuICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0U2VydmVyKGVkaXRvcik7XG4gICAgaWYgKHNlcnZlciA9PSBudWxsIHx8ICFDb2RlQWN0aW9uQWRhcHRlci5jYW5BZGFwdChzZXJ2ZXIuY2FwYWJpbGl0aWVzKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIENvZGVBY3Rpb25BZGFwdGVyLmdldENvZGVBY3Rpb25zKFxuICAgICAgc2VydmVyLmNvbm5lY3Rpb24sXG4gICAgICBzZXJ2ZXIuY2FwYWJpbGl0aWVzLFxuICAgICAgdGhpcy5nZXRTZXJ2ZXJBZGFwdGVyKHNlcnZlciwgJ2xpbnRlclB1c2hWMicpLFxuICAgICAgZWRpdG9yLFxuICAgICAgcmFuZ2UsXG4gICAgICBkaWFnbm9zdGljcyxcbiAgICApO1xuICB9XG5cbiAgcHVibGljIGNvbnN1bWVTaWduYXR1cmVIZWxwKHJlZ2lzdHJ5OiBhdG9tSWRlLlNpZ25hdHVyZUhlbHBSZWdpc3RyeSk6IERpc3Bvc2FibGUge1xuICAgIHRoaXMuX3NpZ25hdHVyZUhlbHBSZWdpc3RyeSA9IHJlZ2lzdHJ5O1xuICAgIGZvciAoY29uc3Qgc2VydmVyIG9mIHRoaXMuX3NlcnZlck1hbmFnZXIuZ2V0QWN0aXZlU2VydmVycygpKSB7XG4gICAgICBjb25zdCBzaWduYXR1cmVIZWxwQWRhcHRlciA9IHRoaXMuZ2V0U2VydmVyQWRhcHRlcihzZXJ2ZXIsICdzaWduYXR1cmVIZWxwQWRhcHRlcicpO1xuICAgICAgaWYgKHNpZ25hdHVyZUhlbHBBZGFwdGVyICE9IG51bGwpIHtcbiAgICAgICAgc2lnbmF0dXJlSGVscEFkYXB0ZXIuYXR0YWNoKHJlZ2lzdHJ5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIHRoaXMuX3NpZ25hdHVyZUhlbHBSZWdpc3RyeSA9IHVuZGVmaW5lZDtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBjb25zdW1lQnVzeVNpZ25hbChzZXJ2aWNlOiBhdG9tSWRlLkJ1c3lTaWduYWxTZXJ2aWNlKTogRGlzcG9zYWJsZSB7XG4gICAgdGhpcy5idXN5U2lnbmFsU2VydmljZSA9IHNlcnZpY2U7XG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IGRlbGV0ZSB0aGlzLmJ1c3lTaWduYWxTZXJ2aWNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBgZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzYCBtZXNzYWdlIGZpbHRlcmluZywgb3ZlcnJpZGUgZm9yIGN1c3RvbSBsb2dpYy5cbiAgICogQHBhcmFtIGZpbGVQYXRoIHBhdGggb2YgYSBmaWxlIHRoYXQgaGFzIGNoYW5nZWQgaW4gdGhlIHByb2plY3QgcGF0aFxuICAgKiBAcmV0dXJuIGZhbHNlID0+IG1lc3NhZ2Ugd2lsbCBub3QgYmUgc2VudCB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqL1xuICBwcm90ZWN0ZWQgZmlsdGVyQ2hhbmdlV2F0Y2hlZEZpbGVzKF9maWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIG9uIGxhbmd1YWdlIHNlcnZlciBzdGRlcnIgb3V0cHV0LlxuICAgKiBAcGFyYW0gc3RkZXJyIGEgY2h1bmsgb2Ygc3RkZXJyIGZyb20gYSBsYW5ndWFnZSBzZXJ2ZXIgaW5zdGFuY2VcbiAgICovXG4gIHByb3RlY3RlZCBoYW5kbGVTZXJ2ZXJTdGRlcnIoc3RkZXJyOiBzdHJpbmcsIF9wcm9qZWN0UGF0aDogc3RyaW5nKSB7XG4gICAgc3RkZXJyLnNwbGl0KCdcXG4nKS5maWx0ZXIoKGwpID0+IGwpLmZvckVhY2goKGxpbmUpID0+IHRoaXMubG9nZ2VyLndhcm4oYHN0ZGVyciAke2xpbmV9YCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB0aGF0IHRoZSBsYW5ndWFnZSBzZXJ2ZXIgY2FuIHN1cHBvcnQgTFNQIGZ1bmN0aW9uYWxpdHkgZm9yXG4gICAqIG91dCBvZiBwcm9qZWN0IGZpbGVzIGluZGljYXRlZCBieSBgdGV4dERvY3VtZW50L2RlZmluaXRpb25gIHJlc3BvbnNlcy5cbiAgICpcbiAgICogRGVmYXVsdDogZmFsc2VcbiAgICovXG4gIHByb3RlY3RlZCBzZXJ2ZXJzU3VwcG9ydERlZmluaXRpb25EZXN0aW5hdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTZXJ2ZXJBZGFwdGVyPFQgZXh0ZW5kcyBrZXlvZiBTZXJ2ZXJBZGFwdGVycz4oXG4gICAgc2VydmVyOiBBY3RpdmVTZXJ2ZXIsIGFkYXB0ZXI6IFQsXG4gICk6IFNlcnZlckFkYXB0ZXJzW1RdIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBhZGFwdGVycyA9IHRoaXMuX3NlcnZlckFkYXB0ZXJzLmdldChzZXJ2ZXIpO1xuICAgIHJldHVybiBhZGFwdGVycyAmJiBhZGFwdGVyc1thZGFwdGVyXTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZXBvcnRCdXN5V2hpbGU6IFV0aWxzLlJlcG9ydEJ1c3lXaGlsZSA9IGFzeW5jICh0aXRsZSwgZikgPT4ge1xuICAgIGlmICh0aGlzLmJ1c3lTaWduYWxTZXJ2aWNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5idXN5U2lnbmFsU2VydmljZS5yZXBvcnRCdXN5V2hpbGUodGl0bGUsIGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXBvcnRCdXN5V2hpbGVEZWZhdWx0KHRpdGxlLCBmKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVwb3J0QnVzeVdoaWxlRGVmYXVsdDogVXRpbHMuUmVwb3J0QnVzeVdoaWxlID0gYXN5bmMgKHRpdGxlLCBmKSA9PiB7XG4gICAgdGhpcy5sb2dnZXIuaW5mbyhgW1N0YXJ0ZWRdICR7dGl0bGV9YCk7XG4gICAgbGV0IHJlcztcbiAgICB0cnkge1xuICAgICAgcmVzID0gYXdhaXQgZigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGBbRmluaXNoZWRdICR7dGl0bGV9YCk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cbn1cbiJdfQ==