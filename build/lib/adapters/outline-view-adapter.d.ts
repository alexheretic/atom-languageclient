import * as atomIde from 'atom-ide';
import { LanguageClientConnection, ServerCapabilities, SymbolInformation, DocumentSymbol } from '../languageclient';
import { TextEditor } from 'atom';
export default class OutlineViewAdapter {
    private _cancellationTokens;
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    getOutline(connection: LanguageClientConnection, editor: TextEditor): Promise<atomIde.Outline | null>;
    static createHierarchicalOutlineTrees(symbols: DocumentSymbol[]): atomIde.OutlineTree[];
    static createOutlineTrees(symbols: SymbolInformation[]): atomIde.OutlineTree[];
    private static _getClosestParent;
    static hierarchicalSymbolToOutline(symbol: DocumentSymbol): atomIde.OutlineTree;
    static symbolToOutline(symbol: SymbolInformation): atomIde.OutlineTree;
    static symbolKindToEntityKind(symbol: number): string | null;
    static symbolKindToTokenKind(symbol: number): atomIde.TokenKind;
}
