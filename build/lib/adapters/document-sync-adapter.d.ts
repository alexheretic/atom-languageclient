import { LanguageClientConnection, TextDocumentSyncKind, TextDocumentSyncOptions, TextDocumentContentChangeEvent, VersionedTextDocumentIdentifier, ServerCapabilities } from '../languageclient';
import { Disposable, TextEditor, BufferStoppedChangingEvent, TextChange } from 'atom';
import * as Utils from '../utils';
/**
 * Public: Synchronizes the documents between Atom and the language server by notifying
 * each end of changes, opening, closing and other events as well as sending and applying
 * changes either in whole or in part depending on what the language server supports.
 */
export default class DocumentSyncAdapter {
    private _connection;
    private _editorSelector;
    private _reportBusyWhile;
    private _disposable;
    _documentSync: TextDocumentSyncOptions;
    private _editors;
    private _versions;
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix textDocumentSync capability either being Full or
     * Incremental.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    private static canAdaptV2;
    private static canAdaptV3;
    /**
     * Public: Create a new {DocumentSyncAdapter} for the given language server.
     *
     * @param connection A {LanguageClientConnection} to the language server to be kept in sync.
     * @param documentSync The document syncing options.
     * @param editorSelector A predicate function that takes a {TextEditor} and returns a {boolean}
     *   indicating whether this adapter should care about the contents of the editor.
     */
    constructor(_connection: LanguageClientConnection, _editorSelector: (editor: TextEditor) => boolean, documentSync: TextDocumentSyncOptions | TextDocumentSyncKind | undefined, _reportBusyWhile: Utils.ReportBusyWhile);
    /** Dispose this adapter ensuring any resources are freed and events unhooked. */
    dispose(): void;
    /**
     * Examine a {TextEditor} and decide if we wish to observe it. If so ensure that we stop observing it
     * when it is closed or otherwise destroyed.
     *
     * @param editor A {TextEditor} to consider for observation.
     */
    observeTextEditor(editor: TextEditor): void;
    private _handleGrammarChange;
    private _handleNewEditor;
    getEditorSyncAdapter(editor: TextEditor): TextEditorSyncAdapter | undefined;
}
/** Public: Keep a single {TextEditor} in sync with a given language server. */
export declare class TextEditorSyncAdapter {
    private _editor;
    private _connection;
    private _documentSync;
    private _versions;
    private _reportBusyWhile;
    private _disposable;
    private _currentUri;
    private _fakeDidChangeWatchedFiles;
    /**
     * Public: Create a {TextEditorSyncAdapter} in sync with a given language server.
     *
     * @param editor A {TextEditor} to keep in sync.
     * @param connection A {LanguageClientConnection} to a language server to keep in sync.
     * @param documentSync The document syncing options.
     */
    constructor(_editor: TextEditor, _connection: LanguageClientConnection, _documentSync: TextDocumentSyncOptions, _versions: Map<string, number>, _reportBusyWhile: Utils.ReportBusyWhile);
    /**
     * The change tracking disposable listener that will ensure that changes are sent to the
     * language server as appropriate.
     */
    setupChangeTracking(documentSync: TextDocumentSyncOptions): Disposable | null;
    /** Dispose this adapter ensuring any resources are freed and events unhooked. */
    dispose(): void;
    /**
     * Get the languageId field that will be sent to the language server by simply
     * using the grammar name.
     */
    getLanguageId(): string;
    /**
     * Public: Create a {VersionedTextDocumentIdentifier} for the document observed by
     * this adapter including both the Uri and the current Version.
     */
    getVersionedTextDocumentIdentifier(): VersionedTextDocumentIdentifier;
    /**
     * Public: Send the entire document to the language server. This is used when
     * operating in Full (1) sync mode.
     */
    sendFullChanges(): void;
    /**
     * Public: Send the incremental text changes to the language server. This is used
     * when operating in Incremental (2) sync mode.
     *
     * @param event The event fired by Atom to indicate the document has stopped changing
     *   including a list of changes since the last time this event fired for this
     *   text editor.
     * NOTE: The order of changes in the event is guaranteed top to bottom.  Language server
     * expects this in reverse.
     */
    sendIncrementalChanges(event: BufferStoppedChangingEvent): void;
    /**
     * Public: Convert an Atom {TextEditEvent} to a language server {TextDocumentContentChangeEvent} object.
     *
     * @param change The Atom {TextEditEvent} to convert.
     * @returns A {TextDocumentContentChangeEvent} that represents the converted {TextEditEvent}.
     */
    static textEditToContentChange(change: TextChange): TextDocumentContentChangeEvent;
    private _isPrimaryAdapter;
    private _bumpVersion;
    /**
     * Ensure when the document is opened we send notification to the language server
     * so it can load it in and keep track of diagnostics etc.
     */
    private didOpen;
    private _getVersion;
    /**
     * Called when the {TextEditor} is closed and sends the 'didCloseTextDocument' notification to
     * the connected language server.
     */
    didClose(): void;
    /**
     * Called just before the {TextEditor} saves and sends the 'willSaveTextDocument' notification to
     * the connected language server.
     */
    willSave(): void;
    /**
     * Called just before the {TextEditor} saves, sends the 'willSaveWaitUntilTextDocument' request to
     * the connected language server and waits for the response before saving the buffer.
     */
    willSaveWaitUntil(): Promise<void>;
    /**
     * Called when the {TextEditor} saves and sends the 'didSaveTextDocument' notification to
     * the connected language server.
     * Note: Right now this also sends the `didChangeWatchedFiles` notification as well but that
     * will be sent from elsewhere soon.
     */
    didSave(): void;
    didRename(): void;
    /** Public: Obtain the current {TextEditor} path and convert it to a Uri. */
    getEditorUri(): string;
}
