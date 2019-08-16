import * as atomIde from 'atom-ide';
import { LanguageClientConnection, ServerCapabilities, SymbolInformation, DocumentSymbol } from '../languageclient';
import { TextEditor } from 'atom';
/**
 * Public: Adapts the documentSymbolProvider of the language server to the Outline View
 * supplied by Atom IDE UI.
 */
export default class OutlineViewAdapter {
    private _cancellationTokens;
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing a documentSymbolProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    /**
     * Public: Obtain the Outline for document via the {LanguageClientConnection} as identified
     * by the {TextEditor}.
     *
     * @param connection A {LanguageClientConnection} to the language server that will be queried
     *   for the outline.
     * @param editor The Atom {TextEditor} containing the text the Outline should represent.
     * @returns A {Promise} containing the {Outline} of this document.
     */
    getOutline(connection: LanguageClientConnection, editor: TextEditor): Promise<atomIde.Outline | null>;
    /**
     * Public: Create an {Array} of {OutlineTree}s from the Array of {DocumentSymbol} recieved
     * from the language server. This includes converting all the children nodes in the entire
     * hierarchy.
     *
     * @param symbols An {Array} of {DocumentSymbol}s received from the language server that
     *   should be converted to an {Array} of {OutlineTree}.
     * @returns An {Array} of {OutlineTree} containing the given symbols that the Outline View can display.
     */
    static createHierarchicalOutlineTrees(symbols: DocumentSymbol[]): atomIde.OutlineTree[];
    /**
     * Public: Create an {Array} of {OutlineTree}s from the Array of {SymbolInformation} recieved
     * from the language server. This includes determining the appropriate child and parent
     * relationships for the hierarchy.
     *
     * @param symbols An {Array} of {SymbolInformation}s received from the language server that
     *   should be converted to an {OutlineTree}.
     * @returns An {OutlineTree} containing the given symbols that the Outline View can display.
     */
    static createOutlineTrees(symbols: SymbolInformation[]): atomIde.OutlineTree[];
    private static _getClosestParent;
    /**
     * Public: Convert an individual {DocumentSymbol} from the language server
     * to an {OutlineTree} for use by the Outline View. It does NOT recursively
     * process the given symbol's children (if any).
     *
     * @param symbol The {DocumentSymbol} to convert to an {OutlineTree}.
     * @returns The {OutlineTree} corresponding to the given {DocumentSymbol}.
     */
    static hierarchicalSymbolToOutline(symbol: DocumentSymbol): atomIde.OutlineTree;
    /**
     * Public: Convert an individual {SymbolInformation} from the language server
     * to an {OutlineTree} for use by the Outline View.
     *
     * @param symbol The {SymbolInformation} to convert to an {OutlineTree}.
     * @returns The {OutlineTree} equivalent to the given {SymbolInformation}.
     */
    static symbolToOutline(symbol: SymbolInformation): atomIde.OutlineTree;
    /**
     * Public: Convert a symbol kind into an outline entity kind used to determine
     * the styling such as the appropriate icon in the Outline View.
     *
     * @param symbol The numeric symbol kind received from the language server.
     * @returns A string representing the equivalent OutlineView entity kind.
     */
    static symbolKindToEntityKind(symbol: number): string | null;
    /**
     * Public: Convert a symbol kind to the appropriate token kind used to syntax
     * highlight the symbol name in the Outline View.
     *
     * @param symbol The numeric symbol kind received from the language server.
     * @returns A string representing the equivalent syntax token kind.
     */
    static symbolKindToTokenKind(symbol: number): atomIde.TokenKind;
}
