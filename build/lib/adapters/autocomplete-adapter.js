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
const Utils = require("../utils");
const fuzzaldrin_plus_1 = require("fuzzaldrin-plus");
const languageclient_1 = require("../languageclient");
const atom_1 = require("atom");
class PossiblyResolvedCompletionItem {
    constructor(completionItem, isResolved) {
        this.completionItem = completionItem;
        this.isResolved = isResolved;
    }
}
/**
 * Public: Adapts the language server protocol "textDocument/completion" to the Atom
 * AutoComplete+ package.
 */
class AutocompleteAdapter {
    constructor() {
        this._suggestionCache = new WeakMap();
        this._cancellationTokens = new WeakMap();
    }
    static canAdapt(serverCapabilities) {
        return serverCapabilities.completionProvider != null;
    }
    static canResolve(serverCapabilities) {
        return serverCapabilities.completionProvider != null &&
            serverCapabilities.completionProvider.resolveProvider === true;
    }
    /**
     * Public: Obtain suggestion list for AutoComplete+ by querying the language server using
     * the `textDocument/completion` request.
     *
     * @param server An {ActiveServer} pointing to the language server to query.
     * @param request The {atom$AutocompleteRequest} to satisfy.
     * @param onDidConvertCompletionItem An optional function that takes a {CompletionItem},
     *   an {atom$AutocompleteSuggestion} and a {atom$AutocompleteRequest}
     *   allowing you to adjust converted items.
     * @returns A {Promise} of an {Array} of {atom$AutocompleteSuggestion}s containing the
     *   AutoComplete+ suggestions to display.
     */
    getSuggestions(server, request, onDidConvertCompletionItem, minimumWordLength) {
        return __awaiter(this, void 0, void 0, function* () {
            const triggerChars = server.capabilities.completionProvider != null
                ? server.capabilities.completionProvider.triggerCharacters || []
                : [];
            // triggerOnly is true if we have just typed in a trigger character, and is false if we
            // have typed additional characters following a trigger character.
            const [triggerChar, triggerOnly] = AutocompleteAdapter.getTriggerCharacter(request, triggerChars);
            if (!this.shouldTrigger(request, triggerChar, minimumWordLength || 0)) {
                return [];
            }
            // Get the suggestions either from the cache or by calling the language server
            const suggestions = yield this.getOrBuildSuggestions(server, request, triggerChar, triggerOnly, onDidConvertCompletionItem);
            // We must update the replacement prefix as characters are added and removed
            const cache = this._suggestionCache.get(server);
            const replacementPrefix = request.editor.getTextInBufferRange([cache.triggerPoint, request.bufferPosition]);
            for (const suggestion of suggestions) {
                if (suggestion.customReplacmentPrefix) { // having this property means a custom range was provided
                    const len = replacementPrefix.length;
                    const preReplacementPrefix = suggestion.customReplacmentPrefix
                        + replacementPrefix.substring(len + cache.originalBufferPoint.column - request.bufferPosition.column, len);
                    // we cannot replace text after the cursor with the current autocomplete-plus API
                    // so we will simply ignore it for now
                    suggestion.replacementPrefix = preReplacementPrefix;
                }
                else {
                    suggestion.replacementPrefix = replacementPrefix;
                }
            }
            const filtered = !(request.prefix === "" || (triggerChar !== '' && triggerOnly));
            return filtered ? fuzzaldrin_plus_1.filter(suggestions, request.prefix, { key: 'filterText' }) : suggestions;
        });
    }
    shouldTrigger(request, triggerChar, minWordLength) {
        return request.activatedManually
            || triggerChar !== ''
            || minWordLength <= 0
            || request.prefix.length >= minWordLength;
    }
    getOrBuildSuggestions(server, request, triggerChar, triggerOnly, onDidConvertCompletionItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const cache = this._suggestionCache.get(server);
            const triggerColumn = (triggerChar !== '' && triggerOnly)
                ? request.bufferPosition.column - triggerChar.length
                : request.bufferPosition.column - request.prefix.length - triggerChar.length;
            const triggerPoint = new atom_1.Point(request.bufferPosition.row, triggerColumn);
            // Do we have complete cached suggestions that are still valid for this request?
            if (cache && !cache.isIncomplete && cache.triggerChar === triggerChar
                && cache.triggerPoint.isEqual(triggerPoint)
                && cache.originalBufferPoint.isLessThanOrEqual(request.bufferPosition)) {
                return Array.from(cache.suggestionMap.keys());
            }
            // Our cached suggestions can't be used so obtain new ones from the language server
            const completions = yield Utils.doWithCancellationToken(server.connection, this._cancellationTokens, (cancellationToken) => server.connection.completion(AutocompleteAdapter.createCompletionParams(request, triggerChar, triggerOnly), cancellationToken));
            // spec guarantees all edits are on the same line, so we only need to check the columns
            const triggerColumns = [triggerPoint.column, request.bufferPosition.column];
            // Setup the cache for subsequent filtered results
            const isComplete = completions === null || Array.isArray(completions) || completions.isIncomplete === false;
            const suggestionMap = this.completionItemsToSuggestions(completions, request, triggerColumns, onDidConvertCompletionItem);
            this._suggestionCache.set(server, {
                isIncomplete: !isComplete,
                triggerChar,
                triggerPoint,
                originalBufferPoint: request.bufferPosition,
                suggestionMap,
            });
            return Array.from(suggestionMap.keys());
        });
    }
    /**
     * Public: Obtain a complete version of a suggestion with additional information
     * the language server can provide by way of the `completionItem/resolve` request.
     *
     * @param server An {ActiveServer} pointing to the language server to query.
     * @param suggestion An {atom$AutocompleteSuggestion} suggestion that should be resolved.
     * @param request An {Object} with the AutoComplete+ request to satisfy.
     * @param onDidConvertCompletionItem An optional function that takes a {CompletionItem}, an
     *   {atom$AutocompleteSuggestion} and a {atom$AutocompleteRequest} allowing you to adjust converted items.
     * @returns A {Promise} of an {atom$AutocompleteSuggestion} with the resolved AutoComplete+ suggestion.
     */
    completeSuggestion(server, suggestion, request, onDidConvertCompletionItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const cache = this._suggestionCache.get(server);
            if (cache) {
                const possiblyResolvedCompletionItem = cache.suggestionMap.get(suggestion);
                if (possiblyResolvedCompletionItem != null && possiblyResolvedCompletionItem.isResolved === false) {
                    const resolvedCompletionItem = yield server.connection.completionItemResolve(possiblyResolvedCompletionItem.completionItem);
                    if (resolvedCompletionItem != null) {
                        AutocompleteAdapter.resolveSuggestion(resolvedCompletionItem, suggestion, request, onDidConvertCompletionItem);
                        possiblyResolvedCompletionItem.isResolved = true;
                    }
                }
            }
            return suggestion;
        });
    }
    static resolveSuggestion(resolvedCompletionItem, suggestion, request, onDidConvertCompletionItem) {
        // only the `documentation` and `detail` properties may change when resolving
        AutocompleteAdapter.applyDetailsToSuggestion(resolvedCompletionItem, suggestion);
        if (onDidConvertCompletionItem != null) {
            onDidConvertCompletionItem(resolvedCompletionItem, suggestion, request);
        }
    }
    /**
     * Public: Get the trigger character that caused the autocomplete (if any).  This is required because
     * AutoComplete-plus does not have trigger characters.  Although the terminology is 'character' we treat
     * them as variable length strings as this will almost certainly change in the future to support '->' etc.
     *
     * @param request An {Array} of {atom$AutocompleteSuggestion}s to locate the prefix, editor, bufferPosition etc.
     * @param triggerChars The {Array} of {string}s that can be trigger characters.
     * @returns A [{string}, boolean] where the string is the matching trigger character or an empty string
     *   if one was not matched, and the boolean is true if the trigger character is in request.prefix, and false
     *   if it is in the word before request.prefix. The boolean return value has no meaning if the string return
     *   value is an empty string.
     */
    static getTriggerCharacter(request, triggerChars) {
        // AutoComplete-Plus considers text after a symbol to be a new trigger. So we should look backward
        // from the current cursor position to see if one is there and thus simulate it.
        const buffer = request.editor.getBuffer();
        const cursor = request.bufferPosition;
        const prefixStartColumn = cursor.column - request.prefix.length;
        for (const triggerChar of triggerChars) {
            if (request.prefix.endsWith(triggerChar)) {
                return [triggerChar, true];
            }
            if (prefixStartColumn >= triggerChar.length) { // Far enough along a line to fit the trigger char
                const start = new atom_1.Point(cursor.row, prefixStartColumn - triggerChar.length);
                const possibleTrigger = buffer.getTextInRange([start, [cursor.row, prefixStartColumn]]);
                if (possibleTrigger === triggerChar) { // The text before our trigger is a trigger char!
                    return [triggerChar, false];
                }
            }
        }
        // There was no explicit trigger char
        return ['', false];
    }
    /**
     * Public: Create TextDocumentPositionParams to be sent to the language server
     * based on the editor and position from the AutoCompleteRequest.
     *
     * @param request The {atom$AutocompleteRequest} to obtain the editor from.
     * @param triggerPoint The {atom$Point} where the trigger started.
     * @returns A {string} containing the prefix including the trigger character.
     */
    static getPrefixWithTrigger(request, triggerPoint) {
        return request.editor
            .getBuffer()
            .getTextInRange([[triggerPoint.row, triggerPoint.column], request.bufferPosition]);
    }
    /**
     * Public: Create {CompletionParams} to be sent to the language server
     * based on the editor and position from the Autocomplete request etc.
     *
     * @param request The {atom$AutocompleteRequest} containing the request details.
     * @param triggerCharacter The {string} containing the trigger character (empty if none).
     * @param triggerOnly A {boolean} representing whether this completion is triggered right after a trigger character.
     * @returns A {CompletionParams} with the keys:
     *   * `textDocument` the language server protocol textDocument identification.
     *   * `position` the position within the text document to display completion request for.
     *   * `context` containing the trigger character and kind.
     */
    static createCompletionParams(request, triggerCharacter, triggerOnly) {
        return {
            textDocument: convert_1.default.editorToTextDocumentIdentifier(request.editor),
            position: convert_1.default.pointToPosition(request.bufferPosition),
            context: AutocompleteAdapter.createCompletionContext(triggerCharacter, triggerOnly),
        };
    }
    /**
     * Public: Create {CompletionContext} to be sent to the language server
     * based on the trigger character.
     *
     * @param triggerCharacter The {string} containing the trigger character or '' if none.
     * @param triggerOnly A {boolean} representing whether this completion is triggered right after a trigger character.
     * @returns An {CompletionContext} that specifies the triggerKind and the triggerCharacter
     *   if there is one.
     */
    static createCompletionContext(triggerCharacter, triggerOnly) {
        if (triggerCharacter === '') {
            return { triggerKind: languageclient_1.CompletionTriggerKind.Invoked };
        }
        else {
            return triggerOnly
                ? { triggerKind: languageclient_1.CompletionTriggerKind.TriggerCharacter, triggerCharacter }
                : { triggerKind: languageclient_1.CompletionTriggerKind.TriggerForIncompleteCompletions, triggerCharacter };
        }
    }
    /**
     * Public: Convert a language server protocol CompletionItem array or CompletionList to
     * an array of ordered AutoComplete+ suggestions.
     *
     * @param completionItems An {Array} of {CompletionItem} objects or a {CompletionList} containing completion
     *   items to be converted.
     * @param request The {atom$AutocompleteRequest} to satisfy.
     * @param onDidConvertCompletionItem A function that takes a {CompletionItem}, an {atom$AutocompleteSuggestion}
     *   and a {atom$AutocompleteRequest} allowing you to adjust converted items.
     * @returns A {Map} of AutoComplete+ suggestions ordered by the CompletionItems sortText.
     */
    completionItemsToSuggestions(completionItems, request, triggerColumns, onDidConvertCompletionItem) {
        const completionsArray = Array.isArray(completionItems)
            ? completionItems
            : (completionItems && completionItems.items) || [];
        return new Map(completionsArray
            .sort((a, b) => (a.sortText || a.label).localeCompare(b.sortText || b.label))
            .map((s) => [
            AutocompleteAdapter.completionItemToSuggestion(s, {}, request, triggerColumns, onDidConvertCompletionItem),
            new PossiblyResolvedCompletionItem(s, false),
        ]));
    }
    /**
     * Public: Convert a language server protocol CompletionItem to an AutoComplete+ suggestion.
     *
     * @param item An {CompletionItem} containing a completion item to be converted.
     * @param suggestion A {atom$AutocompleteSuggestion} to have the conversion applied to.
     * @param request The {atom$AutocompleteRequest} to satisfy.
     * @param onDidConvertCompletionItem A function that takes a {CompletionItem}, an {atom$AutocompleteSuggestion}
     *   and a {atom$AutocompleteRequest} allowing you to adjust converted items.
     * @returns The {atom$AutocompleteSuggestion} passed in as suggestion with the conversion applied.
     */
    static completionItemToSuggestion(item, suggestion, request, triggerColumns, onDidConvertCompletionItem) {
        AutocompleteAdapter.applyCompletionItemToSuggestion(item, suggestion);
        AutocompleteAdapter.applyTextEditToSuggestion(item.textEdit, request.editor, triggerColumns, request.bufferPosition, suggestion);
        AutocompleteAdapter.applySnippetToSuggestion(item, suggestion);
        if (onDidConvertCompletionItem != null) {
            onDidConvertCompletionItem(item, suggestion, request);
        }
        return suggestion;
    }
    /**
     * Public: Convert the primary parts of a language server protocol CompletionItem to an AutoComplete+ suggestion.
     *
     * @param item An {CompletionItem} containing the completion items to be merged into.
     * @param suggestion The {Suggestion} to merge the conversion into.
     * @returns The {Suggestion} with details added from the {CompletionItem}.
     */
    static applyCompletionItemToSuggestion(item, suggestion) {
        suggestion.text = item.insertText || item.label;
        suggestion.filterText = item.filterText || item.label;
        suggestion.displayText = item.label;
        suggestion.type = AutocompleteAdapter.completionKindToSuggestionType(item.kind);
        AutocompleteAdapter.applyDetailsToSuggestion(item, suggestion);
    }
    static applyDetailsToSuggestion(item, suggestion) {
        suggestion.rightLabel = item.detail;
        // Older format, can't know what it is so assign to both and hope for best
        if (typeof (item.documentation) === 'string') {
            suggestion.descriptionMarkdown = item.documentation;
            suggestion.description = item.documentation;
        }
        if (item.documentation != null && typeof (item.documentation) === 'object') {
            // Newer format specifies the kind of documentation, assign appropriately
            if (item.documentation.kind === 'markdown') {
                suggestion.descriptionMarkdown = item.documentation.value;
            }
            else {
                suggestion.description = item.documentation.value;
            }
        }
    }
    /**
     * Public: Applies the textEdit part of a language server protocol CompletionItem to an
     * AutoComplete+ Suggestion via the replacementPrefix and text properties.
     *
     * @param textEdit A {TextEdit} from a CompletionItem to apply.
     * @param editor An Atom {TextEditor} used to obtain the necessary text replacement.
     * @param suggestion An {atom$AutocompleteSuggestion} to set the replacementPrefix and text properties of.
     */
    static applyTextEditToSuggestion(textEdit, editor, triggerColumns, originalBufferPosition, suggestion) {
        if (!textEdit) {
            return;
        }
        if (textEdit.range.start.character !== triggerColumns[0]) {
            const range = convert_1.default.lsRangeToAtomRange(textEdit.range);
            suggestion.customReplacmentPrefix = editor.getTextInBufferRange([range.start, originalBufferPosition]);
        }
        suggestion.text = textEdit.newText;
    }
    /**
     * Public: Adds a snippet to the suggestion if the CompletionItem contains
     * snippet-formatted text
     *
     * @param item An {CompletionItem} containing the completion items to be merged into.
     * @param suggestion The {atom$AutocompleteSuggestion} to merge the conversion into.
     */
    static applySnippetToSuggestion(item, suggestion) {
        if (item.insertTextFormat === languageclient_1.InsertTextFormat.Snippet) {
            suggestion.snippet = item.textEdit != null ? item.textEdit.newText : (item.insertText || '');
        }
    }
    /**
     * Public: Obtain the textual suggestion type required by AutoComplete+ that
     * most closely maps to the numeric completion kind supplies by the language server.
     *
     * @param kind A {Number} that represents the suggestion kind to be converted.
     * @returns A {String} containing the AutoComplete+ suggestion type equivalent
     *   to the given completion kind.
     */
    static completionKindToSuggestionType(kind) {
        switch (kind) {
            case languageclient_1.CompletionItemKind.Constant:
                return 'constant';
            case languageclient_1.CompletionItemKind.Method:
                return 'method';
            case languageclient_1.CompletionItemKind.Function:
            case languageclient_1.CompletionItemKind.Constructor:
                return 'function';
            case languageclient_1.CompletionItemKind.Field:
            case languageclient_1.CompletionItemKind.Property:
                return 'property';
            case languageclient_1.CompletionItemKind.Variable:
                return 'variable';
            case languageclient_1.CompletionItemKind.Class:
                return 'class';
            case languageclient_1.CompletionItemKind.Struct:
            case languageclient_1.CompletionItemKind.TypeParameter:
                return 'type';
            case languageclient_1.CompletionItemKind.Operator:
                return 'selector';
            case languageclient_1.CompletionItemKind.Interface:
                return 'mixin';
            case languageclient_1.CompletionItemKind.Module:
                return 'module';
            case languageclient_1.CompletionItemKind.Unit:
                return 'builtin';
            case languageclient_1.CompletionItemKind.Enum:
            case languageclient_1.CompletionItemKind.EnumMember:
                return 'enum';
            case languageclient_1.CompletionItemKind.Keyword:
                return 'keyword';
            case languageclient_1.CompletionItemKind.Snippet:
                return 'snippet';
            case languageclient_1.CompletionItemKind.File:
            case languageclient_1.CompletionItemKind.Folder:
                return 'import';
            case languageclient_1.CompletionItemKind.Reference:
                return 'require';
            default:
                return 'value';
        }
    }
}
exports.default = AutocompleteAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlLWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvYXV0b2NvbXBsZXRlLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHdDQUFpQztBQUNqQyxrQ0FBa0M7QUFHbEMscURBQXlDO0FBQ3pDLHNEQVcyQjtBQUMzQiwrQkFHYztBQXdCZCxNQUFNLDhCQUE4QjtJQUNsQyxZQUNTLGNBQThCLEVBQzlCLFVBQW1CO1FBRG5CLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUM5QixlQUFVLEdBQVYsVUFBVSxDQUFTO0lBRTVCLENBQUM7Q0FDRjtBQUVEOzs7R0FHRztBQUNILE1BQXFCLG1CQUFtQjtJQUF4QztRQVVVLHFCQUFnQixHQUFnRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzlFLHdCQUFtQixHQUErRCxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBNGIxRyxDQUFDO0lBdGNRLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sa0JBQWtCLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDO0lBQ3ZELENBQUM7SUFFTSxNQUFNLENBQUMsVUFBVSxDQUFDLGtCQUFzQztRQUM3RCxPQUFPLGtCQUFrQixDQUFDLGtCQUFrQixJQUFJLElBQUk7WUFDbEQsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsZUFBZSxLQUFLLElBQUksQ0FBQztJQUNuRSxDQUFDO0lBS0Q7Ozs7Ozs7Ozs7O09BV0c7SUFDVSxjQUFjLENBQ3pCLE1BQW9CLEVBQ3BCLE9BQXFDLEVBQ3JDLDBCQUFtRCxFQUNuRCxpQkFBMEI7O1lBRTFCLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsa0JBQWtCLElBQUksSUFBSTtnQkFDakUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLElBQUksRUFBRTtnQkFDaEUsQ0FBQyxD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QVMsQ0FBQztZQUNuQixLQUFLLG1DQUFrQixDQUFDLElBQUksQ0FBQztZQUM3QixLQUFLLG1DQUFrQixDQUFDLE1BQU07Z0JBQzVCLE9BQU8sUUFBUSxDQUFDO1lBQ2xCLEtBQUssbUNBQWtCLENBQUMsU0FBUztnQkFDL0IsT0FBTyxTQUFTLENBQUM7WUFDbkI7Z0JBQ0UsT0FBTyxPQUFPLENBQUM7U0FDbEI7SUFDSCxDQUFDO0NBQ0Y7QUF2Y0Qsc0NBdWNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IENvbnZlcnQgZnJvbSAnLi4vY29udmVydCc7XG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgeyBDYW5jZWxsYXRpb25Ub2tlblNvdXJjZSB9IGZyb20gJ3ZzY29kZS1qc29ucnBjJztcbmltcG9ydCB7IEFjdGl2ZVNlcnZlciB9IGZyb20gJy4uL3NlcnZlci1tYW5hZ2VyJztcbmltcG9ydCB7IGZpbHRlciB9IGZyb20gJ2Z1enphbGRyaW4tcGx1cyc7XG5pbXBvcnQge1xuICBDb21wbGV0aW9uQ29udGV4dCxcbiAgQ29tcGxldGlvbkl0ZW0sXG4gIENvbXBsZXRpb25JdGVtS2luZCxcbiAgQ29tcGxldGlvbkxpc3QsXG4gIENvbXBsZXRpb25QYXJhbXMsXG4gIENvbXBsZXRpb25UcmlnZ2VyS2luZCxcbiAgSW5zZXJ0VGV4dEZvcm1hdCxcbiAgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG4gIFRleHRFZGl0LFxufSBmcm9tICcuLi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQge1xuICBQb2ludCxcbiAgVGV4dEVkaXRvcixcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgKiBhcyBhYyBmcm9tICdhdG9tL2F1dG9jb21wbGV0ZS1wbHVzJztcbmltcG9ydCB7IFN1Z2dlc3Rpb24sIFRleHRTdWdnZXN0aW9uLCBTbmlwcGV0U3VnZ2VzdGlvbiB9IGZyb20gJ2F0b20taWRlJztcblxuLyoqXG4gKiBIb2xkcyBhIGxpc3Qgb2Ygc3VnZ2VzdGlvbnMgZ2VuZXJhdGVkIGZyb20gdGhlIENvbXBsZXRpb25JdGVtW11cbiAqIGxpc3Qgc2VudCBieSB0aGUgc2VydmVyLCBhcyB3ZWxsIGFzIG1ldGFkYXRhIGFib3V0IHRoZSBjb250ZXh0XG4gKiBpdCB3YXMgY29sbGVjdGVkIGluXG4gKi9cbmludGVyZmFjZSBTdWdnZXN0aW9uQ2FjaGVFbnRyeSB7XG4gIC8qKiBJZiBgdHJ1ZWAsIHRoZSBzZXJ2ZXIgd2lsbCBzZW5kIGEgbGlzdCBvZiBzdWdnZXN0aW9ucyB0byByZXBsYWNlIHRoaXMgb25lICovXG4gIGlzSW5jb21wbGV0ZTogYm9vbGVhbjtcbiAgLyoqIFRoZSBwb2ludCBsZWZ0IG9mIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaW4gdGhlIG9yaWdpbmFsIHByZWZpeCBzZW50IHRvIHRoZSBzZXJ2ZXIgKi9cbiAgdHJpZ2dlclBvaW50OiBQb2ludDtcbiAgLyoqIFRoZSBwb2ludCByaWdodCBvZiB0aGUgbGFzdCBjaGFyYWN0ZXIgaW4gdGhlIG9yaWdpbmFsIHByZWZpeCBzZW50IHRvIHRoZSBzZXJ2ZXIgKi9cbiAgb3JpZ2luYWxCdWZmZXJQb2ludDogUG9pbnQ7XG4gIC8qKiBUaGUgdHJpZ2dlciBzdHJpbmcgdGhhdCBjYXVzZWQgdGhlIGF1dG9jb21wbGV0ZSAoaWYgYW55KSAqL1xuICB0cmlnZ2VyQ2hhcjogc3RyaW5nO1xuICBzdWdnZXN0aW9uTWFwOiBNYXA8U3VnZ2VzdGlvbiwgUG9zc2libHlSZXNvbHZlZENvbXBsZXRpb25JdGVtPjtcbn1cblxudHlwZSBDb21wbGV0aW9uSXRlbUFkanVzdGVyID1cbiAgKGl0ZW06IENvbXBsZXRpb25JdGVtLCBzdWdnZXN0aW9uOiBhYy5BbnlTdWdnZXN0aW9uLCByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50KSA9PiB2b2lkO1xuXG5jbGFzcyBQb3NzaWJseVJlc29sdmVkQ29tcGxldGlvbkl0ZW0ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgY29tcGxldGlvbkl0ZW06IENvbXBsZXRpb25JdGVtLFxuICAgIHB1YmxpYyBpc1Jlc29sdmVkOiBib29sZWFuLFxuICApIHtcbiAgfVxufVxuXG4vKipcbiAqIFB1YmxpYzogQWRhcHRzIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgcHJvdG9jb2wgXCJ0ZXh0RG9jdW1lbnQvY29tcGxldGlvblwiIHRvIHRoZSBBdG9tXG4gKiBBdXRvQ29tcGxldGUrIHBhY2thZ2UuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEF1dG9jb21wbGV0ZUFkYXB0ZXIge1xuICBwdWJsaWMgc3RhdGljIGNhbkFkYXB0KHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHNlcnZlckNhcGFiaWxpdGllcy5jb21wbGV0aW9uUHJvdmlkZXIgIT0gbnVsbDtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgY2FuUmVzb2x2ZShzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBzZXJ2ZXJDYXBhYmlsaXRpZXMuY29tcGxldGlvblByb3ZpZGVyICE9IG51bGwgJiZcbiAgICAgIHNlcnZlckNhcGFiaWxpdGllcy5jb21wbGV0aW9uUHJvdmlkZXIucmVzb2x2ZVByb3ZpZGVyID09PSB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfc3VnZ2VzdGlvbkNhY2hlOiBXZWFrTWFwPEFjdGl2ZVNlcnZlciwgU3VnZ2VzdGlvbkNhY2hlRW50cnk+ID0gbmV3IFdlYWtNYXAoKTtcbiAgcHJpdmF0ZSBfY2FuY2VsbGF0aW9uVG9rZW5zOiBXZWFrTWFwPExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiwgQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2U+ID0gbmV3IFdlYWtNYXAoKTtcblxuICAvKipcbiAgICogUHVibGljOiBPYnRhaW4gc3VnZ2VzdGlvbiBsaXN0IGZvciBBdXRvQ29tcGxldGUrIGJ5IHF1ZXJ5aW5nIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdXNpbmdcbiAgICogdGhlIGB0ZXh0RG9jdW1lbnQvY29tcGxldGlvbmAgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHNlcnZlciBBbiB7QWN0aXZlU2VydmVyfSBwb2ludGluZyB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRvIHF1ZXJ5LlxuICAgKiBAcGFyYW0gcmVxdWVzdCBUaGUge2F0b20kQXV0b2NvbXBsZXRlUmVxdWVzdH0gdG8gc2F0aXNmeS5cbiAgICogQHBhcmFtIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSB7Q29tcGxldGlvbkl0ZW19LFxuICAgKiAgIGFuIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259IGFuZCBhIHthdG9tJEF1dG9jb21wbGV0ZVJlcXVlc3R9XG4gICAqICAgYWxsb3dpbmcgeW91IHRvIGFkanVzdCBjb252ZXJ0ZWQgaXRlbXMuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IG9mIGFuIHtBcnJheX0gb2Yge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn1zIGNvbnRhaW5pbmcgdGhlXG4gICAqICAgQXV0b0NvbXBsZXRlKyBzdWdnZXN0aW9ucyB0byBkaXNwbGF5LlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdldFN1Z2dlc3Rpb25zKFxuICAgIHNlcnZlcjogQWN0aXZlU2VydmVyLFxuICAgIHJlcXVlc3Q6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQsXG4gICAgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0/OiBDb21wbGV0aW9uSXRlbUFkanVzdGVyLFxuICAgIG1pbmltdW1Xb3JkTGVuZ3RoPzogbnVtYmVyLFxuICApOiBQcm9taXNlPGFjLkFueVN1Z2dlc3Rpb25bXT4ge1xuICAgIGNvbnN0IHRyaWdnZXJDaGFycyA9IHNlcnZlci5jYXBhYmlsaXRpZXMuY29tcGxldGlvblByb3ZpZGVyICE9IG51bGxcbiAgICAgID8gc2VydmVyLmNhcGFiaWxpdGllcy5jb21wbGV0aW9uUHJvdmlkZXIudHJpZ2dlckNoYXJhY3RlcnMgfHwgW11cbiAgICAgIDogW107XG5cbiAgICAvLyB0cmlnZ2VyT25seSBpcyB0cnVlIGlmIHdlIGhhdmUganVzdCB0eXBlZCBpbiBhIHRyaWdnZXIgY2hhcmFjdGVyLCBhbmQgaXMgZmFsc2UgaWYgd2VcbiAgICAvLyBoYXZlIHR5cGVkIGFkZGl0aW9uYWwgY2hhcmFjdGVycyBmb2xsb3dpbmcgYSB0cmlnZ2VyIGNoYXJhY3Rlci5cbiAgICBjb25zdCBbdHJpZ2dlckNoYXIsIHRyaWdnZXJPbmx5XSA9IEF1dG9jb21wbGV0ZUFkYXB0ZXIuZ2V0VHJpZ2dlckNoYXJhY3RlcihyZXF1ZXN0LCB0cmlnZ2VyQ2hhcnMpO1xuXG4gICAgaWYgKCF0aGlzLnNob3VsZFRyaWdnZXIocmVxdWVzdCwgdHJpZ2dlckNoYXIsIG1pbmltdW1Xb3JkTGVuZ3RoIHx8IDApKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSBzdWdnZXN0aW9ucyBlaXRoZXIgZnJvbSB0aGUgY2FjaGUgb3IgYnkgY2FsbGluZyB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAgY29uc3Qgc3VnZ2VzdGlvbnMgPSBhd2FpdFxuICAgICAgdGhpcy5nZXRPckJ1aWxkU3VnZ2VzdGlvbnMoc2VydmVyLCByZXF1ZXN0LCB0cmlnZ2VyQ2hhciwgdHJpZ2dlck9ubHksIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtKTtcblxuICAgIC8vIFdlIG11c3QgdXBkYXRlIHRoZSByZXBsYWNlbWVudCBwcmVmaXggYXMgY2hhcmFjdGVycyBhcmUgYWRkZWQgYW5kIHJlbW92ZWRcbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuX3N1Z2dlc3Rpb25DYWNoZS5nZXQoc2VydmVyKSE7XG4gICAgY29uc3QgcmVwbGFjZW1lbnRQcmVmaXggPSByZXF1ZXN0LmVkaXRvci5nZXRUZXh0SW5CdWZmZXJSYW5nZShbY2FjaGUudHJpZ2dlclBvaW50LCByZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uXSk7XG4gICAgZm9yIChjb25zdCBzdWdnZXN0aW9uIG9mIHN1Z2dlc3Rpb25zKSB7XG4gICAgICBpZiAoc3VnZ2VzdGlvbi5jdXN0b21SZXBsYWNtZW50UHJlZml4KSB7IC8vIGhhdmluZyB0aGlzIHByb3BlcnR5IG1lYW5zIGEgY3VzdG9tIHJhbmdlIHdhcyBwcm92aWRlZFxuICAgICAgICBjb25zdCBsZW4gPSByZXBsYWNlbWVudFByZWZpeC5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHByZVJlcGxhY2VtZW50UHJlZml4ID0gc3VnZ2VzdGlvbi5jdXN0b21SZXBsYWNtZW50UHJlZml4XG4gICAgICAgICAgKyByZXBsYWNlbWVudFByZWZpeC5zdWJzdHJpbmcobGVuICsgY2FjaGUub3JpZ2luYWxCdWZmZXJQb2ludC5jb2x1bW4gLSByZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uLmNvbHVtbiwgbGVuKTtcbiAgICAgICAgLy8gd2UgY2Fubm90IHJlcGxhY2UgdGV4dCBhZnRlciB0aGUgY3Vyc29yIHdpdGggdGhlIGN1cnJlbnQgYXV0b2NvbXBsZXRlLXBsdXMgQVBJXG4gICAgICAgIC8vIHNvIHdlIHdpbGwgc2ltcGx5IGlnbm9yZSBpdCBmb3Igbm93XG4gICAgICAgIHN1Z2dlc3Rpb24ucmVwbGFjZW1lbnRQcmVmaXggPSBwcmVSZXBsYWNlbWVudFByZWZpeDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN1Z2dlc3Rpb24ucmVwbGFjZW1lbnRQcmVmaXggPSByZXBsYWNlbWVudFByZWZpeDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBmaWx0ZXJlZCA9ICEocmVxdWVzdC5wcmVmaXggPT09IFwiXCIgfHwgKHRyaWdnZXJDaGFyICE9PSAnJyAmJiB0cmlnZ2VyT25seSkpO1xuICAgIHJldHVybiBmaWx0ZXJlZCA/IGZpbHRlcihzdWdnZXN0aW9ucywgcmVxdWVzdC5wcmVmaXgsIHsga2V5OiAnZmlsdGVyVGV4dCcgfSkgOiBzdWdnZXN0aW9ucztcbiAgfVxuXG4gIHByaXZhdGUgc2hvdWxkVHJpZ2dlcihcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICAgIHRyaWdnZXJDaGFyOiBzdHJpbmcsXG4gICAgbWluV29yZExlbmd0aDogbnVtYmVyLFxuICApOiBib29sZWFuIHtcbiAgICByZXR1cm4gcmVxdWVzdC5hY3RpdmF0ZWRNYW51YWxseVxuICAgICAgfHwgdHJpZ2dlckNoYXIgIT09ICcnXG4gICAgICB8fCBtaW5Xb3JkTGVuZ3RoIDw9IDBcbiAgICAgIHx8IHJlcXVlc3QucHJlZml4Lmxlbmd0aCA+PSBtaW5Xb3JkTGVuZ3RoO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRPckJ1aWxkU3VnZ2VzdGlvbnMoXG4gICAgc2VydmVyOiBBY3RpdmVTZXJ2ZXIsXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgICB0cmlnZ2VyQ2hhcjogc3RyaW5nLFxuICAgIHRyaWdnZXJPbmx5OiBib29sZWFuLFxuICAgIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtPzogQ29tcGxldGlvbkl0ZW1BZGp1c3RlcixcbiAgKTogUHJvbWlzZTxTdWdnZXN0aW9uW10+IHtcbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuX3N1Z2dlc3Rpb25DYWNoZS5nZXQoc2VydmVyKTtcblxuICAgIGNvbnN0IHRyaWdnZXJDb2x1bW4gPSAodHJpZ2dlckNoYXIgIT09ICcnICYmIHRyaWdnZXJPbmx5KVxuICAgICAgPyByZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uLmNvbHVtbiAtIHRyaWdnZXJDaGFyLmxlbmd0aFxuICAgICAgOiByZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uLmNvbHVtbiAtIHJlcXVlc3QucHJlZml4Lmxlbmd0aCAtIHRyaWdnZXJDaGFyLmxlbmd0aDtcbiAgICBjb25zdCB0cmlnZ2VyUG9pbnQgPSBuZXcgUG9pbnQocmVxdWVzdC5idWZmZXJQb3NpdGlvbi5yb3csIHRyaWdnZXJDb2x1bW4pO1xuXG4gICAgLy8gRG8gd2UgaGF2ZSBjb21wbGV0ZSBjYWNoZWQgc3VnZ2VzdGlvbnMgdGhhdCBhcmUgc3RpbGwgdmFsaWQgZm9yIHRoaXMgcmVxdWVzdD9cbiAgICBpZiAoY2FjaGUgJiYgIWNhY2hlLmlzSW5jb21wbGV0ZSAmJiBjYWNoZS50cmlnZ2VyQ2hhciA9PT0gdHJpZ2dlckNoYXJcbiAgICAgICYmIGNhY2hlLnRyaWdnZXJQb2ludC5pc0VxdWFsKHRyaWdnZXJQb2ludClcbiAgICAgICYmIGNhY2hlLm9yaWdpbmFsQnVmZmVyUG9pbnQuaXNMZXNzVGhhbk9yRXF1YWwocmVxdWVzdC5idWZmZXJQb3NpdGlvbikpIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGNhY2hlLnN1Z2dlc3Rpb25NYXAua2V5cygpKTtcbiAgICB9XG5cbiAgICAvLyBPdXIgY2FjaGVkIHN1Z2dlc3Rpb25zIGNhbid0IGJlIHVzZWQgc28gb2J0YWluIG5ldyBvbmVzIGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlclxuICAgIGNvbnN0IGNvbXBsZXRpb25zID0gYXdhaXQgVXRpbHMuZG9XaXRoQ2FuY2VsbGF0aW9uVG9rZW4oc2VydmVyLmNvbm5lY3Rpb24sIHRoaXMuX2NhbmNlbGxhdGlvblRva2VucyxcbiAgICAgIChjYW5jZWxsYXRpb25Ub2tlbikgPT4gc2VydmVyLmNvbm5lY3Rpb24uY29tcGxldGlvbihcbiAgICAgICAgQXV0b2NvbXBsZXRlQWRhcHRlci5jcmVhdGVDb21wbGV0aW9uUGFyYW1zKHJlcXVlc3QsIHRyaWdnZXJDaGFyLCB0cmlnZ2VyT25seSksIGNhbmNlbGxhdGlvblRva2VuKSxcbiAgICApO1xuXG4gICAgLy8gc3BlYyBndWFyYW50ZWVzIGFsbCBlZGl0cyBhcmUgb24gdGhlIHNhbWUgbGluZSwgc28gd2Ugb25seSBuZWVkIHRvIGNoZWNrIHRoZSBjb2x1bW5zXG4gICAgY29uc3QgdHJpZ2dlckNvbHVtbnM6IFtudW1iZXIsIG51bWJlcl0gPSBbdHJpZ2dlclBvaW50LmNvbHVtbiwgcmVxdWVzdC5idWZmZXJQb3NpdGlvbi5jb2x1bW5dO1xuXG4gICAgLy8gU2V0dXAgdGhlIGNhY2hlIGZvciBzdWJzZXF1ZW50IGZpbHRlcmVkIHJlc3VsdHNcbiAgICBjb25zdCBpc0NvbXBsZXRlID0gY29tcGxldGlvbnMgPT09IG51bGwgfHwgQXJyYXkuaXNBcnJheShjb21wbGV0aW9ucykgfHwgY29tcGxldGlvbnMuaXNJbmNvbXBsZXRlID09PSBmYWxzZTtcbiAgICBjb25zdCBzdWdnZXN0aW9uTWFwID1cbiAgICAgIHRoaXMuY29tcGxldGlvbkl0ZW1zVG9TdWdnZXN0aW9ucyhjb21wbGV0aW9ucywgcmVxdWVzdCwgdHJpZ2dlckNvbHVtbnMsIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtKTtcbiAgICB0aGlzLl9zdWdnZXN0aW9uQ2FjaGUuc2V0KHNlcnZlciwge1xuICAgICAgaXNJbmNvbXBsZXRlOiAhaXNDb21wbGV0ZSxcbiAgICAgIHRyaWdnZXJDaGFyLFxuICAgICAgdHJpZ2dlclBvaW50LFxuICAgICAgb3JpZ2luYWxCdWZmZXJQb2ludDogcmVxdWVzdC5idWZmZXJQb3NpdGlvbixcbiAgICAgIHN1Z2dlc3Rpb25NYXAsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gQXJyYXkuZnJvbShzdWdnZXN0aW9uTWFwLmtleXMoKSk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBPYnRhaW4gYSBjb21wbGV0ZSB2ZXJzaW9uIG9mIGEgc3VnZ2VzdGlvbiB3aXRoIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbiAgICogdGhlIGxhbmd1YWdlIHNlcnZlciBjYW4gcHJvdmlkZSBieSB3YXkgb2YgdGhlIGBjb21wbGV0aW9uSXRlbS9yZXNvbHZlYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gc2VydmVyIEFuIHtBY3RpdmVTZXJ2ZXJ9IHBvaW50aW5nIHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdG8gcXVlcnkuXG4gICAqIEBwYXJhbSBzdWdnZXN0aW9uIEFuIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259IHN1Z2dlc3Rpb24gdGhhdCBzaG91bGQgYmUgcmVzb2x2ZWQuXG4gICAqIEBwYXJhbSByZXF1ZXN0IEFuIHtPYmplY3R9IHdpdGggdGhlIEF1dG9Db21wbGV0ZSsgcmVxdWVzdCB0byBzYXRpc2Z5LlxuICAgKiBAcGFyYW0gb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0gQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIHtDb21wbGV0aW9uSXRlbX0sIGFuXG4gICAqICAge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn0gYW5kIGEge2F0b20kQXV0b2NvbXBsZXRlUmVxdWVzdH0gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBjb252ZXJ0ZWQgaXRlbXMuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IG9mIGFuIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259IHdpdGggdGhlIHJlc29sdmVkIEF1dG9Db21wbGV0ZSsgc3VnZ2VzdGlvbi5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBjb21wbGV0ZVN1Z2dlc3Rpb24oXG4gICAgc2VydmVyOiBBY3RpdmVTZXJ2ZXIsXG4gICAgc3VnZ2VzdGlvbjogYWMuQW55U3VnZ2VzdGlvbixcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICAgIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtPzogQ29tcGxldGlvbkl0ZW1BZGp1c3RlcixcbiAgKTogUHJvbWlzZTxhYy5BbnlTdWdnZXN0aW9uPiB7XG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLl9zdWdnZXN0aW9uQ2FjaGUuZ2V0KHNlcnZlcik7XG4gICAgaWYgKGNhY2hlKSB7XG4gICAgICBjb25zdCBwb3NzaWJseVJlc29sdmVkQ29tcGxldGlvbkl0ZW0gPSBjYWNoZS5zdWdnZXN0aW9uTWFwLmdldChzdWdnZXN0aW9uKTtcbiAgICAgIGlmIChwb3NzaWJseVJlc29sdmVkQ29tcGxldGlvbkl0ZW0gIT0gbnVsbCAmJiBwb3NzaWJseVJlc29sdmVkQ29tcGxldGlvbkl0ZW0uaXNSZXNvbHZlZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWRDb21wbGV0aW9uSXRlbSA9IGF3YWl0XG4gICAgICAgICAgc2VydmVyLmNvbm5lY3Rpb24uY29tcGxldGlvbkl0ZW1SZXNvbHZlKHBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbS5jb21wbGV0aW9uSXRlbSk7XG4gICAgICAgIGlmIChyZXNvbHZlZENvbXBsZXRpb25JdGVtICE9IG51bGwpIHtcbiAgICAgICAgICBBdXRvY29tcGxldGVBZGFwdGVyLnJlc29sdmVTdWdnZXN0aW9uKFxuICAgICAgICAgICAgcmVzb2x2ZWRDb21wbGV0aW9uSXRlbSwgc3VnZ2VzdGlvbiwgcmVxdWVzdCwgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0pO1xuICAgICAgICAgIHBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbS5pc1Jlc29sdmVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VnZ2VzdGlvbjtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgcmVzb2x2ZVN1Z2dlc3Rpb24oXG4gICAgcmVzb2x2ZWRDb21wbGV0aW9uSXRlbTogQ29tcGxldGlvbkl0ZW0sXG4gICAgc3VnZ2VzdGlvbjogYWMuQW55U3VnZ2VzdGlvbixcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICAgIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtPzogQ29tcGxldGlvbkl0ZW1BZGp1c3RlcixcbiAgKSB7XG4gICAgLy8gb25seSB0aGUgYGRvY3VtZW50YXRpb25gIGFuZCBgZGV0YWlsYCBwcm9wZXJ0aWVzIG1heSBjaGFuZ2Ugd2hlbiByZXNvbHZpbmdcbiAgICBBdXRvY29tcGxldGVBZGFwdGVyLmFwcGx5RGV0YWlsc1RvU3VnZ2VzdGlvbihyZXNvbHZlZENvbXBsZXRpb25JdGVtLCBzdWdnZXN0aW9uKTtcbiAgICBpZiAob25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0gIT0gbnVsbCkge1xuICAgICAgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0ocmVzb2x2ZWRDb21wbGV0aW9uSXRlbSwgc3VnZ2VzdGlvbiBhcyBhYy5BbnlTdWdnZXN0aW9uLCByZXF1ZXN0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBHZXQgdGhlIHRyaWdnZXIgY2hhcmFjdGVyIHRoYXQgY2F1c2VkIHRoZSBhdXRvY29tcGxldGUgKGlmIGFueSkuICBUaGlzIGlzIHJlcXVpcmVkIGJlY2F1c2VcbiAgICogQXV0b0NvbXBsZXRlLXBsdXMgZG9lcyBub3QgaGF2ZSB0cmlnZ2VyIGNoYXJhY3RlcnMuICBBbHRob3VnaCB0aGUgdGVybWlub2xvZ3kgaXMgJ2NoYXJhY3Rlcicgd2UgdHJlYXRcbiAgICogdGhlbSBhcyB2YXJpYWJsZSBsZW5ndGggc3RyaW5ncyBhcyB0aGlzIHdpbGwgYWxtb3N0IGNlcnRhaW5seSBjaGFuZ2UgaW4gdGhlIGZ1dHVyZSB0byBzdXBwb3J0ICctPicgZXRjLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBbiB7QXJyYXl9IG9mIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259cyB0byBsb2NhdGUgdGhlIHByZWZpeCwgZWRpdG9yLCBidWZmZXJQb3NpdGlvbiBldGMuXG4gICAqIEBwYXJhbSB0cmlnZ2VyQ2hhcnMgVGhlIHtBcnJheX0gb2Yge3N0cmluZ31zIHRoYXQgY2FuIGJlIHRyaWdnZXIgY2hhcmFjdGVycy5cbiAgICogQHJldHVybnMgQSBbe3N0cmluZ30sIGJvb2xlYW5dIHdoZXJlIHRoZSBzdHJpbmcgaXMgdGhlIG1hdGNoaW5nIHRyaWdnZXIgY2hhcmFjdGVyIG9yIGFuIGVtcHR5IHN0cmluZ1xuICAgKiAgIGlmIG9uZSB3YXMgbm90IG1hdGNoZWQsIGFuZCB0aGUgYm9vbGVhbiBpcyB0cnVlIGlmIHRoZSB0cmlnZ2VyIGNoYXJhY3RlciBpcyBpbiByZXF1ZXN0LnByZWZpeCwgYW5kIGZhbHNlXG4gICAqICAgaWYgaXQgaXMgaW4gdGhlIHdvcmQgYmVmb3JlIHJlcXVlc3QucHJlZml4LiBUaGUgYm9vbGVhbiByZXR1cm4gdmFsdWUgaGFzIG5vIG1lYW5pbmcgaWYgdGhlIHN0cmluZyByZXR1cm5cbiAgICogICB2YWx1ZSBpcyBhbiBlbXB0eSBzdHJpbmcuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGdldFRyaWdnZXJDaGFyYWN0ZXIoXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgICB0cmlnZ2VyQ2hhcnM6IHN0cmluZ1tdLFxuICApOiBbc3RyaW5nLCBib29sZWFuXSB7XG4gICAgLy8gQXV0b0NvbXBsZXRlLVBsdXMgY29uc2lkZXJzIHRleHQgYWZ0ZXIgYSBzeW1ib2wgdG8gYmUgYSBuZXcgdHJpZ2dlci4gU28gd2Ugc2hvdWxkIGxvb2sgYmFja3dhcmRcbiAgICAvLyBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byBzZWUgaWYgb25lIGlzIHRoZXJlIGFuZCB0aHVzIHNpbXVsYXRlIGl0LlxuICAgIGNvbnN0IGJ1ZmZlciA9IHJlcXVlc3QuZWRpdG9yLmdldEJ1ZmZlcigpO1xuICAgIGNvbnN0IGN1cnNvciA9IHJlcXVlc3QuYnVmZmVyUG9zaXRpb247XG4gICAgY29uc3QgcHJlZml4U3RhcnRDb2x1bW4gPSBjdXJzb3IuY29sdW1uIC0gcmVxdWVzdC5wcmVmaXgubGVuZ3RoO1xuICAgIGZvciAoY29uc3QgdHJpZ2dlckNoYXIgb2YgdHJpZ2dlckNoYXJzKSB7XG4gICAgICBpZiAocmVxdWVzdC5wcmVmaXguZW5kc1dpdGgodHJpZ2dlckNoYXIpKSB7XG4gICAgICAgIHJldHVybiBbdHJpZ2dlckNoYXIsIHRydWVdO1xuICAgICAgfVxuICAgICAgaWYgKHByZWZpeFN0YXJ0Q29sdW1uID49IHRyaWdnZXJDaGFyLmxlbmd0aCkgeyAvLyBGYXIgZW5vdWdoIGFsb25nIGEgbGluZSB0byBmaXQgdGhlIHRyaWdnZXIgY2hhclxuICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBQb2ludChjdXJzb3Iucm93LCBwcmVmaXhTdGFydENvbHVtbiAtIHRyaWdnZXJDaGFyLmxlbmd0aCk7XG4gICAgICAgIGNvbnN0IHBvc3NpYmxlVHJpZ2dlciA9IGJ1ZmZlci5nZXRUZXh0SW5SYW5nZShbc3RhcnQsIFtjdXJzb3Iucm93LCBwcmVmaXhTdGFydENvbHVtbl1dKTtcbiAgICAgICAgaWYgKHBvc3NpYmxlVHJpZ2dlciA9PT0gdHJpZ2dlckNoYXIpIHsgLy8gVGhlIHRleHQgYmVmb3JlIG91ciB0cmlnZ2VyIGlzIGEgdHJpZ2dlciBjaGFyIVxuICAgICAgICAgIHJldHVybiBbdHJpZ2dlckNoYXIsIGZhbHNlXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZXJlIHdhcyBubyBleHBsaWNpdCB0cmlnZ2VyIGNoYXJcbiAgICByZXR1cm4gWycnLCBmYWxzZV07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUgVGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMgdG8gYmUgc2VudCB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqIGJhc2VkIG9uIHRoZSBlZGl0b3IgYW5kIHBvc2l0aW9uIGZyb20gdGhlIEF1dG9Db21wbGV0ZVJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IFRoZSB7YXRvbSRBdXRvY29tcGxldGVSZXF1ZXN0fSB0byBvYnRhaW4gdGhlIGVkaXRvciBmcm9tLlxuICAgKiBAcGFyYW0gdHJpZ2dlclBvaW50IFRoZSB7YXRvbSRQb2ludH0gd2hlcmUgdGhlIHRyaWdnZXIgc3RhcnRlZC5cbiAgICogQHJldHVybnMgQSB7c3RyaW5nfSBjb250YWluaW5nIHRoZSBwcmVmaXggaW5jbHVkaW5nIHRoZSB0cmlnZ2VyIGNoYXJhY3Rlci5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2V0UHJlZml4V2l0aFRyaWdnZXIoXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgICB0cmlnZ2VyUG9pbnQ6IFBvaW50LFxuICApOiBzdHJpbmcge1xuICAgIHJldHVybiByZXF1ZXN0LmVkaXRvclxuICAgICAgLmdldEJ1ZmZlcigpXG4gICAgICAuZ2V0VGV4dEluUmFuZ2UoW1t0cmlnZ2VyUG9pbnQucm93LCB0cmlnZ2VyUG9pbnQuY29sdW1uXSwgcmVxdWVzdC5idWZmZXJQb3NpdGlvbl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIHtDb21wbGV0aW9uUGFyYW1zfSB0byBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIGVkaXRvciBhbmQgcG9zaXRpb24gZnJvbSB0aGUgQXV0b2NvbXBsZXRlIHJlcXVlc3QgZXRjLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBUaGUge2F0b20kQXV0b2NvbXBsZXRlUmVxdWVzdH0gY29udGFpbmluZyB0aGUgcmVxdWVzdCBkZXRhaWxzLlxuICAgKiBAcGFyYW0gdHJpZ2dlckNoYXJhY3RlciBUaGUge3N0cmluZ30gY29udGFpbmluZyB0aGUgdHJpZ2dlciBjaGFyYWN0ZXIgKGVtcHR5IGlmIG5vbmUpLlxuICAgKiBAcGFyYW0gdHJpZ2dlck9ubHkgQSB7Ym9vbGVhbn0gcmVwcmVzZW50aW5nIHdoZXRoZXIgdGhpcyBjb21wbGV0aW9uIGlzIHRyaWdnZXJlZCByaWdodCBhZnRlciBhIHRyaWdnZXIgY2hhcmFjdGVyLlxuICAgKiBAcmV0dXJucyBBIHtDb21wbGV0aW9uUGFyYW1zfSB3aXRoIHRoZSBrZXlzOlxuICAgKiAgICogYHRleHREb2N1bWVudGAgdGhlIGxhbmd1YWdlIHNlcnZlciBwcm90b2NvbCB0ZXh0RG9jdW1lbnQgaWRlbnRpZmljYXRpb24uXG4gICAqICAgKiBgcG9zaXRpb25gIHRoZSBwb3NpdGlvbiB3aXRoaW4gdGhlIHRleHQgZG9jdW1lbnQgdG8gZGlzcGxheSBjb21wbGV0aW9uIHJlcXVlc3QgZm9yLlxuICAgKiAgICogYGNvbnRleHRgIGNvbnRhaW5pbmcgdGhlIHRyaWdnZXIgY2hhcmFjdGVyIGFuZCBraW5kLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjcmVhdGVDb21wbGV0aW9uUGFyYW1zKFxuICAgIHJlcXVlc3Q6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQsXG4gICAgdHJpZ2dlckNoYXJhY3Rlcjogc3RyaW5nLFxuICAgIHRyaWdnZXJPbmx5OiBib29sZWFuLFxuICApOiBDb21wbGV0aW9uUGFyYW1zIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGV4dERvY3VtZW50OiBDb252ZXJ0LmVkaXRvclRvVGV4dERvY3VtZW50SWRlbnRpZmllcihyZXF1ZXN0LmVkaXRvciksXG4gICAgICBwb3NpdGlvbjogQ29udmVydC5wb2ludFRvUG9zaXRpb24ocmVxdWVzdC5idWZmZXJQb3NpdGlvbiksXG4gICAgICBjb250ZXh0OiBBdXRvY29tcGxldGVBZGFwdGVyLmNyZWF0ZUNvbXBsZXRpb25Db250ZXh0KHRyaWdnZXJDaGFyYWN0ZXIsIHRyaWdnZXJPbmx5KSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIHtDb21wbGV0aW9uQ29udGV4dH0gdG8gYmUgc2VudCB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqIGJhc2VkIG9uIHRoZSB0cmlnZ2VyIGNoYXJhY3Rlci5cbiAgICpcbiAgICogQHBhcmFtIHRyaWdnZXJDaGFyYWN0ZXIgVGhlIHtzdHJpbmd9IGNvbnRhaW5pbmcgdGhlIHRyaWdnZXIgY2hhcmFjdGVyIG9yICcnIGlmIG5vbmUuXG4gICAqIEBwYXJhbSB0cmlnZ2VyT25seSBBIHtib29sZWFufSByZXByZXNlbnRpbmcgd2hldGhlciB0aGlzIGNvbXBsZXRpb24gaXMgdHJpZ2dlcmVkIHJpZ2h0IGFmdGVyIGEgdHJpZ2dlciBjaGFyYWN0ZXIuXG4gICAqIEByZXR1cm5zIEFuIHtDb21wbGV0aW9uQ29udGV4dH0gdGhhdCBzcGVjaWZpZXMgdGhlIHRyaWdnZXJLaW5kIGFuZCB0aGUgdHJpZ2dlckNoYXJhY3RlclxuICAgKiAgIGlmIHRoZXJlIGlzIG9uZS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY3JlYXRlQ29tcGxldGlvbkNvbnRleHQodHJpZ2dlckNoYXJhY3Rlcjogc3RyaW5nLCB0cmlnZ2VyT25seTogYm9vbGVhbik6IENvbXBsZXRpb25Db250ZXh0IHtcbiAgICBpZiAodHJpZ2dlckNoYXJhY3RlciA9PT0gJycpIHtcbiAgICAgIHJldHVybiB7IHRyaWdnZXJLaW5kOiBDb21wbGV0aW9uVHJpZ2dlcktpbmQuSW52b2tlZCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJpZ2dlck9ubHlcbiAgICAgICAgPyB7IHRyaWdnZXJLaW5kOiBDb21wbGV0aW9uVHJpZ2dlcktpbmQuVHJpZ2dlckNoYXJhY3RlciwgdHJpZ2dlckNoYXJhY3RlciB9XG4gICAgICAgIDogeyB0cmlnZ2VyS2luZDogQ29tcGxldGlvblRyaWdnZXJLaW5kLlRyaWdnZXJGb3JJbmNvbXBsZXRlQ29tcGxldGlvbnMsIHRyaWdnZXJDaGFyYWN0ZXIgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGEgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIENvbXBsZXRpb25JdGVtIGFycmF5IG9yIENvbXBsZXRpb25MaXN0IHRvXG4gICAqIGFuIGFycmF5IG9mIG9yZGVyZWQgQXV0b0NvbXBsZXRlKyBzdWdnZXN0aW9ucy5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBsZXRpb25JdGVtcyBBbiB7QXJyYXl9IG9mIHtDb21wbGV0aW9uSXRlbX0gb2JqZWN0cyBvciBhIHtDb21wbGV0aW9uTGlzdH0gY29udGFpbmluZyBjb21wbGV0aW9uXG4gICAqICAgaXRlbXMgdG8gYmUgY29udmVydGVkLlxuICAgKiBAcGFyYW0gcmVxdWVzdCBUaGUge2F0b20kQXV0b2NvbXBsZXRlUmVxdWVzdH0gdG8gc2F0aXNmeS5cbiAgICogQHBhcmFtIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIHtDb21wbGV0aW9uSXRlbX0sIGFuIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259XG4gICAqICAgYW5kIGEge2F0b20kQXV0b2NvbXBsZXRlUmVxdWVzdH0gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBjb252ZXJ0ZWQgaXRlbXMuXG4gICAqIEByZXR1cm5zIEEge01hcH0gb2YgQXV0b0NvbXBsZXRlKyBzdWdnZXN0aW9ucyBvcmRlcmVkIGJ5IHRoZSBDb21wbGV0aW9uSXRlbXMgc29ydFRleHQuXG4gICAqL1xuICBwdWJsaWMgY29tcGxldGlvbkl0ZW1zVG9TdWdnZXN0aW9ucyhcbiAgICBjb21wbGV0aW9uSXRlbXM6IENvbXBsZXRpb25JdGVtW10gfCBDb21wbGV0aW9uTGlzdCB8IG51bGwsXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgICB0cmlnZ2VyQ29sdW1uczogW251bWJlciwgbnVtYmVyXSxcbiAgICBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbT86IENvbXBsZXRpb25JdGVtQWRqdXN0ZXIsXG4gICk6IE1hcDxTdWdnZXN0aW9uLCBQb3NzaWJseVJlc29sdmVkQ29tcGxldGlvbkl0ZW0+IHtcbiAgICBjb25zdCBjb21wbGV0aW9uc0FycmF5ID0gQXJyYXkuaXNBcnJheShjb21wbGV0aW9uSXRlbXMpXG4gICAgICA/IGNvbXBsZXRpb25JdGVtc1xuICAgICAgOiAoY29tcGxldGlvbkl0ZW1zICYmIGNvbXBsZXRpb25JdGVtcy5pdGVtcykgfHwgW107XG4gICAgcmV0dXJuIG5ldyBNYXAoY29tcGxldGlvbnNBcnJheVxuICAgICAgLnNvcnQoKGEsIGIpID0+IChhLnNvcnRUZXh0IHx8IGEubGFiZWwpLmxvY2FsZUNvbXBhcmUoYi5zb3J0VGV4dCB8fCBiLmxhYmVsKSlcbiAgICAgIC5tYXA8W1N1Z2dlc3Rpb24sIFBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbV0+KFxuICAgICAgICAocykgPT4gW1xuICAgICAgICAgIEF1dG9jb21wbGV0ZUFkYXB0ZXIuY29tcGxldGlvbkl0ZW1Ub1N1Z2dlc3Rpb24oXG4gICAgICAgICAgICBzLCB7fSBhcyBTdWdnZXN0aW9uLCByZXF1ZXN0LCB0cmlnZ2VyQ29sdW1ucywgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0pLFxuICAgICAgICAgIG5ldyBQb3NzaWJseVJlc29sdmVkQ29tcGxldGlvbkl0ZW0ocywgZmFsc2UpLFxuICAgICAgICBdLFxuICAgICAgKSxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhIGxhbmd1YWdlIHNlcnZlciBwcm90b2NvbCBDb21wbGV0aW9uSXRlbSB0byBhbiBBdXRvQ29tcGxldGUrIHN1Z2dlc3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBpdGVtIEFuIHtDb21wbGV0aW9uSXRlbX0gY29udGFpbmluZyBhIGNvbXBsZXRpb24gaXRlbSB0byBiZSBjb252ZXJ0ZWQuXG4gICAqIEBwYXJhbSBzdWdnZXN0aW9uIEEge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn0gdG8gaGF2ZSB0aGUgY29udmVyc2lvbiBhcHBsaWVkIHRvLlxuICAgKiBAcGFyYW0gcmVxdWVzdCBUaGUge2F0b20kQXV0b2NvbXBsZXRlUmVxdWVzdH0gdG8gc2F0aXNmeS5cbiAgICogQHBhcmFtIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIHtDb21wbGV0aW9uSXRlbX0sIGFuIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259XG4gICAqICAgYW5kIGEge2F0b20kQXV0b2NvbXBsZXRlUmVxdWVzdH0gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBjb252ZXJ0ZWQgaXRlbXMuXG4gICAqIEByZXR1cm5zIFRoZSB7YXRvbSRBdXRvY29tcGxldGVTdWdnZXN0aW9ufSBwYXNzZWQgaW4gYXMgc3VnZ2VzdGlvbiB3aXRoIHRoZSBjb252ZXJzaW9uIGFwcGxpZWQuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNvbXBsZXRpb25JdGVtVG9TdWdnZXN0aW9uKFxuICAgIGl0ZW06IENvbXBsZXRpb25JdGVtLFxuICAgIHN1Z2dlc3Rpb246IFN1Z2dlc3Rpb24sXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgICB0cmlnZ2VyQ29sdW1uczogW251bWJlciwgbnVtYmVyXSxcbiAgICBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbT86IENvbXBsZXRpb25JdGVtQWRqdXN0ZXIsXG4gICk6IFN1Z2dlc3Rpb24ge1xuICAgIEF1dG9jb21wbGV0ZUFkYXB0ZXIuYXBwbHlDb21wbGV0aW9uSXRlbVRvU3VnZ2VzdGlvbihpdGVtLCBzdWdnZXN0aW9uIGFzIFRleHRTdWdnZXN0aW9uKTtcbiAgICBBdXRvY29tcGxldGVBZGFwdGVyLmFwcGx5VGV4dEVkaXRUb1N1Z2dlc3Rpb24oXG4gICAgICBpdGVtLnRleHRFZGl0LCByZXF1ZXN0LmVkaXRvciwgdHJpZ2dlckNvbHVtbnMsIHJlcXVlc3QuYnVmZmVyUG9zaXRpb24sIHN1Z2dlc3Rpb24gYXMgVGV4dFN1Z2dlc3Rpb24sXG4gICAgKTtcbiAgICBBdXRvY29tcGxldGVBZGFwdGVyLmFwcGx5U25pcHBldFRvU3VnZ2VzdGlvbihpdGVtLCBzdWdnZXN0aW9uIGFzIFNuaXBwZXRTdWdnZXN0aW9uKTtcbiAgICBpZiAob25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0gIT0gbnVsbCkge1xuICAgICAgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0oaXRlbSwgc3VnZ2VzdGlvbiBhcyBhYy5BbnlTdWdnZXN0aW9uLCByZXF1ZXN0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VnZ2VzdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgdGhlIHByaW1hcnkgcGFydHMgb2YgYSBsYW5ndWFnZSBzZXJ2ZXIgcHJvdG9jb2wgQ29tcGxldGlvbkl0ZW0gdG8gYW4gQXV0b0NvbXBsZXRlKyBzdWdnZXN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gaXRlbSBBbiB7Q29tcGxldGlvbkl0ZW19IGNvbnRhaW5pbmcgdGhlIGNvbXBsZXRpb24gaXRlbXMgdG8gYmUgbWVyZ2VkIGludG8uXG4gICAqIEBwYXJhbSBzdWdnZXN0aW9uIFRoZSB7U3VnZ2VzdGlvbn0gdG8gbWVyZ2UgdGhlIGNvbnZlcnNpb24gaW50by5cbiAgICogQHJldHVybnMgVGhlIHtTdWdnZXN0aW9ufSB3aXRoIGRldGFpbHMgYWRkZWQgZnJvbSB0aGUge0NvbXBsZXRpb25JdGVtfS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXBwbHlDb21wbGV0aW9uSXRlbVRvU3VnZ2VzdGlvbihcbiAgICBpdGVtOiBDb21wbGV0aW9uSXRlbSxcbiAgICBzdWdnZXN0aW9uOiBUZXh0U3VnZ2VzdGlvbixcbiAgKSB7XG4gICAgc3VnZ2VzdGlvbi50ZXh0ID0gaXRlbS5pbnNlcnRUZXh0IHx8IGl0ZW0ubGFiZWw7XG4gICAgc3VnZ2VzdGlvbi5maWx0ZXJUZXh0ID0gaXRlbS5maWx0ZXJUZXh0IHx8IGl0ZW0ubGFiZWw7XG4gICAgc3VnZ2VzdGlvbi5kaXNwbGF5VGV4dCA9IGl0ZW0ubGFiZWw7XG4gICAgc3VnZ2VzdGlvbi50eXBlID0gQXV0b2NvbXBsZXRlQWRhcHRlci5jb21wbGV0aW9uS2luZFRvU3VnZ2VzdGlvblR5cGUoaXRlbS5raW5kKTtcbiAgICBBdXRvY29tcGxldGVBZGFwdGVyLmFwcGx5RGV0YWlsc1RvU3VnZ2VzdGlvbihpdGVtLCBzdWdnZXN0aW9uKTtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgYXBwbHlEZXRhaWxzVG9TdWdnZXN0aW9uKFxuICAgIGl0ZW06IENvbXBsZXRpb25JdGVtLFxuICAgIHN1Z2dlc3Rpb246IFN1Z2dlc3Rpb24sXG4gICkge1xuICAgIHN1Z2dlc3Rpb24ucmlnaHRMYWJlbCA9IGl0ZW0uZGV0YWlsO1xuXG4gICAgLy8gT2xkZXIgZm9ybWF0LCBjYW4ndCBrbm93IHdoYXQgaXQgaXMgc28gYXNzaWduIHRvIGJvdGggYW5kIGhvcGUgZm9yIGJlc3RcbiAgICBpZiAodHlwZW9mIChpdGVtLmRvY3VtZW50YXRpb24pID09PSAnc3RyaW5nJykge1xuICAgICAgc3VnZ2VzdGlvbi5kZXNjcmlwdGlvbk1hcmtkb3duID0gaXRlbS5kb2N1bWVudGF0aW9uO1xuICAgICAgc3VnZ2VzdGlvbi5kZXNjcmlwdGlvbiA9IGl0ZW0uZG9jdW1lbnRhdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoaXRlbS5kb2N1bWVudGF0aW9uICE9IG51bGwgJiYgdHlwZW9mIChpdGVtLmRvY3VtZW50YXRpb24pID09PSAnb2JqZWN0Jykge1xuICAgICAgLy8gTmV3ZXIgZm9ybWF0IHNwZWNpZmllcyB0aGUga2luZCBvZiBkb2N1bWVudGF0aW9uLCBhc3NpZ24gYXBwcm9wcmlhdGVseVxuICAgICAgaWYgKGl0ZW0uZG9jdW1lbnRhdGlvbi5raW5kID09PSAnbWFya2Rvd24nKSB7XG4gICAgICAgIHN1Z2dlc3Rpb24uZGVzY3JpcHRpb25NYXJrZG93biA9IGl0ZW0uZG9jdW1lbnRhdGlvbi52YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN1Z2dlc3Rpb24uZGVzY3JpcHRpb24gPSBpdGVtLmRvY3VtZW50YXRpb24udmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQXBwbGllcyB0aGUgdGV4dEVkaXQgcGFydCBvZiBhIGxhbmd1YWdlIHNlcnZlciBwcm90b2NvbCBDb21wbGV0aW9uSXRlbSB0byBhblxuICAgKiBBdXRvQ29tcGxldGUrIFN1Z2dlc3Rpb24gdmlhIHRoZSByZXBsYWNlbWVudFByZWZpeCBhbmQgdGV4dCBwcm9wZXJ0aWVzLlxuICAgKlxuICAgKiBAcGFyYW0gdGV4dEVkaXQgQSB7VGV4dEVkaXR9IGZyb20gYSBDb21wbGV0aW9uSXRlbSB0byBhcHBseS5cbiAgICogQHBhcmFtIGVkaXRvciBBbiBBdG9tIHtUZXh0RWRpdG9yfSB1c2VkIHRvIG9idGFpbiB0aGUgbmVjZXNzYXJ5IHRleHQgcmVwbGFjZW1lbnQuXG4gICAqIEBwYXJhbSBzdWdnZXN0aW9uIEFuIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259IHRvIHNldCB0aGUgcmVwbGFjZW1lbnRQcmVmaXggYW5kIHRleHQgcHJvcGVydGllcyBvZi5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXBwbHlUZXh0RWRpdFRvU3VnZ2VzdGlvbihcbiAgICB0ZXh0RWRpdDogVGV4dEVkaXQgfCB1bmRlZmluZWQsXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHRyaWdnZXJDb2x1bW5zOiBbbnVtYmVyLCBudW1iZXJdLFxuICAgIG9yaWdpbmFsQnVmZmVyUG9zaXRpb246IFBvaW50LFxuICAgIHN1Z2dlc3Rpb246IFRleHRTdWdnZXN0aW9uLFxuICApOiB2b2lkIHtcbiAgICBpZiAoIXRleHRFZGl0KSB7IHJldHVybjsgfVxuICAgIGlmICh0ZXh0RWRpdC5yYW5nZS5zdGFydC5jaGFyYWN0ZXIgIT09IHRyaWdnZXJDb2x1bW5zWzBdKSB7XG4gICAgICBjb25zdCByYW5nZSA9IENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKHRleHRFZGl0LnJhbmdlKTtcbiAgICAgIHN1Z2dlc3Rpb24uY3VzdG9tUmVwbGFjbWVudFByZWZpeCA9IGVkaXRvci5nZXRUZXh0SW5CdWZmZXJSYW5nZShbcmFuZ2Uuc3RhcnQsIG9yaWdpbmFsQnVmZmVyUG9zaXRpb25dKTtcbiAgICB9XG4gICAgc3VnZ2VzdGlvbi50ZXh0ID0gdGV4dEVkaXQubmV3VGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEFkZHMgYSBzbmlwcGV0IHRvIHRoZSBzdWdnZXN0aW9uIGlmIHRoZSBDb21wbGV0aW9uSXRlbSBjb250YWluc1xuICAgKiBzbmlwcGV0LWZvcm1hdHRlZCB0ZXh0XG4gICAqXG4gICAqIEBwYXJhbSBpdGVtIEFuIHtDb21wbGV0aW9uSXRlbX0gY29udGFpbmluZyB0aGUgY29tcGxldGlvbiBpdGVtcyB0byBiZSBtZXJnZWQgaW50by5cbiAgICogQHBhcmFtIHN1Z2dlc3Rpb24gVGhlIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259IHRvIG1lcmdlIHRoZSBjb252ZXJzaW9uIGludG8uXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFwcGx5U25pcHBldFRvU3VnZ2VzdGlvbihpdGVtOiBDb21wbGV0aW9uSXRlbSwgc3VnZ2VzdGlvbjogU25pcHBldFN1Z2dlc3Rpb24pOiB2b2lkIHtcbiAgICBpZiAoaXRlbS5pbnNlcnRUZXh0Rm9ybWF0ID09PSBJbnNlcnRUZXh0Rm9ybWF0LlNuaXBwZXQpIHtcbiAgICAgIHN1Z2dlc3Rpb24uc25pcHBldCA9IGl0ZW0udGV4dEVkaXQgIT0gbnVsbCA/IGl0ZW0udGV4dEVkaXQubmV3VGV4dCA6IChpdGVtLmluc2VydFRleHQgfHwgJycpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IE9idGFpbiB0aGUgdGV4dHVhbCBzdWdnZXN0aW9uIHR5cGUgcmVxdWlyZWQgYnkgQXV0b0NvbXBsZXRlKyB0aGF0XG4gICAqIG1vc3QgY2xvc2VseSBtYXBzIHRvIHRoZSBudW1lcmljIGNvbXBsZXRpb24ga2luZCBzdXBwbGllcyBieSB0aGUgbGFuZ3VhZ2Ugc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0ga2luZCBBIHtOdW1iZXJ9IHRoYXQgcmVwcmVzZW50cyB0aGUgc3VnZ2VzdGlvbiBraW5kIHRvIGJlIGNvbnZlcnRlZC5cbiAgICogQHJldHVybnMgQSB7U3RyaW5nfSBjb250YWluaW5nIHRoZSBBdXRvQ29tcGxldGUrIHN1Z2dlc3Rpb24gdHlwZSBlcXVpdmFsZW50XG4gICAqICAgdG8gdGhlIGdpdmVuIGNvbXBsZXRpb24ga2luZC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY29tcGxldGlvbktpbmRUb1N1Z2dlc3Rpb25UeXBlKGtpbmQ6IG51bWJlciB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gICAgc3dpdGNoIChraW5kKSB7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5Db25zdGFudDpcbiAgICAgICAgcmV0dXJuICdjb25zdGFudCc7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5NZXRob2Q6XG4gICAgICAgIHJldHVybiAnbWV0aG9kJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLkZ1bmN0aW9uOlxuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuQ29uc3RydWN0b3I6XG4gICAgICAgIHJldHVybiAnZnVuY3Rpb24nO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuRmllbGQ6XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5Qcm9wZXJ0eTpcbiAgICAgICAgcmV0dXJuICdwcm9wZXJ0eSc7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5WYXJpYWJsZTpcbiAgICAgICAgcmV0dXJuICd2YXJpYWJsZSc7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5DbGFzczpcbiAgICAgICAgcmV0dXJuICdjbGFzcyc7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5TdHJ1Y3Q6XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5UeXBlUGFyYW1ldGVyOlxuICAgICAgICByZXR1cm4gJ3R5cGUnO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuT3BlcmF0b3I6XG4gICAgICAgIHJldHVybiAnc2VsZWN0b3InO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuSW50ZXJmYWNlOlxuICAgICAgICByZXR1cm4gJ21peGluJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLk1vZHVsZTpcbiAgICAgICAgcmV0dXJuICdtb2R1bGUnO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuVW5pdDpcbiAgICAgICAgcmV0dXJuICdidWlsdGluJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLkVudW06XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5FbnVtTWVtYmVyOlxuICAgICAgICByZXR1cm4gJ2VudW0nO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuS2V5d29yZDpcbiAgICAgICAgcmV0dXJuICdrZXl3b3JkJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQ6XG4gICAgICAgIHJldHVybiAnc25pcHBldCc7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5GaWxlOlxuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuRm9sZGVyOlxuICAgICAgICByZXR1cm4gJ2ltcG9ydCc7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5SZWZlcmVuY2U6XG4gICAgICAgIHJldHVybiAncmVxdWlyZSc7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gJ3ZhbHVlJztcbiAgICB9XG4gIH1cbn1cbiJdfQ==