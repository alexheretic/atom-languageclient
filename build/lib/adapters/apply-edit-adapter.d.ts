import * as atomIde from 'atom-ide';
import { LanguageClientConnection, ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse } from '../languageclient';
import { TextBuffer } from 'atom';
export default class ApplyEditAdapter {
    static attach(connection: LanguageClientConnection): void;
    /**
     * Tries to apply edits and reverts if anything goes wrong.
     * Returns the checkpoint, so the caller can revert changes if needed.
     */
    static applyEdits(buffer: TextBuffer, edits: atomIde.TextEdit[]): number;
    static onApplyEdit(params: ApplyWorkspaceEditParams): Promise<ApplyWorkspaceEditResponse>;
    private static validateEdit;
}
