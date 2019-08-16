import * as atomIde from 'atom-ide';
import LinterPushV2Adapter from './linter-push-v2-adapter';
import { LanguageClientConnection, ServerCapabilities } from '../languageclient';
import { Range, TextEditor } from 'atom';
export default class CodeActionAdapter {
    /**
     * @returns A {Boolean} indicating this adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities: ServerCapabilities): boolean;
    /**
     * Public: Retrieves code actions for a given editor, range, and context (diagnostics).
     * Throws an error if codeActionProvider is not a registered capability.
     *
     * @param connection A {LanguageClientConnection} to the language server that provides highlights.
     * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
     * @param editor The Atom {TextEditor} containing the diagnostics.
     * @param range The Atom {Range} to fetch code actions for.
     * @param diagnostics An {Array<atomIde$Diagnostic>} to fetch code actions for.
     *   This is typically a list of diagnostics intersecting `range`.
     * @returns A {Promise} of an {Array} of {atomIde$CodeAction}s to display.
     */
    static getCodeActions(connection: LanguageClientConnection, serverCapabilities: ServerCapabilities, linterAdapter: LinterPushV2Adapter | undefined, editor: TextEditor, range: Range, diagnostics: atomIde.Diagnostic[]): Promise<atomIde.CodeAction[]>;
    private static createCodeAction;
    private static applyWorkspaceEdit;
    private static executeCommand;
    private static createCodeActionParams;
}
