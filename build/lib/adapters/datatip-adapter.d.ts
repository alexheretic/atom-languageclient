import * as atomIde from 'atom-ide';
import { LanguageClientConnection, ServerCapabilities } from '../languageclient';
import { Point, TextEditor } from 'atom';
export default class DatatipAdapter {
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    getDatatip(connection: LanguageClientConnection, editor: TextEditor, point: Point): Promise<atomIde.Datatip | null>;
    private static isEmptyHover;
    private static convertMarkedString;
}
