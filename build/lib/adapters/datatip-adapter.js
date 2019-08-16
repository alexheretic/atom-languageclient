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
        return serverCapabilities.hoverProvider === true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YXRpcC1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2FkYXB0ZXJzL2RhdGF0aXAtYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQ0Esd0NBQWlDO0FBQ2pDLGtDQUFrQztBQWFsQzs7O0dBR0c7QUFDSCxNQUFxQixjQUFjO0lBQ2pDOzs7Ozs7O09BT0c7SUFDSSxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFzQztRQUMzRCxPQUFPLGtCQUFrQixDQUFDLGFBQWEsS0FBSyxJQUFJLENBQUM7SUFDbkQsQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNVLFVBQVUsQ0FDckIsVUFBb0MsRUFDcEMsTUFBa0IsRUFDbEIsS0FBWTs7WUFFWixNQUFNLHNCQUFzQixHQUFHLGlCQUFPLENBQUMsa0NBQWtDLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRXpGLE1BQU0sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzdELElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN2RCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsTUFBTSxLQUFLLEdBQ1QsS0FBSyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXpHLE1BQU0sYUFBYSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDcEcsY0FBYyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FDaEQsQ0FBQztZQUVGLE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUM7UUFDbEMsQ0FBQztLQUFBO0lBRU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFZO1FBQ3RDLE9BQU8sS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJO1lBQzNCLENBQUMsT0FBTyxLQUFLLENBQUMsUUFBUSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7WUFDbkUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7Z0JBQzVCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRU8sTUFBTSxDQUFDLG1CQUFtQixDQUNoQyxNQUFrQixFQUNsQixZQUEwQztRQUUxQyxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRTtZQUNwQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLENBQUM7U0FDbEQ7UUFFRCxJQUFLLFlBQThCLENBQUMsSUFBSSxFQUFFO1lBQ3hDLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSzthQUMxQixDQUFDO1NBQ0g7UUFFRCw2REFBNkQ7UUFDN0QsZ0VBQWdFO1FBQ2hFLDhCQUE4QjtRQUM5QixJQUFLLFlBQXFDLENBQUMsUUFBUSxFQUFFO1lBQ25ELE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsdURBQXVEO2dCQUN2RCxPQUFPLEVBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FDL0IsVUFBVyxZQUFxQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRTtnQkFDdkYsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLO2FBQzFCLENBQUM7U0FDSDtRQUVELGlCQUFpQjtRQUNqQixPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7SUFDOUQsQ0FBQztDQUNGO0FBcEZELGlDQW9GQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGF0b21JZGUgZnJvbSAnYXRvbS1pZGUnO1xuaW1wb3J0IENvbnZlcnQgZnJvbSAnLi4vY29udmVydCc7XG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICBIb3ZlcixcbiAgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICBNYXJrdXBDb250ZW50LFxuICBNYXJrZWRTdHJpbmcsXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbn0gZnJvbSAnLi4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IHtcbiAgUG9pbnQsXG4gIFRleHRFZGl0b3IsXG59IGZyb20gJ2F0b20nO1xuXG4vKipcbiAqIFB1YmxpYzogQWRhcHRzIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgcHJvdG9jb2wgXCJ0ZXh0RG9jdW1lbnQvaG92ZXJcIiB0byB0aGVcbiAqIEF0b20gSURFIFVJIERhdGF0aXAgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGF0YXRpcEFkYXB0ZXIge1xuICAvKipcbiAgICogUHVibGljOiBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGFkYXB0ZXIgY2FuIGJlIHVzZWQgdG8gYWRhcHQgYSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIHNlcnZlckNhcGFiaWxpdGllcyBtYXRyaXggY29udGFpbmluZyBhIGhvdmVyUHJvdmlkZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzZXJ2ZXJDYXBhYmlsaXRpZXMgVGhlIHtTZXJ2ZXJDYXBhYmlsaXRpZXN9IG9mIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdG8gY29uc2lkZXIuXG4gICAqIEByZXR1cm5zIEEge0Jvb2xlYW59IGluZGljYXRpbmcgYWRhcHRlciBjYW4gYWRhcHQgdGhlIHNlcnZlciBiYXNlZCBvbiB0aGVcbiAgICogICBnaXZlbiBzZXJ2ZXJDYXBhYmlsaXRpZXMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNhbkFkYXB0KHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHNlcnZlckNhcGFiaWxpdGllcy5ob3ZlclByb3ZpZGVyID09PSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogR2V0IHRoZSBEYXRhdGlwIGZvciB0aGlzIHtQb2ludH0gaW4gYSB7VGV4dEVkaXRvcn0gYnkgcXVlcnlpbmdcbiAgICogdGhlIGxhbmd1YWdlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBiZSBxdWVyaWVkXG4gICAqICAgZm9yIHRoZSBob3ZlciB0ZXh0L2RhdGF0aXAuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIHRleHQgdGhlIERhdGF0aXAgc2hvdWxkIHJlbGF0ZSB0by5cbiAgICogQHBhcmFtIHBvaW50IFRoZSBBdG9tIHtQb2ludH0gY29udGFpbmluZyB0aGUgcG9pbnQgd2l0aGluIHRoZSB0ZXh0IHRoZSBEYXRhdGlwIHNob3VsZCByZWxhdGUgdG8uXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgdGhlIHtEYXRhdGlwfSB0byBkaXNwbGF5IG9yIHtudWxsfSBpZiBubyBEYXRhdGlwIGlzIGF2YWlsYWJsZS5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBnZXREYXRhdGlwKFxuICAgIGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcG9pbnQ6IFBvaW50LFxuICApOiBQcm9taXNlPGF0b21JZGUuRGF0YXRpcCB8IG51bGw+IHtcbiAgICBjb25zdCBkb2N1bWVudFBvc2l0aW9uUGFyYW1zID0gQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKGVkaXRvciwgcG9pbnQpO1xuXG4gICAgY29uc3QgaG92ZXIgPSBhd2FpdCBjb25uZWN0aW9uLmhvdmVyKGRvY3VtZW50UG9zaXRpb25QYXJhbXMpO1xuICAgIGlmIChob3ZlciA9PSBudWxsIHx8IERhdGF0aXBBZGFwdGVyLmlzRW1wdHlIb3Zlcihob3ZlcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJhbmdlID1cbiAgICAgIGhvdmVyLnJhbmdlID09IG51bGwgPyBVdGlscy5nZXRXb3JkQXRQb3NpdGlvbihlZGl0b3IsIHBvaW50KSA6IENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKGhvdmVyLnJhbmdlKTtcblxuICAgIGNvbnN0IG1hcmtlZFN0cmluZ3MgPSAoQXJyYXkuaXNBcnJheShob3Zlci5jb250ZW50cykgPyBob3Zlci5jb250ZW50cyA6IFtob3Zlci5jb250ZW50c10pLm1hcCgoc3RyKSA9PlxuICAgICAgRGF0YXRpcEFkYXB0ZXIuY29udmVydE1hcmtlZFN0cmluZyhlZGl0b3IsIHN0ciksXG4gICAgKTtcblxuICAgIHJldHVybiB7IHJhbmdlLCBtYXJrZWRTdHJpbmdzIH07XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBpc0VtcHR5SG92ZXIoaG92ZXI6IEhvdmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGhvdmVyLmNvbnRlbnRzID09IG51bGwgfHxcbiAgICAgICh0eXBlb2YgaG92ZXIuY29udGVudHMgPT09ICdzdHJpbmcnICYmIGhvdmVyLmNvbnRlbnRzLmxlbmd0aCA9PT0gMCkgfHxcbiAgICAgIChBcnJheS5pc0FycmF5KGhvdmVyLmNvbnRlbnRzKSAmJlxuICAgICAgICAoaG92ZXIuY29udGVudHMubGVuZ3RoID09PSAwIHx8IGhvdmVyLmNvbnRlbnRzWzBdID09PSBcIlwiKSk7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBjb252ZXJ0TWFya2VkU3RyaW5nKFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBtYXJrZWRTdHJpbmc6IE1hcmtlZFN0cmluZyB8IE1hcmt1cENvbnRlbnQsXG4gICk6IGF0b21JZGUuTWFya2VkU3RyaW5nIHtcbiAgICBpZiAodHlwZW9mIG1hcmtlZFN0cmluZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiB7IHR5cGU6ICdtYXJrZG93bicsIHZhbHVlOiBtYXJrZWRTdHJpbmcgfTtcbiAgICB9XG5cbiAgICBpZiAoKG1hcmtlZFN0cmluZyBhcyBNYXJrdXBDb250ZW50KS5raW5kKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnbWFya2Rvd24nLFxuICAgICAgICB2YWx1ZTogbWFya2VkU3RyaW5nLnZhbHVlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBNdXN0IGNoZWNrIGFzIDx7bGFuZ3VhZ2U6IHN0cmluZ30+IHRvIGRpc2FtYmlndWF0ZSBiZXR3ZWVuXG4gICAgLy8gc3RyaW5nIGFuZCB0aGUgbW9yZSBleHBsaWNpdCBvYmplY3QgdHlwZSBiZWNhdXNlIE1hcmtlZFN0cmluZ1xuICAgIC8vIGlzIGEgdW5pb24gb2YgdGhlIHR3byB0eXBlc1xuICAgIGlmICgobWFya2VkU3RyaW5nIGFzIHsgbGFuZ3VhZ2U6IHN0cmluZyB9KS5sYW5ndWFnZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3NuaXBwZXQnLFxuICAgICAgICAvLyBUT0RPOiBmaW5kIGEgYmV0dGVyIG1hcHBpbmcgZnJvbSBsYW5ndWFnZSAtPiBncmFtbWFyXG4gICAgICAgIGdyYW1tYXI6XG4gICAgICAgICAgYXRvbS5ncmFtbWFycy5ncmFtbWFyRm9yU2NvcGVOYW1lKFxuICAgICAgICAgICAgYHNvdXJjZS4keyhtYXJrZWRTdHJpbmcgYXMgeyBsYW5ndWFnZTogc3RyaW5nIH0pLmxhbmd1YWdlfWApIHx8IGVkaXRvci5nZXRHcmFtbWFyKCksXG4gICAgICAgIHZhbHVlOiBtYXJrZWRTdHJpbmcudmFsdWUsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIENhdGNoLWFsbCBjYXNlXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hcmtkb3duJywgdmFsdWU6IG1hcmtlZFN0cmluZy50b1N0cmluZygpIH07XG4gIH1cbn1cbiJdfQ==