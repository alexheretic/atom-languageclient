"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const convert_1 = require("../convert");
/**
 * Public: Adapts the language server protocol "textDocument/completion" to the
 * Atom IDE UI Code-format package.
 */
class CodeFormatAdapter {
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing either a documentFormattingProvider
     * or a documentRangeFormattingProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating this adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities) {
        return (!!serverCapabilities.documentRangeFormattingProvider ||
            !!serverCapabilities.documentFormattingProvider);
    }
    /**
     * Public: Format text in the editor using the given language server connection and an optional range.
     * If the server does not support range formatting then range will be ignored and the entire document formatted.
     *
     * @param connection A {LanguageClientConnection} to the language server that will format the text.
     * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
     * @param editor The Atom {TextEditor} containing the text that will be formatted.
     * @param range The optional Atom {Range} containing the subset of the text to be formatted.
     * @returns A {Promise} of an {Array} of {Object}s containing the AutoComplete+
     *   suggestions to display.
     */
    static format(connection, serverCapabilities, editor, range) {
        if (serverCapabilities.documentRangeFormattingProvider) {
            return CodeFormatAdapter.formatRange(connection, editor, range);
        }
        if (serverCapabilities.documentFormattingProvider) {
            return CodeFormatAdapter.formatDocument(connection, editor);
        }
        throw new Error('Can not format document, language server does not support it');
    }
    /**
     * Public: Format the entire document of an Atom {TextEditor} by using a given language server.
     *
     * @param connection A {LanguageClientConnection} to the language server that will format the text.
     * @param editor The Atom {TextEditor} containing the document to be formatted.
     * @returns A {Promise} of an {Array} of {TextEdit} objects that can be applied to the Atom TextEditor
     *   to format the document.
     */
    static formatDocument(connection, editor) {
        return __awaiter(this, void 0, void 0, function* () {
            const edits = yield connection.documentFormatting(CodeFormatAdapter.createDocumentFormattingParams(editor));
            return convert_1.default.convertLsTextEdits(edits);
        });
    }
    /**
     * Public: Create {DocumentFormattingParams} to be sent to the language server when requesting an
     * entire document is formatted.
     *
     * @param editor The Atom {TextEditor} containing the document to be formatted.
     * @returns A {DocumentFormattingParams} containing the identity of the text document as well as
     *   options to be used in formatting the document such as tab size and tabs vs spaces.
     */
    static createDocumentFormattingParams(editor) {
        return {
            textDocument: convert_1.default.editorToTextDocumentIdentifier(editor),
            options: CodeFormatAdapter.getFormatOptions(editor),
        };
    }
    /**
     * Public: Format a range within an Atom {TextEditor} by using a given language server.
     *
     * @param connection A {LanguageClientConnection} to the language server that will format the text.
     * @param range The Atom {Range} containing the range of text that should be formatted.
     * @param editor The Atom {TextEditor} containing the document to be formatted.
     * @returns A {Promise} of an {Array} of {TextEdit} objects that can be applied to the Atom TextEditor
     *   to format the document.
     */
    static formatRange(connection, editor, range) {
        return __awaiter(this, void 0, void 0, function* () {
            const edits = yield connection.documentRangeFormatting(CodeFormatAdapter.createDocumentRangeFormattingParams(editor, range));
            return convert_1.default.convertLsTextEdits(edits);
        });
    }
    /**
     * Public: Create {DocumentRangeFormattingParams} to be sent to the language server when requesting an
     * entire document is formatted.
     *
     * @param editor The Atom {TextEditor} containing the document to be formatted.
     * @param range The Atom {Range} containing the range of text that should be formatted.
     * @returns A {DocumentRangeFormattingParams} containing the identity of the text document, the
     *   range of the text to be formatted as well as the options to be used in formatting the
     *   document such as tab size and tabs vs spaces.
     */
    static createDocumentRangeFormattingParams(editor, range) {
        return {
            textDocument: convert_1.default.editorToTextDocumentIdentifier(editor),
            range: convert_1.default.atomRangeToLSRange(range),
            options: CodeFormatAdapter.getFormatOptions(editor),
        };
    }
    /**
     * Public: Format on type within an Atom {TextEditor} by using a given language server.
     *
     * @param connection A {LanguageClientConnection} to the language server that will format the text.
     * @param editor The Atom {TextEditor} containing the document to be formatted.
     * @param point The {Point} at which the document to be formatted.
     * @param character A character that triggered formatting request.
     * @returns A {Promise} of an {Array} of {TextEdit} objects that can be applied to the Atom TextEditor
     *   to format the document.
     */
    static formatOnType(connection, editor, point, character) {
        return __awaiter(this, void 0, void 0, function* () {
            const edits = yield connection.documentOnTypeFormatting(CodeFormatAdapter.createDocumentOnTypeFormattingParams(editor, point, character));
            return convert_1.default.convertLsTextEdits(edits);
        });
    }
    /**
     * Public: Create {DocumentOnTypeFormattingParams} to be sent to the language server when requesting an
     * entire document is formatted.
     *
     * @param editor The Atom {TextEditor} containing the document to be formatted.
     * @param point The {Point} at which the document to be formatted.
     * @param character A character that triggered formatting request.
     * @returns A {DocumentOnTypeFormattingParams} containing the identity of the text document, the
     *   position of the text to be formatted, the character that triggered formatting request
     *   as well as the options to be used in formatting the document such as tab size and tabs vs spaces.
     */
    static createDocumentOnTypeFormattingParams(editor, point, character) {
        return {
            textDocument: convert_1.default.editorToTextDocumentIdentifier(editor),
            position: convert_1.default.pointToPosition(point),
            ch: character,
            options: CodeFormatAdapter.getFormatOptions(editor),
        };
    }
    /**
     * Public: Create {DocumentRangeFormattingParams} to be sent to the language server when requesting an
     * entire document is formatted.
     *
     * @param editor The Atom {TextEditor} containing the document to be formatted.
     * @param range The Atom {Range} containing the range of document that should be formatted.
     * @returns The {FormattingOptions} to be used containing the keys:
     *   * `tabSize` The number of spaces a tab represents.
     *   * `insertSpaces` {True} if spaces should be used, {False} for tab characters.
     */
    static getFormatOptions(editor) {
        return {
            tabSize: editor.getTabLength(),
            insertSpaces: editor.getSoftTabs(),
        };
    }
}
exports.default = CodeFormatAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1mb3JtYXQtYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9hZGFwdGVycy9jb2RlLWZvcm1hdC1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQ0Esd0NBQWlDO0FBZWpDOzs7R0FHRztBQUNILE1BQXFCLGlCQUFpQjtJQUNwQzs7Ozs7Ozs7T0FRRztJQUNJLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sQ0FDTCxDQUFDLENBQUMsa0JBQWtCLENBQUMsK0JBQStCO1lBQ3BELENBQUMsQ0FBQyxrQkFBa0IsQ0FBQywwQkFBMEIsQ0FDaEQsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7Ozs7OztPQVVHO0lBQ0ksTUFBTSxDQUFDLE1BQU0sQ0FDbEIsVUFBb0MsRUFDcEMsa0JBQXNDLEVBQ3RDLE1BQWtCLEVBQ2xCLEtBQVk7UUFFWixJQUFJLGtCQUFrQixDQUFDLCtCQUErQixFQUFFO1lBQ3RELE9BQU8saUJBQWlCLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDakU7UUFFRCxJQUFJLGtCQUFrQixDQUFDLDBCQUEwQixFQUFFO1lBQ2pELE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUM3RDtRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsOERBQThELENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLE1BQU0sQ0FBTyxjQUFjLENBQ2hDLFVBQW9DLEVBQ3BDLE1BQWtCOztZQUVsQixNQUFNLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzVHLE9BQU8saUJBQU8sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxDQUFDO0tBQUE7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksTUFBTSxDQUFDLDhCQUE4QixDQUFDLE1BQWtCO1FBQzdELE9BQU87WUFDTCxZQUFZLEVBQUUsaUJBQU8sQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUM7WUFDNUQsT0FBTyxFQUFFLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztTQUNwRCxDQUFDO0lBQ0osQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0ksTUFBTSxDQUFPLFdBQVcsQ0FDN0IsVUFBb0MsRUFDcEMsTUFBa0IsRUFDbEIsS0FBWTs7WUFFWixNQUFNLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQyx1QkFBdUIsQ0FDcEQsaUJBQWlCLENBQUMsbUNBQW1DLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUNyRSxDQUFDO1lBQ0YsT0FBTyxpQkFBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLENBQUM7S0FBQTtJQUVEOzs7Ozs7Ozs7T0FTRztJQUNJLE1BQU0sQ0FBQyxtQ0FBbUMsQ0FDL0MsTUFBa0IsRUFDbEIsS0FBWTtRQUVaLE9BQU87WUFDTCxZQUFZLEVBQUUsaUJBQU8sQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUM7WUFDNUQsS0FBSyxFQUFFLGlCQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1lBQ3hDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7U0FDcEQsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSSxNQUFNLENBQU8sWUFBWSxDQUM5QixVQUFvQyxFQUNwQyxNQUFrQixFQUNsQixLQUFZLEVBQ1osU0FBaUI7O1lBRWpCLE1BQU0sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFDLHdCQUF3QixDQUNyRCxpQkFBaUIsQ0FBQyxvQ0FBb0MsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUNqRixDQUFDO1lBQ0YsT0FBTyxpQkFBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLENBQUM7S0FBQTtJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSSxNQUFNLENBQUMsb0NBQW9DLENBQ2hELE1BQWtCLEVBQ2xCLEtBQVksRUFDWixTQUFpQjtRQUVqQixPQUFPO1lBQ0wsWUFBWSxFQUFFLGlCQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxDQUFDO1lBQzVELFFBQVEsRUFBRSxpQkFBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7WUFDeEMsRUFBRSxFQUFFLFNBQVM7WUFDYixPQUFPLEVBQUUsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1NBQ3BELENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0ksTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQWtCO1FBQy9DLE9BQU87WUFDTCxPQUFPLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUM5QixZQUFZLEVBQUUsTUFBTSxDQUFDLFdBQVcsRUFBRTtTQUNuQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBbkxELG9DQW1MQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGF0b21JZGUgZnJvbSAnYXRvbS1pZGUnO1xuaW1wb3J0IENvbnZlcnQgZnJvbSAnLi4vY29udmVydCc7XG5pbXBvcnQge1xuICBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gIERvY3VtZW50Rm9ybWF0dGluZ1BhcmFtcyxcbiAgRG9jdW1lbnRSYW5nZUZvcm1hdHRpbmdQYXJhbXMsXG4gIERvY3VtZW50T25UeXBlRm9ybWF0dGluZ1BhcmFtcyxcbiAgRm9ybWF0dGluZ09wdGlvbnMsXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbn0gZnJvbSAnLi4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IHtcbiAgVGV4dEVkaXRvcixcbiAgUmFuZ2UsXG4gIFBvaW50LFxufSBmcm9tICdhdG9tJztcblxuLyoqXG4gKiBQdWJsaWM6IEFkYXB0cyB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIFwidGV4dERvY3VtZW50L2NvbXBsZXRpb25cIiB0byB0aGVcbiAqIEF0b20gSURFIFVJIENvZGUtZm9ybWF0IHBhY2thZ2UuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvZGVGb3JtYXRBZGFwdGVyIHtcbiAgLyoqXG4gICAqIFB1YmxpYzogRGV0ZXJtaW5lIHdoZXRoZXIgdGhpcyBhZGFwdGVyIGNhbiBiZSB1c2VkIHRvIGFkYXB0IGEgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqIGJhc2VkIG9uIHRoZSBzZXJ2ZXJDYXBhYmlsaXRpZXMgbWF0cml4IGNvbnRhaW5pbmcgZWl0aGVyIGEgZG9jdW1lbnRGb3JtYXR0aW5nUHJvdmlkZXJcbiAgICogb3IgYSBkb2N1bWVudFJhbmdlRm9ybWF0dGluZ1Byb3ZpZGVyLlxuICAgKlxuICAgKiBAcGFyYW0gc2VydmVyQ2FwYWJpbGl0aWVzIFRoZSB7U2VydmVyQ2FwYWJpbGl0aWVzfSBvZiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRvIGNvbnNpZGVyLlxuICAgKiBAcmV0dXJucyBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHRoaXMgYWRhcHRlciBjYW4gYWRhcHQgdGhlIHNlcnZlciBiYXNlZCBvbiB0aGVcbiAgICogICBnaXZlbiBzZXJ2ZXJDYXBhYmlsaXRpZXMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNhbkFkYXB0KHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIChcbiAgICAgICEhc2VydmVyQ2FwYWJpbGl0aWVzLmRvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUHJvdmlkZXIgfHxcbiAgICAgICEhc2VydmVyQ2FwYWJpbGl0aWVzLmRvY3VtZW50Rm9ybWF0dGluZ1Byb3ZpZGVyXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEZvcm1hdCB0ZXh0IGluIHRoZSBlZGl0b3IgdXNpbmcgdGhlIGdpdmVuIGxhbmd1YWdlIHNlcnZlciBjb25uZWN0aW9uIGFuZCBhbiBvcHRpb25hbCByYW5nZS5cbiAgICogSWYgdGhlIHNlcnZlciBkb2VzIG5vdCBzdXBwb3J0IHJhbmdlIGZvcm1hdHRpbmcgdGhlbiByYW5nZSB3aWxsIGJlIGlnbm9yZWQgYW5kIHRoZSBlbnRpcmUgZG9jdW1lbnQgZm9ybWF0dGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIGZvcm1hdCB0aGUgdGV4dC5cbiAgICogQHBhcmFtIHNlcnZlckNhcGFiaWxpdGllcyBUaGUge1NlcnZlckNhcGFiaWxpdGllc30gb2YgdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0IHdpbGwgYmUgdXNlZC5cbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgdGV4dCB0aGF0IHdpbGwgYmUgZm9ybWF0dGVkLlxuICAgKiBAcGFyYW0gcmFuZ2UgVGhlIG9wdGlvbmFsIEF0b20ge1JhbmdlfSBjb250YWluaW5nIHRoZSBzdWJzZXQgb2YgdGhlIHRleHQgdG8gYmUgZm9ybWF0dGVkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBvZiBhbiB7QXJyYXl9IG9mIHtPYmplY3R9cyBjb250YWluaW5nIHRoZSBBdXRvQ29tcGxldGUrXG4gICAqICAgc3VnZ2VzdGlvbnMgdG8gZGlzcGxheS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZm9ybWF0KFxuICAgIGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgICBzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyxcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcmFuZ2U6IFJhbmdlLFxuICApOiBQcm9taXNlPGF0b21JZGUuVGV4dEVkaXRbXT4ge1xuICAgIGlmIChzZXJ2ZXJDYXBhYmlsaXRpZXMuZG9jdW1lbnRSYW5nZUZvcm1hdHRpbmdQcm92aWRlcikge1xuICAgICAgcmV0dXJuIENvZGVGb3JtYXRBZGFwdGVyLmZvcm1hdFJhbmdlKGNvbm5lY3Rpb24sIGVkaXRvciwgcmFuZ2UpO1xuICAgIH1cblxuICAgIGlmIChzZXJ2ZXJDYXBhYmlsaXRpZXMuZG9jdW1lbnRGb3JtYXR0aW5nUHJvdmlkZXIpIHtcbiAgICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXREb2N1bWVudChjb25uZWN0aW9uLCBlZGl0b3IpO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBmb3JtYXQgZG9jdW1lbnQsIGxhbmd1YWdlIHNlcnZlciBkb2VzIG5vdCBzdXBwb3J0IGl0Jyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBGb3JtYXQgdGhlIGVudGlyZSBkb2N1bWVudCBvZiBhbiBBdG9tIHtUZXh0RWRpdG9yfSBieSB1c2luZyBhIGdpdmVuIGxhbmd1YWdlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBmb3JtYXQgdGhlIHRleHQuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gb2YgYW4ge0FycmF5fSBvZiB7VGV4dEVkaXR9IG9iamVjdHMgdGhhdCBjYW4gYmUgYXBwbGllZCB0byB0aGUgQXRvbSBUZXh0RWRpdG9yXG4gICAqICAgdG8gZm9ybWF0IHRoZSBkb2N1bWVudC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgZm9ybWF0RG9jdW1lbnQoXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBlZGl0cyA9IGF3YWl0IGNvbm5lY3Rpb24uZG9jdW1lbnRGb3JtYXR0aW5nKENvZGVGb3JtYXRBZGFwdGVyLmNyZWF0ZURvY3VtZW50Rm9ybWF0dGluZ1BhcmFtcyhlZGl0b3IpKTtcbiAgICByZXR1cm4gQ29udmVydC5jb252ZXJ0THNUZXh0RWRpdHMoZWRpdHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIHtEb2N1bWVudEZvcm1hdHRpbmdQYXJhbXN9IHRvIGJlIHNlbnQgdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB3aGVuIHJlcXVlc3RpbmcgYW5cbiAgICogZW50aXJlIGRvY3VtZW50IGlzIGZvcm1hdHRlZC5cbiAgICpcbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgZG9jdW1lbnQgdG8gYmUgZm9ybWF0dGVkLlxuICAgKiBAcmV0dXJucyBBIHtEb2N1bWVudEZvcm1hdHRpbmdQYXJhbXN9IGNvbnRhaW5pbmcgdGhlIGlkZW50aXR5IG9mIHRoZSB0ZXh0IGRvY3VtZW50IGFzIHdlbGwgYXNcbiAgICogICBvcHRpb25zIHRvIGJlIHVzZWQgaW4gZm9ybWF0dGluZyB0aGUgZG9jdW1lbnQgc3VjaCBhcyB0YWIgc2l6ZSBhbmQgdGFicyB2cyBzcGFjZXMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNyZWF0ZURvY3VtZW50Rm9ybWF0dGluZ1BhcmFtcyhlZGl0b3I6IFRleHRFZGl0b3IpOiBEb2N1bWVudEZvcm1hdHRpbmdQYXJhbXMge1xuICAgIHJldHVybiB7XG4gICAgICB0ZXh0RG9jdW1lbnQ6IENvbnZlcnQuZWRpdG9yVG9UZXh0RG9jdW1lbnRJZGVudGlmaWVyKGVkaXRvciksXG4gICAgICBvcHRpb25zOiBDb2RlRm9ybWF0QWRhcHRlci5nZXRGb3JtYXRPcHRpb25zKGVkaXRvciksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEZvcm1hdCBhIHJhbmdlIHdpdGhpbiBhbiBBdG9tIHtUZXh0RWRpdG9yfSBieSB1c2luZyBhIGdpdmVuIGxhbmd1YWdlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBmb3JtYXQgdGhlIHRleHQuXG4gICAqIEBwYXJhbSByYW5nZSBUaGUgQXRvbSB7UmFuZ2V9IGNvbnRhaW5pbmcgdGhlIHJhbmdlIG9mIHRleHQgdGhhdCBzaG91bGQgYmUgZm9ybWF0dGVkLlxuICAgKiBAcGFyYW0gZWRpdG9yIFRoZSBBdG9tIHtUZXh0RWRpdG9yfSBjb250YWluaW5nIHRoZSBkb2N1bWVudCB0byBiZSBmb3JtYXR0ZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IG9mIGFuIHtBcnJheX0gb2Yge1RleHRFZGl0fSBvYmplY3RzIHRoYXQgY2FuIGJlIGFwcGxpZWQgdG8gdGhlIEF0b20gVGV4dEVkaXRvclxuICAgKiAgIHRvIGZvcm1hdCB0aGUgZG9jdW1lbnQuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGZvcm1hdFJhbmdlKFxuICAgIGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcmFuZ2U6IFJhbmdlLFxuICApOiBQcm9taXNlPGF0b21JZGUuVGV4dEVkaXRbXT4ge1xuICAgIGNvbnN0IGVkaXRzID0gYXdhaXQgY29ubmVjdGlvbi5kb2N1bWVudFJhbmdlRm9ybWF0dGluZyhcbiAgICAgIENvZGVGb3JtYXRBZGFwdGVyLmNyZWF0ZURvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUGFyYW1zKGVkaXRvciwgcmFuZ2UpLFxuICAgICk7XG4gICAgcmV0dXJuIENvbnZlcnQuY29udmVydExzVGV4dEVkaXRzKGVkaXRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSB7RG9jdW1lbnRSYW5nZUZvcm1hdHRpbmdQYXJhbXN9IHRvIGJlIHNlbnQgdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB3aGVuIHJlcXVlc3RpbmcgYW5cbiAgICogZW50aXJlIGRvY3VtZW50IGlzIGZvcm1hdHRlZC5cbiAgICpcbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgZG9jdW1lbnQgdG8gYmUgZm9ybWF0dGVkLlxuICAgKiBAcGFyYW0gcmFuZ2UgVGhlIEF0b20ge1JhbmdlfSBjb250YWluaW5nIHRoZSByYW5nZSBvZiB0ZXh0IHRoYXQgc2hvdWxkIGJlIGZvcm1hdHRlZC5cbiAgICogQHJldHVybnMgQSB7RG9jdW1lbnRSYW5nZUZvcm1hdHRpbmdQYXJhbXN9IGNvbnRhaW5pbmcgdGhlIGlkZW50aXR5IG9mIHRoZSB0ZXh0IGRvY3VtZW50LCB0aGVcbiAgICogICByYW5nZSBvZiB0aGUgdGV4dCB0byBiZSBmb3JtYXR0ZWQgYXMgd2VsbCBhcyB0aGUgb3B0aW9ucyB0byBiZSB1c2VkIGluIGZvcm1hdHRpbmcgdGhlXG4gICAqICAgZG9jdW1lbnQgc3VjaCBhcyB0YWIgc2l6ZSBhbmQgdGFicyB2cyBzcGFjZXMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNyZWF0ZURvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUGFyYW1zKFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICByYW5nZTogUmFuZ2UsXG4gICk6IERvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUGFyYW1zIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGV4dERvY3VtZW50OiBDb252ZXJ0LmVkaXRvclRvVGV4dERvY3VtZW50SWRlbnRpZmllcihlZGl0b3IpLFxuICAgICAgcmFuZ2U6IENvbnZlcnQuYXRvbVJhbmdlVG9MU1JhbmdlKHJhbmdlKSxcbiAgICAgIG9wdGlvbnM6IENvZGVGb3JtYXRBZGFwdGVyLmdldEZvcm1hdE9wdGlvbnMoZWRpdG9yKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogRm9ybWF0IG9uIHR5cGUgd2l0aGluIGFuIEF0b20ge1RleHRFZGl0b3J9IGJ5IHVzaW5nIGEgZ2l2ZW4gbGFuZ3VhZ2Ugc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIGZvcm1hdCB0aGUgdGV4dC5cbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgZG9jdW1lbnQgdG8gYmUgZm9ybWF0dGVkLlxuICAgKiBAcGFyYW0gcG9pbnQgVGhlIHtQb2ludH0gYXQgd2hpY2ggdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHBhcmFtIGNoYXJhY3RlciBBIGNoYXJhY3RlciB0aGF0IHRyaWdnZXJlZCBmb3JtYXR0aW5nIHJlcXVlc3QuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IG9mIGFuIHtBcnJheX0gb2Yge1RleHRFZGl0fSBvYmplY3RzIHRoYXQgY2FuIGJlIGFwcGxpZWQgdG8gdGhlIEF0b20gVGV4dEVkaXRvclxuICAgKiAgIHRvIGZvcm1hdCB0aGUgZG9jdW1lbnQuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGZvcm1hdE9uVHlwZShcbiAgICBjb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHBvaW50OiBQb2ludCxcbiAgICBjaGFyYWN0ZXI6IHN0cmluZyxcbiAgKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBlZGl0cyA9IGF3YWl0IGNvbm5lY3Rpb24uZG9jdW1lbnRPblR5cGVGb3JtYXR0aW5nKFxuICAgICAgQ29kZUZvcm1hdEFkYXB0ZXIuY3JlYXRlRG9jdW1lbnRPblR5cGVGb3JtYXR0aW5nUGFyYW1zKGVkaXRvciwgcG9pbnQsIGNoYXJhY3RlciksXG4gICAgKTtcbiAgICByZXR1cm4gQ29udmVydC5jb252ZXJ0THNUZXh0RWRpdHMoZWRpdHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIHtEb2N1bWVudE9uVHlwZUZvcm1hdHRpbmdQYXJhbXN9IHRvIGJlIHNlbnQgdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB3aGVuIHJlcXVlc3RpbmcgYW5cbiAgICogZW50aXJlIGRvY3VtZW50IGlzIGZvcm1hdHRlZC5cbiAgICpcbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgZG9jdW1lbnQgdG8gYmUgZm9ybWF0dGVkLlxuICAgKiBAcGFyYW0gcG9pbnQgVGhlIHtQb2ludH0gYXQgd2hpY2ggdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHBhcmFtIGNoYXJhY3RlciBBIGNoYXJhY3RlciB0aGF0IHRyaWdnZXJlZCBmb3JtYXR0aW5nIHJlcXVlc3QuXG4gICAqIEByZXR1cm5zIEEge0RvY3VtZW50T25UeXBlRm9ybWF0dGluZ1BhcmFtc30gY29udGFpbmluZyB0aGUgaWRlbnRpdHkgb2YgdGhlIHRleHQgZG9jdW1lbnQsIHRoZVxuICAgKiAgIHBvc2l0aW9uIG9mIHRoZSB0ZXh0IHRvIGJlIGZvcm1hdHRlZCwgdGhlIGNoYXJhY3RlciB0aGF0IHRyaWdnZXJlZCBmb3JtYXR0aW5nIHJlcXVlc3RcbiAgICogICBhcyB3ZWxsIGFzIHRoZSBvcHRpb25zIHRvIGJlIHVzZWQgaW4gZm9ybWF0dGluZyB0aGUgZG9jdW1lbnQgc3VjaCBhcyB0YWIgc2l6ZSBhbmQgdGFicyB2cyBzcGFjZXMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNyZWF0ZURvY3VtZW50T25UeXBlRm9ybWF0dGluZ1BhcmFtcyhcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcG9pbnQ6IFBvaW50LFxuICAgIGNoYXJhY3Rlcjogc3RyaW5nLFxuICApOiBEb2N1bWVudE9uVHlwZUZvcm1hdHRpbmdQYXJhbXMge1xuICAgIHJldHVybiB7XG4gICAgICB0ZXh0RG9jdW1lbnQ6IENvbnZlcnQuZWRpdG9yVG9UZXh0RG9jdW1lbnRJZGVudGlmaWVyKGVkaXRvciksXG4gICAgICBwb3NpdGlvbjogQ29udmVydC5wb2ludFRvUG9zaXRpb24ocG9pbnQpLFxuICAgICAgY2g6IGNoYXJhY3RlcixcbiAgICAgIG9wdGlvbnM6IENvZGVGb3JtYXRBZGFwdGVyLmdldEZvcm1hdE9wdGlvbnMoZWRpdG9yKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIHtEb2N1bWVudFJhbmdlRm9ybWF0dGluZ1BhcmFtc30gdG8gYmUgc2VudCB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHdoZW4gcmVxdWVzdGluZyBhblxuICAgKiBlbnRpcmUgZG9jdW1lbnQgaXMgZm9ybWF0dGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZWRpdG9yIFRoZSBBdG9tIHtUZXh0RWRpdG9yfSBjb250YWluaW5nIHRoZSBkb2N1bWVudCB0byBiZSBmb3JtYXR0ZWQuXG4gICAqIEBwYXJhbSByYW5nZSBUaGUgQXRvbSB7UmFuZ2V9IGNvbnRhaW5pbmcgdGhlIHJhbmdlIG9mIGRvY3VtZW50IHRoYXQgc2hvdWxkIGJlIGZvcm1hdHRlZC5cbiAgICogQHJldHVybnMgVGhlIHtGb3JtYXR0aW5nT3B0aW9uc30gdG8gYmUgdXNlZCBjb250YWluaW5nIHRoZSBrZXlzOlxuICAgKiAgICogYHRhYlNpemVgIFRoZSBudW1iZXIgb2Ygc3BhY2VzIGEgdGFiIHJlcHJlc2VudHMuXG4gICAqICAgKiBgaW5zZXJ0U3BhY2VzYCB7VHJ1ZX0gaWYgc3BhY2VzIHNob3VsZCBiZSB1c2VkLCB7RmFsc2V9IGZvciB0YWIgY2hhcmFjdGVycy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2V0Rm9ybWF0T3B0aW9ucyhlZGl0b3I6IFRleHRFZGl0b3IpOiBGb3JtYXR0aW5nT3B0aW9ucyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRhYlNpemU6IGVkaXRvci5nZXRUYWJMZW5ndGgoKSxcbiAgICAgIGluc2VydFNwYWNlczogZWRpdG9yLmdldFNvZnRUYWJzKCksXG4gICAgfTtcbiAgfVxufVxuIl19