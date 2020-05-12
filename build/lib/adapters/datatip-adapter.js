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
const Utils = require("../utils");
/**
 * Public: Adapts the language server protocol "textDocument/hover" to the
 * Atom IDE UI Datatip package.
 */
class DatatipAdapter {
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing a hoverProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities) {
        return !!serverCapabilities.hoverProvider;
    }
    /**
     * Public: Get the Datatip for this {Point} in a {TextEditor} by querying
     * the language server.
     *
     * @param connection A {LanguageClientConnection} to the language server that will be queried
     *   for the hover text/datatip.
     * @param editor The Atom {TextEditor} containing the text the Datatip should relate to.
     * @param point The Atom {Point} containing the point within the text the Datatip should relate to.
     * @returns A {Promise} containing the {Datatip} to display or {null} if no Datatip is available.
     */
    getDatatip(connection, editor, point) {
        return __awaiter(this, void 0, void 0, function* () {
            const documentPositionParams = convert_1.default.editorToTextDocumentPositionParams(editor, point);
            const hover = yield connection.hover(documentPositionParams);
            if (hover == null || DatatipAdapter.isEmptyHover(hover)) {
                return null;
            }
            const range = hover.range == null ? Utils.getWordAtPosition(editor, point) : convert_1.default.lsRangeToAtomRange(hover.range);
            const markedStrings = (Array.isArray(hover.contents) ? hover.contents : [hover.contents]).map((str) => DatatipAdapter.convertMarkedString(editor, str));
            return { range, markedStrings };
        });
    }
    static isEmptyHover(hover) {
        return hover.contents == null ||
            (typeof hover.contents === 'string' && hover.contents.length === 0) ||
            (Array.isArray(hover.contents) &&
                (hover.contents.length === 0 || hover.contents[0] === ""));
    }
    static convertMarkedString(editor, markedString) {
        if (typeof markedString === 'string') {
            return { type: 'markdown', value: markedString };
        }
        if (markedString.kind) {
            return {
                type: 'markdown',
                value: markedString.value,
            };
        }
        // Must check as <{language: string}> to disambiguate between
        // string and the more explicit object type because MarkedString
        // is a union of the two types
        if (markedString.language) {
            return {
                type: 'snippet',
                // TODO: find a better mapping from language -> grammar
                grammar: atom.grammars.grammarForScopeName(`source.${markedString.language}`) || editor.getGrammar(),
                value: markedString.value,
            };
        }
        // Catch-all case
        return { type: 'markdown', value: markedString.toString() };
    }
}
exports.default = DatatipAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YXRpcC1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2FkYXB0ZXJzL2RhdGF0aXAtYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUNBLHdDQUFpQztBQUNqQyxrQ0FBa0M7QUFhbEM7OztHQUdHO0FBQ0gsTUFBcUIsY0FBYztJQUNqQzs7Ozs7OztPQU9HO0lBQ0ksTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBc0M7UUFDM0QsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDO0lBQzVDLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDVSxVQUFVLENBQ3JCLFVBQW9DLEVBQ3BDLE1BQWtCLEVBQ2xCLEtBQVk7O1lBRVosTUFBTSxzQkFBc0IsR0FBRyxpQkFBTyxDQUFDLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUV6RixNQUFNLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUM3RCxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksY0FBYyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDdkQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE1BQU0sS0FBSyxHQUNULEtBQUssQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV6RyxNQUFNLGFBQWEsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQ3BHLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQ2hELENBQUM7WUFFRixPQUFPLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDO1FBQ2xDLENBQUM7S0FBQTtJQUVPLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBWTtRQUN0QyxPQUFPLEtBQUssQ0FBQyxRQUFRLElBQUksSUFBSTtZQUMzQixDQUFDLE9BQU8sS0FBSyxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO1lBQ25FLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO2dCQUM1QixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDaEMsTUFBa0IsRUFDbEIsWUFBMEM7UUFFMUMsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLEVBQUU7WUFDcEMsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDO1NBQ2xEO1FBRUQsSUFBSyxZQUE4QixDQUFDLElBQUksRUFBRTtZQUN4QyxPQUFPO2dCQUNMLElBQUksRUFBRSxVQUFVO2dCQUNoQixLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7YUFDMUIsQ0FBQztTQUNIO1FBRUQsNkRBQTZEO1FBQzdELGdFQUFnRTtRQUNoRSw4QkFBOEI7UUFDOUIsSUFBSyxZQUFxQyxDQUFDLFFBQVEsRUFBRTtZQUNuRCxPQUFPO2dCQUNMLElBQUksRUFBRSxTQUFTO2dCQUNmLHVEQUF1RDtnQkFDdkQsT0FBTyxFQUNMLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQy9CLFVBQVcsWUFBcUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUU7Z0JBQ3ZGLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSzthQUMxQixDQUFDO1NBQ0g7UUFFRCxpQkFBaUI7UUFDakIsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO0lBQzlELENBQUM7Q0FDRjtBQXBGRCxpQ0FvRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhdG9tSWRlIGZyb20gJ2F0b20taWRlJztcbmltcG9ydCBDb252ZXJ0IGZyb20gJy4uL2NvbnZlcnQnO1xuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgSG92ZXIsXG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgTWFya3VwQ29udGVudCxcbiAgTWFya2VkU3RyaW5nLFxuICBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG59IGZyb20gJy4uL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCB7XG4gIFBvaW50LFxuICBUZXh0RWRpdG9yLFxufSBmcm9tICdhdG9tJztcblxuLyoqXG4gKiBQdWJsaWM6IEFkYXB0cyB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIFwidGV4dERvY3VtZW50L2hvdmVyXCIgdG8gdGhlXG4gKiBBdG9tIElERSBVSSBEYXRhdGlwIHBhY2thZ2UuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERhdGF0aXBBZGFwdGVyIHtcbiAgLyoqXG4gICAqIFB1YmxpYzogRGV0ZXJtaW5lIHdoZXRoZXIgdGhpcyBhZGFwdGVyIGNhbiBiZSB1c2VkIHRvIGFkYXB0IGEgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqIGJhc2VkIG9uIHRoZSBzZXJ2ZXJDYXBhYmlsaXRpZXMgbWF0cml4IGNvbnRhaW5pbmcgYSBob3ZlclByb3ZpZGVyLlxuICAgKlxuICAgKiBAcGFyYW0gc2VydmVyQ2FwYWJpbGl0aWVzIFRoZSB7U2VydmVyQ2FwYWJpbGl0aWVzfSBvZiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRvIGNvbnNpZGVyLlxuICAgKiBAcmV0dXJucyBBIHtCb29sZWFufSBpbmRpY2F0aW5nIGFkYXB0ZXIgY2FuIGFkYXB0IHRoZSBzZXJ2ZXIgYmFzZWQgb24gdGhlXG4gICAqICAgZ2l2ZW4gc2VydmVyQ2FwYWJpbGl0aWVzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjYW5BZGFwdChzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXNlcnZlckNhcGFiaWxpdGllcy5ob3ZlclByb3ZpZGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogR2V0IHRoZSBEYXRhdGlwIGZvciB0aGlzIHtQb2ludH0gaW4gYSB7VGV4dEVkaXRvcn0gYnkgcXVlcnlpbmdcbiAgICogdGhlIGxhbmd1YWdlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBiZSBxdWVyaWVkXG4gICAqICAgZm9yIHRoZSBob3ZlciB0ZXh0L2RhdGF0aXAuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIHRleHQgdGhlIERhdGF0aXAgc2hvdWxkIHJlbGF0ZSB0by5cbiAgICogQHBhcmFtIHBvaW50IFRoZSBBdG9tIHtQb2ludH0gY29udGFpbmluZyB0aGUgcG9pbnQgd2l0aGluIHRoZSB0ZXh0IHRoZSBEYXRhdGlwIHNob3VsZCByZWxhdGUgdG8uXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgdGhlIHtEYXRhdGlwfSB0byBkaXNwbGF5IG9yIHtudWxsfSBpZiBubyBEYXRhdGlwIGlzIGF2YWlsYWJsZS5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBnZXREYXRhdGlwKFxuICAgIGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcG9pbnQ6IFBvaW50LFxuICApOiBQcm9taXNlPGF0b21JZGUuRGF0YXRpcCB8IG51bGw+IHtcbiAgICBjb25zdCBkb2N1bWVudFBvc2l0aW9uUGFyYW1zID0gQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKGVkaXRvciwgcG9pbnQpO1xuXG4gICAgY29uc3QgaG92ZXIgPSBhd2FpdCBjb25uZWN0aW9uLmhvdmVyKGRvY3VtZW50UG9zaXRpb25QYXJhbXMpO1xuICAgIGlmIChob3ZlciA9PSBudWxsIHx8IERhdGF0aXBBZGFwdGVyLmlzRW1wdHlIb3Zlcihob3ZlcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJhbmdlID1cbiAgICAgIGhvdmVyLnJhbmdlID09IG51bGwgPyBVdGlscy5nZXRXb3JkQXRQb3NpdGlvbihlZGl0b3IsIHBvaW50KSA6IENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKGhvdmVyLnJhbmdlKTtcblxuICAgIGNvbnN0IG1hcmtlZFN0cmluZ3MgPSAoQXJyYXkuaXNBcnJheShob3Zlci5jb250ZW50cykgPyBob3Zlci5jb250ZW50cyA6IFtob3Zlci5jb250ZW50c10pLm1hcCgoc3RyKSA9PlxuICAgICAgRGF0YXRpcEFkYXB0ZXIuY29udmVydE1hcmtlZFN0cmluZyhlZGl0b3IsIHN0ciksXG4gICAgKTtcblxuICAgIHJldHVybiB7IHJhbmdlLCBtYXJrZWRTdHJpbmdzIH07XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBpc0VtcHR5SG92ZXIoaG92ZXI6IEhvdmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGhvdmVyLmNvbnRlbnRzID09IG51bGwgfHxcbiAgICAgICh0eXBlb2YgaG92ZXIuY29udGVudHMgPT09ICdzdHJpbmcnICYmIGhvdmVyLmNvbnRlbnRzLmxlbmd0aCA9PT0gMCkgfHxcbiAgICAgIChBcnJheS5pc0FycmF5KGhvdmVyLmNvbnRlbnRzKSAmJlxuICAgICAgICAoaG92ZXIuY29udGVudHMubGVuZ3RoID09PSAwIHx8IGhvdmVyLmNvbnRlbnRzWzBdID09PSBcIlwiKSk7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBjb252ZXJ0TWFya2VkU3RyaW5nKFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBtYXJrZWRTdHJpbmc6IE1hcmtlZFN0cmluZyB8IE1hcmt1cENvbnRlbnQsXG4gICk6IGF0b21JZGUuTWFya2VkU3RyaW5nIHtcbiAgICBpZiAodHlwZW9mIG1hcmtlZFN0cmluZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiB7IHR5cGU6ICdtYXJrZG93bicsIHZhbHVlOiBtYXJrZWRTdHJpbmcgfTtcbiAgICB9XG5cbiAgICBpZiAoKG1hcmtlZFN0cmluZyBhcyBNYXJrdXBDb250ZW50KS5raW5kKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnbWFya2Rvd24nLFxuICAgICAgICB2YWx1ZTogbWFya2VkU3RyaW5nLnZhbHVlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBNdXN0IGNoZWNrIGFzIDx7bGFuZ3VhZ2U6IHN0cmluZ30+IHRvIGRpc2FtYmlndWF0ZSBiZXR3ZWVuXG4gICAgLy8gc3RyaW5nIGFuZCB0aGUgbW9yZSBleHBsaWNpdCBvYmplY3QgdHlwZSBiZWNhdXNlIE1hcmtlZFN0cmluZ1xuICAgIC8vIGlzIGEgdW5pb24gb2YgdGhlIHR3byB0eXBlc1xuICAgIGlmICgobWFya2VkU3RyaW5nIGFzIHsgbGFuZ3VhZ2U6IHN0cmluZyB9KS5sYW5ndWFnZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3NuaXBwZXQnLFxuICAgICAgICAvLyBUT0RPOiBmaW5kIGEgYmV0dGVyIG1hcHBpbmcgZnJvbSBsYW5ndWFnZSAtPiBncmFtbWFyXG4gICAgICAgIGdyYW1tYXI6XG4gICAgICAgICAgYXRvbS5ncmFtbWFycy5ncmFtbWFyRm9yU2NvcGVOYW1lKFxuICAgICAgICAgICAgYHNvdXJjZS4keyhtYXJrZWRTdHJpbmcgYXMgeyBsYW5ndWFnZTogc3RyaW5nIH0pLmxhbmd1YWdlfWApIHx8IGVkaXRvci5nZXRHcmFtbWFyKCksXG4gICAgICAgIHZhbHVlOiBtYXJrZWRTdHJpbmcudmFsdWUsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIENhdGNoLWFsbCBjYXNlXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hcmtkb3duJywgdmFsdWU6IG1hcmtlZFN0cmluZy50b1N0cmluZygpIH07XG4gIH1cbn1cbiJdfQ==