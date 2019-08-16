import * as atomIde from 'atom-ide';
import { LanguageClientConnection, ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse } from '../languageclient';
import { TextBuffer } from 'atom';
/** Public: Adapts workspace/applyEdit commands to editors. */
export default class ApplyEditAdapter {
    /** Public: Attach to a {LanguageClientConnection} to receive edit events. */
    static attach(connection: LanguageClientConnection): void;
    /**
     * Tries to apply edits and reverts if anything goes wrong.
     * Returns the checkpoint, so the caller can revert changes if needed.
     */
    static applyEdits(buffer: TextBuffer, edits: atomIde.TextEdit[]): number;
    static onApplyEdit(params: ApplyWorkspaceEditParams): Promise<ApplyWorkspaceEditResponse>;
    /** Private: Do some basic sanity checking on the edit ranges. */
    private static validateEdit;
}
