import * as atomIde from 'atom-ide';
import { LanguageClientConnection, ServerCapabilities } from '../languageclient';
import { Point, TextEditor } from 'atom';
/**
 * Public: Adapts the language server protocol "textDocument/hover" to the
 * Atom IDE UI Datatip package.
 */
export default class DatatipAdapter {
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing a hoverProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    /**
     * Public: Get the Datatip for this {Point} in a {TextEditor} by querying
     * the language server.
     *
     * @param connection A {LanguageClientConnection} to the language server that will be queried
     *   for the hover text/datatip.
     * @param editor The Atom {TextEditor} containing the text the Datatip should relate to.
     * @param point The Atom {Point} containing the point within the text the Datatip should relate to.
     * @returns A {Promise} containing the {Datatip} to display or {null} if no Datatip is available.
     */
    getDatatip(connection: LanguageClientConnection, editor: TextEditor, point: Point): Promise<atomIde.Datatip | null>;
    private static isEmptyHover;
    private static convertMarkedString;
}
