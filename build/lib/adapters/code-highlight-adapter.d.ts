import { Point, TextEditor, Range } from 'atom';
import { LanguageClientConnection, ServerCapabilities } from '../languageclient';
export default class CodeHighlightAdapter {
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    static highlight(connection: LanguageClientConnection, serverCapabilities: ServerCapabilities, editor: TextEditor, position: Point): Promise<Range[] | null>;
}
