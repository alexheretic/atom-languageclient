import * as atomIde from 'atom-ide';
import { Point, TextEditor } from 'atom';
import { LanguageClientConnection, RenameParams, ServerCapabilities, TextDocumentEdit, TextEdit } from '../languageclient';
export default class RenameAdapter {
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    static getRename(connection: LanguageClientConnection, editor: TextEditor, point: Point, newName: string): Promise<Map<atomIde.IdeUri, atomIde.TextEdit[]> | null>;
    static createRenameParams(editor: TextEditor, point: Point, newName: string): RenameParams;
    static convertChanges(changes: {
        [uri: string]: TextEdit[];
    }): Map<atomIde.IdeUri, atomIde.TextEdit[]>;
    static convertDocumentChanges(documentChanges: TextDocumentEdit[]): Map<atomIde.IdeUri, atomIde.TextEdit[]>;
}
