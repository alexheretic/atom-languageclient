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
const convert_1 = require("../convert");
const languageclient_1 = require("../languageclient");
const apply_edit_adapter_1 = require("./apply-edit-adapter");
const atom_1 = require("atom");
const Utils = require("../utils");
/**
 * Public: Synchronizes the documents between Atom and the language server by notifying
 * each end of changes, opening, closing and other events as well as sending and applying
 * changes either in whole or in part depending on what the language server supports.
 */
class DocumentSyncAdapter {
    /**
     * Public: Create a new {DocumentSyncAdapter} for the given language server.
     *
     * @param connection A {LanguageClientConnection} to the language server to be kept in sync.
     * @param documentSync The document syncing options.
     * @param editorSelector A predicate function that takes a {TextEditor} and returns a {boolean}
     *   indicating whether this adapter should care about the contents of the editor.
     */
    constructor(_connection, _editorSelector, documentSync, _reportBusyWhile) {
        this._connection = _connection;
        this._editorSelector = _editorSelector;
        this._reportBusyWhile = _reportBusyWhile;
        this._disposable = new atom_1.CompositeDisposable();
        this._editors = new WeakMap();
        this._versions = new Map();
        if (typeof documentSync === 'object') {
            this._documentSync = documentSync;
        }
        else {
            this._documentSync = {
                change: documentSync || languageclient_1.TextDocumentSyncKind.Full,
            };
        }
        this._disposable.add(atom.textEditors.observe(this.observeTextEditor.bind(this)));
    }
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix textDocumentSync capability either being Full or
     * Incremental.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities) {
        return this.canAdaptV2(serverCapabilities) || this.canAdaptV3(serverCapabilities);
    }
    static canAdaptV2(serverCapabilities) {
        return (serverCapabilities.textDocumentSync === languageclient_1.TextDocumentSyncKind.Incremental ||
            serverCapabilities.textDocumentSync === languageclient_1.TextDocumentSyncKind.Full);
    }
    static canAdaptV3(serverCapabilities) {
        const options = serverCapabilities.textDocumentSync;
        return (options !== null &&
            typeof options === 'object' &&
            (options.change === languageclient_1.TextDocumentSyncKind.Incremental || options.change === languageclient_1.TextDocumentSyncKind.Full));
    }
    /** Dispose this adapter ensuring any resources are freed and events unhooked. */
    dispose() {
        this._disposable.dispose();
    }
    /**
     * Examine a {TextEditor} and decide if we wish to observe it. If so ensure that we stop observing it
     * when it is closed or otherwise destroyed.
     *
     * @param editor A {TextEditor} to consider for observation.
     */
    observeTextEditor(editor) {
        const listener = editor.observeGrammar((_grammar) => this._handleGrammarChange(editor));
        this._disposable.add(editor.onDidDestroy(() => {
            this._disposable.remove(listener);
            listener.dispose();
        }));
        this._disposable.add(listener);
        if (!this._editors.has(editor) && this._editorSelector(editor)) {
            this._handleNewEditor(editor);
        }
    }
    _handleGrammarChange(editor) {
        const sync = this._editors.get(editor);
        if (sync != null && !this._editorSelector(editor)) {
            this._editors.delete(editor);
            this._disposable.remove(sync);
            sync.didClose();
            sync.dispose();
        }
        else if (sync == null && this._editorSelector(editor)) {
            this._handleNewEditor(editor);
        }
    }
    _handleNewEditor(editor) {
        const sync = new TextEditorSyncAdapter(editor, this._connection, this._documentSync, this._versions, this._reportBusyWhile);
        this._editors.set(editor, sync);
        this._disposable.add(sync);
        this._disposable.add(editor.onDidDestroy(() => {
            const destroyedSync = this._editors.get(editor);
            if (destroyedSync) {
                this._editors.delete(editor);
                this._disposable.remove(destroyedSync);
                destroyedSync.dispose();
            }
        }));
    }
    getEditorSyncAdapter(editor) {
        return this._editors.get(editor);
    }
}
exports.default = DocumentSyncAdapter;
/** Public: Keep a single {TextEditor} in sync with a given language server. */
class TextEditorSyncAdapter {
    /**
     * Public: Create a {TextEditorSyncAdapter} in sync with a given language server.
     *
     * @param editor A {TextEditor} to keep in sync.
     * @param connection A {LanguageClientConnection} to a language server to keep in sync.
     * @param documentSync The document syncing options.
     */
    constructor(_editor, _connection, _documentSync, _versions, _reportBusyWhile) {
        this._editor = _editor;
        this._connection = _connection;
        this._documentSync = _documentSync;
        this._versions = _versions;
        this._reportBusyWhile = _reportBusyWhile;
        this._disposable = new atom_1.CompositeDisposable();
        this._fakeDidChangeWatchedFiles = atom.project.onDidChangeFiles == null;
        const changeTracking = this.setupChangeTracking(_documentSync);
        if (changeTracking != null) {
            this._disposable.add(changeTracking);
        }
        // These handlers are attached only if server supports them
        if (_documentSync.willSave) {
            this._disposable.add(_editor.getBuffer().onWillSave(this.willSave.bind(this)));
        }
        if (_documentSync.willSaveWaitUntil) {
            this._disposable.add(_editor.getBuffer().onWillSave(this.willSaveWaitUntil.bind(this)));
        }
        // Send close notifications unless it's explicitly disabled
        if (_documentSync.openClose !== false) {
            this._disposable.add(_editor.onDidDestroy(this.didClose.bind(this)));
        }
        this._disposable.add(_editor.onDidSave(this.didSave.bind(this)), _editor.onDidChangePath(this.didRename.bind(this)));
        this._currentUri = this.getEditorUri();
        if (_documentSync.openClose !== false) {
            this.didOpen();
        }
    }
    /**
     * The change tracking disposable listener that will ensure that changes are sent to the
     * language server as appropriate.
     */
    setupChangeTracking(documentSync) {
        switch (documentSync.change) {
            case languageclient_1.TextDocumentSyncKind.Full:
                return this._editor.onDidChange(this.sendFullChanges.bind(this));
            case languageclient_1.TextDocumentSyncKind.Incremental:
                return this._editor.getBuffer().onDidChangeText(this.sendIncrementalChanges.bind(this));
        }
        return null;
    }
    /** Dispose this adapter ensuring any resources are freed and events unhooked. */
    dispose() {
        this._disposable.dispose();
    }
    /**
     * Get the languageId field that will be sent to the language server by simply
     * using the grammar name.
     */
    getLanguageId() {
        return this._editor.getGrammar().name;
    }
    /**
     * Public: Create a {VersionedTextDocumentIdentifier} for the document observed by
     * this adapter including both the Uri and the current Version.
     */
    getVersionedTextDocumentIdentifier() {
        return {
            uri: this.getEditorUri(),
            version: this._getVersion(this._editor.getPath() || ''),
        };
    }
    /**
     * Public: Send the entire document to the language server. This is used when
     * operating in Full (1) sync mode.
     */
    sendFullChanges() {
        if (!this._isPrimaryAdapter()) {
            return;
        } // Multiple editors, we are not first
        this._bumpVersion();
        this._connection.didChangeTextDocument({
            textDocument: this.getVersionedTextDocumentIdentifier(),
            contentChanges: [{ text: this._editor.getText() }],
        });
    }
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
    sendIncrementalChanges(event) {
        if (event.changes.length > 0) {
            if (!this._isPrimaryAdapter()) {
                return;
            } // Multiple editors, we are not first
            this._bumpVersion();
            this._connection.didChangeTextDocument({
                textDocument: this.getVersionedTextDocumentIdentifier(),
                contentChanges: event.changes.map(TextEditorSyncAdapter.textEditToContentChange).reverse(),
            });
        }
    }
    /**
     * Public: Convert an Atom {TextEditEvent} to a language server {TextDocumentContentChangeEvent} object.
     *
     * @param change The Atom {TextEditEvent} to convert.
     * @returns A {TextDocumentContentChangeEvent} that represents the converted {TextEditEvent}.
     */
    static textEditToContentChange(change) {
        return {
            range: convert_1.default.atomRangeToLSRange(change.oldRange),
            rangeLength: change.oldText.length,
            text: change.newText,
        };
    }
    _isPrimaryAdapter() {
        const lowestIdForBuffer = Math.min(...atom.workspace
            .getTextEditors()
            .filter((t) => t.getBuffer() === this._editor.getBuffer())
            .map((t) => t.id));
        return lowestIdForBuffer === this._editor.id;
    }
    _bumpVersion() {
        const filePath = this._editor.getPath();
        if (filePath == null) {
            return;
        }
        this._versions.set(filePath, this._getVersion(filePath) + 1);
    }
    /**
     * Ensure when the document is opened we send notification to the language server
     * so it can load it in and keep track of diagnostics etc.
     */
    didOpen() {
        const filePath = this._editor.getPath();
        if (filePath == null) {
            return;
        } // Not yet saved
        if (!this._isPrimaryAdapter()) {
            return;
        } // Multiple editors, we are not first
        this._connection.didOpenTextDocument({
            textDocument: {
                uri: this.getEditorUri(),
                languageId: this.getLanguageId().toLowerCase(),
                version: this._getVersion(filePath),
                text: this._editor.getText(),
            },
        });
    }
    _getVersion(filePath) {
        return this._versions.get(filePath) || 1;
    }
    /**
     * Called when the {TextEditor} is closed and sends the 'didCloseTextDocument' notification to
     * the connected language server.
     */
    didClose() {
        if (this._editor.getPath() == null) {
            return;
        } // Not yet saved
        const fileStillOpen = atom.workspace.getTextEditors().find((t) => t.getBuffer() === this._editor.getBuffer());
        if (fileStillOpen) {
            return; // Other windows or editors still have this file open
        }
        this._connection.didCloseTextDocument({ textDocument: { uri: this.getEditorUri() } });
    }
    /**
     * Called just before the {TextEditor} saves and sends the 'willSaveTextDocument' notification to
     * the connected language server.
     */
    willSave() {
        if (!this._isPrimaryAdapter()) {
            return;
        }
        const uri = this.getEditorUri();
        this._connection.willSaveTextDocument({
            textDocument: { uri },
            reason: languageclient_1.TextDocumentSaveReason.Manual,
        });
    }
    /**
     * Called just before the {TextEditor} saves, sends the 'willSaveWaitUntilTextDocument' request to
     * the connected language server and waits for the response before saving the buffer.
     */
    willSaveWaitUntil() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._isPrimaryAdapter()) {
                return Promise.resolve();
            }
            const buffer = this._editor.getBuffer();
            const uri = this.getEditorUri();
            const title = this._editor.getLongTitle();
            const applyEditsOrTimeout = Utils.promiseWithTimeout(2500, // 2.5 seconds timeout
            this._connection.willSaveWaitUntilTextDocument({
                textDocument: { uri },
                reason: languageclient_1.TextDocumentSaveReason.Manual,
            })).then((edits) => {
                const cursor = this._editor.getCursorBufferPosition();
                apply_edit_adapter_1.default.applyEdits(buffer, convert_1.default.convertLsTextEdits(edits));
                this._editor.setCursorBufferPosition(cursor);
            }).catch((err) => {
                atom.notifications.addError('On-save action failed', {
                    description: `Failed to apply edits to ${title}`,
                    detail: err.message,
                });
                return;
            });
            const withBusySignal = this._reportBusyWhile(`Applying on-save edits for ${title}`, () => applyEditsOrTimeout);
            return withBusySignal || applyEditsOrTimeout;
        });
    }
    /**
     * Called when the {TextEditor} saves and sends the 'didSaveTextDocument' notification to
     * the connected language server.
     * Note: Right now this also sends the `didChangeWatchedFiles` notification as well but that
     * will be sent from elsewhere soon.
     */
    didSave() {
        if (!this._isPrimaryAdapter()) {
            return;
        }
        const uri = this.getEditorUri();
        const didSaveNotification = {
            textDocument: { uri, version: this._getVersion((uri)) },
        };
        if (this._documentSync.save && this._documentSync.save.includeText) {
            didSaveNotification.text = this._editor.getText();
        }
        this._connection.didSaveTextDocument(didSaveNotification);
        if (this._fakeDidChangeWatchedFiles) {
            this._connection.didChangeWatchedFiles({
                changes: [{ uri, type: languageclient_1.FileChangeType.Changed }],
            });
        }
    }
    didRename() {
        if (!this._isPrimaryAdapter()) {
            return;
        }
        const oldUri = this._currentUri;
        this._currentUri = this.getEditorUri();
        if (!oldUri) {
            return; // Didn't previously have a name
        }
        if (this._documentSync.openClose !== false) {
            this._connection.didCloseTextDocument({ textDocument: { uri: oldUri } });
        }
        if (this._fakeDidChangeWatchedFiles) {
            this._connection.didChangeWatchedFiles({
                changes: [
                    { uri: oldUri, type: languageclient_1.FileChangeType.Deleted },
                    { uri: this._currentUri, type: languageclient_1.FileChangeType.Created },
                ],
            });
        }
        // Send an equivalent open event for this editor, which will now use the new
        // file path.
        if (this._documentSync.openClose !== false) {
            this.didOpen();
        }
    }
    /** Public: Obtain the current {TextEditor} path and convert it to a Uri. */
    getEditorUri() {
        return convert_1.default.pathToUri(this._editor.getPath() || '');
    }
}
exports.TextEditorSyncAdapter = TextEditorSyncAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnQtc3luYy1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2FkYXB0ZXJzL2RvY3VtZW50LXN5bmMtYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLHdDQUFpQztBQUNqQyxzREFVMkI7QUFDM0IsNkRBQW9EO0FBQ3BELCtCQU1jO0FBQ2Qsa0NBQWtDO0FBRWxDOzs7O0dBSUc7QUFDSCxNQUFxQixtQkFBbUI7SUFtQ3RDOzs7Ozs7O09BT0c7SUFDSCxZQUNVLFdBQXFDLEVBQ3JDLGVBQWdELEVBQ3hELFlBQXdFLEVBQ2hFLGdCQUF1QztRQUh2QyxnQkFBVyxHQUFYLFdBQVcsQ0FBMEI7UUFDckMsb0JBQWUsR0FBZixlQUFlLENBQWlDO1FBRWhELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBdUI7UUE5Q3pDLGdCQUFXLEdBQUcsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBRXhDLGFBQVEsR0FBK0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNyRSxjQUFTLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7UUE2Q2pELElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFO1lBQ3BDLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDO1NBQ25DO2FBQU07WUFDTCxJQUFJLENBQUMsYUFBYSxHQUFHO2dCQUNuQixNQUFNLEVBQUUsWUFBWSxJQUFJLHFDQUFvQixDQUFDLElBQUk7YUFDbEQsQ0FBQztTQUNIO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQW5ERDs7Ozs7Ozs7T0FRRztJQUNJLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sSUFBSSxDQUFDLFVB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QzFFO1FBRUQsSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUU7WUFDbkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQztnQkFDckMsT0FBTyxFQUFFO29CQUNQLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsK0JBQWMsQ0FBQyxPQUFPLEVBQUU7b0JBQzdDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLCtCQUFjLENBQUMsT0FBTyxFQUFFO2lCQUN4RDthQUNGLENBQUMsQ0FBQztTQUNKO1FBRUQsNEVBQTRFO1FBQzVFLGFBQWE7UUFDYixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtZQUMxQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDaEI7SUFDSCxDQUFDO0lBRUQsNEVBQTRFO0lBQ3JFLFlBQVk7UUFDakIsT0FBTyxpQkFBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3pELENBQUM7Q0FDRjtBQTVTRCxzREE0U0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCB7XG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgRmlsZUNoYW5nZVR5cGUsXG4gIFRleHREb2N1bWVudFNhdmVSZWFzb24sXG4gIFRleHREb2N1bWVudFN5bmNLaW5kLFxuICBUZXh0RG9jdW1lbnRTeW5jT3B0aW9ucyxcbiAgVGV4dERvY3VtZW50Q29udGVudENoYW5nZUV2ZW50LFxuICBWZXJzaW9uZWRUZXh0RG9jdW1lbnRJZGVudGlmaWVyLFxuICBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG4gIERpZFNhdmVUZXh0RG9jdW1lbnRQYXJhbXMsXG59IGZyb20gJy4uL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCBBcHBseUVkaXRBZGFwdGVyIGZyb20gJy4vYXBwbHktZWRpdC1hZGFwdGVyJztcbmltcG9ydCB7XG4gIENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIERpc3Bvc2FibGUsXG4gIFRleHRFZGl0b3IsXG4gIEJ1ZmZlclN0b3BwZWRDaGFuZ2luZ0V2ZW50LFxuICBUZXh0Q2hhbmdlLFxufSBmcm9tICdhdG9tJztcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBQdWJsaWM6IFN5bmNocm9uaXplcyB0aGUgZG9jdW1lbnRzIGJldHdlZW4gQXRvbSBhbmQgdGhlIGxhbmd1YWdlIHNlcnZlciBieSBub3RpZnlpbmdcbiAqIGVhY2ggZW5kIG9mIGNoYW5nZXMsIG9wZW5pbmcsIGNsb3NpbmcgYW5kIG90aGVyIGV2ZW50cyBhcyB3ZWxsIGFzIHNlbmRpbmcgYW5kIGFwcGx5aW5nXG4gKiBjaGFuZ2VzIGVpdGhlciBpbiB3aG9sZSBvciBpbiBwYXJ0IGRlcGVuZGluZyBvbiB3aGF0IHRoZSBsYW5ndWFnZSBzZXJ2ZXIgc3VwcG9ydHMuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERvY3VtZW50U3luY0FkYXB0ZXIge1xuICBwcml2YXRlIF9kaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHVibGljIF9kb2N1bWVudFN5bmM6IFRleHREb2N1bWVudFN5bmNPcHRpb25zO1xuICBwcml2YXRlIF9lZGl0b3JzOiBXZWFrTWFwPFRleHRFZGl0b3IsIFRleHRFZGl0b3JTeW5jQWRhcHRlcj4gPSBuZXcgV2Vha01hcCgpO1xuICBwcml2YXRlIF92ZXJzaW9uczogTWFwPHN0cmluZywgbnVtYmVyPiA9IG5ldyBNYXAoKTtcblxuICAvKipcbiAgICogUHVibGljOiBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGFkYXB0ZXIgY2FuIGJlIHVzZWQgdG8gYWRhcHQgYSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIHNlcnZlckNhcGFiaWxpdGllcyBtYXRyaXggdGV4dERvY3VtZW50U3luYyBjYXBhYmlsaXR5IGVpdGhlciBiZWluZyBGdWxsIG9yXG4gICAqIEluY3JlbWVudGFsLlxuICAgKlxuICAgKiBAcGFyYW0gc2VydmVyQ2FwYWJpbGl0aWVzIFRoZSB7U2VydmVyQ2FwYWJpbGl0aWVzfSBvZiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRvIGNvbnNpZGVyLlxuICAgKiBAcmV0dXJucyBBIHtCb29sZWFufSBpbmRpY2F0aW5nIGFkYXB0ZXIgY2FuIGFkYXB0IHRoZSBzZXJ2ZXIgYmFzZWQgb24gdGhlXG4gICAqICAgZ2l2ZW4gc2VydmVyQ2FwYWJpbGl0aWVzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjYW5BZGFwdChzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmNhbkFkYXB0VjIoc2VydmVyQ2FwYWJpbGl0aWVzKSB8fCB0aGlzLmNhbkFkYXB0VjMoc2VydmVyQ2FwYWJpbGl0aWVzKTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGNhbkFkYXB0VjIoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgc2VydmVyQ2FwYWJpbGl0aWVzLnRleHREb2N1bWVudFN5bmMgPT09IFRleHREb2N1bWVudFN5bmNLaW5kLkluY3JlbWVudGFsIHx8XG4gICAgICBzZXJ2ZXJDYXBhYmlsaXRpZXMudGV4dERvY3VtZW50U3luYyA9PT0gVGV4dERvY3VtZW50U3luY0tpbmQuRnVsbFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBjYW5BZGFwdFYzKHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHNlcnZlckNhcGFiaWxpdGllcy50ZXh0RG9jdW1lbnRTeW5jO1xuICAgIHJldHVybiAoXG4gICAgICBvcHRpb25zICE9PSBudWxsICYmXG4gICAgICB0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcgJiZcbiAgICAgIChvcHRpb25zLmNoYW5nZSA9PT0gVGV4dERvY3VtZW50U3luY0tpbmQuSW5jcmVtZW50YWwgfHwgb3B0aW9ucy5jaGFuZ2UgPT09IFRleHREb2N1bWVudFN5bmNLaW5kLkZ1bGwpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSBhIG5ldyB7RG9jdW1lbnRTeW5jQWRhcHRlcn0gZm9yIHRoZSBnaXZlbiBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSBjb25uZWN0aW9uIEEge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB0byBiZSBrZXB0IGluIHN5bmMuXG4gICAqIEBwYXJhbSBkb2N1bWVudFN5bmMgVGhlIGRvY3VtZW50IHN5bmNpbmcgb3B0aW9ucy5cbiAgICogQHBhcmFtIGVkaXRvclNlbGVjdG9yIEEgcHJlZGljYXRlIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSB7VGV4dEVkaXRvcn0gYW5kIHJldHVybnMgYSB7Ym9vbGVhbn1cbiAgICogICBpbmRpY2F0aW5nIHdoZXRoZXIgdGhpcyBhZGFwdGVyIHNob3VsZCBjYXJlIGFib3V0IHRoZSBjb250ZW50cyBvZiB0aGUgZWRpdG9yLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIHByaXZhdGUgX2VkaXRvclNlbGVjdG9yOiAoZWRpdG9yOiBUZXh0RWRpdG9yKSA9PiBib29sZWFuLFxuICAgIGRvY3VtZW50U3luYzogVGV4dERvY3VtZW50U3luY09wdGlvbnMgfCBUZXh0RG9jdW1lbnRTeW5jS2luZCB8IHVuZGVmaW5lZCxcbiAgICBwcml2YXRlIF9yZXBvcnRCdXN5V2hpbGU6IFV0aWxzLlJlcG9ydEJ1c3lXaGlsZSxcbiAgKSB7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudFN5bmMgPT09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLl9kb2N1bWVudFN5bmMgPSBkb2N1bWVudFN5bmM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2RvY3VtZW50U3luYyA9IHtcbiAgICAgICAgY2hhbmdlOiBkb2N1bWVudFN5bmMgfHwgVGV4dERvY3VtZW50U3luY0tpbmQuRnVsbCxcbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGF0b20udGV4dEVkaXRvcnMub2JzZXJ2ZSh0aGlzLm9ic2VydmVUZXh0RWRpdG9yLmJpbmQodGhpcykpKTtcbiAgfVxuXG4gIC8qKiBEaXNwb3NlIHRoaXMgYWRhcHRlciBlbnN1cmluZyBhbnkgcmVzb3VyY2VzIGFyZSBmcmVlZCBhbmQgZXZlbnRzIHVuaG9va2VkLiAqL1xuICBwdWJsaWMgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEge1RleHRFZGl0b3J9IGFuZCBkZWNpZGUgaWYgd2Ugd2lzaCB0byBvYnNlcnZlIGl0LiBJZiBzbyBlbnN1cmUgdGhhdCB3ZSBzdG9wIG9ic2VydmluZyBpdFxuICAgKiB3aGVuIGl0IGlzIGNsb3NlZCBvciBvdGhlcndpc2UgZGVzdHJveWVkLlxuICAgKlxuICAgKiBAcGFyYW0gZWRpdG9yIEEge1RleHRFZGl0b3J9IHRvIGNvbnNpZGVyIGZvciBvYnNlcnZhdGlvbi5cbiAgICovXG4gIHB1YmxpYyBvYnNlcnZlVGV4dEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiB2b2lkIHtcbiAgICBjb25zdCBsaXN0ZW5lciA9IGVkaXRvci5vYnNlcnZlR3JhbW1hcigoX2dyYW1tYXIpID0+IHRoaXMuX2hhbmRsZUdyYW1tYXJDaGFuZ2UoZWRpdG9yKSk7XG4gICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoXG4gICAgICBlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IHtcbiAgICAgICAgdGhpcy5fZGlzcG9zYWJsZS5yZW1vdmUobGlzdGVuZXIpO1xuICAgICAgICBsaXN0ZW5lci5kaXNwb3NlKCk7XG4gICAgICB9KSxcbiAgICApO1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGxpc3RlbmVyKTtcbiAgICBpZiAoIXRoaXMuX2VkaXRvcnMuaGFzKGVkaXRvcikgJiYgdGhpcy5fZWRpdG9yU2VsZWN0b3IoZWRpdG9yKSkge1xuICAgICAgdGhpcy5faGFuZGxlTmV3RWRpdG9yKGVkaXRvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfaGFuZGxlR3JhbW1hckNoYW5nZShlZGl0b3I6IFRleHRFZGl0b3IpOiB2b2lkIHtcbiAgICBjb25zdCBzeW5jID0gdGhpcy5fZWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgICBpZiAoc3luYyAhPSBudWxsICYmICF0aGlzLl9lZGl0b3JTZWxlY3RvcihlZGl0b3IpKSB7XG4gICAgICB0aGlzLl9lZGl0b3JzLmRlbGV0ZShlZGl0b3IpO1xuICAgICAgdGhpcy5fZGlzcG9zYWJsZS5yZW1vdmUoc3luYyk7XG4gICAgICBzeW5jLmRpZENsb3NlKCk7XG4gICAgICBzeW5jLmRpc3Bvc2UoKTtcbiAgICB9IGVsc2UgaWYgKHN5bmMgPT0gbnVsbCAmJiB0aGlzLl9lZGl0b3JTZWxlY3RvcihlZGl0b3IpKSB7XG4gICAgICB0aGlzLl9oYW5kbGVOZXdFZGl0b3IoZWRpdG9yKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9oYW5kbGVOZXdFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogdm9pZCB7XG4gICAgY29uc3Qgc3luYyA9IG5ldyBUZXh0RWRpdG9yU3luY0FkYXB0ZXIoXG4gICAgICBlZGl0b3IsXG4gICAgICB0aGlzLl9jb25uZWN0aW9uLFxuICAgICAgdGhpcy5fZG9jdW1lbnRTeW5jLFxuICAgICAgdGhpcy5fdmVyc2lvbnMsXG4gICAgICB0aGlzLl9yZXBvcnRCdXN5V2hpbGUsXG4gICAgKTtcbiAgICB0aGlzLl9lZGl0b3JzLnNldChlZGl0b3IsIHN5bmMpO1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKHN5bmMpO1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKFxuICAgICAgZWRpdG9yLm9uRGlkRGVzdHJveSgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlc3Ryb3llZFN5bmMgPSB0aGlzLl9lZGl0b3JzLmdldChlZGl0b3IpO1xuICAgICAgICBpZiAoZGVzdHJveWVkU3luYykge1xuICAgICAgICAgIHRoaXMuX2VkaXRvcnMuZGVsZXRlKGVkaXRvcik7XG4gICAgICAgICAgdGhpcy5fZGlzcG9zYWJsZS5yZW1vdmUoZGVzdHJveWVkU3luYyk7XG4gICAgICAgICAgZGVzdHJveWVkU3luYy5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgZ2V0RWRpdG9yU3luY0FkYXB0ZXIoZWRpdG9yOiBUZXh0RWRpdG9yKTogVGV4dEVkaXRvclN5bmNBZGFwdGVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fZWRpdG9ycy5nZXQoZWRpdG9yKTtcbiAgfVxufVxuXG4vKiogUHVibGljOiBLZWVwIGEgc2luZ2xlIHtUZXh0RWRpdG9yfSBpbiBzeW5jIHdpdGggYSBnaXZlbiBsYW5ndWFnZSBzZXJ2ZXIuICovXG5leHBvcnQgY2xhc3MgVGV4dEVkaXRvclN5bmNBZGFwdGVyIHtcbiAgcHJpdmF0ZSBfZGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gIHByaXZhdGUgX2N1cnJlbnRVcmk6IHN0cmluZztcbiAgcHJpdmF0ZSBfZmFrZURpZENoYW5nZVdhdGNoZWRGaWxlczogYm9vbGVhbjtcblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUgYSB7VGV4dEVkaXRvclN5bmNBZGFwdGVyfSBpbiBzeW5jIHdpdGggYSBnaXZlbiBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSBlZGl0b3IgQSB7VGV4dEVkaXRvcn0gdG8ga2VlcCBpbiBzeW5jLlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIGEgbGFuZ3VhZ2Ugc2VydmVyIHRvIGtlZXAgaW4gc3luYy5cbiAgICogQHBhcmFtIGRvY3VtZW50U3luYyBUaGUgZG9jdW1lbnQgc3luY2luZyBvcHRpb25zLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHByaXZhdGUgX2Nvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgICBwcml2YXRlIF9kb2N1bWVudFN5bmM6IFRleHREb2N1bWVudFN5bmNPcHRpb25zLFxuICAgIHByaXZhdGUgX3ZlcnNpb25zOiBNYXA8c3RyaW5nLCBudW1iZXI+LFxuICAgIHByaXZhdGUgX3JlcG9ydEJ1c3lXaGlsZTogVXRpbHMuUmVwb3J0QnVzeVdoaWxlLFxuICApIHtcbiAgICB0aGlzLl9mYWtlRGlkQ2hhbmdlV2F0Y2hlZEZpbGVzID0gYXRvbS5wcm9qZWN0Lm9uRGlkQ2hhbmdlRmlsZXMgPT0gbnVsbDtcblxuICAgIGNvbnN0IGNoYW5nZVRyYWNraW5nID0gdGhpcy5zZXR1cENoYW5nZVRyYWNraW5nKF9kb2N1bWVudFN5bmMpO1xuICAgIGlmIChjaGFuZ2VUcmFja2luZyAhPSBudWxsKSB7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChjaGFuZ2VUcmFja2luZyk7XG4gICAgfVxuXG4gICAgLy8gVGhlc2UgaGFuZGxlcnMgYXJlIGF0dGFjaGVkIG9ubHkgaWYgc2VydmVyIHN1cHBvcnRzIHRoZW1cbiAgICBpZiAoX2RvY3VtZW50U3luYy53aWxsU2F2ZSkge1xuICAgICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoX2VkaXRvci5nZXRCdWZmZXIoKS5vbldpbGxTYXZlKHRoaXMud2lsbFNhdmUuYmluZCh0aGlzKSkpO1xuICAgIH1cbiAgICBpZiAoX2RvY3VtZW50U3luYy53aWxsU2F2ZVdhaXRVbnRpbCkge1xuICAgICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoX2VkaXRvci5nZXRCdWZmZXIoKS5vbldpbGxTYXZlKHRoaXMud2lsbFNhdmVXYWl0VW50aWwuYmluZCh0aGlzKSkpO1xuICAgIH1cbiAgICAvLyBTZW5kIGNsb3NlIG5vdGlmaWNhdGlvbnMgdW5sZXNzIGl0J3MgZXhwbGljaXRseSBkaXNhYmxlZFxuICAgIGlmIChfZG9jdW1lbnRTeW5jLm9wZW5DbG9zZSAhPT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKF9lZGl0b3Iub25EaWREZXN0cm95KHRoaXMuZGlkQ2xvc2UuYmluZCh0aGlzKSkpO1xuICAgIH1cbiAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChcbiAgICAgIF9lZGl0b3Iub25EaWRTYXZlKHRoaXMuZGlkU2F2ZS5iaW5kKHRoaXMpKSxcbiAgICAgIF9lZGl0b3Iub25EaWRDaGFuZ2VQYXRoKHRoaXMuZGlkUmVuYW1lLmJpbmQodGhpcykpLFxuICAgICk7XG5cbiAgICB0aGlzLl9jdXJyZW50VXJpID0gdGhpcy5nZXRFZGl0b3JVcmkoKTtcblxuICAgIGlmIChfZG9jdW1lbnRTeW5jLm9wZW5DbG9zZSAhPT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuZGlkT3BlbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgY2hhbmdlIHRyYWNraW5nIGRpc3Bvc2FibGUgbGlzdGVuZXIgdGhhdCB3aWxsIGVuc3VyZSB0aGF0IGNoYW5nZXMgYXJlIHNlbnQgdG8gdGhlXG4gICAqIGxhbmd1YWdlIHNlcnZlciBhcyBhcHByb3ByaWF0ZS5cbiAgICovXG4gIHB1YmxpYyBzZXR1cENoYW5nZVRyYWNraW5nKGRvY3VtZW50U3luYzogVGV4dERvY3VtZW50U3luY09wdGlvbnMpOiBEaXNwb3NhYmxlIHwgbnVsbCB7XG4gICAgc3dpdGNoIChkb2N1bWVudFN5bmMuY2hhbmdlKSB7XG4gICAgICBjYXNlIFRleHREb2N1bWVudFN5bmNLaW5kLkZ1bGw6XG4gICAgICAgIHJldHVybiB0aGlzLl9lZGl0b3Iub25EaWRDaGFuZ2UodGhpcy5zZW5kRnVsbENoYW5nZXMuYmluZCh0aGlzKSk7XG4gICAgICBjYXNlIFRleHREb2N1bWVudFN5bmNLaW5kLkluY3JlbWVudGFsOlxuICAgICAgICByZXR1cm4gdGhpcy5fZWRpdG9yLmdldEJ1ZmZlcigpLm9uRGlkQ2hhbmdlVGV4dCh0aGlzLnNlbmRJbmNyZW1lbnRhbENoYW5nZXMuYmluZCh0aGlzKSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqIERpc3Bvc2UgdGhpcyBhZGFwdGVyIGVuc3VyaW5nIGFueSByZXNvdXJjZXMgYXJlIGZyZWVkIGFuZCBldmVudHMgdW5ob29rZWQuICovXG4gIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbGFuZ3VhZ2VJZCBmaWVsZCB0aGF0IHdpbGwgYmUgc2VudCB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGJ5IHNpbXBseVxuICAgKiB1c2luZyB0aGUgZ3JhbW1hciBuYW1lLlxuICAgKi9cbiAgcHVibGljIGdldExhbmd1YWdlSWQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZWRpdG9yLmdldEdyYW1tYXIoKS5uYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIGEge1ZlcnNpb25lZFRleHREb2N1bWVudElkZW50aWZpZXJ9IGZvciB0aGUgZG9jdW1lbnQgb2JzZXJ2ZWQgYnlcbiAgICogdGhpcyBhZGFwdGVyIGluY2x1ZGluZyBib3RoIHRoZSBVcmkgYW5kIHRoZSBjdXJyZW50IFZlcnNpb24uXG4gICAqL1xuICBwdWJsaWMgZ2V0VmVyc2lvbmVkVGV4dERvY3VtZW50SWRlbnRpZmllcigpOiBWZXJzaW9uZWRUZXh0RG9jdW1lbnRJZGVudGlmaWVyIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXJpOiB0aGlzLmdldEVkaXRvclVyaSgpLFxuICAgICAgdmVyc2lvbjogdGhpcy5fZ2V0VmVyc2lvbih0aGlzLl9lZGl0b3IuZ2V0UGF0aCgpIHx8ICcnKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCB0aGUgZW50aXJlIGRvY3VtZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuIFRoaXMgaXMgdXNlZCB3aGVuXG4gICAqIG9wZXJhdGluZyBpbiBGdWxsICgxKSBzeW5jIG1vZGUuXG4gICAqL1xuICBwdWJsaWMgc2VuZEZ1bGxDaGFuZ2VzKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5faXNQcmltYXJ5QWRhcHRlcigpKSB7IHJldHVybjsgfSAvLyBNdWx0aXBsZSBlZGl0b3JzLCB3ZSBhcmUgbm90IGZpcnN0XG5cbiAgICB0aGlzLl9idW1wVmVyc2lvbigpO1xuICAgIHRoaXMuX2Nvbm5lY3Rpb24uZGlkQ2hhbmdlVGV4dERvY3VtZW50KHtcbiAgICAgIHRleHREb2N1bWVudDogdGhpcy5nZXRWZXJzaW9uZWRUZXh0RG9jdW1lbnRJZGVudGlmaWVyKCksXG4gICAgICBjb250ZW50Q2hhbmdlczogW3sgdGV4dDogdGhpcy5fZWRpdG9yLmdldFRleHQoKSB9XSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFNlbmQgdGhlIGluY3JlbWVudGFsIHRleHQgY2hhbmdlcyB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyLiBUaGlzIGlzIHVzZWRcbiAgICogd2hlbiBvcGVyYXRpbmcgaW4gSW5jcmVtZW50YWwgKDIpIHN5bmMgbW9kZS5cbiAgICpcbiAgICogQHBhcmFtIGV2ZW50IFRoZSBldmVudCBmaXJlZCBieSBBdG9tIHRvIGluZGljYXRlIHRoZSBkb2N1bWVudCBoYXMgc3RvcHBlZCBjaGFuZ2luZ1xuICAgKiAgIGluY2x1ZGluZyBhIGxpc3Qgb2YgY2hhbmdlcyBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoaXMgZXZlbnQgZmlyZWQgZm9yIHRoaXNcbiAgICogICB0ZXh0IGVkaXRvci5cbiAgICogTk9URTogVGhlIG9yZGVyIG9mIGNoYW5nZXMgaW4gdGhlIGV2ZW50IGlzIGd1YXJhbnRlZWQgdG9wIHRvIGJvdHRvbS4gIExhbmd1YWdlIHNlcnZlclxuICAgKiBleHBlY3RzIHRoaXMgaW4gcmV2ZXJzZS5cbiAgICovXG4gIHB1YmxpYyBzZW5kSW5jcmVtZW50YWxDaGFuZ2VzKGV2ZW50OiBCdWZmZXJTdG9wcGVkQ2hhbmdpbmdFdmVudCk6IHZvaWQge1xuICAgIGlmIChldmVudC5jaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmICghdGhpcy5faXNQcmltYXJ5QWRhcHRlcigpKSB7IHJldHVybjsgfSAvLyBNdWx0aXBsZSBlZGl0b3JzLCB3ZSBhcmUgbm90IGZpcnN0XG5cbiAgICAgIHRoaXMuX2J1bXBWZXJzaW9uKCk7XG4gICAgICB0aGlzLl9jb25uZWN0aW9uLmRpZENoYW5nZVRleHREb2N1bWVudCh7XG4gICAgICAgIHRleHREb2N1bWVudDogdGhpcy5nZXRWZXJzaW9uZWRUZXh0RG9jdW1lbnRJZGVudGlmaWVyKCksXG4gICAgICAgIGNvbnRlbnRDaGFuZ2VzOiBldmVudC5jaGFuZ2VzLm1hcChUZXh0RWRpdG9yU3luY0FkYXB0ZXIudGV4dEVkaXRUb0NvbnRlbnRDaGFuZ2UpLnJldmVyc2UoKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYW4gQXRvbSB7VGV4dEVkaXRFdmVudH0gdG8gYSBsYW5ndWFnZSBzZXJ2ZXIge1RleHREb2N1bWVudENvbnRlbnRDaGFuZ2VFdmVudH0gb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0gY2hhbmdlIFRoZSBBdG9tIHtUZXh0RWRpdEV2ZW50fSB0byBjb252ZXJ0LlxuICAgKiBAcmV0dXJucyBBIHtUZXh0RG9jdW1lbnRDb250ZW50Q2hhbmdlRXZlbnR9IHRoYXQgcmVwcmVzZW50cyB0aGUgY29udmVydGVkIHtUZXh0RWRpdEV2ZW50fS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgdGV4dEVkaXRUb0NvbnRlbnRDaGFuZ2UoY2hhbmdlOiBUZXh0Q2hhbmdlKTogVGV4dERvY3VtZW50Q29udGVudENoYW5nZUV2ZW50IHtcbiAgICByZXR1cm4ge1xuICAgICAgcmFuZ2U6IENvbnZlcnQuYXRvbVJhbmdlVG9MU1JhbmdlKGNoYW5nZS5vbGRSYW5nZSksXG4gICAgICByYW5nZUxlbmd0aDogY2hhbmdlLm9sZFRleHQubGVuZ3RoLFxuICAgICAgdGV4dDogY2hhbmdlLm5ld1RleHQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgX2lzUHJpbWFyeUFkYXB0ZXIoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbG93ZXN0SWRGb3JCdWZmZXIgPSBNYXRoLm1pbihcbiAgICAgIC4uLmF0b20ud29ya3NwYWNlXG4gICAgICAgIC5nZXRUZXh0RWRpdG9ycygpXG4gICAgICAgIC5maWx0ZXIoKHQpID0+IHQuZ2V0QnVmZmVyKCkgPT09IHRoaXMuX2VkaXRvci5nZXRCdWZmZXIoKSlcbiAgICAgICAgLm1hcCgodCkgPT4gdC5pZCksXG4gICAgKTtcbiAgICByZXR1cm4gbG93ZXN0SWRGb3JCdWZmZXIgPT09IHRoaXMuX2VkaXRvci5pZDtcbiAgfVxuXG4gIHByaXZhdGUgX2J1bXBWZXJzaW9uKCk6IHZvaWQge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gdGhpcy5fZWRpdG9yLmdldFBhdGgoKTtcbiAgICBpZiAoZmlsZVBhdGggPT0gbnVsbCkgeyByZXR1cm47IH1cbiAgICB0aGlzLl92ZXJzaW9ucy5zZXQoZmlsZVBhdGgsIHRoaXMuX2dldFZlcnNpb24oZmlsZVBhdGgpICsgMSk7XG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlIHdoZW4gdGhlIGRvY3VtZW50IGlzIG9wZW5lZCB3ZSBzZW5kIG5vdGlmaWNhdGlvbiB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqIHNvIGl0IGNhbiBsb2FkIGl0IGluIGFuZCBrZWVwIHRyYWNrIG9mIGRpYWdub3N0aWNzIGV0Yy5cbiAgICovXG4gIHByaXZhdGUgZGlkT3BlbigpOiB2b2lkIHtcbiAgICBjb25zdCBmaWxlUGF0aCA9IHRoaXMuX2VkaXRvci5nZXRQYXRoKCk7XG4gICAgaWYgKGZpbGVQYXRoID09IG51bGwpIHsgcmV0dXJuOyB9IC8vIE5vdCB5ZXQgc2F2ZWRcblxuICAgIGlmICghdGhpcy5faXNQcmltYXJ5QWRhcHRlcigpKSB7IHJldHVybjsgfSAvLyBNdWx0aXBsZSBlZGl0b3JzLCB3ZSBhcmUgbm90IGZpcnN0XG5cbiAgICB0aGlzLl9jb25uZWN0aW9uLmRpZE9wZW5UZXh0RG9jdW1lbnQoe1xuICAgICAgdGV4dERvY3VtZW50OiB7XG4gICAgICAgIHVyaTogdGhpcy5nZXRFZGl0b3JVcmkoKSxcbiAgICAgICAgbGFuZ3VhZ2VJZDogdGhpcy5nZXRMYW5ndWFnZUlkKCkudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgdmVyc2lvbjogdGhpcy5fZ2V0VmVyc2lvbihmaWxlUGF0aCksXG4gICAgICAgIHRleHQ6IHRoaXMuX2VkaXRvci5nZXRUZXh0KCksXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0VmVyc2lvbihmaWxlUGF0aDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fdmVyc2lvbnMuZ2V0KGZpbGVQYXRoKSB8fCAxO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSB7VGV4dEVkaXRvcn0gaXMgY2xvc2VkIGFuZCBzZW5kcyB0aGUgJ2RpZENsb3NlVGV4dERvY3VtZW50JyBub3RpZmljYXRpb24gdG9cbiAgICogdGhlIGNvbm5lY3RlZCBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqL1xuICBwdWJsaWMgZGlkQ2xvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2VkaXRvci5nZXRQYXRoKCkgPT0gbnVsbCkgeyByZXR1cm47IH0gLy8gTm90IHlldCBzYXZlZFxuXG4gICAgY29uc3QgZmlsZVN0aWxsT3BlbiA9IGF0b20ud29ya3NwYWNlLmdldFRleHRFZGl0b3JzKCkuZmluZCgodCkgPT4gdC5nZXRCdWZmZXIoKSA9PT0gdGhpcy5fZWRpdG9yLmdldEJ1ZmZlcigpKTtcbiAgICBpZiAoZmlsZVN0aWxsT3Blbikge1xuICAgICAgcmV0dXJuOyAvLyBPdGhlciB3aW5kb3dzIG9yIGVkaXRvcnMgc3RpbGwgaGF2ZSB0aGlzIGZpbGUgb3BlblxuICAgIH1cblxuICAgIHRoaXMuX2Nvbm5lY3Rpb24uZGlkQ2xvc2VUZXh0RG9jdW1lbnQoeyB0ZXh0RG9jdW1lbnQ6IHsgdXJpOiB0aGlzLmdldEVkaXRvclVyaSgpIH0gfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIGp1c3QgYmVmb3JlIHRoZSB7VGV4dEVkaXRvcn0gc2F2ZXMgYW5kIHNlbmRzIHRoZSAnd2lsbFNhdmVUZXh0RG9jdW1lbnQnIG5vdGlmaWNhdGlvbiB0b1xuICAgKiB0aGUgY29ubmVjdGVkIGxhbmd1YWdlIHNlcnZlci5cbiAgICovXG4gIHB1YmxpYyB3aWxsU2F2ZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuX2lzUHJpbWFyeUFkYXB0ZXIoKSkgeyByZXR1cm47IH1cblxuICAgIGNvbnN0IHVyaSA9IHRoaXMuZ2V0RWRpdG9yVXJpKCk7XG4gICAgdGhpcy5fY29ubmVjdGlvbi53aWxsU2F2ZVRleHREb2N1bWVudCh7XG4gICAgICB0ZXh0RG9jdW1lbnQ6IHsgdXJpIH0sXG4gICAgICByZWFzb246IFRleHREb2N1bWVudFNhdmVSZWFzb24uTWFudWFsLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBqdXN0IGJlZm9yZSB0aGUge1RleHRFZGl0b3J9IHNhdmVzLCBzZW5kcyB0aGUgJ3dpbGxTYXZlV2FpdFVudGlsVGV4dERvY3VtZW50JyByZXF1ZXN0IHRvXG4gICAqIHRoZSBjb25uZWN0ZWQgbGFuZ3VhZ2Ugc2VydmVyIGFuZCB3YWl0cyBmb3IgdGhlIHJlc3BvbnNlIGJlZm9yZSBzYXZpbmcgdGhlIGJ1ZmZlci5cbiAgICovXG4gIHB1YmxpYyBhc3luYyB3aWxsU2F2ZVdhaXRVbnRpbCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX2lzUHJpbWFyeUFkYXB0ZXIoKSkgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7IH1cblxuICAgIGNvbnN0IGJ1ZmZlciA9IHRoaXMuX2VkaXRvci5nZXRCdWZmZXIoKTtcbiAgICBjb25zdCB1cmkgPSB0aGlzLmdldEVkaXRvclVyaSgpO1xuICAgIGNvbnN0IHRpdGxlID0gdGhpcy5fZWRpdG9yLmdldExvbmdUaXRsZSgpO1xuXG4gICAgY29uc3QgYXBwbHlFZGl0c09yVGltZW91dCA9IFV0aWxzLnByb21pc2VXaXRoVGltZW91dChcbiAgICAgIDI1MDAsIC8vIDIuNSBzZWNvbmRzIHRpbWVvdXRcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb24ud2lsbFNhdmVXYWl0VW50aWxUZXh0RG9jdW1lbnQoe1xuICAgICAgICB0ZXh0RG9jdW1lbnQ6IHsgdXJpIH0sXG4gICAgICAgIHJlYXNvbjogVGV4dERvY3VtZW50U2F2ZVJlYXNvbi5NYW51YWwsXG4gICAgICB9KSxcbiAgICApLnRoZW4oKGVkaXRzKSA9PiB7XG4gICAgICBjb25zdCBjdXJzb3IgPSB0aGlzLl9lZGl0b3IuZ2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oKTtcbiAgICAgIEFwcGx5RWRpdEFkYXB0ZXIuYXBwbHlFZGl0cyhidWZmZXIsIENvbnZlcnQuY29udmVydExzVGV4dEVkaXRzKGVkaXRzKSk7XG4gICAgICB0aGlzLl9lZGl0b3Iuc2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oY3Vyc29yKTtcbiAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ09uLXNhdmUgYWN0aW9uIGZhaWxlZCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246IGBGYWlsZWQgdG8gYXBwbHkgZWRpdHMgdG8gJHt0aXRsZX1gLFxuICAgICAgICBkZXRhaWw6IGVyci5tZXNzYWdlLFxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfSk7XG5cbiAgICBjb25zdCB3aXRoQnVzeVNpZ25hbCA9XG4gICAgICB0aGlzLl9yZXBvcnRCdXN5V2hpbGUoXG4gICAgICAgIGBBcHBseWluZyBvbi1zYXZlIGVkaXRzIGZvciAke3RpdGxlfWAsXG4gICAgICAgICgpID0+IGFwcGx5RWRpdHNPclRpbWVvdXQsXG4gICAgICApO1xuICAgIHJldHVybiB3aXRoQnVzeVNpZ25hbCB8fCBhcHBseUVkaXRzT3JUaW1lb3V0O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSB7VGV4dEVkaXRvcn0gc2F2ZXMgYW5kIHNlbmRzIHRoZSAnZGlkU2F2ZVRleHREb2N1bWVudCcgbm90aWZpY2F0aW9uIHRvXG4gICAqIHRoZSBjb25uZWN0ZWQgbGFuZ3VhZ2Ugc2VydmVyLlxuICAgKiBOb3RlOiBSaWdodCBub3cgdGhpcyBhbHNvIHNlbmRzIHRoZSBgZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzYCBub3RpZmljYXRpb24gYXMgd2VsbCBidXQgdGhhdFxuICAgKiB3aWxsIGJlIHNlbnQgZnJvbSBlbHNld2hlcmUgc29vbi5cbiAgICovXG4gIHB1YmxpYyBkaWRTYXZlKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5faXNQcmltYXJ5QWRhcHRlcigpKSB7IHJldHVybjsgfVxuXG4gICAgY29uc3QgdXJpID0gdGhpcy5nZXRFZGl0b3JVcmkoKTtcbiAgICBjb25zdCBkaWRTYXZlTm90aWZpY2F0aW9uID0ge1xuICAgICAgdGV4dERvY3VtZW50OiB7IHVyaSwgdmVyc2lvbjogdGhpcy5fZ2V0VmVyc2lvbigodXJpKSkgfSxcbiAgICB9IGFzIERpZFNhdmVUZXh0RG9jdW1lbnRQYXJhbXM7XG4gICAgaWYgKHRoaXMuX2RvY3VtZW50U3luYy5zYXZlICYmIHRoaXMuX2RvY3VtZW50U3luYy5zYXZlLmluY2x1ZGVUZXh0KSB7XG4gICAgICBkaWRTYXZlTm90aWZpY2F0aW9uLnRleHQgPSB0aGlzLl9lZGl0b3IuZ2V0VGV4dCgpO1xuICAgIH1cbiAgICB0aGlzLl9jb25uZWN0aW9uLmRpZFNhdmVUZXh0RG9jdW1lbnQoZGlkU2F2ZU5vdGlmaWNhdGlvbik7XG4gICAgaWYgKHRoaXMuX2Zha2VEaWRDaGFuZ2VXYXRjaGVkRmlsZXMpIHtcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb24uZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzKHtcbiAgICAgICAgY2hhbmdlczogW3sgdXJpLCB0eXBlOiBGaWxlQ2hhbmdlVHlwZS5DaGFuZ2VkIH1dLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGRpZFJlbmFtZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuX2lzUHJpbWFyeUFkYXB0ZXIoKSkgeyByZXR1cm47IH1cblxuICAgIGNvbnN0IG9sZFVyaSA9IHRoaXMuX2N1cnJlbnRVcmk7XG4gICAgdGhpcy5fY3VycmVudFVyaSA9IHRoaXMuZ2V0RWRpdG9yVXJpKCk7XG4gICAgaWYgKCFvbGRVcmkpIHtcbiAgICAgIHJldHVybjsgLy8gRGlkbid0IHByZXZpb3VzbHkgaGF2ZSBhIG5hbWVcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZG9jdW1lbnRTeW5jLm9wZW5DbG9zZSAhPT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb24uZGlkQ2xvc2VUZXh0RG9jdW1lbnQoeyB0ZXh0RG9jdW1lbnQ6IHsgdXJpOiBvbGRVcmkgfSB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZmFrZURpZENoYW5nZVdhdGNoZWRGaWxlcykge1xuICAgICAgdGhpcy5fY29ubmVjdGlvbi5kaWRDaGFuZ2VXYXRjaGVkRmlsZXMoe1xuICAgICAgICBjaGFuZ2VzOiBbXG4gICAgICAgICAgeyB1cmk6IG9sZFVyaSwgdHlwZTogRmlsZUNoYW5nZVR5cGUuRGVsZXRlZCB9LFxuICAgICAgICAgIHsgdXJpOiB0aGlzLl9jdXJyZW50VXJpLCB0eXBlOiBGaWxlQ2hhbmdlVHlwZS5DcmVhdGVkIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBTZW5kIGFuIGVxdWl2YWxlbnQgb3BlbiBldmVudCBmb3IgdGhpcyBlZGl0b3IsIHdoaWNoIHdpbGwgbm93IHVzZSB0aGUgbmV3XG4gICAgLy8gZmlsZSBwYXRoLlxuICAgIGlmICh0aGlzLl9kb2N1bWVudFN5bmMub3BlbkNsb3NlICE9PSBmYWxzZSkge1xuICAgICAgdGhpcy5kaWRPcGVuKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFB1YmxpYzogT2J0YWluIHRoZSBjdXJyZW50IHtUZXh0RWRpdG9yfSBwYXRoIGFuZCBjb252ZXJ0IGl0IHRvIGEgVXJpLiAqL1xuICBwdWJsaWMgZ2V0RWRpdG9yVXJpKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIENvbnZlcnQucGF0aFRvVXJpKHRoaXMuX2VkaXRvci5nZXRQYXRoKCkgfHwgJycpO1xuICB9XG59XG4iXX0=