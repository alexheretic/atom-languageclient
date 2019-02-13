import * as rpc from 'vscode-jsonrpc';
import { TextEditor } from 'atom';
export declare function createSpyConnection(): rpc.MessageConnection;
export declare function createFakeEditor(path?: string): TextEditor;
