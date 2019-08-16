import * as atomIde from 'atom-ide';
import { Point, TextEditor } from 'atom';
import { LanguageClientConnection, Location, ServerCapabilities, ReferenceParams } from '../languageclient';
/**
 * Public: Adapts the language server definition provider to the
 * Atom IDE UI Definitions package for 'Go To Definition' functionality.
 */
export default class FindReferencesAdapter {
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing a referencesProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    /**
     * Public: Get the references for a specific symbol within the document as represented by
     * the {TextEditor} and {Point} within it via the language server.
     *
     * @param connection A {LanguageClientConnection} to the language server that will be queried
     *   for the references.
     * @param editor The Atom {TextEditor} containing the text the references should relate to.
     * @param point The Atom {Point} containing the point within the text the references should relate to.
     * @returns A {Promise} containing a {FindReferencesReturn} with all the references the language server
     *   could find.
     */
    getReferences(connection: LanguageClientConnection, editor: TextEditor, point: Point, projectRoot: string | null): Promise<atomIde.FindReferencesReturn | null>;
    /**
     * Public: Create a {ReferenceParams} from a given {TextEditor} for a specific {Point}.
     *
     * @param editor A {TextEditor} that represents the document.
     * @param point A {Point} within the document.
     * @returns A {ReferenceParams} built from the given parameters.
     */
    static createReferenceParams(editor: TextEditor, point: Point): ReferenceParams;
    /**
     * Public: Convert a {Location} into a {Reference}.
     *
     * @param location A {Location} to convert.
     * @returns A {Reference} equivalent to the given {Location}.
     */
    static locationToReference(location: Location): atomIde.Reference;
    /** Public: Get a symbol name from a {TextEditor} for a specific {Point} in the document. */
    static getReferencedSymbolName(editor: TextEditor, point: Point, references: atomIde.Reference[]): string;
}
