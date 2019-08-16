import * as atomIde from 'atom-ide';
import { LanguageClientConnection, Location, ServerCapabilities } from '../languageclient';
import { Point, TextEditor } from 'atom';
/**
 * Public: Adapts the language server definition provider to the
 * Atom IDE UI Definitions package for 'Go To Definition' functionality.
 */
export default class DefinitionAdapter {
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing a definitionProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    /**
     * Public: Get the definitions for a symbol at a given {Point} within a
     * {TextEditor} including optionally highlighting all other references
     * within the document if the langauge server also supports highlighting.
     *
     * @param connection A {LanguageClientConnection} to the language server that will provide definitions and highlights.
     * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
     * @param languageName The name of the programming language.
     * @param editor The Atom {TextEditor} containing the symbol and potential highlights.
     * @param point The Atom {Point} containing the position of the text that represents the symbol
     *   for which the definition and highlights should be provided.
     * @returns A {Promise} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    getDefinition(connection: LanguageClientConnection, serverCapabilities: ServerCapabilities, languageName: string, editor: TextEditor, point: Point): Promise<atomIde.DefinitionQueryResult | null>;
    /**
     * Public: Normalize the locations so a single {Location} becomes an {Array} of just
     * one. The language server protocol return either as the protocol evolved between v1 and v2.
     *
     * @param locationResult Either a single {Location} object or an {Array} of {Locations}.
     * @returns An {Array} of {Location}s or {null} if the locationResult was null.
     */
    static normalizeLocations(locationResult: Location | Location[]): Location[] | null;
    /**
     * Public: Convert an {Array} of {Location} objects into an Array of {Definition}s.
     *
     * @param locations An {Array} of {Location} objects to be converted.
     * @param languageName The name of the language these objects are written in.
     * @returns An {Array} of {Definition}s that represented the converted {Location}s.
     */
    static convertLocationsToDefinitions(locations: Location[], languageName: string): atomIde.Definition[];
}
