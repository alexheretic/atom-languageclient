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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnQtc3luYy1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2FkYXB0ZXJzL2RvY3VtZW50LXN5bmMtYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsd0NBQWlDO0FBQ2pDLHNEQVUyQjtBQUMzQiw2REFBb0Q7QUFDcEQsK0JBTWM7QUFDZCxrQ0FBa0M7QUFFbEM7Ozs7R0FJRztBQUNILE1BQXFCLG1CQUFtQjtJQW1DdEM7Ozs7Ozs7T0FPRztJQUNILFlBQ1UsV0FBcUMsRUFDckMsZUFBZ0QsRUFDeEQsWUFBd0UsRUFDaEUsZ0JBQXVDO1FBSHZDLGdCQUFXLEdBQVgsV0FBVyxDQUEwQjtRQUNyQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUM7UUFFaEQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF1QjtRQTlDekMsZ0JBQVcsR0FBRyxJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFFeEMsYUFBUSxHQUErQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ3JFLGNBQVMsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQTZDakQsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLEVBQUU7WUFDcEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7U0FDbkM7YUFBTTtZQUNMLElBQUksQ0FBQyxhQUFhLEdBQUc7Z0JBQ25CLE1BQU0sRUFBRSxZQUFZLElBQUkscUNBQW9CLENBQUMsSUFBSTthQUNsRCxDQUFDO1NBQ0g7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBbkREOzs7Ozs7OztPQVFHO0lBQ0ksTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBc0M7UUFDM0QsT0FBTyxJQUFJLENBQUMsVUFB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MUU7UUFFRCxJQUFJLElBQUksQ0FBQywwQkFBMEIsRUFBRTtZQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDO2dCQUNyQyxPQUFPLEVBQUU7b0JBQ1AsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSwrQkFBYyxDQUFDLE9BQU8sRUFBRTtvQkFDN0MsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsK0JBQWMsQ0FBQyxPQUFPLEVBQUU7aUJBQ3hEO2FBQ0YsQ0FBQyxDQUFDO1NBQ0o7UUFFRCw0RUFBNEU7UUFDNUUsYUFBYTtRQUNiLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEtBQUssS0FBSyxFQUFFO1lBQzFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNoQjtJQUNILENBQUM7SUFFRCw0RUFBNEU7SUFDckUsWUFBWTtRQUNqQixPQUFPLGlCQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDekQsQ0FBQztDQUNGO0FBNVNELHNEQTRTQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBDb252ZXJ0IGZyb20gJy4uL2NvbnZlcnQnO1xuaW1wb3J0IHtcbiAgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICBGaWxlQ2hhbmdlVHlwZSxcbiAgVGV4dERvY3VtZW50U2F2ZVJlYXNvbixcbiAgVGV4dERvY3VtZW50U3luY0tpbmQsXG4gIFRleHREb2N1bWVudFN5bmNPcHRpb25zLFxuICBUZXh0RG9jdW1lbnRDb250ZW50Q2hhbmdlRXZlbnQsXG4gIFZlcnNpb25lZFRleHREb2N1bWVudElkZW50aWZpZXIsXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbiAgRGlkU2F2ZVRleHREb2N1bWVudFBhcmFtcyxcbn0gZnJvbSAnLi4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IEFwcGx5RWRpdEFkYXB0ZXIgZnJvbSAnLi9hcHBseS1lZGl0LWFkYXB0ZXInO1xuaW1wb3J0IHtcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgRGlzcG9zYWJsZSxcbiAgVGV4dEVkaXRvcixcbiAgQnVmZmVyU3RvcHBlZENoYW5naW5nRXZlbnQsXG4gIFRleHRDaGFuZ2UsXG59IGZyb20gJ2F0b20nO1xuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFB1YmxpYzogU3luY2hyb25pemVzIHRoZSBkb2N1bWVudHMgYmV0d2VlbiBBdG9tIGFuZCB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGJ5IG5vdGlmeWluZ1xuICogZWFjaCBlbmQgb2YgY2hhbmdlcywgb3BlbmluZywgY2xvc2luZyBhbmQgb3RoZXIgZXZlbnRzIGFzIHdlbGwgYXMgc2VuZGluZyBhbmQgYXBwbHlpbmdcbiAqIGNoYW5nZXMgZWl0aGVyIGluIHdob2xlIG9yIGluIHBhcnQgZGVwZW5kaW5nIG9uIHdoYXQgdGhlIGxhbmd1YWdlIHNlcnZlciBzdXBwb3J0cy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRG9jdW1lbnRTeW5jQWRhcHRlciB7XG4gIHByaXZhdGUgX2Rpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwdWJsaWMgX2RvY3VtZW50U3luYzogVGV4dERvY3VtZW50U3luY09wdGlvbnM7XG4gIHByaXZhdGUgX2VkaXRvcnM6IFdlYWtNYXA8VGV4dEVkaXRvciwgVGV4dEVkaXRvclN5bmNBZGFwdGVyPiA9IG5ldyBXZWFrTWFwKCk7XG4gIHByaXZhdGUgX3ZlcnNpb25zOiBNYXA8c3RyaW5nLCBudW1iZXI+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBQdWJsaWM6IERldGVybWluZSB3aGV0aGVyIHRoaXMgYWRhcHRlciBjYW4gYmUgdXNlZCB0byBhZGFwdCBhIGxhbmd1YWdlIHNlcnZlclxuICAgKiBiYXNlZCBvbiB0aGUgc2VydmVyQ2FwYWJpbGl0aWVzIG1hdHJpeCB0ZXh0RG9jdW1lbnRTeW5jIGNhcGFiaWxpdHkgZWl0aGVyIGJlaW5nIEZ1bGwgb3JcbiAgICogSW5jcmVtZW50YWwuXG4gICAqXG4gICAqIEBwYXJhbSBzZXJ2ZXJDYXBhYmlsaXRpZXMgVGhlIHtTZXJ2ZXJDYXBhYmlsaXRpZXN9IG9mIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdG8gY29uc2lkZXIuXG4gICAqIEByZXR1cm5zIEEge0Jvb2xlYW59IGluZGljYXRpbmcgYWRhcHRlciBjYW4gYWRhcHQgdGhlIHNlcnZlciBiYXNlZCBvbiB0aGVcbiAgICogICBnaXZlbiBzZXJ2ZXJDYXBhYmlsaXRpZXMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNhbkFkYXB0KHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY2FuQWRhcHRWMihzZXJ2ZXJDYXBhYmlsaXRpZXMpIHx8IHRoaXMuY2FuQWRhcHRWMyhzZXJ2ZXJDYXBhYmlsaXRpZXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgY2FuQWRhcHRWMihzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoXG4gICAgICBzZXJ2ZXJDYXBhYmlsaXRpZXMudGV4dERvY3VtZW50U3luYyA9PT0gVGV4dERvY3VtZW50U3luY0tpbmQuSW5jcmVtZW50YWwgfHxcbiAgICAgIHNlcnZlckNhcGFiaWxpdGllcy50ZXh0RG9jdW1lbnRTeW5jID09PSBUZXh0RG9jdW1lbnRTeW5jS2luZC5GdWxsXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGNhbkFkYXB0VjMoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICBjb25zdCBvcHRpb25zID0gc2VydmVyQ2FwYWJpbGl0aWVzLnRleHREb2N1bWVudFN5bmM7XG4gICAgcmV0dXJuIChcbiAgICAgIG9wdGlvbnMgIT09IG51bGwgJiZcbiAgICAgIHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0JyAmJlxuICAgICAgKG9wdGlvbnMuY2hhbmdlID09PSBUZXh0RG9jdW1lbnRTeW5jS2luZC5JbmNyZW1lbnRhbCB8fCBvcHRpb25zLmNoYW5nZSA9PT0gVGV4dERvY3VtZW50U3luY0tpbmQuRnVsbClcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIGEgbmV3IHtEb2N1bWVudFN5bmNBZGFwdGVyfSBmb3IgdGhlIGdpdmVuIGxhbmd1YWdlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRvIGJlIGtlcHQgaW4gc3luYy5cbiAgICogQHBhcmFtIGRvY3VtZW50U3luYyBUaGUgZG9jdW1lbnQgc3luY2luZyBvcHRpb25zLlxuICAgKiBAcGFyYW0gZWRpdG9yU2VsZWN0b3IgQSBwcmVkaWNhdGUgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIHtUZXh0RWRpdG9yfSBhbmQgcmV0dXJucyBhIHtib29sZWFufVxuICAgKiAgIGluZGljYXRpbmcgd2hldGhlciB0aGlzIGFkYXB0ZXIgc2hvdWxkIGNhcmUgYWJvdXQgdGhlIGNvbnRlbnRzIG9mIHRoZSBlZGl0b3IuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIF9jb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gICAgcHJpdmF0ZSBfZWRpdG9yU2VsZWN0b3I6IChlZGl0b3I6IFRleHRFZGl0b3IpID0+IGJvb2xlYW4sXG4gICAgZG9jdW1lbnRTeW5jOiBUZXh0RG9jdW1lbnRTeW5jT3B0aW9ucyB8IFRleHREb2N1bWVudFN5bmNLaW5kIHwgdW5kZWZpbmVkLFxuICAgIHByaXZhdGUgX3JlcG9ydEJ1c3lXaGlsZTogVXRpbHMuUmVwb3J0QnVzeVdoaWxlLFxuICApIHtcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50U3luYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHRoaXMuX2RvY3VtZW50U3luYyA9IGRvY3VtZW50U3luYztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZG9jdW1lbnRTeW5jID0ge1xuICAgICAgICBjaGFuZ2U6IGRvY3VtZW50U3luYyB8fCBUZXh0RG9jdW1lbnRTeW5jS2luZC5GdWxsLFxuICAgICAgfTtcbiAgICB9XG4gICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoYXRvbS50ZXh0RWRpdG9ycy5vYnNlcnZlKHRoaXMub2JzZXJ2ZVRleHRFZGl0b3IuYmluZCh0aGlzKSkpO1xuICB9XG5cbiAgLyoqIERpc3Bvc2UgdGhpcyBhZGFwdGVyIGVuc3VyaW5nIGFueSByZXNvdXJjZXMgYXJlIGZyZWVkIGFuZCBldmVudHMgdW5ob29rZWQuICovXG4gIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YW1pbmUgYSB7VGV4dEVkaXRvcn0gYW5kIGRlY2lkZSBpZiB3ZSB3aXNoIHRvIG9ic2VydmUgaXQuIElmIHNvIGVuc3VyZSB0aGF0IHdlIHN0b3Agb2JzZXJ2aW5nIGl0XG4gICAqIHdoZW4gaXQgaXMgY2xvc2VkIG9yIG90aGVyd2lzZSBkZXN0cm95ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBlZGl0b3IgQSB7VGV4dEVkaXRvcn0gdG8gY29uc2lkZXIgZm9yIG9ic2VydmF0aW9uLlxuICAgKi9cbiAgcHVibGljIG9ic2VydmVUZXh0RWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcik6IHZvaWQge1xuICAgIGNvbnN0IGxpc3RlbmVyID0gZWRpdG9yLm9ic2VydmVHcmFtbWFyKChfZ3JhbW1hcikgPT4gdGhpcy5faGFuZGxlR3JhbW1hckNoYW5nZShlZGl0b3IpKTtcbiAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChcbiAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4ge1xuICAgICAgICB0aGlzLl9kaXNwb3NhYmxlLnJlbW92ZShsaXN0ZW5lcik7XG4gICAgICAgIGxpc3RlbmVyLmRpc3Bvc2UoKTtcbiAgICAgIH0pLFxuICAgICk7XG4gICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQobGlzdGVuZXIpO1xuICAgIGlmICghdGhpcy5fZWRpdG9ycy5oYXMoZWRpdG9yKSAmJiB0aGlzLl9lZGl0b3JTZWxlY3RvcihlZGl0b3IpKSB7XG4gICAgICB0aGlzLl9oYW5kbGVOZXdFZGl0b3IoZWRpdG9yKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9oYW5kbGVHcmFtbWFyQ2hhbmdlKGVkaXRvcjogVGV4dEVkaXRvcik6IHZvaWQge1xuICAgIGNvbnN0IHN5bmMgPSB0aGlzLl9lZGl0b3JzLmdldChlZGl0b3IpO1xuICAgIGlmIChzeW5jICE9IG51bGwgJiYgIXRoaXMuX2VkaXRvclNlbGVjdG9yKGVkaXRvcikpIHtcbiAgICAgIHRoaXMuX2VkaXRvcnMuZGVsZXRlKGVkaXRvcik7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlLnJlbW92ZShzeW5jKTtcbiAgICAgIHN5bmMuZGlkQ2xvc2UoKTtcbiAgICAgIHN5bmMuZGlzcG9zZSgpO1xuICAgIH0gZWxzZSBpZiAoc3luYyA9PSBudWxsICYmIHRoaXMuX2VkaXRvclNlbGVjdG9yKGVkaXRvcikpIHtcbiAgICAgIHRoaXMuX2hhbmRsZU5ld0VkaXRvcihlZGl0b3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2hhbmRsZU5ld0VkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiB2b2lkIHtcbiAgICBjb25zdCBzeW5jID0gbmV3IFRleHRFZGl0b3JTeW5jQWRhcHRlcihcbiAgICAgIGVkaXRvcixcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb24sXG4gICAgICB0aGlzLl9kb2N1bWVudFN5bmMsXG4gICAgICB0aGlzLl92ZXJzaW9ucyxcbiAgICAgIHRoaXMuX3JlcG9ydEJ1c3lXaGlsZSxcbiAgICApO1xuICAgIHRoaXMuX2VkaXRvcnMuc2V0KGVkaXRvciwgc3luYyk7XG4gICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoc3luYyk7XG4gICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoXG4gICAgICBlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IHtcbiAgICAgICAgY29uc3QgZGVzdHJveWVkU3luYyA9IHRoaXMuX2VkaXRvcnMuZ2V0KGVkaXRvcik7XG4gICAgICAgIGlmIChkZXN0cm95ZWRTeW5jKSB7XG4gICAgICAgICAgdGhpcy5fZWRpdG9ycy5kZWxldGUoZWRpdG9yKTtcbiAgICAgICAgICB0aGlzLl9kaXNwb3NhYmxlLnJlbW92ZShkZXN0cm95ZWRTeW5jKTtcbiAgICAgICAgICBkZXN0cm95ZWRTeW5jLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXRFZGl0b3JTeW5jQWRhcHRlcihlZGl0b3I6IFRleHRFZGl0b3IpOiBUZXh0RWRpdG9yU3luY0FkYXB0ZXIgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9lZGl0b3JzLmdldChlZGl0b3IpO1xuICB9XG59XG5cbi8qKiBQdWJsaWM6IEtlZXAgYSBzaW5nbGUge1RleHRFZGl0b3J9IGluIHN5bmMgd2l0aCBhIGdpdmVuIGxhbmd1YWdlIHNlcnZlci4gKi9cbmV4cG9ydCBjbGFzcyBUZXh0RWRpdG9yU3luY0FkYXB0ZXIge1xuICBwcml2YXRlIF9kaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHJpdmF0ZSBfY3VycmVudFVyaTogc3RyaW5nO1xuICBwcml2YXRlIF9mYWtlRGlkQ2hhbmdlV2F0Y2hlZEZpbGVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSBhIHtUZXh0RWRpdG9yU3luY0FkYXB0ZXJ9IGluIHN5bmMgd2l0aCBhIGdpdmVuIGxhbmd1YWdlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGVkaXRvciBBIHtUZXh0RWRpdG9yfSB0byBrZWVwIGluIHN5bmMuXG4gICAqIEBwYXJhbSBjb25uZWN0aW9uIEEge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gdG8gYSBsYW5ndWFnZSBzZXJ2ZXIgdG8ga2VlcCBpbiBzeW5jLlxuICAgKiBAcGFyYW0gZG9jdW1lbnRTeW5jIFRoZSBkb2N1bWVudCBzeW5jaW5nIG9wdGlvbnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIF9lZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcHJpdmF0ZSBfY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIHByaXZhdGUgX2RvY3VtZW50U3luYzogVGV4dERvY3VtZW50U3luY09wdGlvbnMsXG4gICAgcHJpdmF0ZSBfdmVyc2lvbnM6IE1hcDxzdHJpbmcsIG51bWJlcj4sXG4gICAgcHJpdmF0ZSBfcmVwb3J0QnVzeVdoaWxlOiBVdGlscy5SZXBvcnRCdXN5V2hpbGUsXG4gICkge1xuICAgIHRoaXMuX2Zha2VEaWRDaGFuZ2VXYXRjaGVkRmlsZXMgPSBhdG9tLnByb2plY3Qub25EaWRDaGFuZ2VGaWxlcyA9PSBudWxsO1xuXG4gICAgY29uc3QgY2hhbmdlVHJhY2tpbmcgPSB0aGlzLnNldHVwQ2hhbmdlVHJhY2tpbmcoX2RvY3VtZW50U3luYyk7XG4gICAgaWYgKGNoYW5nZVRyYWNraW5nICE9IG51bGwpIHtcbiAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGNoYW5nZVRyYWNraW5nKTtcbiAgICB9XG5cbiAgICAvLyBUaGVzZSBoYW5kbGVycyBhcmUgYXR0YWNoZWQgb25seSBpZiBzZXJ2ZXIgc3VwcG9ydHMgdGhlbVxuICAgIGlmIChfZG9jdW1lbnRTeW5jLndpbGxTYXZlKSB7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChfZWRpdG9yLmdldEJ1ZmZlcigpLm9uV2lsbFNhdmUodGhpcy53aWxsU2F2ZS5iaW5kKHRoaXMpKSk7XG4gICAgfVxuICAgIGlmIChfZG9jdW1lbnRTeW5jLndpbGxTYXZlV2FpdFVudGlsKSB7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChfZWRpdG9yLmdldEJ1ZmZlcigpLm9uV2lsbFNhdmUodGhpcy53aWxsU2F2ZVdhaXRVbnRpbC5iaW5kKHRoaXMpKSk7XG4gICAgfVxuICAgIC8vIFNlbmQgY2xvc2Ugbm90aWZpY2F0aW9ucyB1bmxlc3MgaXQncyBleHBsaWNpdGx5IGRpc2FibGVkXG4gICAgaWYgKF9kb2N1bWVudFN5bmMub3BlbkNsb3NlICE9PSBmYWxzZSkge1xuICAgICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoX2VkaXRvci5vbkRpZERlc3Ryb3kodGhpcy5kaWRDbG9zZS5iaW5kKHRoaXMpKSk7XG4gICAgfVxuICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKFxuICAgICAgX2VkaXRvci5vbkRpZFNhdmUodGhpcy5kaWRTYXZlLmJpbmQodGhpcykpLFxuICAgICAgX2VkaXRvci5vbkRpZENoYW5nZVBhdGgodGhpcy5kaWRSZW5hbWUuYmluZCh0aGlzKSksXG4gICAgKTtcblxuICAgIHRoaXMuX2N1cnJlbnRVcmkgPSB0aGlzLmdldEVkaXRvclVyaSgpO1xuXG4gICAgaWYgKF9kb2N1bWVudFN5bmMub3BlbkNsb3NlICE9PSBmYWxzZSkge1xuICAgICAgdGhpcy5kaWRPcGVuKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBjaGFuZ2UgdHJhY2tpbmcgZGlzcG9zYWJsZSBsaXN0ZW5lciB0aGF0IHdpbGwgZW5zdXJlIHRoYXQgY2hhbmdlcyBhcmUgc2VudCB0byB0aGVcbiAgICogbGFuZ3VhZ2Ugc2VydmVyIGFzIGFwcHJvcHJpYXRlLlxuICAgKi9cbiAgcHVibGljIHNldHVwQ2hhbmdlVHJhY2tpbmcoZG9jdW1lbnRTeW5jOiBUZXh0RG9jdW1lbnRTeW5jT3B0aW9ucyk6IERpc3Bvc2FibGUgfCBudWxsIHtcbiAgICBzd2l0Y2ggKGRvY3VtZW50U3luYy5jaGFuZ2UpIHtcbiAgICAgIGNhc2UgVGV4dERvY3VtZW50U3luY0tpbmQuRnVsbDpcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VkaXRvci5vbkRpZENoYW5nZSh0aGlzLnNlbmRGdWxsQ2hhbmdlcy5iaW5kKHRoaXMpKTtcbiAgICAgIGNhc2UgVGV4dERvY3VtZW50U3luY0tpbmQuSW5jcmVtZW50YWw6XG4gICAgICAgIHJldHVybiB0aGlzLl9lZGl0b3IuZ2V0QnVmZmVyKCkub25EaWRDaGFuZ2VUZXh0KHRoaXMuc2VuZEluY3JlbWVudGFsQ2hhbmdlcy5iaW5kKHRoaXMpKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKiogRGlzcG9zZSB0aGlzIGFkYXB0ZXIgZW5zdXJpbmcgYW55IHJlc291cmNlcyBhcmUgZnJlZWQgYW5kIGV2ZW50cyB1bmhvb2tlZC4gKi9cbiAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5fZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBsYW5ndWFnZUlkIGZpZWxkIHRoYXQgd2lsbCBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgYnkgc2ltcGx5XG4gICAqIHVzaW5nIHRoZSBncmFtbWFyIG5hbWUuXG4gICAqL1xuICBwdWJsaWMgZ2V0TGFuZ3VhZ2VJZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9lZGl0b3IuZ2V0R3JhbW1hcigpLm5hbWU7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUgYSB7VmVyc2lvbmVkVGV4dERvY3VtZW50SWRlbnRpZmllcn0gZm9yIHRoZSBkb2N1bWVudCBvYnNlcnZlZCBieVxuICAgKiB0aGlzIGFkYXB0ZXIgaW5jbHVkaW5nIGJvdGggdGhlIFVyaSBhbmQgdGhlIGN1cnJlbnQgVmVyc2lvbi5cbiAgICovXG4gIHB1YmxpYyBnZXRWZXJzaW9uZWRUZXh0RG9jdW1lbnRJZGVudGlmaWVyKCk6IFZlcnNpb25lZFRleHREb2N1bWVudElkZW50aWZpZXIge1xuICAgIHJldHVybiB7XG4gICAgICB1cmk6IHRoaXMuZ2V0RWRpdG9yVXJpKCksXG4gICAgICB2ZXJzaW9uOiB0aGlzLl9nZXRWZXJzaW9uKHRoaXMuX2VkaXRvci5nZXRQYXRoKCkgfHwgJycpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBTZW5kIHRoZSBlbnRpcmUgZG9jdW1lbnQgdG8gdGhlIGxhbmd1YWdlIHNlcnZlci4gVGhpcyBpcyB1c2VkIHdoZW5cbiAgICogb3BlcmF0aW5nIGluIEZ1bGwgKDEpIHN5bmMgbW9kZS5cbiAgICovXG4gIHB1YmxpYyBzZW5kRnVsbENoYW5nZXMoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLl9pc1ByaW1hcnlBZGFwdGVyKCkpIHsgcmV0dXJuOyB9IC8vIE11bHRpcGxlIGVkaXRvcnMsIHdlIGFyZSBub3QgZmlyc3RcblxuICAgIHRoaXMuX2J1bXBWZXJzaW9uKCk7XG4gICAgdGhpcy5fY29ubmVjdGlvbi5kaWRDaGFuZ2VUZXh0RG9jdW1lbnQoe1xuICAgICAgdGV4dERvY3VtZW50OiB0aGlzLmdldFZlcnNpb25lZFRleHREb2N1bWVudElkZW50aWZpZXIoKSxcbiAgICAgIGNvbnRlbnRDaGFuZ2VzOiBbeyB0ZXh0OiB0aGlzLl9lZGl0b3IuZ2V0VGV4dCgpIH1dLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogU2VuZCB0aGUgaW5jcmVtZW50YWwgdGV4dCBjaGFuZ2VzIHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuIFRoaXMgaXMgdXNlZFxuICAgKiB3aGVuIG9wZXJhdGluZyBpbiBJbmNyZW1lbnRhbCAoMikgc3luYyBtb2RlLlxuICAgKlxuICAgKiBAcGFyYW0gZXZlbnQgVGhlIGV2ZW50IGZpcmVkIGJ5IEF0b20gdG8gaW5kaWNhdGUgdGhlIGRvY3VtZW50IGhhcyBzdG9wcGVkIGNoYW5naW5nXG4gICAqICAgaW5jbHVkaW5nIGEgbGlzdCBvZiBjaGFuZ2VzIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhpcyBldmVudCBmaXJlZCBmb3IgdGhpc1xuICAgKiAgIHRleHQgZWRpdG9yLlxuICAgKiBOT1RFOiBUaGUgb3JkZXIgb2YgY2hhbmdlcyBpbiB0aGUgZXZlbnQgaXMgZ3VhcmFudGVlZCB0b3AgdG8gYm90dG9tLiAgTGFuZ3VhZ2Ugc2VydmVyXG4gICAqIGV4cGVjdHMgdGhpcyBpbiByZXZlcnNlLlxuICAgKi9cbiAgcHVibGljIHNlbmRJbmNyZW1lbnRhbENoYW5nZXMoZXZlbnQ6IEJ1ZmZlclN0b3BwZWRDaGFuZ2luZ0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKGV2ZW50LmNoYW5nZXMubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKCF0aGlzLl9pc1ByaW1hcnlBZGFwdGVyKCkpIHsgcmV0dXJuOyB9IC8vIE11bHRpcGxlIGVkaXRvcnMsIHdlIGFyZSBub3QgZmlyc3RcblxuICAgICAgdGhpcy5fYnVtcFZlcnNpb24oKTtcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb24uZGlkQ2hhbmdlVGV4dERvY3VtZW50KHtcbiAgICAgICAgdGV4dERvY3VtZW50OiB0aGlzLmdldFZlcnNpb25lZFRleHREb2N1bWVudElkZW50aWZpZXIoKSxcbiAgICAgICAgY29udGVudENoYW5nZXM6IGV2ZW50LmNoYW5nZXMubWFwKFRleHRFZGl0b3JTeW5jQWRhcHRlci50ZXh0RWRpdFRvQ29udGVudENoYW5nZSkucmV2ZXJzZSgpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhbiBBdG9tIHtUZXh0RWRpdEV2ZW50fSB0byBhIGxhbmd1YWdlIHNlcnZlciB7VGV4dERvY3VtZW50Q29udGVudENoYW5nZUV2ZW50fSBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSBjaGFuZ2UgVGhlIEF0b20ge1RleHRFZGl0RXZlbnR9IHRvIGNvbnZlcnQuXG4gICAqIEByZXR1cm5zIEEge1RleHREb2N1bWVudENvbnRlbnRDaGFuZ2VFdmVudH0gdGhhdCByZXByZXNlbnRzIHRoZSBjb252ZXJ0ZWQge1RleHRFZGl0RXZlbnR9LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyB0ZXh0RWRpdFRvQ29udGVudENoYW5nZShjaGFuZ2U6IFRleHRDaGFuZ2UpOiBUZXh0RG9jdW1lbnRDb250ZW50Q2hhbmdlRXZlbnQge1xuICAgIHJldHVybiB7XG4gICAgICByYW5nZTogQ29udmVydC5hdG9tUmFuZ2VUb0xTUmFuZ2UoY2hhbmdlLm9sZFJhbmdlKSxcbiAgICAgIHJhbmdlTGVuZ3RoOiBjaGFuZ2Uub2xkVGV4dC5sZW5ndGgsXG4gICAgICB0ZXh0OiBjaGFuZ2UubmV3VGV4dCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfaXNQcmltYXJ5QWRhcHRlcigpOiBib29sZWFuIHtcbiAgICBjb25zdCBsb3dlc3RJZEZvckJ1ZmZlciA9IE1hdGgubWluKFxuICAgICAgLi4uYXRvbS53b3Jrc3BhY2VcbiAgICAgICAgLmdldFRleHRFZGl0b3JzKClcbiAgICAgICAgLmZpbHRlcigodCkgPT4gdC5nZXRCdWZmZXIoKSA9PT0gdGhpcy5fZWRpdG9yLmdldEJ1ZmZlcigpKVxuICAgICAgICAubWFwKCh0KSA9PiB0LmlkKSxcbiAgICApO1xuICAgIHJldHVybiBsb3dlc3RJZEZvckJ1ZmZlciA9PT0gdGhpcy5fZWRpdG9yLmlkO1xuICB9XG5cbiAgcHJpdmF0ZSBfYnVtcFZlcnNpb24oKTogdm9pZCB7XG4gICAgY29uc3QgZmlsZVBhdGggPSB0aGlzLl9lZGl0b3IuZ2V0UGF0aCgpO1xuICAgIGlmIChmaWxlUGF0aCA9PSBudWxsKSB7IHJldHVybjsgfVxuICAgIHRoaXMuX3ZlcnNpb25zLnNldChmaWxlUGF0aCwgdGhpcy5fZ2V0VmVyc2lvbihmaWxlUGF0aCkgKyAxKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmUgd2hlbiB0aGUgZG9jdW1lbnQgaXMgb3BlbmVkIHdlIHNlbmQgbm90aWZpY2F0aW9uIHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogc28gaXQgY2FuIGxvYWQgaXQgaW4gYW5kIGtlZXAgdHJhY2sgb2YgZGlhZ25vc3RpY3MgZXRjLlxuICAgKi9cbiAgcHJpdmF0ZSBkaWRPcGVuKCk6IHZvaWQge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gdGhpcy5fZWRpdG9yLmdldFBhdGgoKTtcbiAgICBpZiAoZmlsZVBhdGggPT0gbnVsbCkgeyByZXR1cm47IH0gLy8gTm90IHlldCBzYXZlZFxuXG4gICAgaWYgKCF0aGlzLl9pc1ByaW1hcnlBZGFwdGVyKCkpIHsgcmV0dXJuOyB9IC8vIE11bHRpcGxlIGVkaXRvcnMsIHdlIGFyZSBub3QgZmlyc3RcblxuICAgIHRoaXMuX2Nvbm5lY3Rpb24uZGlkT3BlblRleHREb2N1bWVudCh7XG4gICAgICB0ZXh0RG9jdW1lbnQ6IHtcbiAgICAgICAgdXJpOiB0aGlzLmdldEVkaXRvclVyaSgpLFxuICAgICAgICBsYW5ndWFnZUlkOiB0aGlzLmdldExhbmd1YWdlSWQoKS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICB2ZXJzaW9uOiB0aGlzLl9nZXRWZXJzaW9uKGZpbGVQYXRoKSxcbiAgICAgICAgdGV4dDogdGhpcy5fZWRpdG9yLmdldFRleHQoKSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9nZXRWZXJzaW9uKGZpbGVQYXRoOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl92ZXJzaW9ucy5nZXQoZmlsZVBhdGgpIHx8IDE7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIHtUZXh0RWRpdG9yfSBpcyBjbG9zZWQgYW5kIHNlbmRzIHRoZSAnZGlkQ2xvc2VUZXh0RG9jdW1lbnQnIG5vdGlmaWNhdGlvbiB0b1xuICAgKiB0aGUgY29ubmVjdGVkIGxhbmd1YWdlIHNlcnZlci5cbiAgICovXG4gIHB1YmxpYyBkaWRDbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fZWRpdG9yLmdldFBhdGgoKSA9PSBudWxsKSB7IHJldHVybjsgfSAvLyBOb3QgeWV0IHNhdmVkXG5cbiAgICBjb25zdCBmaWxlU3RpbGxPcGVuID0gYXRvbS53b3Jrc3BhY2UuZ2V0VGV4dEVkaXRvcnMoKS5maW5kKCh0KSA9PiB0LmdldEJ1ZmZlcigpID09PSB0aGlzLl9lZGl0b3IuZ2V0QnVmZmVyKCkpO1xuICAgIGlmIChmaWxlU3RpbGxPcGVuKSB7XG4gICAgICByZXR1cm47IC8vIE90aGVyIHdpbmRvd3Mgb3IgZWRpdG9ycyBzdGlsbCBoYXZlIHRoaXMgZmlsZSBvcGVuXG4gICAgfVxuXG4gICAgdGhpcy5fY29ubmVjdGlvbi5kaWRDbG9zZVRleHREb2N1bWVudCh7IHRleHREb2N1bWVudDogeyB1cmk6IHRoaXMuZ2V0RWRpdG9yVXJpKCkgfSB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQganVzdCBiZWZvcmUgdGhlIHtUZXh0RWRpdG9yfSBzYXZlcyBhbmQgc2VuZHMgdGhlICd3aWxsU2F2ZVRleHREb2N1bWVudCcgbm90aWZpY2F0aW9uIHRvXG4gICAqIHRoZSBjb25uZWN0ZWQgbGFuZ3VhZ2Ugc2VydmVyLlxuICAgKi9cbiAgcHVibGljIHdpbGxTYXZlKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5faXNQcmltYXJ5QWRhcHRlcigpKSB7IHJldHVybjsgfVxuXG4gICAgY29uc3QgdXJpID0gdGhpcy5nZXRFZGl0b3JVcmkoKTtcbiAgICB0aGlzLl9jb25uZWN0aW9uLndpbGxTYXZlVGV4dERvY3VtZW50KHtcbiAgICAgIHRleHREb2N1bWVudDogeyB1cmkgfSxcbiAgICAgIHJlYXNvbjogVGV4dERvY3VtZW50U2F2ZVJlYXNvbi5NYW51YWwsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIGp1c3QgYmVmb3JlIHRoZSB7VGV4dEVkaXRvcn0gc2F2ZXMsIHNlbmRzIHRoZSAnd2lsbFNhdmVXYWl0VW50aWxUZXh0RG9jdW1lbnQnIHJlcXVlc3QgdG9cbiAgICogdGhlIGNvbm5lY3RlZCBsYW5ndWFnZSBzZXJ2ZXIgYW5kIHdhaXRzIGZvciB0aGUgcmVzcG9uc2UgYmVmb3JlIHNhdmluZyB0aGUgYnVmZmVyLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIHdpbGxTYXZlV2FpdFVudGlsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5faXNQcmltYXJ5QWRhcHRlcigpKSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUoKTsgfVxuXG4gICAgY29uc3QgYnVmZmVyID0gdGhpcy5fZWRpdG9yLmdldEJ1ZmZlcigpO1xuICAgIGNvbnN0IHVyaSA9IHRoaXMuZ2V0RWRpdG9yVXJpKCk7XG4gICAgY29uc3QgdGl0bGUgPSB0aGlzLl9lZGl0b3IuZ2V0TG9uZ1RpdGxlKCk7XG5cbiAgICBjb25zdCBhcHBseUVkaXRzT3JUaW1lb3V0ID0gVXRpbHMucHJvbWlzZVdpdGhUaW1lb3V0KFxuICAgICAgMjUwMCwgLy8gMi41IHNlY29uZHMgdGltZW91dFxuICAgICAgdGhpcy5fY29ubmVjdGlvbi53aWxsU2F2ZVdhaXRVbnRpbFRleHREb2N1bWVudCh7XG4gICAgICAgIHRleHREb2N1bWVudDogeyB1cmkgfSxcbiAgICAgICAgcmVhc29uOiBUZXh0RG9jdW1lbnRTYXZlUmVhc29uLk1hbnVhbCxcbiAgICAgIH0pLFxuICAgICkudGhlbigoZWRpdHMpID0+IHtcbiAgICAgIGNvbnN0IGN1cnNvciA9IHRoaXMuX2VkaXRvci5nZXRDdXJzb3JCdWZmZXJQb3NpdGlvbigpO1xuICAgICAgQXBwbHlFZGl0QWRhcHRlci5hcHBseUVkaXRzKGJ1ZmZlciwgQ29udmVydC5jb252ZXJ0THNUZXh0RWRpdHMoZWRpdHMpKTtcbiAgICAgIHRoaXMuX2VkaXRvci5zZXRDdXJzb3JCdWZmZXJQb3NpdGlvbihjdXJzb3IpO1xuICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgIGF0b20ubm90aWZpY2F0aW9ucy5hZGRFcnJvcignT24tc2F2ZSBhY3Rpb24gZmFpbGVkJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogYEZhaWxlZCB0byBhcHBseSBlZGl0cyB0byAke3RpdGxlfWAsXG4gICAgICAgIGRldGFpbDogZXJyLm1lc3NhZ2UsXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9KTtcblxuICAgIGNvbnN0IHdpdGhCdXN5U2lnbmFsID1cbiAgICAgIHRoaXMuX3JlcG9ydEJ1c3lXaGlsZShcbiAgICAgICAgYEFwcGx5aW5nIG9uLXNhdmUgZWRpdHMgZm9yICR7dGl0bGV9YCxcbiAgICAgICAgKCkgPT4gYXBwbHlFZGl0c09yVGltZW91dCxcbiAgICAgICk7XG4gICAgcmV0dXJuIHdpdGhCdXN5U2lnbmFsIHx8IGFwcGx5RWRpdHNPclRpbWVvdXQ7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIHtUZXh0RWRpdG9yfSBzYXZlcyBhbmQgc2VuZHMgdGhlICdkaWRTYXZlVGV4dERvY3VtZW50JyBub3RpZmljYXRpb24gdG9cbiAgICogdGhlIGNvbm5lY3RlZCBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqIE5vdGU6IFJpZ2h0IG5vdyB0aGlzIGFsc28gc2VuZHMgdGhlIGBkaWRDaGFuZ2VXYXRjaGVkRmlsZXNgIG5vdGlmaWNhdGlvbiBhcyB3ZWxsIGJ1dCB0aGF0XG4gICAqIHdpbGwgYmUgc2VudCBmcm9tIGVsc2V3aGVyZSBzb29uLlxuICAgKi9cbiAgcHVibGljIGRpZFNhdmUoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLl9pc1ByaW1hcnlBZGFwdGVyKCkpIHsgcmV0dXJuOyB9XG5cbiAgICBjb25zdCB1cmkgPSB0aGlzLmdldEVkaXRvclVyaSgpO1xuICAgIGNvbnN0IGRpZFNhdmVOb3RpZmljYXRpb24gPSB7XG4gICAgICB0ZXh0RG9jdW1lbnQ6IHsgdXJpLCB2ZXJzaW9uOiB0aGlzLl9nZXRWZXJzaW9uKCh1cmkpKSB9LFxuICAgIH0gYXMgRGlkU2F2ZVRleHREb2N1bWVudFBhcmFtcztcbiAgICBpZiAodGhpcy5fZG9jdW1lbnRTeW5jLnNhdmUgJiYgdGhpcy5fZG9jdW1lbnRTeW5jLnNhdmUuaW5jbHVkZVRleHQpIHtcbiAgICAgIGRpZFNhdmVOb3RpZmljYXRpb24udGV4dCA9IHRoaXMuX2VkaXRvci5nZXRUZXh0KCk7XG4gICAgfVxuICAgIHRoaXMuX2Nvbm5lY3Rpb24uZGlkU2F2ZVRleHREb2N1bWVudChkaWRTYXZlTm90aWZpY2F0aW9uKTtcbiAgICBpZiAodGhpcy5fZmFrZURpZENoYW5nZVdhdGNoZWRGaWxlcykge1xuICAgICAgdGhpcy5fY29ubmVjdGlvbi5kaWRDaGFuZ2VXYXRjaGVkRmlsZXMoe1xuICAgICAgICBjaGFuZ2VzOiBbeyB1cmksIHR5cGU6IEZpbGVDaGFuZ2VUeXBlLkNoYW5nZWQgfV0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZGlkUmVuYW1lKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5faXNQcmltYXJ5QWRhcHRlcigpKSB7IHJldHVybjsgfVxuXG4gICAgY29uc3Qgb2xkVXJpID0gdGhpcy5fY3VycmVudFVyaTtcbiAgICB0aGlzLl9jdXJyZW50VXJpID0gdGhpcy5nZXRFZGl0b3JVcmkoKTtcbiAgICBpZiAoIW9sZFVyaSkge1xuICAgICAgcmV0dXJuOyAvLyBEaWRuJ3QgcHJldmlvdXNseSBoYXZlIGEgbmFtZVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9kb2N1bWVudFN5bmMub3BlbkNsb3NlICE9PSBmYWxzZSkge1xuICAgICAgdGhpcy5fY29ubmVjdGlvbi5kaWRDbG9zZVRleHREb2N1bWVudCh7IHRleHREb2N1bWVudDogeyB1cmk6IG9sZFVyaSB9IH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9mYWtlRGlkQ2hhbmdlV2F0Y2hlZEZpbGVzKSB7XG4gICAgICB0aGlzLl9jb25uZWN0aW9uLmRpZENoYW5nZVdhdGNoZWRGaWxlcyh7XG4gICAgICAgIGNoYW5nZXM6IFtcbiAgICAgICAgICB7IHVyaTogb2xkVXJpLCB0eXBlOiBGaWxlQ2hhbmdlVHlwZS5EZWxldGVkIH0sXG4gICAgICAgICAgeyB1cmk6IHRoaXMuX2N1cnJlbnRVcmksIHR5cGU6IEZpbGVDaGFuZ2VUeXBlLkNyZWF0ZWQgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFNlbmQgYW4gZXF1aXZhbGVudCBvcGVuIGV2ZW50IGZvciB0aGlzIGVkaXRvciwgd2hpY2ggd2lsbCBub3cgdXNlIHRoZSBuZXdcbiAgICAvLyBmaWxlIHBhdGguXG4gICAgaWYgKHRoaXMuX2RvY3VtZW50U3luYy5vcGVuQ2xvc2UgIT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmRpZE9wZW4oKTtcbiAgICB9XG4gIH1cblxuICAvKiogUHVibGljOiBPYnRhaW4gdGhlIGN1cnJlbnQge1RleHRFZGl0b3J9IHBhdGggYW5kIGNvbnZlcnQgaXQgdG8gYSBVcmkuICovXG4gIHB1YmxpYyBnZXRFZGl0b3JVcmkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQ29udmVydC5wYXRoVG9VcmkodGhpcy5fZWRpdG9yLmdldFBhdGgoKSB8fCAnJyk7XG4gIH1cbn1cbiJdfQ==