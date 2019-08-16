import { ActiveServer } from '../server-manager';
import { CompletionContext, CompletionItem, CompletionList, CompletionParams, ServerCapabilities, TextEdit } from '../languageclient';
import { Point, TextEditor } from 'atom';
import * as ac from 'atom/autocomplete-plus';
import { Suggestion, TextSuggestion, SnippetSuggestion } from 'atom-ide';
declare type CompletionItemAdjuster = (item: CompletionItem, suggestion: ac.AnySuggestion, request: ac.SuggestionsRequestedEvent) => void;
declare class PossiblyResolvedCompletionItem {
    completionItem: CompletionItem;
    isResolved: boolean;
    constructor(completionItem: CompletionItem, isResolved: boolean);
}
/**
 * Public: Adapts the language server protocol "textDocument/completion" to the Atom
 * AutoComplete+ package.
 */
export default class AutocompleteAdapter {
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    static canResolve(serverCapabilities: ServerCapabilities): boolean;
    private _suggestionCache;
    private _cancellationTokens;
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
    getSuggestions(server: ActiveServer, request: ac.SuggestionsRequestedEvent, onDidConvertCompletionItem?: CompletionItemAdjuster, minimumWordLength?: number): Promise<ac.AnySuggestion[]>;
    private shouldTrigger;
    private getOrBuildSuggestions;
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
    completeSuggestion(server: ActiveServer, suggestion: ac.AnySuggestion, request: ac.SuggestionsRequestedEvent, onDidConvertCompletionItem?: CompletionItemAdjuster): Promise<ac.AnySuggestion>;
    static resolveSuggestion(resolvedCompletionItem: CompletionItem, suggestion: ac.AnySuggestion, request: ac.SuggestionsRequestedEvent, onDidConvertCompletionItem?: CompletionItemAdjuster): void;
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
    static getTriggerCharacter(request: ac.SuggestionsRequestedEvent, triggerChars: string[]): [string, boolean];
    /**
     * Public: Create TextDocumentPositionParams to be sent to the language server
     * based on the editor and position from the AutoCompleteRequest.
     *
     * @param request The {atom$AutocompleteRequest} to obtain the editor from.
     * @param triggerPoint The {atom$Point} where the trigger started.
     * @returns A {string} containing the prefix including the trigger character.
     */
    static getPrefixWithTrigger(request: ac.SuggestionsRequestedEvent, triggerPoint: Point): string;
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
    static createCompletionParams(request: ac.SuggestionsRequestedEvent, triggerCharacter: string, triggerOnly: boolean): CompletionParams;
    /**
     * Public: Create {CompletionContext} to be sent to the language server
     * based on the trigger character.
     *
     * @param triggerCharacter The {string} containing the trigger character or '' if none.
     * @param triggerOnly A {boolean} representing whether this completion is triggered right after a trigger character.
     * @returns An {CompletionContext} that specifies the triggerKind and the triggerCharacter
     *   if there is one.
     */
    static createCompletionContext(triggerCharacter: string, triggerOnly: boolean): CompletionContext;
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
    completionItemsToSuggestions(completionItems: CompletionItem[] | CompletionList | null, request: ac.SuggestionsRequestedEvent, triggerColumns: [number, number], onDidConvertCompletionItem?: CompletionItemAdjuster): Map<Suggestion, PossiblyResolvedCompletionItem>;
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
    static completionItemToSuggestion(item: CompletionItem, suggestion: Suggestion, request: ac.SuggestionsRequestedEvent, triggerColumns: [number, number], onDidConvertCompletionItem?: CompletionItemAdjuster): Suggestion;
    /**
     * Public: Convert the primary parts of a language server protocol CompletionItem to an AutoComplete+ suggestion.
     *
     * @param item An {CompletionItem} containing the completion items to be merged into.
     * @param suggestion The {Suggestion} to merge the conversion into.
     * @returns The {Suggestion} with details added from the {CompletionItem}.
     */
    static applyCompletionItemToSuggestion(item: CompletionItem, suggestion: TextSuggestion): void;
    static applyDetailsToSuggestion(item: CompletionItem, suggestion: Suggestion): void;
    /**
     * Public: Applies the textEdit part of a language server protocol CompletionItem to an
     * AutoComplete+ Suggestion via the replacementPrefix and text properties.
     *
     * @param textEdit A {TextEdit} from a CompletionItem to apply.
     * @param editor An Atom {TextEditor} used to obtain the necessary text replacement.
     * @param suggestion An {atom$AutocompleteSuggestion} to set the replacementPrefix and text properties of.
     */
    static applyTextEditToSuggestion(textEdit: TextEdit | undefined, editor: TextEditor, triggerColumns: [number, number], originalBufferPosition: Point, suggestion: TextSuggestion): void;
    /**
     * Public: Adds a snippet to the suggestion if the CompletionItem contains
     * snippet-formatted text
     *
     * @param item An {CompletionItem} containing the completion items to be merged into.
     * @param suggestion The {atom$AutocompleteSuggestion} to merge the conversion into.
     */
    static applySnippetToSuggestion(item: CompletionItem, suggestion: SnippetSuggestion): void;
    /**
     * Public: Obtain the textual suggestion type required by AutoComplete+ that
     * most closely maps to the numeric completion kind supplies by the language server.
     *
     * @param kind A {Number} that represents the suggestion kind to be converted.
     * @returns A {String} containing the AutoComplete+ suggestion type equivalent
     *   to the given completion kind.
     */
    static completionKindToSuggestionType(kind: number | undefined): string;
}
export {};
