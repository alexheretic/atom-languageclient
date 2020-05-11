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
                ? request.bufferPosition.column
                : request.bufferPosition.column - request.prefix.length;
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
        suggestion.completionItem = item;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlLWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvYXV0b2NvbXBsZXRlLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHdDQUFpQztBQUNqQyxrQ0FBa0M7QUFHbEMscURBQXlDO0FBQ3pDLHNEQVcyQjtBQUMzQiwrQkFHYztBQXdCZCxNQUFNLDhCQUE4QjtJQUNsQyxZQUNTLGNBQThCLEVBQzlCLFVBQW1CO1FBRG5CLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUM5QixlQUFVLEdBQVYsVUFBVSxDQUFTO0lBRTVCLENBQUM7Q0FDRjtBQUVEOzs7R0FHRztBQUNILE1BQXFCLG1CQUFtQjtJQUF4QztRQVVVLHFCQUFnQixHQUFnRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzlFLHdCQUFtQixHQUErRCxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBOGIxRyxDQUFDO0lBeGNRLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sa0JBQWtCLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDO0lBQ3ZELENBQUM7SUFFTSxNQUFNLENBQUMsVUFBVSxDQUFDLGtCQUFzQztRQUM3RCxPQUFPLGtCQUFrQixDQUFDLGtCQUFrQixJQUFJLElBQUk7WUFDbEQsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsZUFBZSxLQUFLLElBQUksQ0FBQztJQUNuRSxDQUFDO0lBS0Q7Ozs7Ozs7Ozs7O09BV0c7SUFDVSxjQUFjLENBQ3pCLE1BQW9CLEVBQ3BCLE9BQXFDLEVBQ3JDLDBCQUFtRCxFQUNuRCxpQkFBMEI7O1lBRTFCLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsa0JBQWtCLElBQUksSUFBSTtnQkFDakUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLElBQUksRUFBRTtnQkFDaEUsQ0FBQyxD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QUFDO1lBQ25CLEtBQUssbUNBQWtCLENBQUMsSUFBSSxDQUFDO1lBQzdCLEtBQUssbUNBQWtCLENBQUMsTUFBTTtnQkFDNUIsT0FBTyxRQUFRLENBQUM7WUFDbEIsS0FBSyxtQ0FBa0IsQ0FBQyxTQUFTO2dCQUMvQixPQUFPLFNBQVMsQ0FBQztZQUNuQjtnQkFDRSxPQUFPLE9BQU8sQ0FBQztTQUNsQjtJQUNILENBQUM7Q0FDRjtBQXpjRCxzQ0F5Y0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IENhbmNlbGxhdGlvblRva2VuU291cmNlIH0gZnJvbSAndnNjb2RlLWpzb25ycGMnO1xuaW1wb3J0IHsgQWN0aXZlU2VydmVyIH0gZnJvbSAnLi4vc2VydmVyLW1hbmFnZXInO1xuaW1wb3J0IHsgZmlsdGVyIH0gZnJvbSAnZnV6emFsZHJpbi1wbHVzJztcbmltcG9ydCB7XG4gIENvbXBsZXRpb25Db250ZXh0LFxuICBDb21wbGV0aW9uSXRlbSxcbiAgQ29tcGxldGlvbkl0ZW1LaW5kLFxuICBDb21wbGV0aW9uTGlzdCxcbiAgQ29tcGxldGlvblBhcmFtcyxcbiAgQ29tcGxldGlvblRyaWdnZXJLaW5kLFxuICBJbnNlcnRUZXh0Rm9ybWF0LFxuICBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbiAgVGV4dEVkaXQsXG59IGZyb20gJy4uL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCB7XG4gIFBvaW50LFxuICBUZXh0RWRpdG9yLFxufSBmcm9tICdhdG9tJztcbmltcG9ydCAqIGFzIGFjIGZyb20gJ2F0b20vYXV0b2NvbXBsZXRlLXBsdXMnO1xuaW1wb3J0IHsgU3VnZ2VzdGlvbiwgVGV4dFN1Z2dlc3Rpb24sIFNuaXBwZXRTdWdnZXN0aW9uIH0gZnJvbSAnYXRvbS1pZGUnO1xuXG4vKipcbiAqIEhvbGRzIGEgbGlzdCBvZiBzdWdnZXN0aW9ucyBnZW5lcmF0ZWQgZnJvbSB0aGUgQ29tcGxldGlvbkl0ZW1bXVxuICogbGlzdCBzZW50IGJ5IHRoZSBzZXJ2ZXIsIGFzIHdlbGwgYXMgbWV0YWRhdGEgYWJvdXQgdGhlIGNvbnRleHRcbiAqIGl0IHdhcyBjb2xsZWN0ZWQgaW5cbiAqL1xuaW50ZXJmYWNlIFN1Z2dlc3Rpb25DYWNoZUVudHJ5IHtcbiAgLyoqIElmIGB0cnVlYCwgdGhlIHNlcnZlciB3aWxsIHNlbmQgYSBsaXN0IG9mIHN1Z2dlc3Rpb25zIHRvIHJlcGxhY2UgdGhpcyBvbmUgKi9cbiAgaXNJbmNvbXBsZXRlOiBib29sZWFuO1xuICAvKiogVGhlIHBvaW50IGxlZnQgb2YgdGhlIGZpcnN0IGNoYXJhY3RlciBpbiB0aGUgb3JpZ2luYWwgcHJlZml4IHNlbnQgdG8gdGhlIHNlcnZlciAqL1xuICB0cmlnZ2VyUG9pbnQ6IFBvaW50O1xuICAvKiogVGhlIHBvaW50IHJpZ2h0IG9mIHRoZSBsYXN0IGNoYXJhY3RlciBpbiB0aGUgb3JpZ2luYWwgcHJlZml4IHNlbnQgdG8gdGhlIHNlcnZlciAqL1xuICBvcmlnaW5hbEJ1ZmZlclBvaW50OiBQb2ludDtcbiAgLyoqIFRoZSB0cmlnZ2VyIHN0cmluZyB0aGF0IGNhdXNlZCB0aGUgYXV0b2NvbXBsZXRlIChpZiBhbnkpICovXG4gIHRyaWdnZXJDaGFyOiBzdHJpbmc7XG4gIHN1Z2dlc3Rpb25NYXA6IE1hcDxTdWdnZXN0aW9uLCBQb3NzaWJseVJlc29sdmVkQ29tcGxldGlvbkl0ZW0+O1xufVxuXG50eXBlIENvbXBsZXRpb25JdGVtQWRqdXN0ZXIgPVxuICAoaXRlbTogQ29tcGxldGlvbkl0ZW0sIHN1Z2dlc3Rpb246IGFjLkFueVN1Z2dlc3Rpb24sIHJlcXVlc3Q6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQpID0+IHZvaWQ7XG5cbmNsYXNzIFBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBjb21wbGV0aW9uSXRlbTogQ29tcGxldGlvbkl0ZW0sXG4gICAgcHVibGljIGlzUmVzb2x2ZWQ6IGJvb2xlYW4sXG4gICkge1xuICB9XG59XG5cbi8qKlxuICogUHVibGljOiBBZGFwdHMgdGhlIGxhbmd1YWdlIHNlcnZlciBwcm90b2NvbCBcInRleHREb2N1bWVudC9jb21wbGV0aW9uXCIgdG8gdGhlIEF0b21cbiAqIEF1dG9Db21wbGV0ZSsgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXV0b2NvbXBsZXRlQWRhcHRlciB7XG4gIHB1YmxpYyBzdGF0aWMgY2FuQWRhcHQoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICByZXR1cm4gc2VydmVyQ2FwYWJpbGl0aWVzLmNvbXBsZXRpb25Qcm92aWRlciAhPSBudWxsO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyBjYW5SZXNvbHZlKHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHNlcnZlckNhcGFiaWxpdGllcy5jb21wbGV0aW9uUHJvdmlkZXIgIT0gbnVsbCAmJlxuICAgICAgc2VydmVyQ2FwYWJpbGl0aWVzLmNvbXBsZXRpb25Qcm92aWRlci5yZXNvbHZlUHJvdmlkZXIgPT09IHRydWU7XG4gIH1cblxuICBwcml2YXRlIF9zdWdnZXN0aW9uQ2FjaGU6IFdlYWtNYXA8QWN0aXZlU2VydmVyLCBTdWdnZXN0aW9uQ2FjaGVFbnRyeT4gPSBuZXcgV2Vha01hcCgpO1xuICBwcml2YXRlIF9jYW5jZWxsYXRpb25Ub2tlbnM6IFdlYWtNYXA8TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLCBDYW5jZWxsYXRpb25Ub2tlblNvdXJjZT4gPSBuZXcgV2Vha01hcCgpO1xuXG4gIC8qKlxuICAgKiBQdWJsaWM6IE9idGFpbiBzdWdnZXN0aW9uIGxpc3QgZm9yIEF1dG9Db21wbGV0ZSsgYnkgcXVlcnlpbmcgdGhlIGxhbmd1YWdlIHNlcnZlciB1c2luZ1xuICAgKiB0aGUgYHRleHREb2N1bWVudC9jb21wbGV0aW9uYCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gc2VydmVyIEFuIHtBY3RpdmVTZXJ2ZXJ9IHBvaW50aW5nIHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdG8gcXVlcnkuXG4gICAqIEBwYXJhbSByZXF1ZXN0IFRoZSB7YXRvbSRBdXRvY29tcGxldGVSZXF1ZXN0fSB0byBzYXRpc2Z5LlxuICAgKiBAcGFyYW0gb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0gQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIHtDb21wbGV0aW9uSXRlbX0sXG4gICAqICAgYW4ge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn0gYW5kIGEge2F0b20kQXV0b2NvbXBsZXRlUmVxdWVzdH1cbiAgICogICBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGNvbnZlcnRlZCBpdGVtcy5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gb2YgYW4ge0FycmF5fSBvZiB7YXRvbSRBdXRvY29tcGxldGVTdWdnZXN0aW9ufXMgY29udGFpbmluZyB0aGVcbiAgICogICBBdXRvQ29tcGxldGUrIHN1Z2dlc3Rpb25zIHRvIGRpc3BsYXkuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZ2V0U3VnZ2VzdGlvbnMoXG4gICAgc2VydmVyOiBBY3RpdmVTZXJ2ZXIsXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgICBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbT86IENvbXBsZXRpb25JdGVtQWRqdXN0ZXIsXG4gICAgbWluaW11bVdvcmRMZW5ndGg/OiBudW1iZXIsXG4gICk6IFByb21pc2U8YWMuQW55U3VnZ2VzdGlvbltdPiB7XG4gICAgY29uc3QgdHJpZ2dlckNoYXJzID0gc2VydmVyLmNhcGFiaWxpdGllcy5jb21wbGV0aW9uUHJvdmlkZXIgIT0gbnVsbFxuICAgICAgPyBzZXJ2ZXIuY2FwYWJpbGl0aWVzLmNvbXBsZXRpb25Qcm92aWRlci50cmlnZ2VyQ2hhcmFjdGVycyB8fCBbXVxuICAgICAgOiBbXTtcblxuICAgIC8vIHRyaWdnZXJPbmx5IGlzIHRydWUgaWYgd2UgaGF2ZSBqdXN0IHR5cGVkIGluIGEgdHJpZ2dlciBjaGFyYWN0ZXIsIGFuZCBpcyBmYWxzZSBpZiB3ZVxuICAgIC8vIGhhdmUgdHlwZWQgYWRkaXRpb25hbCBjaGFyYWN0ZXJzIGZvbGxvd2luZyBhIHRyaWdnZXIgY2hhcmFjdGVyLlxuICAgIGNvbnN0IFt0cmlnZ2VyQ2hhciwgdHJpZ2dlck9ubHldID0gQXV0b2NvbXBsZXRlQWRhcHRlci5nZXRUcmlnZ2VyQ2hhcmFjdGVyKHJlcXVlc3QsIHRyaWdnZXJDaGFycyk7XG5cbiAgICBpZiAoIXRoaXMuc2hvdWxkVHJpZ2dlcihyZXF1ZXN0LCB0cmlnZ2VyQ2hhciwgbWluaW11bVdvcmRMZW5ndGggfHwgMCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIHN1Z2dlc3Rpb25zIGVpdGhlciBmcm9tIHRoZSBjYWNoZSBvciBieSBjYWxsaW5nIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICBjb25zdCBzdWdnZXN0aW9ucyA9IGF3YWl0XG4gICAgICB0aGlzLmdldE9yQnVpbGRTdWdnZXN0aW9ucyhzZXJ2ZXIsIHJlcXVlc3QsIHRyaWdnZXJDaGFyLCB0cmlnZ2VyT25seSwgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0pO1xuXG4gICAgLy8gV2UgbXVzdCB1cGRhdGUgdGhlIHJlcGxhY2VtZW50IHByZWZpeCBhcyBjaGFyYWN0ZXJzIGFyZSBhZGRlZCBhbmQgcmVtb3ZlZFxuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5fc3VnZ2VzdGlvbkNhY2hlLmdldChzZXJ2ZXIpITtcbiAgICBjb25zdCByZXBsYWNlbWVudFByZWZpeCA9IHJlcXVlc3QuZWRpdG9yLmdldFRleHRJbkJ1ZmZlclJhbmdlKFtjYWNoZS50cmlnZ2VyUG9pbnQsIHJlcXVlc3QuYnVmZmVyUG9zaXRpb25dKTtcbiAgICBmb3IgKGNvbnN0IHN1Z2dlc3Rpb24gb2Ygc3VnZ2VzdGlvbnMpIHtcbiAgICAgIGlmIChzdWdnZXN0aW9uLmN1c3RvbVJlcGxhY21lbnRQcmVmaXgpIHsgLy8gaGF2aW5nIHRoaXMgcHJvcGVydHkgbWVhbnMgYSBjdXN0b20gcmFuZ2Ugd2FzIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IGxlbiA9IHJlcGxhY2VtZW50UHJlZml4Lmxlbmd0aDtcbiAgICAgICAgY29uc3QgcHJlUmVwbGFjZW1lbnRQcmVmaXggPSBzdWdnZXN0aW9uLmN1c3RvbVJlcGxhY21lbnRQcmVmaXhcbiAgICAgICAgICArIHJlcGxhY2VtZW50UHJlZml4LnN1YnN0cmluZyhsZW4gKyBjYWNoZS5vcmlnaW5hbEJ1ZmZlclBvaW50LmNvbHVtbiAtIHJlcXVlc3QuYnVmZmVyUG9zaXRpb24uY29sdW1uLCBsZW4pO1xuICAgICAgICAvLyB3ZSBjYW5ub3QgcmVwbGFjZSB0ZXh0IGFmdGVyIHRoZSBjdXJzb3Igd2l0aCB0aGUgY3VycmVudCBhdXRvY29tcGxldGUtcGx1cyBBUElcbiAgICAgICAgLy8gc28gd2Ugd2lsbCBzaW1wbHkgaWdub3JlIGl0IGZvciBub3dcbiAgICAgICAgc3VnZ2VzdGlvbi5yZXBsYWNlbWVudFByZWZpeCA9IHByZVJlcGxhY2VtZW50UHJlZml4O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3VnZ2VzdGlvbi5yZXBsYWNlbWVudFByZWZpeCA9IHJlcGxhY2VtZW50UHJlZml4O1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGZpbHRlcmVkID0gIShyZXF1ZXN0LnByZWZpeCA9PT0gXCJcIiB8fCAodHJpZ2dlckNoYXIgIT09ICcnICYmIHRyaWdnZXJPbmx5KSk7XG4gICAgcmV0dXJuIGZpbHRlcmVkID8gZmlsdGVyKHN1Z2dlc3Rpb25zLCByZXF1ZXN0LnByZWZpeCwgeyBrZXk6ICdmaWx0ZXJUZXh0JyB9KSA6IHN1Z2dlc3Rpb25zO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG91bGRUcmlnZ2VyKFxuICAgIHJlcXVlc3Q6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQsXG4gICAgdHJpZ2dlckNoYXI6IHN0cmluZyxcbiAgICBtaW5Xb3JkTGVuZ3RoOiBudW1iZXIsXG4gICk6IGJvb2xlYW4ge1xuICAgIHJldHVybiByZXF1ZXN0LmFjdGl2YXRlZE1hbnVhbGx5XG4gICAgICB8fCB0cmlnZ2VyQ2hhciAhPT0gJydcbiAgICAgIHx8IG1pbldvcmRMZW5ndGggPD0gMFxuICAgICAgfHwgcmVxdWVzdC5wcmVmaXgubGVuZ3RoID49IG1pbldvcmRMZW5ndGg7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldE9yQnVpbGRTdWdnZXN0aW9ucyhcbiAgICBzZXJ2ZXI6IEFjdGl2ZVNlcnZlcixcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICAgIHRyaWdnZXJDaGFyOiBzdHJpbmcsXG4gICAgdHJpZ2dlck9ubHk6IGJvb2xlYW4sXG4gICAgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0/OiBDb21wbGV0aW9uSXRlbUFkanVzdGVyLFxuICApOiBQcm9taXNlPFN1Z2dlc3Rpb25bXT4ge1xuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5fc3VnZ2VzdGlvbkNhY2hlLmdldChzZXJ2ZXIpO1xuXG4gICAgY29uc3QgdHJpZ2dlckNvbHVtbiA9ICh0cmlnZ2VyQ2hhciAhPT0gJycgJiYgdHJpZ2dlck9ubHkpXG4gICAgICA/IHJlcXVlc3QuYnVmZmVyUG9zaXRpb24uY29sdW1uXG4gICAgICA6IHJlcXVlc3QuYnVmZmVyUG9zaXRpb24uY29sdW1uIC0gcmVxdWVzdC5wcmVmaXgubGVuZ3RoO1xuICAgIGNvbnN0IHRyaWdnZXJQb2ludCA9IG5ldyBQb2ludChyZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uLnJvdywgdHJpZ2dlckNvbHVtbik7XG5cbiAgICAvLyBEbyB3ZSBoYXZlIGNvbXBsZXRlIGNhY2hlZCBzdWdnZXN0aW9ucyB0aGF0IGFyZSBzdGlsbCB2YWxpZCBmb3IgdGhpcyByZXF1ZXN0P1xuICAgIGlmIChjYWNoZSAmJiAhY2FjaGUuaXNJbmNvbXBsZXRlICYmIGNhY2hlLnRyaWdnZXJDaGFyID09PSB0cmlnZ2VyQ2hhclxuICAgICAgJiYgY2FjaGUudHJpZ2dlclBvaW50LmlzRXF1YWwodHJpZ2dlclBvaW50KVxuICAgICAgJiYgY2FjaGUub3JpZ2luYWxCdWZmZXJQb2ludC5pc0xlc3NUaGFuT3JFcXVhbChyZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uKSkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oY2FjaGUuc3VnZ2VzdGlvbk1hcC5rZXlzKCkpO1xuICAgIH1cblxuICAgIC8vIE91ciBjYWNoZWQgc3VnZ2VzdGlvbnMgY2FuJ3QgYmUgdXNlZCBzbyBvYnRhaW4gbmV3IG9uZXMgZnJvbSB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAgY29uc3QgY29tcGxldGlvbnMgPSBhd2FpdCBVdGlscy5kb1dpdGhDYW5jZWxsYXRpb25Ub2tlbihzZXJ2ZXIuY29ubmVjdGlvbiwgdGhpcy5fY2FuY2VsbGF0aW9uVG9rZW5zLFxuICAgICAgKGNhbmNlbGxhdGlvblRva2VuKSA9PiBzZXJ2ZXIuY29ubmVjdGlvbi5jb21wbGV0aW9uKFxuICAgICAgICBBdXRvY29tcGxldGVBZGFwdGVyLmNyZWF0ZUNvbXBsZXRpb25QYXJhbXMocmVxdWVzdCwgdHJpZ2dlckNoYXIsIHRyaWdnZXJPbmx5KSwgY2FuY2VsbGF0aW9uVG9rZW4pLFxuICAgICk7XG5cbiAgICAvLyBzcGVjIGd1YXJhbnRlZXMgYWxsIGVkaXRzIGFyZSBvbiB0aGUgc2FtZSBsaW5lLCBzbyB3ZSBvbmx5IG5lZWQgdG8gY2hlY2sgdGhlIGNvbHVtbnNcbiAgICBjb25zdCB0cmlnZ2VyQ29sdW1uczogW251bWJlciwgbnVtYmVyXSA9IFt0cmlnZ2VyUG9pbnQuY29sdW1uLCByZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uLmNvbHVtbl07XG5cbiAgICAvLyBTZXR1cCB0aGUgY2FjaGUgZm9yIHN1YnNlcXVlbnQgZmlsdGVyZWQgcmVzdWx0c1xuICAgIGNvbnN0IGlzQ29tcGxldGUgPSBjb21wbGV0aW9ucyA9PT0gbnVsbCB8fCBBcnJheS5pc0FycmF5KGNvbXBsZXRpb25zKSB8fCBjb21wbGV0aW9ucy5pc0luY29tcGxldGUgPT09IGZhbHNlO1xuICAgIGNvbnN0IHN1Z2dlc3Rpb25NYXAgPVxuICAgICAgdGhpcy5jb21wbGV0aW9uSXRlbXNUb1N1Z2dlc3Rpb25zKGNvbXBsZXRpb25zLCByZXF1ZXN0LCB0cmlnZ2VyQ29sdW1ucywgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0pO1xuICAgIHRoaXMuX3N1Z2dlc3Rpb25DYWNoZS5zZXQoc2VydmVyLCB7XG4gICAgICBpc0luY29tcGxldGU6ICFpc0NvbXBsZXRlLFxuICAgICAgdHJpZ2dlckNoYXIsXG4gICAgICB0cmlnZ2VyUG9pbnQsXG4gICAgICBvcmlnaW5hbEJ1ZmZlclBvaW50OiByZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uLFxuICAgICAgc3VnZ2VzdGlvbk1hcCxcbiAgICB9KTtcblxuICAgIHJldHVybiBBcnJheS5mcm9tKHN1Z2dlc3Rpb25NYXAua2V5cygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IE9idGFpbiBhIGNvbXBsZXRlIHZlcnNpb24gb2YgYSBzdWdnZXN0aW9uIHdpdGggYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuICAgKiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGNhbiBwcm92aWRlIGJ5IHdheSBvZiB0aGUgYGNvbXBsZXRpb25JdGVtL3Jlc29sdmVgIHJlcXVlc3QuXG4gICAqXG4gICAqIEBwYXJhbSBzZXJ2ZXIgQW4ge0FjdGl2ZVNlcnZlcn0gcG9pbnRpbmcgdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB0byBxdWVyeS5cbiAgICogQHBhcmFtIHN1Z2dlc3Rpb24gQW4ge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn0gc3VnZ2VzdGlvbiB0aGF0IHNob3VsZCBiZSByZXNvbHZlZC5cbiAgICogQHBhcmFtIHJlcXVlc3QgQW4ge09iamVjdH0gd2l0aCB0aGUgQXV0b0NvbXBsZXRlKyByZXF1ZXN0IHRvIHNhdGlzZnkuXG4gICAqIEBwYXJhbSBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbSBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IHRha2VzIGEge0NvbXBsZXRpb25JdGVtfSwgYW5cbiAgICogICB7YXRvbSRBdXRvY29tcGxldGVTdWdnZXN0aW9ufSBhbmQgYSB7YXRvbSRBdXRvY29tcGxldGVSZXF1ZXN0fSBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGNvbnZlcnRlZCBpdGVtcy5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gb2YgYW4ge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn0gd2l0aCB0aGUgcmVzb2x2ZWQgQXV0b0NvbXBsZXRlKyBzdWdnZXN0aW9uLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGNvbXBsZXRlU3VnZ2VzdGlvbihcbiAgICBzZXJ2ZXI6IEFjdGl2ZVNlcnZlcixcbiAgICBzdWdnZXN0aW9uOiBhYy5BbnlTdWdnZXN0aW9uLFxuICAgIHJlcXVlc3Q6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQsXG4gICAgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0/OiBDb21wbGV0aW9uSXRlbUFkanVzdGVyLFxuICApOiBQcm9taXNlPGFjLkFueVN1Z2dlc3Rpb24+IHtcbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuX3N1Z2dlc3Rpb25DYWNoZS5nZXQoc2VydmVyKTtcbiAgICBpZiAoY2FjaGUpIHtcbiAgICAgIGNvbnN0IHBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbSA9IGNhY2hlLnN1Z2dlc3Rpb25NYXAuZ2V0KHN1Z2dlc3Rpb24pO1xuICAgICAgaWYgKHBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbSAhPSBudWxsICYmIHBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbS5pc1Jlc29sdmVkID09PSBmYWxzZSkge1xuICAgICAgICBjb25zdCByZXNvbHZlZENvbXBsZXRpb25JdGVtID0gYXdhaXRcbiAgICAgICAgICBzZXJ2ZXIuY29ubmVjdGlvbi5jb21wbGV0aW9uSXRlbVJlc29sdmUocG9zc2libHlSZXNvbHZlZENvbXBsZXRpb25JdGVtLmNvbXBsZXRpb25JdGVtKTtcbiAgICAgICAgaWYgKHJlc29sdmVkQ29tcGxldGlvbkl0ZW0gIT0gbnVsbCkge1xuICAgICAgICAgIEF1dG9jb21wbGV0ZUFkYXB0ZXIucmVzb2x2ZVN1Z2dlc3Rpb24oXG4gICAgICAgICAgICByZXNvbHZlZENvbXBsZXRpb25JdGVtLCBzdWdnZXN0aW9uLCByZXF1ZXN0LCBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbSk7XG4gICAgICAgICAgcG9zc2libHlSZXNvbHZlZENvbXBsZXRpb25JdGVtLmlzUmVzb2x2ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdWdnZXN0aW9uO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyByZXNvbHZlU3VnZ2VzdGlvbihcbiAgICByZXNvbHZlZENvbXBsZXRpb25JdGVtOiBDb21wbGV0aW9uSXRlbSxcbiAgICBzdWdnZXN0aW9uOiBhYy5BbnlTdWdnZXN0aW9uLFxuICAgIHJlcXVlc3Q6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQsXG4gICAgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0/OiBDb21wbGV0aW9uSXRlbUFkanVzdGVyLFxuICApIHtcbiAgICAvLyBvbmx5IHRoZSBgZG9jdW1lbnRhdGlvbmAgYW5kIGBkZXRhaWxgIHByb3BlcnRpZXMgbWF5IGNoYW5nZSB3aGVuIHJlc29sdmluZ1xuICAgIEF1dG9jb21wbGV0ZUFkYXB0ZXIuYXBwbHlEZXRhaWxzVG9TdWdnZXN0aW9uKHJlc29sdmVkQ29tcGxldGlvbkl0ZW0sIHN1Z2dlc3Rpb24pO1xuICAgIGlmIChvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbSAhPSBudWxsKSB7XG4gICAgICBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbShyZXNvbHZlZENvbXBsZXRpb25JdGVtLCBzdWdnZXN0aW9uIGFzIGFjLkFueVN1Z2dlc3Rpb24sIHJlcXVlc3QpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEdldCB0aGUgdHJpZ2dlciBjaGFyYWN0ZXIgdGhhdCBjYXVzZWQgdGhlIGF1dG9jb21wbGV0ZSAoaWYgYW55KS4gIFRoaXMgaXMgcmVxdWlyZWQgYmVjYXVzZVxuICAgKiBBdXRvQ29tcGxldGUtcGx1cyBkb2VzIG5vdCBoYXZlIHRyaWdnZXIgY2hhcmFjdGVycy4gIEFsdGhvdWdoIHRoZSB0ZXJtaW5vbG9neSBpcyAnY2hhcmFjdGVyJyB3ZSB0cmVhdFxuICAgKiB0aGVtIGFzIHZhcmlhYmxlIGxlbmd0aCBzdHJpbmdzIGFzIHRoaXMgd2lsbCBhbG1vc3QgY2VydGFpbmx5IGNoYW5nZSBpbiB0aGUgZnV0dXJlIHRvIHN1cHBvcnQgJy0+JyBldGMuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEFuIHtBcnJheX0gb2Yge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn1zIHRvIGxvY2F0ZSB0aGUgcHJlZml4LCBlZGl0b3IsIGJ1ZmZlclBvc2l0aW9uIGV0Yy5cbiAgICogQHBhcmFtIHRyaWdnZXJDaGFycyBUaGUge0FycmF5fSBvZiB7c3RyaW5nfXMgdGhhdCBjYW4gYmUgdHJpZ2dlciBjaGFyYWN0ZXJzLlxuICAgKiBAcmV0dXJucyBBIFt7c3RyaW5nfSwgYm9vbGVhbl0gd2hlcmUgdGhlIHN0cmluZyBpcyB0aGUgbWF0Y2hpbmcgdHJpZ2dlciBjaGFyYWN0ZXIgb3IgYW4gZW1wdHkgc3RyaW5nXG4gICAqICAgaWYgb25lIHdhcyBub3QgbWF0Y2hlZCwgYW5kIHRoZSBib29sZWFuIGlzIHRydWUgaWYgdGhlIHRyaWdnZXIgY2hhcmFjdGVyIGlzIGluIHJlcXVlc3QucHJlZml4LCBhbmQgZmFsc2VcbiAgICogICBpZiBpdCBpcyBpbiB0aGUgd29yZCBiZWZvcmUgcmVxdWVzdC5wcmVmaXguIFRoZSBib29sZWFuIHJldHVybiB2YWx1ZSBoYXMgbm8gbWVhbmluZyBpZiB0aGUgc3RyaW5nIHJldHVyblxuICAgKiAgIHZhbHVlIGlzIGFuIGVtcHR5IHN0cmluZy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2V0VHJpZ2dlckNoYXJhY3RlcihcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICAgIHRyaWdnZXJDaGFyczogc3RyaW5nW10sXG4gICk6IFtzdHJpbmcsIGJvb2xlYW5dIHtcbiAgICAvLyBBdXRvQ29tcGxldGUtUGx1cyBjb25zaWRlcnMgdGV4dCBhZnRlciBhIHN5bWJvbCB0byBiZSBhIG5ldyB0cmlnZ2VyLiBTbyB3ZSBzaG91bGQgbG9vayBiYWNrd2FyZFxuICAgIC8vIGZyb20gdGhlIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uIHRvIHNlZSBpZiBvbmUgaXMgdGhlcmUgYW5kIHRodXMgc2ltdWxhdGUgaXQuXG4gICAgY29uc3QgYnVmZmVyID0gcmVxdWVzdC5lZGl0b3IuZ2V0QnVmZmVyKCk7XG4gICAgY29uc3QgY3Vyc29yID0gcmVxdWVzdC5idWZmZXJQb3NpdGlvbjtcbiAgICBjb25zdCBwcmVmaXhTdGFydENvbHVtbiA9IGN1cnNvci5jb2x1bW4gLSByZXF1ZXN0LnByZWZpeC5sZW5ndGg7XG4gICAgZm9yIChjb25zdCB0cmlnZ2VyQ2hhciBvZiB0cmlnZ2VyQ2hhcnMpIHtcbiAgICAgIGlmIChyZXF1ZXN0LnByZWZpeC5lbmRzV2l0aCh0cmlnZ2VyQ2hhcikpIHtcbiAgICAgICAgcmV0dXJuIFt0cmlnZ2VyQ2hhciwgdHJ1ZV07XG4gICAgICB9XG4gICAgICBpZiAocHJlZml4U3RhcnRDb2x1bW4gPj0gdHJpZ2dlckNoYXIubGVuZ3RoKSB7IC8vIEZhciBlbm91Z2ggYWxvbmcgYSBsaW5lIHRvIGZpdCB0aGUgdHJpZ2dlciBjaGFyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IFBvaW50KGN1cnNvci5yb3csIHByZWZpeFN0YXJ0Q29sdW1uIC0gdHJpZ2dlckNoYXIubGVuZ3RoKTtcbiAgICAgICAgY29uc3QgcG9zc2libGVUcmlnZ2VyID0gYnVmZmVyLmdldFRleHRJblJhbmdlKFtzdGFydCwgW2N1cnNvci5yb3csIHByZWZpeFN0YXJ0Q29sdW1uXV0pO1xuICAgICAgICBpZiAocG9zc2libGVUcmlnZ2VyID09PSB0cmlnZ2VyQ2hhcikgeyAvLyBUaGUgdGV4dCBiZWZvcmUgb3VyIHRyaWdnZXIgaXMgYSB0cmlnZ2VyIGNoYXIhXG4gICAgICAgICAgcmV0dXJuIFt0cmlnZ2VyQ2hhciwgZmFsc2VdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlcmUgd2FzIG5vIGV4cGxpY2l0IHRyaWdnZXIgY2hhclxuICAgIHJldHVybiBbJycsIGZhbHNlXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSBUZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyB0byBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIGVkaXRvciBhbmQgcG9zaXRpb24gZnJvbSB0aGUgQXV0b0NvbXBsZXRlUmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgVGhlIHthdG9tJEF1dG9jb21wbGV0ZVJlcXVlc3R9IHRvIG9idGFpbiB0aGUgZWRpdG9yIGZyb20uXG4gICAqIEBwYXJhbSB0cmlnZ2VyUG9pbnQgVGhlIHthdG9tJFBvaW50fSB3aGVyZSB0aGUgdHJpZ2dlciBzdGFydGVkLlxuICAgKiBAcmV0dXJucyBBIHtzdHJpbmd9IGNvbnRhaW5pbmcgdGhlIHByZWZpeCBpbmNsdWRpbmcgdGhlIHRyaWdnZXIgY2hhcmFjdGVyLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZXRQcmVmaXhXaXRoVHJpZ2dlcihcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICAgIHRyaWdnZXJQb2ludDogUG9pbnQsXG4gICk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlcXVlc3QuZWRpdG9yXG4gICAgICAuZ2V0QnVmZmVyKClcbiAgICAgIC5nZXRUZXh0SW5SYW5nZShbW3RyaWdnZXJQb2ludC5yb3csIHRyaWdnZXJQb2ludC5jb2x1bW5dLCByZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uXSk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUge0NvbXBsZXRpb25QYXJhbXN9IHRvIGJlIHNlbnQgdG8gdGhlIGxhbmd1YWdlIHNlcnZlclxuICAgKiBiYXNlZCBvbiB0aGUgZWRpdG9yIGFuZCBwb3NpdGlvbiBmcm9tIHRoZSBBdXRvY29tcGxldGUgcmVxdWVzdCBldGMuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IFRoZSB7YXRvbSRBdXRvY29tcGxldGVSZXF1ZXN0fSBjb250YWluaW5nIHRoZSByZXF1ZXN0IGRldGFpbHMuXG4gICAqIEBwYXJhbSB0cmlnZ2VyQ2hhcmFjdGVyIFRoZSB7c3RyaW5nfSBjb250YWluaW5nIHRoZSB0cmlnZ2VyIGNoYXJhY3RlciAoZW1wdHkgaWYgbm9uZSkuXG4gICAqIEBwYXJhbSB0cmlnZ2VyT25seSBBIHtib29sZWFufSByZXByZXNlbnRpbmcgd2hldGhlciB0aGlzIGNvbXBsZXRpb24gaXMgdHJpZ2dlcmVkIHJpZ2h0IGFmdGVyIGEgdHJpZ2dlciBjaGFyYWN0ZXIuXG4gICAqIEByZXR1cm5zIEEge0NvbXBsZXRpb25QYXJhbXN9IHdpdGggdGhlIGtleXM6XG4gICAqICAgKiBgdGV4dERvY3VtZW50YCB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIHRleHREb2N1bWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICogICAqIGBwb3NpdGlvbmAgdGhlIHBvc2l0aW9uIHdpdGhpbiB0aGUgdGV4dCBkb2N1bWVudCB0byBkaXNwbGF5IGNvbXBsZXRpb24gcmVxdWVzdCBmb3IuXG4gICAqICAgKiBgY29udGV4dGAgY29udGFpbmluZyB0aGUgdHJpZ2dlciBjaGFyYWN0ZXIgYW5kIGtpbmQuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNyZWF0ZUNvbXBsZXRpb25QYXJhbXMoXG4gICAgcmVxdWVzdDogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCxcbiAgICB0cmlnZ2VyQ2hhcmFjdGVyOiBzdHJpbmcsXG4gICAgdHJpZ2dlck9ubHk6IGJvb2xlYW4sXG4gICk6IENvbXBsZXRpb25QYXJhbXMge1xuICAgIHJldHVybiB7XG4gICAgICB0ZXh0RG9jdW1lbnQ6IENvbnZlcnQuZWRpdG9yVG9UZXh0RG9jdW1lbnRJZGVudGlmaWVyKHJlcXVlc3QuZWRpdG9yKSxcbiAgICAgIHBvc2l0aW9uOiBDb252ZXJ0LnBvaW50VG9Qb3NpdGlvbihyZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uKSxcbiAgICAgIGNvbnRleHQ6IEF1dG9jb21wbGV0ZUFkYXB0ZXIuY3JlYXRlQ29tcGxldGlvbkNvbnRleHQodHJpZ2dlckNoYXJhY3RlciwgdHJpZ2dlck9ubHkpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUge0NvbXBsZXRpb25Db250ZXh0fSB0byBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIHRyaWdnZXIgY2hhcmFjdGVyLlxuICAgKlxuICAgKiBAcGFyYW0gdHJpZ2dlckNoYXJhY3RlciBUaGUge3N0cmluZ30gY29udGFpbmluZyB0aGUgdHJpZ2dlciBjaGFyYWN0ZXIgb3IgJycgaWYgbm9uZS5cbiAgICogQHBhcmFtIHRyaWdnZXJPbmx5IEEge2Jvb2xlYW59IHJlcHJlc2VudGluZyB3aGV0aGVyIHRoaXMgY29tcGxldGlvbiBpcyB0cmlnZ2VyZWQgcmlnaHQgYWZ0ZXIgYSB0cmlnZ2VyIGNoYXJhY3Rlci5cbiAgICogQHJldHVybnMgQW4ge0NvbXBsZXRpb25Db250ZXh0fSB0aGF0IHNwZWNpZmllcyB0aGUgdHJpZ2dlcktpbmQgYW5kIHRoZSB0cmlnZ2VyQ2hhcmFjdGVyXG4gICAqICAgaWYgdGhlcmUgaXMgb25lLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjcmVhdGVDb21wbGV0aW9uQ29udGV4dCh0cmlnZ2VyQ2hhcmFjdGVyOiBzdHJpbmcsIHRyaWdnZXJPbmx5OiBib29sZWFuKTogQ29tcGxldGlvbkNvbnRleHQge1xuICAgIGlmICh0cmlnZ2VyQ2hhcmFjdGVyID09PSAnJykge1xuICAgICAgcmV0dXJuIHsgdHJpZ2dlcktpbmQ6IENvbXBsZXRpb25UcmlnZ2VyS2luZC5JbnZva2VkIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cmlnZ2VyT25seVxuICAgICAgICA/IHsgdHJpZ2dlcktpbmQ6IENvbXBsZXRpb25UcmlnZ2VyS2luZC5UcmlnZ2VyQ2hhcmFjdGVyLCB0cmlnZ2VyQ2hhcmFjdGVyIH1cbiAgICAgICAgOiB7IHRyaWdnZXJLaW5kOiBDb21wbGV0aW9uVHJpZ2dlcktpbmQuVHJpZ2dlckZvckluY29tcGxldGVDb21wbGV0aW9ucywgdHJpZ2dlckNoYXJhY3RlciB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYSBsYW5ndWFnZSBzZXJ2ZXIgcHJvdG9jb2wgQ29tcGxldGlvbkl0ZW0gYXJyYXkgb3IgQ29tcGxldGlvbkxpc3QgdG9cbiAgICogYW4gYXJyYXkgb2Ygb3JkZXJlZCBBdXRvQ29tcGxldGUrIHN1Z2dlc3Rpb25zLlxuICAgKlxuICAgKiBAcGFyYW0gY29tcGxldGlvbkl0ZW1zIEFuIHtBcnJheX0gb2Yge0NvbXBsZXRpb25JdGVtfSBvYmplY3RzIG9yIGEge0NvbXBsZXRpb25MaXN0fSBjb250YWluaW5nIGNvbXBsZXRpb25cbiAgICogICBpdGVtcyB0byBiZSBjb252ZXJ0ZWQuXG4gICAqIEBwYXJhbSByZXF1ZXN0IFRoZSB7YXRvbSRBdXRvY29tcGxldGVSZXF1ZXN0fSB0byBzYXRpc2Z5LlxuICAgKiBAcGFyYW0gb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0gQSBmdW5jdGlvbiB0aGF0IHRha2VzIGEge0NvbXBsZXRpb25JdGVtfSwgYW4ge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn1cbiAgICogICBhbmQgYSB7YXRvbSRBdXRvY29tcGxldGVSZXF1ZXN0fSBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGNvbnZlcnRlZCBpdGVtcy5cbiAgICogQHJldHVybnMgQSB7TWFwfSBvZiBBdXRvQ29tcGxldGUrIHN1Z2dlc3Rpb25zIG9yZGVyZWQgYnkgdGhlIENvbXBsZXRpb25JdGVtcyBzb3J0VGV4dC5cbiAgICovXG4gIHB1YmxpYyBjb21wbGV0aW9uSXRlbXNUb1N1Z2dlc3Rpb25zKFxuICAgIGNvbXBsZXRpb25JdGVtczogQ29tcGxldGlvbkl0ZW1bXSB8IENvbXBsZXRpb25MaXN0IHwgbnVsbCxcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICAgIHRyaWdnZXJDb2x1bW5zOiBbbnVtYmVyLCBudW1iZXJdLFxuICAgIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtPzogQ29tcGxldGlvbkl0ZW1BZGp1c3RlcixcbiAgKTogTWFwPFN1Z2dlc3Rpb24sIFBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbT4ge1xuICAgIGNvbnN0IGNvbXBsZXRpb25zQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvbXBsZXRpb25JdGVtcylcbiAgICAgID8gY29tcGxldGlvbkl0ZW1zXG4gICAgICA6IChjb21wbGV0aW9uSXRlbXMgJiYgY29tcGxldGlvbkl0ZW1zLml0ZW1zKSB8fCBbXTtcbiAgICByZXR1cm4gbmV3IE1hcChjb21wbGV0aW9uc0FycmF5XG4gICAgICAuc29ydCgoYSwgYikgPT4gKGEuc29ydFRleHQgfHwgYS5sYWJlbCkubG9jYWxlQ29tcGFyZShiLnNvcnRUZXh0IHx8IGIubGFiZWwpKVxuICAgICAgLm1hcDxbU3VnZ2VzdGlvbiwgUG9zc2libHlSZXNvbHZlZENvbXBsZXRpb25JdGVtXT4oXG4gICAgICAgIChzKSA9PiBbXG4gICAgICAgICAgQXV0b2NvbXBsZXRlQWRhcHRlci5jb21wbGV0aW9uSXRlbVRvU3VnZ2VzdGlvbihcbiAgICAgICAgICAgIHMsIHt9IGFzIFN1Z2dlc3Rpb24sIHJlcXVlc3QsIHRyaWdnZXJDb2x1bW5zLCBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbSksXG4gICAgICAgICAgbmV3IFBvc3NpYmx5UmVzb2x2ZWRDb21wbGV0aW9uSXRlbShzLCBmYWxzZSksXG4gICAgICAgIF0sXG4gICAgICApLFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGEgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIENvbXBsZXRpb25JdGVtIHRvIGFuIEF1dG9Db21wbGV0ZSsgc3VnZ2VzdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGl0ZW0gQW4ge0NvbXBsZXRpb25JdGVtfSBjb250YWluaW5nIGEgY29tcGxldGlvbiBpdGVtIHRvIGJlIGNvbnZlcnRlZC5cbiAgICogQHBhcmFtIHN1Z2dlc3Rpb24gQSB7YXRvbSRBdXRvY29tcGxldGVTdWdnZXN0aW9ufSB0byBoYXZlIHRoZSBjb252ZXJzaW9uIGFwcGxpZWQgdG8uXG4gICAqIEBwYXJhbSByZXF1ZXN0IFRoZSB7YXRvbSRBdXRvY29tcGxldGVSZXF1ZXN0fSB0byBzYXRpc2Z5LlxuICAgKiBAcGFyYW0gb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0gQSBmdW5jdGlvbiB0aGF0IHRha2VzIGEge0NvbXBsZXRpb25JdGVtfSwgYW4ge2F0b20kQXV0b2NvbXBsZXRlU3VnZ2VzdGlvbn1cbiAgICogICBhbmQgYSB7YXRvbSRBdXRvY29tcGxldGVSZXF1ZXN0fSBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGNvbnZlcnRlZCBpdGVtcy5cbiAgICogQHJldHVybnMgVGhlIHthdG9tJEF1dG9jb21wbGV0ZVN1Z2dlc3Rpb259IHBhc3NlZCBpbiBhcyBzdWdnZXN0aW9uIHdpdGggdGhlIGNvbnZlcnNpb24gYXBwbGllZC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY29tcGxldGlvbkl0ZW1Ub1N1Z2dlc3Rpb24oXG4gICAgaXRlbTogQ29tcGxldGlvbkl0ZW0sXG4gICAgc3VnZ2VzdGlvbjogU3VnZ2VzdGlvbixcbiAgICByZXF1ZXN0OiBhYy5TdWdnZXN0aW9uc1JlcXVlc3RlZEV2ZW50LFxuICAgIHRyaWdnZXJDb2x1bW5zOiBbbnVtYmVyLCBudW1iZXJdLFxuICAgIG9uRGlkQ29udmVydENvbXBsZXRpb25JdGVtPzogQ29tcGxldGlvbkl0ZW1BZGp1c3RlcixcbiAgKTogU3VnZ2VzdGlvbiB7XG4gICAgQXV0b2NvbXBsZXRlQWRhcHRlci5hcHBseUNvbXBsZXRpb25JdGVtVG9TdWdnZXN0aW9uKGl0ZW0sIHN1Z2dlc3Rpb24gYXMgVGV4dFN1Z2dlc3Rpb24pO1xuICAgIEF1dG9jb21wbGV0ZUFkYXB0ZXIuYXBwbHlUZXh0RWRpdFRvU3VnZ2VzdGlvbihcbiAgICAgIGl0ZW0udGV4dEVkaXQsIHJlcXVlc3QuZWRpdG9yLCB0cmlnZ2VyQ29sdW1ucywgcmVxdWVzdC5idWZmZXJQb3NpdGlvbiwgc3VnZ2VzdGlvbiBhcyBUZXh0U3VnZ2VzdGlvbixcbiAgICApO1xuICAgIEF1dG9jb21wbGV0ZUFkYXB0ZXIuYXBwbHlTbmlwcGV0VG9TdWdnZXN0aW9uKGl0ZW0sIHN1Z2dlc3Rpb24gYXMgU25pcHBldFN1Z2dlc3Rpb24pO1xuICAgIGlmIChvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbSAhPSBudWxsKSB7XG4gICAgICBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbShpdGVtLCBzdWdnZXN0aW9uIGFzIGFjLkFueVN1Z2dlc3Rpb24sIHJlcXVlc3QpO1xuICAgIH1cblxuICAgIHN1Z2dlc3Rpb24uY29tcGxldGlvbkl0ZW0gPSBpdGVtO1xuXG4gICAgcmV0dXJuIHN1Z2dlc3Rpb247XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IHRoZSBwcmltYXJ5IHBhcnRzIG9mIGEgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIENvbXBsZXRpb25JdGVtIHRvIGFuIEF1dG9Db21wbGV0ZSsgc3VnZ2VzdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGl0ZW0gQW4ge0NvbXBsZXRpb25JdGVtfSBjb250YWluaW5nIHRoZSBjb21wbGV0aW9uIGl0ZW1zIHRvIGJlIG1lcmdlZCBpbnRvLlxuICAgKiBAcGFyYW0gc3VnZ2VzdGlvbiBUaGUge1N1Z2dlc3Rpb259IHRvIG1lcmdlIHRoZSBjb252ZXJzaW9uIGludG8uXG4gICAqIEByZXR1cm5zIFRoZSB7U3VnZ2VzdGlvbn0gd2l0aCBkZXRhaWxzIGFkZGVkIGZyb20gdGhlIHtDb21wbGV0aW9uSXRlbX0uXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFwcGx5Q29tcGxldGlvbkl0ZW1Ub1N1Z2dlc3Rpb24oXG4gICAgaXRlbTogQ29tcGxldGlvbkl0ZW0sXG4gICAgc3VnZ2VzdGlvbjogVGV4dFN1Z2dlc3Rpb24sXG4gICkge1xuICAgIHN1Z2dlc3Rpb24udGV4dCA9IGl0ZW0uaW5zZXJ0VGV4dCB8fCBpdGVtLmxhYmVsO1xuICAgIHN1Z2dlc3Rpb24uZmlsdGVyVGV4dCA9IGl0ZW0uZmlsdGVyVGV4dCB8fCBpdGVtLmxhYmVsO1xuICAgIHN1Z2dlc3Rpb24uZGlzcGxheVRleHQgPSBpdGVtLmxhYmVsO1xuICAgIHN1Z2dlc3Rpb24udHlwZSA9IEF1dG9jb21wbGV0ZUFkYXB0ZXIuY29tcGxldGlvbktpbmRUb1N1Z2dlc3Rpb25UeXBlKGl0ZW0ua2luZCk7XG4gICAgQXV0b2NvbXBsZXRlQWRhcHRlci5hcHBseURldGFpbHNUb1N1Z2dlc3Rpb24oaXRlbSwgc3VnZ2VzdGlvbik7XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGFwcGx5RGV0YWlsc1RvU3VnZ2VzdGlvbihcbiAgICBpdGVtOiBDb21wbGV0aW9uSXRlbSxcbiAgICBzdWdnZXN0aW9uOiBTdWdnZXN0aW9uLFxuICApIHtcbiAgICBzdWdnZXN0aW9uLnJpZ2h0TGFiZWwgPSBpdGVtLmRldGFpbDtcblxuICAgIC8vIE9sZGVyIGZvcm1hdCwgY2FuJ3Qga25vdyB3aGF0IGl0IGlzIHNvIGFzc2lnbiB0byBib3RoIGFuZCBob3BlIGZvciBiZXN0XG4gICAgaWYgKHR5cGVvZiAoaXRlbS5kb2N1bWVudGF0aW9uKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHN1Z2dlc3Rpb24uZGVzY3JpcHRpb25NYXJrZG93biA9IGl0ZW0uZG9jdW1lbnRhdGlvbjtcbiAgICAgIHN1Z2dlc3Rpb24uZGVzY3JpcHRpb24gPSBpdGVtLmRvY3VtZW50YXRpb247XG4gICAgfVxuXG4gICAgaWYgKGl0ZW0uZG9jdW1lbnRhdGlvbiAhPSBudWxsICYmIHR5cGVvZiAoaXRlbS5kb2N1bWVudGF0aW9uKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIE5ld2VyIGZvcm1hdCBzcGVjaWZpZXMgdGhlIGtpbmQgb2YgZG9jdW1lbnRhdGlvbiwgYXNzaWduIGFwcHJvcHJpYXRlbHlcbiAgICAgIGlmIChpdGVtLmRvY3VtZW50YXRpb24ua2luZCA9PT0gJ21hcmtkb3duJykge1xuICAgICAgICBzdWdnZXN0aW9uLmRlc2NyaXB0aW9uTWFya2Rvd24gPSBpdGVtLmRvY3VtZW50YXRpb24udmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWdnZXN0aW9uLmRlc2NyaXB0aW9uID0gaXRlbS5kb2N1bWVudGF0aW9uLnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEFwcGxpZXMgdGhlIHRleHRFZGl0IHBhcnQgb2YgYSBsYW5ndWFnZSBzZXJ2ZXIgcHJvdG9jb2wgQ29tcGxldGlvbkl0ZW0gdG8gYW5cbiAgICogQXV0b0NvbXBsZXRlKyBTdWdnZXN0aW9uIHZpYSB0aGUgcmVwbGFjZW1lbnRQcmVmaXggYW5kIHRleHQgcHJvcGVydGllcy5cbiAgICpcbiAgICogQHBhcmFtIHRleHRFZGl0IEEge1RleHRFZGl0fSBmcm9tIGEgQ29tcGxldGlvbkl0ZW0gdG8gYXBwbHkuXG4gICAqIEBwYXJhbSBlZGl0b3IgQW4gQXRvbSB7VGV4dEVkaXRvcn0gdXNlZCB0byBvYnRhaW4gdGhlIG5lY2Vzc2FyeSB0ZXh0IHJlcGxhY2VtZW50LlxuICAgKiBAcGFyYW0gc3VnZ2VzdGlvbiBBbiB7YXRvbSRBdXRvY29tcGxldGVTdWdnZXN0aW9ufSB0byBzZXQgdGhlIHJlcGxhY2VtZW50UHJlZml4IGFuZCB0ZXh0IHByb3BlcnRpZXMgb2YuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFwcGx5VGV4dEVkaXRUb1N1Z2dlc3Rpb24oXG4gICAgdGV4dEVkaXQ6IFRleHRFZGl0IHwgdW5kZWZpbmVkLFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICB0cmlnZ2VyQ29sdW1uczogW251bWJlciwgbnVtYmVyXSxcbiAgICBvcmlnaW5hbEJ1ZmZlclBvc2l0aW9uOiBQb2ludCxcbiAgICBzdWdnZXN0aW9uOiBUZXh0U3VnZ2VzdGlvbixcbiAgKTogdm9pZCB7XG4gICAgaWYgKCF0ZXh0RWRpdCkgeyByZXR1cm47IH1cbiAgICBpZiAodGV4dEVkaXQucmFuZ2Uuc3RhcnQuY2hhcmFjdGVyICE9PSB0cmlnZ2VyQ29sdW1uc1swXSkge1xuICAgICAgY29uc3QgcmFuZ2UgPSBDb252ZXJ0LmxzUmFuZ2VUb0F0b21SYW5nZSh0ZXh0RWRpdC5yYW5nZSk7XG4gICAgICBzdWdnZXN0aW9uLmN1c3RvbVJlcGxhY21lbnRQcmVmaXggPSBlZGl0b3IuZ2V0VGV4dEluQnVmZmVyUmFuZ2UoW3JhbmdlLnN0YXJ0LCBvcmlnaW5hbEJ1ZmZlclBvc2l0aW9uXSk7XG4gICAgfVxuICAgIHN1Z2dlc3Rpb24udGV4dCA9IHRleHRFZGl0Lm5ld1RleHQ7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBBZGRzIGEgc25pcHBldCB0byB0aGUgc3VnZ2VzdGlvbiBpZiB0aGUgQ29tcGxldGlvbkl0ZW0gY29udGFpbnNcbiAgICogc25pcHBldC1mb3JtYXR0ZWQgdGV4dFxuICAgKlxuICAgKiBAcGFyYW0gaXRlbSBBbiB7Q29tcGxldGlvbkl0ZW19IGNvbnRhaW5pbmcgdGhlIGNvbXBsZXRpb24gaXRlbXMgdG8gYmUgbWVyZ2VkIGludG8uXG4gICAqIEBwYXJhbSBzdWdnZXN0aW9uIFRoZSB7YXRvbSRBdXRvY29tcGxldGVTdWdnZXN0aW9ufSB0byBtZXJnZSB0aGUgY29udmVyc2lvbiBpbnRvLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhcHBseVNuaXBwZXRUb1N1Z2dlc3Rpb24oaXRlbTogQ29tcGxldGlvbkl0ZW0sIHN1Z2dlc3Rpb246IFNuaXBwZXRTdWdnZXN0aW9uKTogdm9pZCB7XG4gICAgaWYgKGl0ZW0uaW5zZXJ0VGV4dEZvcm1hdCA9PT0gSW5zZXJ0VGV4dEZvcm1hdC5TbmlwcGV0KSB7XG4gICAgICBzdWdnZXN0aW9uLnNuaXBwZXQgPSBpdGVtLnRleHRFZGl0ICE9IG51bGwgPyBpdGVtLnRleHRFZGl0Lm5ld1RleHQgOiAoaXRlbS5pbnNlcnRUZXh0IHx8ICcnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBPYnRhaW4gdGhlIHRleHR1YWwgc3VnZ2VzdGlvbiB0eXBlIHJlcXVpcmVkIGJ5IEF1dG9Db21wbGV0ZSsgdGhhdFxuICAgKiBtb3N0IGNsb3NlbHkgbWFwcyB0byB0aGUgbnVtZXJpYyBjb21wbGV0aW9uIGtpbmQgc3VwcGxpZXMgYnkgdGhlIGxhbmd1YWdlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGtpbmQgQSB7TnVtYmVyfSB0aGF0IHJlcHJlc2VudHMgdGhlIHN1Z2dlc3Rpb24ga2luZCB0byBiZSBjb252ZXJ0ZWQuXG4gICAqIEByZXR1cm5zIEEge1N0cmluZ30gY29udGFpbmluZyB0aGUgQXV0b0NvbXBsZXRlKyBzdWdnZXN0aW9uIHR5cGUgZXF1aXZhbGVudFxuICAgKiAgIHRvIHRoZSBnaXZlbiBjb21wbGV0aW9uIGtpbmQuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNvbXBsZXRpb25LaW5kVG9TdWdnZXN0aW9uVHlwZShraW5kOiBudW1iZXIgfCB1bmRlZmluZWQpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuQ29uc3RhbnQ6XG4gICAgICAgIHJldHVybiAnY29uc3RhbnQnO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuTWV0aG9kOlxuICAgICAgICByZXR1cm4gJ21ldGhvZCc7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5GdW5jdGlvbjpcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLkNvbnN0cnVjdG9yOlxuICAgICAgICByZXR1cm4gJ2Z1bmN0aW9uJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLkZpZWxkOlxuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuUHJvcGVydHk6XG4gICAgICAgIHJldHVybiAncHJvcGVydHknO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuVmFyaWFibGU6XG4gICAgICAgIHJldHVybiAndmFyaWFibGUnO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuQ2xhc3M6XG4gICAgICAgIHJldHVybiAnY2xhc3MnO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuU3RydWN0OlxuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuVHlwZVBhcmFtZXRlcjpcbiAgICAgICAgcmV0dXJuICd0eXBlJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLk9wZXJhdG9yOlxuICAgICAgICByZXR1cm4gJ3NlbGVjdG9yJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLkludGVyZmFjZTpcbiAgICAgICAgcmV0dXJuICdtaXhpbic7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5Nb2R1bGU6XG4gICAgICAgIHJldHVybiAnbW9kdWxlJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLlVuaXQ6XG4gICAgICAgIHJldHVybiAnYnVpbHRpbic7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5FbnVtOlxuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuRW51bU1lbWJlcjpcbiAgICAgICAgcmV0dXJuICdlbnVtJztcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLktleXdvcmQ6XG4gICAgICAgIHJldHVybiAna2V5d29yZCc7XG4gICAgICBjYXNlIENvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0OlxuICAgICAgICByZXR1cm4gJ3NuaXBwZXQnO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuRmlsZTpcbiAgICAgIGNhc2UgQ29tcGxldGlvbkl0ZW1LaW5kLkZvbGRlcjpcbiAgICAgICAgcmV0dXJuICdpbXBvcnQnO1xuICAgICAgY2FzZSBDb21wbGV0aW9uSXRlbUtpbmQuUmVmZXJlbmNlOlxuICAgICAgICByZXR1cm4gJ3JlcXVpcmUnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICd2YWx1ZSc7XG4gICAgfVxuICB9XG59XG4iXX0=