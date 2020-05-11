/// <reference types="node" />
import * as cp from 'child_process';
import * as ls from './languageclient';
import * as atomIde from 'atom-ide';
import * as linter from 'atom/linter';
import AutocompleteAdapter from './adapters/autocomplete-adapter';
import DatatipAdapter from './adapters/datatip-adapter';
import DefinitionAdapter from './adapters/definition-adapter';
import FindReferencesAdapter from './adapters/find-references-adapter';
import LinterPushV2Adapter from './adapters/linter-push-v2-adapter';
import LoggingConsoleAdapter from './adapters/logging-console-adapter';
import OutlineViewAdapter from './adapters/outline-view-adapter';
import SignatureHelpAdapter from './adapters/signature-help-adapter';
import * as Utils from './utils';
import { Socket } from 'net';
import { LanguageClientConnection } from './languageclient';
import { Logger } from './logger';
import { LanguageServerProcess, ActiveServer } from './server-manager.js';
import { Disposable, Point, Range, TextEditor } from 'atom';
import * as ac from 'atom/autocomplete-plus';
export { ActiveServer, LanguageClientConnection, LanguageServerProcess };
export declare type ConnectionType = 'stdio' | 'socket' | 'ipc';
export interface ServerAdapters {
    linterPushV2: LinterPushV2Adapter;
    loggingConsole: LoggingConsoleAdapter;
    signatureHelpAdapter?: SignatureHelpAdapter;
}
/**
 * Public: AutoLanguageClient provides a simple way to have all the supported
 * Atom-IDE services wired up entirely for you by just subclassing it and
 * implementing at least
 * - `startServerProcess`
 * - `getGrammarScopes`
 * - `getLanguageName`
 * - `getServerName`
 */
