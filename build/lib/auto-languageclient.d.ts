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
export default class AutoLanguageClient {
    private _disposable;
    private _serverManager;
    private _consoleDelegate?;
    private _linterDelegate?;
    private _signatureHelpRegistry?;
    private _lastAutocompleteRequest?;
    private _isDeactivating;
    private _serverAdapters;
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
    protected getGrammarScopes(): string[];
    protected getLanguageName(): string;
    protected getServerName(): string;
    protected startServerProcess(_projectPath: string): LanguageServerProcess | Promise<LanguageServerProcess>;
    protected shouldStartForEditor(editor: TextEditor): boolean;
    protected getInitializeParams(projectPath: string, process: LanguageServerProcess): ls.InitializeParams;
    protected preInitialization(_connection: LanguageClientConnection): void;
    protected postInitialization(_server: ActiveServer): void;
    protected getConnectionType(): ConnectionType;
    protected getRootConfigurationKey(): string;
    protected mapConfigurationObject(configuration: any): any;
    protected getConnectionForEditor(editor: TextEditor): Promise<LanguageClientConnection | null>;
    protected restartAllServers(): Promise<void>;
    activate(): void;
    private exitCleanup;
    deactivate(): Promise<any>;
    protected spawnChildNode(args: string[], options?: cp.SpawnOptions): cp.ChildProcess;
    protected getLogger(): Logger;
    private startServer;
    private captureServerErrors;
    private handleSpawnFailure;
    private createRpcConnection;
    private startExclusiveAdapters;
    shouldSyncForEditor(editor: TextEditor, projectPath: string): boolean;
    protected isFileInProject(editor: TextEditor, projectPath: string): boolean;
    provideAutocomplete(): ac.AutocompleteProvider;
    protected getSuggestions(request: ac.SuggestionsRequestedEvent): Promise<ac.AnySuggestion[]>;
    protected getSuggestionDetailsOnSelect(suggestion: ac.AnySuggestion): Promise<ac.AnySuggestion | null>;
    protected onDidConvertAutocomplete(_completionItem: ls.CompletionItem, _suggestion: ac.AnySuggestion, _request: ac.SuggestionsRequestedEvent): void;
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
    consumeSignatureHelp(registry: atomIde.SignatureHelpRegistry): Disposable;
    consumeBusySignal(service: atomIde.BusySignalService): Disposable;
    /**
     * `didChangeWatchedFiles` message filtering, override for custom logic.
     * @param filePath path of a file that has changed in the project path
     * @return false => message will not be sent to the language server
     */
    protected filterChangeWatchedFiles(_filePath: string): boolean;
    /** @return false => servers will be killed without awaiting shutdown response. */
    protected shutdownServersGracefully(): boolean;
    /**
     * Called on language server stderr output.
     * @param stderr a chunk of stderr from a language server instance
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
