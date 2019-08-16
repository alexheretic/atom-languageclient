"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
        return (serverCapabilities.documentRangeFormattingProvider === true ||
            serverCapabilities.documentFormattingProvider === true);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1mb3JtYXQtYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9hZGFwdGVycy9jb2RlLWZvcm1hdC1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFDQSx3Q0FBaUM7QUFlakM7OztHQUdHO0FBQ0gsTUFBcUIsaUJBQWlCO0lBQ3BDOzs7Ozs7OztPQVFHO0lBQ0ksTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBc0M7UUFDM0QsT0FBTyxDQUNMLGtCQUFrQixDQUFDLCtCQUErQixLQUFLLElBQUk7WUFDM0Qsa0JBQWtCLENBQUMsMEJBQTBCLEtBQUssSUFBSSxDQUN2RCxDQUFDO0lBQ0osQ0FBQztJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSSxNQUFNLENBQUMsTUFBTSxDQUNsQixVQUFvQyxFQUNwQyxrQkFBc0MsRUFDdEMsTUFBa0IsRUFDbEIsS0FBWTtRQUVaLElBQUksa0JBQWtCLENBQUMsK0JBQStCLEVBQUU7WUFDdEQsT0FBTyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNqRTtRQUVELElBQUksa0JBQWtCLENBQUMsMEJBQTBCLEVBQUU7WUFDakQsT0FBTyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzdEO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksTUFBTSxDQUFPLGNBQWMsQ0FDaEMsVUFBb0MsRUFDcEMsTUFBa0I7O1lBRWxCLE1BQU0sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDNUcsT0FBTyxpQkFBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLENBQUM7S0FBQTtJQUVEOzs7Ozs7O09BT0c7SUFDSSxNQUFNLENBQUMsOEJBQThCLENBQUMsTUFBa0I7UUFDN0QsT0FBTztZQUNMLFlBQVksRUFBRSxpQkFBTyxDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQztZQUM1RCxPQUFPLEVBQUUsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1NBQ3BELENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSSxNQUFNLENBQU8sV0FBVyxDQUM3QixVQUFvQyxFQUNwQyxNQUFrQixFQUNsQixLQUFZOztZQUVaLE1BQU0sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFDLHVCQUF1QixDQUNwRCxpQkFBaUIsQ0FBQyxtQ0FBbUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQ3JFLENBQUM7WUFDRixPQUFPLGlCQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsQ0FBQztLQUFBO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0ksTUFBTSxDQUFDLG1DQUFtQyxDQUMvQyxNQUFrQixFQUNsQixLQUFZO1FBRVosT0FBTztZQUNMLFlBQVksRUFBRSxpQkFBTyxDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQztZQUM1RCxLQUFLLEVBQUUsaUJBQU8sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7WUFDeEMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztTQUNwRCxDQUFDO0lBQ0osQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNJLE1BQU0sQ0FBTyxZQUFZLENBQzlCLFVBQW9DLEVBQ3BDLE1BQWtCLEVBQ2xCLEtBQVksRUFDWixTQUFpQjs7WUFFakIsTUFBTSxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUMsd0JBQXdCLENBQ3JELGlCQUFpQixDQUFDLG9DQUFvQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQ2pGLENBQUM7WUFDRixPQUFPLGlCQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsQ0FBQztLQUFBO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNJLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FDaEQsTUFBa0IsRUFDbEIsS0FBWSxFQUNaLFNBQWlCO1FBRWpCLE9BQU87WUFDTCxZQUFZLEVBQUUsaUJBQU8sQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUM7WUFDNUQsUUFBUSxFQUFFLGlCQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztZQUN4QyxFQUFFLEVBQUUsU0FBUztZQUNiLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7U0FDcEQsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBa0I7UUFDL0MsT0FBTztZQUNMLE9BQU8sRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQzlCLFlBQVksRUFBRSxNQUFNLENBQUMsV0FBVyxFQUFFO1NBQ25DLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFuTEQsb0NBbUxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXRvbUlkZSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCB7XG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgRG9jdW1lbnRGb3JtYXR0aW5nUGFyYW1zLFxuICBEb2N1bWVudFJhbmdlRm9ybWF0dGluZ1BhcmFtcyxcbiAgRG9jdW1lbnRPblR5cGVGb3JtYXR0aW5nUGFyYW1zLFxuICBGb3JtYXR0aW5nT3B0aW9ucyxcbiAgU2VydmVyQ2FwYWJpbGl0aWVzLFxufSBmcm9tICcuLi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQge1xuICBUZXh0RWRpdG9yLFxuICBSYW5nZSxcbiAgUG9pbnQsXG59IGZyb20gJ2F0b20nO1xuXG4vKipcbiAqIFB1YmxpYzogQWRhcHRzIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgcHJvdG9jb2wgXCJ0ZXh0RG9jdW1lbnQvY29tcGxldGlvblwiIHRvIHRoZVxuICogQXRvbSBJREUgVUkgQ29kZS1mb3JtYXQgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29kZUZvcm1hdEFkYXB0ZXIge1xuICAvKipcbiAgICogUHVibGljOiBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGFkYXB0ZXIgY2FuIGJlIHVzZWQgdG8gYWRhcHQgYSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIHNlcnZlckNhcGFiaWxpdGllcyBtYXRyaXggY29udGFpbmluZyBlaXRoZXIgYSBkb2N1bWVudEZvcm1hdHRpbmdQcm92aWRlclxuICAgKiBvciBhIGRvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUHJvdmlkZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzZXJ2ZXJDYXBhYmlsaXRpZXMgVGhlIHtTZXJ2ZXJDYXBhYmlsaXRpZXN9IG9mIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdG8gY29uc2lkZXIuXG4gICAqIEByZXR1cm5zIEEge0Jvb2xlYW59IGluZGljYXRpbmcgdGhpcyBhZGFwdGVyIGNhbiBhZGFwdCB0aGUgc2VydmVyIGJhc2VkIG9uIHRoZVxuICAgKiAgIGdpdmVuIHNlcnZlckNhcGFiaWxpdGllcy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY2FuQWRhcHQoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgc2VydmVyQ2FwYWJpbGl0aWVzLmRvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUHJvdmlkZXIgPT09IHRydWUgfHxcbiAgICAgIHNlcnZlckNhcGFiaWxpdGllcy5kb2N1bWVudEZvcm1hdHRpbmdQcm92aWRlciA9PT0gdHJ1ZVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBGb3JtYXQgdGV4dCBpbiB0aGUgZWRpdG9yIHVzaW5nIHRoZSBnaXZlbiBsYW5ndWFnZSBzZXJ2ZXIgY29ubmVjdGlvbiBhbmQgYW4gb3B0aW9uYWwgcmFuZ2UuXG4gICAqIElmIHRoZSBzZXJ2ZXIgZG9lcyBub3Qgc3VwcG9ydCByYW5nZSBmb3JtYXR0aW5nIHRoZW4gcmFuZ2Ugd2lsbCBiZSBpZ25vcmVkIGFuZCB0aGUgZW50aXJlIGRvY3VtZW50IGZvcm1hdHRlZC5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBmb3JtYXQgdGhlIHRleHQuXG4gICAqIEBwYXJhbSBzZXJ2ZXJDYXBhYmlsaXRpZXMgVGhlIHtTZXJ2ZXJDYXBhYmlsaXRpZXN9IG9mIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIGJlIHVzZWQuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIHRleHQgdGhhdCB3aWxsIGJlIGZvcm1hdHRlZC5cbiAgICogQHBhcmFtIHJhbmdlIFRoZSBvcHRpb25hbCBBdG9tIHtSYW5nZX0gY29udGFpbmluZyB0aGUgc3Vic2V0IG9mIHRoZSB0ZXh0IHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gb2YgYW4ge0FycmF5fSBvZiB7T2JqZWN0fXMgY29udGFpbmluZyB0aGUgQXV0b0NvbXBsZXRlK1xuICAgKiAgIHN1Z2dlc3Rpb25zIHRvIGRpc3BsYXkuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGZvcm1hdChcbiAgICBjb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gICAgc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHJhbmdlOiBSYW5nZSxcbiAgKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBpZiAoc2VydmVyQ2FwYWJpbGl0aWVzLmRvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUHJvdmlkZXIpIHtcbiAgICAgIHJldHVybiBDb2RlRm9ybWF0QWRhcHRlci5mb3JtYXRSYW5nZShjb25uZWN0aW9uLCBlZGl0b3IsIHJhbmdlKTtcbiAgICB9XG5cbiAgICBpZiAoc2VydmVyQ2FwYWJpbGl0aWVzLmRvY3VtZW50Rm9ybWF0dGluZ1Byb3ZpZGVyKSB7XG4gICAgICByZXR1cm4gQ29kZUZvcm1hdEFkYXB0ZXIuZm9ybWF0RG9jdW1lbnQoY29ubmVjdGlvbiwgZWRpdG9yKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZm9ybWF0IGRvY3VtZW50LCBsYW5ndWFnZSBzZXJ2ZXIgZG9lcyBub3Qgc3VwcG9ydCBpdCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogRm9ybWF0IHRoZSBlbnRpcmUgZG9jdW1lbnQgb2YgYW4gQXRvbSB7VGV4dEVkaXRvcn0gYnkgdXNpbmcgYSBnaXZlbiBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSBjb25uZWN0aW9uIEEge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0IHdpbGwgZm9ybWF0IHRoZSB0ZXh0LlxuICAgKiBAcGFyYW0gZWRpdG9yIFRoZSBBdG9tIHtUZXh0RWRpdG9yfSBjb250YWluaW5nIHRoZSBkb2N1bWVudCB0byBiZSBmb3JtYXR0ZWQuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IG9mIGFuIHtBcnJheX0gb2Yge1RleHRFZGl0fSBvYmplY3RzIHRoYXQgY2FuIGJlIGFwcGxpZWQgdG8gdGhlIEF0b20gVGV4dEVkaXRvclxuICAgKiAgIHRvIGZvcm1hdCB0aGUgZG9jdW1lbnQuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGZvcm1hdERvY3VtZW50KFxuICAgIGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICk6IFByb21pc2U8YXRvbUlkZS5UZXh0RWRpdFtdPiB7XG4gICAgY29uc3QgZWRpdHMgPSBhd2FpdCBjb25uZWN0aW9uLmRvY3VtZW50Rm9ybWF0dGluZyhDb2RlRm9ybWF0QWRhcHRlci5jcmVhdGVEb2N1bWVudEZvcm1hdHRpbmdQYXJhbXMoZWRpdG9yKSk7XG4gICAgcmV0dXJuIENvbnZlcnQuY29udmVydExzVGV4dEVkaXRzKGVkaXRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSB7RG9jdW1lbnRGb3JtYXR0aW5nUGFyYW1zfSB0byBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgd2hlbiByZXF1ZXN0aW5nIGFuXG4gICAqIGVudGlyZSBkb2N1bWVudCBpcyBmb3JtYXR0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHJldHVybnMgQSB7RG9jdW1lbnRGb3JtYXR0aW5nUGFyYW1zfSBjb250YWluaW5nIHRoZSBpZGVudGl0eSBvZiB0aGUgdGV4dCBkb2N1bWVudCBhcyB3ZWxsIGFzXG4gICAqICAgb3B0aW9ucyB0byBiZSB1c2VkIGluIGZvcm1hdHRpbmcgdGhlIGRvY3VtZW50IHN1Y2ggYXMgdGFiIHNpemUgYW5kIHRhYnMgdnMgc3BhY2VzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjcmVhdGVEb2N1bWVudEZvcm1hdHRpbmdQYXJhbXMoZWRpdG9yOiBUZXh0RWRpdG9yKTogRG9jdW1lbnRGb3JtYXR0aW5nUGFyYW1zIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGV4dERvY3VtZW50OiBDb252ZXJ0LmVkaXRvclRvVGV4dERvY3VtZW50SWRlbnRpZmllcihlZGl0b3IpLFxuICAgICAgb3B0aW9uczogQ29kZUZvcm1hdEFkYXB0ZXIuZ2V0Rm9ybWF0T3B0aW9ucyhlZGl0b3IpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBGb3JtYXQgYSByYW5nZSB3aXRoaW4gYW4gQXRvbSB7VGV4dEVkaXRvcn0gYnkgdXNpbmcgYSBnaXZlbiBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSBjb25uZWN0aW9uIEEge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0IHdpbGwgZm9ybWF0IHRoZSB0ZXh0LlxuICAgKiBAcGFyYW0gcmFuZ2UgVGhlIEF0b20ge1JhbmdlfSBjb250YWluaW5nIHRoZSByYW5nZSBvZiB0ZXh0IHRoYXQgc2hvdWxkIGJlIGZvcm1hdHRlZC5cbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgZG9jdW1lbnQgdG8gYmUgZm9ybWF0dGVkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBvZiBhbiB7QXJyYXl9IG9mIHtUZXh0RWRpdH0gb2JqZWN0cyB0aGF0IGNhbiBiZSBhcHBsaWVkIHRvIHRoZSBBdG9tIFRleHRFZGl0b3JcbiAgICogICB0byBmb3JtYXQgdGhlIGRvY3VtZW50LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBmb3JtYXRSYW5nZShcbiAgICBjb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHJhbmdlOiBSYW5nZSxcbiAgKTogUHJvbWlzZTxhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCBlZGl0cyA9IGF3YWl0IGNvbm5lY3Rpb24uZG9jdW1lbnRSYW5nZUZvcm1hdHRpbmcoXG4gICAgICBDb2RlRm9ybWF0QWRhcHRlci5jcmVhdGVEb2N1bWVudFJhbmdlRm9ybWF0dGluZ1BhcmFtcyhlZGl0b3IsIHJhbmdlKSxcbiAgICApO1xuICAgIHJldHVybiBDb252ZXJ0LmNvbnZlcnRMc1RleHRFZGl0cyhlZGl0cyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUge0RvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUGFyYW1zfSB0byBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgd2hlbiByZXF1ZXN0aW5nIGFuXG4gICAqIGVudGlyZSBkb2N1bWVudCBpcyBmb3JtYXR0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHBhcmFtIHJhbmdlIFRoZSBBdG9tIHtSYW5nZX0gY29udGFpbmluZyB0aGUgcmFuZ2Ugb2YgdGV4dCB0aGF0IHNob3VsZCBiZSBmb3JtYXR0ZWQuXG4gICAqIEByZXR1cm5zIEEge0RvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUGFyYW1zfSBjb250YWluaW5nIHRoZSBpZGVudGl0eSBvZiB0aGUgdGV4dCBkb2N1bWVudCwgdGhlXG4gICAqICAgcmFuZ2Ugb2YgdGhlIHRleHQgdG8gYmUgZm9ybWF0dGVkIGFzIHdlbGwgYXMgdGhlIG9wdGlvbnMgdG8gYmUgdXNlZCBpbiBmb3JtYXR0aW5nIHRoZVxuICAgKiAgIGRvY3VtZW50IHN1Y2ggYXMgdGFiIHNpemUgYW5kIHRhYnMgdnMgc3BhY2VzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjcmVhdGVEb2N1bWVudFJhbmdlRm9ybWF0dGluZ1BhcmFtcyhcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcmFuZ2U6IFJhbmdlLFxuICApOiBEb2N1bWVudFJhbmdlRm9ybWF0dGluZ1BhcmFtcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHREb2N1bWVudDogQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudElkZW50aWZpZXIoZWRpdG9yKSxcbiAgICAgIHJhbmdlOiBDb252ZXJ0LmF0b21SYW5nZVRvTFNSYW5nZShyYW5nZSksXG4gICAgICBvcHRpb25zOiBDb2RlRm9ybWF0QWRhcHRlci5nZXRGb3JtYXRPcHRpb25zKGVkaXRvciksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEZvcm1hdCBvbiB0eXBlIHdpdGhpbiBhbiBBdG9tIHtUZXh0RWRpdG9yfSBieSB1c2luZyBhIGdpdmVuIGxhbmd1YWdlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBmb3JtYXQgdGhlIHRleHQuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHBhcmFtIHBvaW50IFRoZSB7UG9pbnR9IGF0IHdoaWNoIHRoZSBkb2N1bWVudCB0byBiZSBmb3JtYXR0ZWQuXG4gICAqIEBwYXJhbSBjaGFyYWN0ZXIgQSBjaGFyYWN0ZXIgdGhhdCB0cmlnZ2VyZWQgZm9ybWF0dGluZyByZXF1ZXN0LlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBvZiBhbiB7QXJyYXl9IG9mIHtUZXh0RWRpdH0gb2JqZWN0cyB0aGF0IGNhbiBiZSBhcHBsaWVkIHRvIHRoZSBBdG9tIFRleHRFZGl0b3JcbiAgICogICB0byBmb3JtYXQgdGhlIGRvY3VtZW50LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBmb3JtYXRPblR5cGUoXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBwb2ludDogUG9pbnQsXG4gICAgY2hhcmFjdGVyOiBzdHJpbmcsXG4gICk6IFByb21pc2U8YXRvbUlkZS5UZXh0RWRpdFtdPiB7XG4gICAgY29uc3QgZWRpdHMgPSBhd2FpdCBjb25uZWN0aW9uLmRvY3VtZW50T25UeXBlRm9ybWF0dGluZyhcbiAgICAgIENvZGVGb3JtYXRBZGFwdGVyLmNyZWF0ZURvY3VtZW50T25UeXBlRm9ybWF0dGluZ1BhcmFtcyhlZGl0b3IsIHBvaW50LCBjaGFyYWN0ZXIpLFxuICAgICk7XG4gICAgcmV0dXJuIENvbnZlcnQuY29udmVydExzVGV4dEVkaXRzKGVkaXRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSB7RG9jdW1lbnRPblR5cGVGb3JtYXR0aW5nUGFyYW1zfSB0byBiZSBzZW50IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgd2hlbiByZXF1ZXN0aW5nIGFuXG4gICAqIGVudGlyZSBkb2N1bWVudCBpcyBmb3JtYXR0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIGRvY3VtZW50IHRvIGJlIGZvcm1hdHRlZC5cbiAgICogQHBhcmFtIHBvaW50IFRoZSB7UG9pbnR9IGF0IHdoaWNoIHRoZSBkb2N1bWVudCB0byBiZSBmb3JtYXR0ZWQuXG4gICAqIEBwYXJhbSBjaGFyYWN0ZXIgQSBjaGFyYWN0ZXIgdGhhdCB0cmlnZ2VyZWQgZm9ybWF0dGluZyByZXF1ZXN0LlxuICAgKiBAcmV0dXJucyBBIHtEb2N1bWVudE9uVHlwZUZvcm1hdHRpbmdQYXJhbXN9IGNvbnRhaW5pbmcgdGhlIGlkZW50aXR5IG9mIHRoZSB0ZXh0IGRvY3VtZW50LCB0aGVcbiAgICogICBwb3NpdGlvbiBvZiB0aGUgdGV4dCB0byBiZSBmb3JtYXR0ZWQsIHRoZSBjaGFyYWN0ZXIgdGhhdCB0cmlnZ2VyZWQgZm9ybWF0dGluZyByZXF1ZXN0XG4gICAqICAgYXMgd2VsbCBhcyB0aGUgb3B0aW9ucyB0byBiZSB1c2VkIGluIGZvcm1hdHRpbmcgdGhlIGRvY3VtZW50IHN1Y2ggYXMgdGFiIHNpemUgYW5kIHRhYnMgdnMgc3BhY2VzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjcmVhdGVEb2N1bWVudE9uVHlwZUZvcm1hdHRpbmdQYXJhbXMoXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHBvaW50OiBQb2ludCxcbiAgICBjaGFyYWN0ZXI6IHN0cmluZyxcbiAgKTogRG9jdW1lbnRPblR5cGVGb3JtYXR0aW5nUGFyYW1zIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGV4dERvY3VtZW50OiBDb252ZXJ0LmVkaXRvclRvVGV4dERvY3VtZW50SWRlbnRpZmllcihlZGl0b3IpLFxuICAgICAgcG9zaXRpb246IENvbnZlcnQucG9pbnRUb1Bvc2l0aW9uKHBvaW50KSxcbiAgICAgIGNoOiBjaGFyYWN0ZXIsXG4gICAgICBvcHRpb25zOiBDb2RlRm9ybWF0QWRhcHRlci5nZXRGb3JtYXRPcHRpb25zKGVkaXRvciksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSB7RG9jdW1lbnRSYW5nZUZvcm1hdHRpbmdQYXJhbXN9IHRvIGJlIHNlbnQgdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB3aGVuIHJlcXVlc3RpbmcgYW5cbiAgICogZW50aXJlIGRvY3VtZW50IGlzIGZvcm1hdHRlZC5cbiAgICpcbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgZG9jdW1lbnQgdG8gYmUgZm9ybWF0dGVkLlxuICAgKiBAcGFyYW0gcmFuZ2UgVGhlIEF0b20ge1JhbmdlfSBjb250YWluaW5nIHRoZSByYW5nZSBvZiBkb2N1bWVudCB0aGF0IHNob3VsZCBiZSBmb3JtYXR0ZWQuXG4gICAqIEByZXR1cm5zIFRoZSB7Rm9ybWF0dGluZ09wdGlvbnN9IHRvIGJlIHVzZWQgY29udGFpbmluZyB0aGUga2V5czpcbiAgICogICAqIGB0YWJTaXplYCBUaGUgbnVtYmVyIG9mIHNwYWNlcyBhIHRhYiByZXByZXNlbnRzLlxuICAgKiAgICogYGluc2VydFNwYWNlc2Age1RydWV9IGlmIHNwYWNlcyBzaG91bGQgYmUgdXNlZCwge0ZhbHNlfSBmb3IgdGFiIGNoYXJhY3RlcnMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGdldEZvcm1hdE9wdGlvbnMoZWRpdG9yOiBUZXh0RWRpdG9yKTogRm9ybWF0dGluZ09wdGlvbnMge1xuICAgIHJldHVybiB7XG4gICAgICB0YWJTaXplOiBlZGl0b3IuZ2V0VGFiTGVuZ3RoKCksXG4gICAgICBpbnNlcnRTcGFjZXM6IGVkaXRvci5nZXRTb2Z0VGFicygpLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==