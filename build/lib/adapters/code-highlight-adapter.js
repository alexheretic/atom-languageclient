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
const assert = require("assert");
const convert_1 = require("../convert");
class CodeHighlightAdapter {
    /**
     * @returns A {Boolean} indicating this adapter can adapt the server based on the
     * given serverCapabilities.
     */
    static canAdapt(serverCapabilities) {
        return !!serverCapabilities.documentHighlightProvider;
    }
    /**
     * Public: Creates highlight markers for a given editor position.
     * Throws an error if documentHighlightProvider is not a registered capability.
     *
     * @param connection A {LanguageClientConnection} to the language server that provides highlights.
     * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
     * @param editor The Atom {TextEditor} containing the text to be highlighted.
     * @param position The Atom {Point} to fetch highlights for.
     * @returns A {Promise} of an {Array} of {Range}s to be turned into highlights.
     */
    static highlight(connection, serverCapabilities, editor, position) {
        return __awaiter(this, void 0, void 0, function* () {
            assert(serverCapabilities.documentHighlightProvider, 'Must have the documentHighlight capability');
            const highlights = yield connection.documentHighlight(convert_1.default.editorToTextDocumentPositionParams(editor, position));
            return highlights.map((highlight) => {
                return convert_1.default.lsRangeToAtomRange(highlight.range);
            });
        });
    }
}
exports.default = CodeHighlightAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1oaWdobGlnaHQtYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9hZGFwdGVycy9jb2RlLWhpZ2hsaWdodC1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWtDO0FBQ2xDLHdDQUFpQztBQVdqQyxNQUFxQixvQkFBb0I7SUFDdkM7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBc0M7UUFDM0QsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMseUJBQXlCLENBQUM7SUFDeEQsQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNJLE1BQU0sQ0FBTyxTQUFTLENBQzNCLFVBQW9DLEVBQ3BDLGtCQUFzQyxFQUN0QyxNQUFrQixFQUNsQixRQUFlOztZQUVmLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyx5QkFBeUIsRUFBRSw0Q0FBNEMsQ0FBQyxDQUFDO1lBQ25HLE1BQU0sVUFBVSxHQUFHLE1BQU0sVUFBVSxDQUFDLGlCQUFpQixDQUFDLGlCQUFPLENBQUMsa0NBQWtDLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDcEgsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7Z0JBQ2xDLE9BQU8saUJBQU8sQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0tBQUE7Q0FDRjtBQS9CRCx1Q0ErQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0Jyk7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCB7XG4gIFBvaW50LFxuICBUZXh0RWRpdG9yLFxuICBSYW5nZSxcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQge1xuICBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbn0gZnJvbSAnLi4vbGFuZ3VhZ2VjbGllbnQnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb2RlSGlnaGxpZ2h0QWRhcHRlciB7XG4gIC8qKlxuICAgKiBAcmV0dXJucyBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHRoaXMgYWRhcHRlciBjYW4gYWRhcHQgdGhlIHNlcnZlciBiYXNlZCBvbiB0aGVcbiAgICogZ2l2ZW4gc2VydmVyQ2FwYWJpbGl0aWVzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjYW5BZGFwdChzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXNlcnZlckNhcGFiaWxpdGllcy5kb2N1bWVudEhpZ2hsaWdodFByb3ZpZGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlcyBoaWdobGlnaHQgbWFya2VycyBmb3IgYSBnaXZlbiBlZGl0b3IgcG9zaXRpb24uXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiBkb2N1bWVudEhpZ2hsaWdodFByb3ZpZGVyIGlzIG5vdCBhIHJlZ2lzdGVyZWQgY2FwYWJpbGl0eS5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgcHJvdmlkZXMgaGlnaGxpZ2h0cy5cbiAgICogQHBhcmFtIHNlcnZlckNhcGFiaWxpdGllcyBUaGUge1NlcnZlckNhcGFiaWxpdGllc30gb2YgdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0IHdpbGwgYmUgdXNlZC5cbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgdGV4dCB0byBiZSBoaWdobGlnaHRlZC5cbiAgICogQHBhcmFtIHBvc2l0aW9uIFRoZSBBdG9tIHtQb2ludH0gdG8gZmV0Y2ggaGlnaGxpZ2h0cyBmb3IuXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IG9mIGFuIHtBcnJheX0gb2Yge1JhbmdlfXMgdG8gYmUgdHVybmVkIGludG8gaGlnaGxpZ2h0cy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgaGlnaGxpZ2h0KFxuICAgIGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgICBzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyxcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcG9zaXRpb246IFBvaW50LFxuICApOiBQcm9taXNlPFJhbmdlW10gfCBudWxsPiB7XG4gICAgYXNzZXJ0KHNlcnZlckNhcGFiaWxpdGllcy5kb2N1bWVudEhpZ2hsaWdodFByb3ZpZGVyLCAnTXVzdCBoYXZlIHRoZSBkb2N1bWVudEhpZ2hsaWdodCBjYXBhYmlsaXR5Jyk7XG4gICAgY29uc3QgaGlnaGxpZ2h0cyA9IGF3YWl0IGNvbm5lY3Rpb24uZG9jdW1lbnRIaWdobGlnaHQoQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKGVkaXRvciwgcG9zaXRpb24pKTtcbiAgICByZXR1cm4gaGlnaGxpZ2h0cy5tYXAoKGhpZ2hsaWdodCkgPT4ge1xuICAgICAgcmV0dXJuIENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKGhpZ2hsaWdodC5yYW5nZSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==