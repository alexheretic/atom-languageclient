import { ActiveServer } from '../server-manager';
import { CompletionContext, CompletionItem, CompletionList, CompletionParams, ServerCapabilities, TextEdit } from '../languageclient';
import { Point, TextEditor } from 'atom';
import * as ac from 'atom/autocomplete-plus';
declare type CompletionItemAdjuster = (item: CompletionItem, suggestion: ac.AnySuggestion, request: ac.SuggestionsRequestedEvent) => void;
declare class PossiblyResolvedCompletionItem {
    completionItem: CompletionItem;
    isResolved: boolean;
    constructor(completionItem: CompletionItem, isResolved: boolean);
}
export default class AutocompleteAdapter {
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    static canResolve(serverCapabilities: ServerCapabilities): boolean;
    private _suggestionCache;
    private _cancellationTokens;
    getSuggestions(server: ActiveServer, request: ac.SuggestionsRequestedEvent, onDidConvertCompletionItem?: CompletionItemAdjuster, minimumWordLength?: number): Promise<ac.AnySuggestion[]>;
    private shouldTrigger;
    private getOrBuildSuggestions;
    completeSuggestion(server: ActiveServer, suggestion: ac.AnySuggestion, request: ac.SuggestionsRequestedEvent, onDidConvertCompletionItem?: CompletionItemAdjuster): Promise<ac.AnySuggestion>;
    static getTriggerCharacter(request: ac.SuggestionsRequestedEvent, triggerChars: string[]): [string, boolean];
    static getPrefixWithTrigger(request: ac.SuggestionsRequestedEvent, triggerPoint: Point): string;
    static createCompletionParams(request: ac.SuggestionsRequestedEvent, triggerCharacter: string, triggerOnly: boolean): CompletionParams;
    static createCompletionContext(triggerCharacter: string, triggerOnly: boolean): CompletionContext;
    completionItemsToSuggestions(completionItems: CompletionItem[] | CompletionList, request: ac.SuggestionsRequestedEvent, onDidConvertCompletionItem?: CompletionItemAdjuster): Map<ac.AnySuggestion, PossiblyResolvedCompletionItem>;
    static completionItemToSuggestion(item: CompletionItem, suggestion: ac.AnySuggestion, request: ac.SuggestionsRequestedEvent, onDidConvertCompletionItem?: CompletionItemAdjuster): ac.AnySuggestion;
    static applyCompletionItemToSuggestion(item: CompletionItem, suggestion: ac.TextSuggestion): void;
    static applyTextEditToSuggestion(textEdit: TextEdit | undefined, editor: TextEditor, suggestion: ac.TextSuggestion): void;
    static applySnippetToSuggestion(item: CompletionItem, suggestion: ac.SnippetSuggestion): void;
    static completionKindToSuggestionType(kind: number | undefined): string;
}
export {};
