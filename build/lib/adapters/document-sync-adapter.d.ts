import { LanguageClientConnection, TextDocumentSyncKind, TextDocumentSyncOptions, TextDocumentContentChangeEvent, VersionedTextDocumentIdentifier, ServerCapabilities } from '../languageclient';
import { Disposable, TextEditor, BufferStoppedChangingEvent, TextChange } from 'atom';
import * as Utils from '../utils';
export default class DocumentSyncAdapter {
    private _connection;
    private _editorSelector;
    private _reportBusyWhile;
    private _disposable;
    _documentSync: TextDocumentSyncOptions;
    private _editors;
    private _versions;
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    private static canAdaptV2;
    private static canAdaptV3;
    constructor(_connection: LanguageClientConnection, _editorSelector: (editor: TextEditor) => boolean, documentSync: TextDocumentSyncOptions | TextDocumentSyncKind | undefined, _reportBusyWhile: Utils.ReportBusyWhile);
    dispose(): void;
    observeTextEditor(editor: TextEditor): void;
    private _handleGrammarChange;
    private _handleNewEditor;
    getEditorSyncAdapter(editor: TextEditor): TextEditorSyncAdapter | undefined;
}
export declare class TextEditorSyncAdapter {
    private _editor;
    private _connection;
    private _documentSync;
    private _versions;
    private _reportBusyWhile;
    private _disposable;
    private _currentUri;
    private _fakeDidChangeWatchedFiles;
    constructor(_editor: TextEditor, _connection: LanguageClientConnection, _documentSync: TextDocumentSyncOptions, _versions: Map<string, number>, _reportBusyWhile: Utils.ReportBusyWhile);
    setupChangeTracking(documentSync: TextDocumentSyncOptions): Disposable | null;
    dispose(): void;
    getLanguageId(): string;
    getVersionedTextDocumentIdentifier(): VersionedTextDocumentIdentifier;
    sendFullChanges(): void;
    sendIncrementalChanges(event: BufferStoppedChangingEvent): void;
    static textEditToContentChange(change: TextChange): TextDocumentContentChangeEvent;
    private _isPrimaryAdapter;
    private _bumpVersion;
    private didOpen;
    private _getVersion;
    didClose(): void;
    willSave(): void;
    willSaveWaitUntil(): Promise<void>;
    didSave(): void;
    didRename(): void;
    getEditorUri(): string;
}