export default class AutoLanguageClient {
    private _disposable;
    private _serverManager;
    private _consoleDelegate?;
    private _linterDelegate?;
    private _signatureHelpRegistry?;
    private _lastAutocompleteRequest?;
    private _isDeactivating;
    private _serverAdapters;
    /** Available if consumeBusySignal is setup */
    protected busySignalService?: atomIde.BusySignalService;
    protected processStdErr: string;
    protected logger: Logger;
    protected name: string;
    protected socket: Socket;
    protected autoComplete?: AutocompleteAdapter;
    protected datatip?: DatatipAdapter;
    protected definitions?: DefinitionAdapter;
    protected findReferences?: FindReferencesAdapter;
    protected outlineView?: OutlineViewAdapter;
    /** Return an array of the grammar scopes you handle, e.g. [ 'source.js' ] */
    protected getGrammarScopes(): string[];
    /** Return the name of the language you support, e.g. 'JavaScript' */
    protected getLanguageName(): string;
    /** Return the name of your server, e.g. 'Eclipse JDT' */
    protected getServerName(): string;
    /** Start your server process */
    protected startServerProcess(_projectPath: string): LanguageServerProcess | Promise<LanguageServerProcess>;
    /** (Optional) Determine whether we should start a server for a given editor if we don't have one yet */
    protected shouldStartForEditor(editor: TextEditor): boolean;
    /** (Optional) Return the parameters used to initialize a client - you may want to extend capabilities */
    protected getInitializeParams(projectPath: string, process: LanguageServerProcess): ls.InitializeParams;
    /** (Optional) Early wire-up of listeners before initialize method is sent */
    protected preInitialization(_connection: LanguageClientConnection): void;
    /** (Optional) Late wire-up of listeners after initialize method has been sent */
    protected postInitialization(_server: ActiveServer): void;
    /** (Optional) Determine whether to use ipc, stdio or socket to connect to the server */
    protected getConnectionType(): ConnectionType;
    /** (Optional) Return the name of your root configuration key */
    protected getRootConfigurationKey(): string;
    /** (Optional) Transform the configuration object before it is sent to the server */
    protected mapConfigurationObject(configuration: any): any;
    /** Gets a LanguageClientConnection for a given TextEditor */
    protected getConnectionForEditor(editor: TextEditor): Promise<LanguageClientConnection | null>;
    /** Restart all active language servers for this language client in the workspace */
    protected restartAllServers(): Promise<void>;
    /** Activate does very little for perf reasons - hooks in via ServerManager for later 'activation' */
    activate(): void;
    private exitCleanup;
    /** Deactivate disposes the resources we're using */
    deactivate(): Promise<any>;
    protected spawnChildNode(args: string[], options?: cp.SpawnOptions): cp.ChildProcess;
    /** LSP logging is only set for warnings & errors by default unless you turn on the core.debugLSP setting */
    protected getLogger(): Logger;
    /** Starts the server by starting the process, then initializing the language server and starting adapters */
    private startServer;
    private captureServerErrors;
    private handleSpawnFailure;
    /** Creates the RPC connection which can be ipc, socket or stdio */
    private createRpcConnection;
    /** Start adapters that are not shared between servers */
    private startExclusiveAdapters;
    shouldSyncForEditor(editor: TextEditor, projectPath: string): boolean;
    protected isFileInProject(editor: TextEditor, projectPath: string): boolean;
    provideAutocomplete(): ac.AutocompleteProvider;
    protected getSuggestions(request: ac.SuggestionsRequestedEvent): Promise<ac.AnySuggestion[]>;
    protected getSuggestionDetailsOnSelect(suggestion: ac.AnySuggestion): Promise<ac.AnySuggestion | null>;
    protected onDidConvertAutocomplete(_completionItem: ls.CompletionItem, _suggestion: ac.AnySuggestion, _request: ac.SuggestionsRequestedEvent): void;
    private handleAdditionalTextEdits;
    protected onDidInsertSuggestion(_arg: ac.SuggestionInsertedEvent): void;
    provideDefinitions(): atomIde.DefinitionProvider;
    protected getDefinition(editor: TextEditor, point: Point): Promise<atomIde.DefinitionQueryResult | null>;
    provideOutlines(): atomIde.OutlineProvider;
    protected getOutline(editor: TextEditor): Promise<atomIde.Outline | null>;
    consumeLinterV2(registerIndie: (params: {
        name: string;
    }) => linter.IndieDelegate): void;
    provideFindReferences(): atomIde.FindReferencesProvider;
    protected getReferences(editor: TextEditor, point: Point): Promise<atomIde.FindReferencesReturn | null>;
    consumeDatatip(service: atomIde.DatatipService): void;
    protected getDatatip(editor: TextEditor, point: Point): Promise<atomIde.Datatip | null>;
    consumeConsole(createConsole: atomIde.ConsoleService): Disposable;
    provideCodeFormat(): atomIde.RangeCodeFormatProvider;
    protected getCodeFormat(editor: TextEditor, range: Range): Promise<atomIde.TextEdit[]>;
    provideRangeCodeFormat(): atomIde.RangeCodeFormatProvider;
    protected getRangeCodeFormat(editor: TextEditor, range: Range): Promise<atomIde.TextEdit[]>;
    provideFileCodeFormat(): atomIde.FileCodeFormatProvider;
    provideOnSaveCodeFormat(): atomIde.OnSaveCodeFormatProvider;
    protected getFileCodeFormat(editor: TextEditor): Promise<atomIde.TextEdit[]>;
    provideOnTypeCodeFormat(): atomIde.OnTypeCodeFormatProvider;
    protected getOnTypeCodeFormat(editor: TextEditor, point: Point, character: string): Promise<atomIde.TextEdit[]>;
    provideCodeHighlight(): atomIde.CodeHighlightProvider;
    protected getCodeHighlight(editor: TextEditor, position: Point): Promise<Range[] | null>;
    provideCodeActions(): atomIde.CodeActionProvider;
    protected getCodeActions(editor: TextEditor, range: Range, diagnostics: atomIde.Diagnostic[]): Promise<atomIde.CodeAction[] | null>;
    provideRefactor(): atomIde.RefactorProvider;
    protected getRename(editor: TextEditor, position: Point, newName: string): Promise<Map<string, atomIde.TextEdit[]> | null>;
    consumeSignatureHelp(registry: atomIde.SignatureHelpRegistry): Disposable;
    consumeBusySignal(service: atomIde.BusySignalService): Disposable;
    /**
     * `didChangeWatchedFiles` message filtering, override for custom logic.
     * @param filePath Path of a file that has changed in the project path
     * @returns `false` => message will not be sent to the language server
     */
    protected filterChangeWatchedFiles(_filePath: string): boolean;
    /** @return false => servers will be killed without awaiting shutdown response. */
    protected shutdownServersGracefully(): boolean;
    /**
     * Called on language server stderr output.
     * @param stderr A chunk of stderr from a language server instance
     */
    protected handleServerStderr(stderr: string, _projectPath: string): void;
    /**
     * Indicates that the language server can support LSP functionality for
     * out of project files indicated by `textDocument/definition` responses.
     *
     * Default: false
     */
    protected serversSupportDefinitionDestinations(): boolean;
    private getServerAdapter;
    protected reportBusyWhile: Utils.ReportBusyWhile;
    protected reportBusyWhileDefault: Utils.ReportBusyWhile;
}
