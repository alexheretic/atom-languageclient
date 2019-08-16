import { Point, TextEditor, Range } from 'atom';
import { LanguageClientConnection, ServerCapabilities } from '../languageclient';
export default class CodeHighlightAdapter {
    /**
     * @returns A {Boolean} indicating this adapter can adapt the server based on the
     * given serverCapabilities.
     */
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    /**
     * Public: Creates highlight markers for a given editor position.
     * Throws an error if documentHighlightProvider is not a registered capability.
     *
     * @param connection A {LanguageClientConnection} to the language server that provides highlights.
     * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
     * @param editor The Atom {TextEditor} containing the text to be highlighted.
     * @param position The Atom {Point} to fetch highlights for.
     * @returns A {Promise} of an {Array} of {Range}s to be turned into highlights.
     */
    static highlight(connection: LanguageClientConnection, serverCapabilities: ServerCapabilities, editor: TextEditor, position: Point): Promise<Range[] | null>;
}
