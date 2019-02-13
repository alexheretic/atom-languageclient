import * as atomIde from 'atom-ide';
import { Point, TextEditor } from 'atom';
import { LanguageClientConnection, Location, ServerCapabilities, ReferenceParams } from '../languageclient';
export default class FindReferencesAdapter {
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    getReferences(connection: LanguageClientConnection, editor: TextEditor, point: Point, projectRoot: string | null): Promise<atomIde.FindReferencesReturn | null>;
    static createReferenceParams(editor: TextEditor, point: Point): ReferenceParams;
    static locationToReference(location: Location): atomIde.Reference;
    static getReferencedSymbolName(editor: TextEditor, point: Point, references: atomIde.Reference[]): string;
}
