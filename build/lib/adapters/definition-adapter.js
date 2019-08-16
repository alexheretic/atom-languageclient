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
const atom_1 = require("atom");
/**
 * Public: Adapts the language server definition provider to the
 * Atom IDE UI Definitions package for 'Go To Definition' functionality.
 */
class DefinitionAdapter {
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing a definitionProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities) {
        return serverCapabilities.definitionProvider === true;
    }
    /**
     * Public: Get the definitions for a symbol at a given {Point} within a
     * {TextEditor} including optionally highlighting all other references
     * within the document if the langauge server also supports highlighting.
     *
     * @param connection A {LanguageClientConnection} to the language server that will provide definitions and highlights.
     * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
     * @param languageName The name of the programming language.
     * @param editor The Atom {TextEditor} containing the symbol and potential highlights.
     * @param point The Atom {Point} containing the position of the text that represents the symbol
     *   for which the definition and highlights should be provided.
     * @returns A {Promise} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    getDefinition(connection, serverCapabilities, languageName, editor, point) {
        return __awaiter(this, void 0, void 0, function* () {
            const documentPositionParams = convert_1.default.editorToTextDocumentPositionParams(editor, point);
            const definitionLocations = DefinitionAdapter.normalizeLocations(yield connection.gotoDefinition(documentPositionParams));
            if (definitionLocations == null || definitionLocations.length === 0) {
                return null;
            }
            let queryRange;
            if (serverCapabilities.documentHighlightProvider) {
                const highlights = yield connection.documentHighlight(documentPositionParams);
                if (highlights != null && highlights.length > 0) {
                    queryRange = highlights.map((h) => convert_1.default.lsRangeToAtomRange(h.range));
                }
            }
            return {
                queryRange: queryRange || [Utils.getWordAtPosition(editor, point)],
                definitions: DefinitionAdapter.convertLocationsToDefinitions(definitionLocations, languageName),
            };
        });
    }
    /**
     * Public: Normalize the locations so a single {Location} becomes an {Array} of just
     * one. The language server protocol return either as the protocol evolved between v1 and v2.
     *
     * @param locationResult Either a single {Location} object or an {Array} of {Locations}.
     * @returns An {Array} of {Location}s or {null} if the locationResult was null.
     */
    static normalizeLocations(locationResult) {
        if (locationResult == null) {
            return null;
        }
        return (Array.isArray(locationResult) ? locationResult : [locationResult]).filter((d) => d.range.start != null);
    }
    /**
     * Public: Convert an {Array} of {Location} objects into an Array of {Definition}s.
     *
     * @param locations An {Array} of {Location} objects to be converted.
     * @param languageName The name of the language these objects are written in.
     * @returns An {Array} of {Definition}s that represented the converted {Location}s.
     */
    static convertLocationsToDefinitions(locations, languageName) {
        return locations.map((d) => ({
            path: convert_1.default.uriToPath(d.uri),
            position: convert_1.default.positionToPoint(d.range.start),
            range: atom_1.Range.fromObject(convert_1.default.lsRangeToAtomRange(d.range)),
            language: languageName,
        }));
    }
}
exports.default = DefinitionAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbi1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2FkYXB0ZXJzL2RlZmluaXRpb24tYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQ0Esd0NBQWlDO0FBQ2pDLGtDQUFrQztBQU1sQywrQkFJYztBQUVkOzs7R0FHRztBQUNILE1BQXFCLGlCQUFpQjtJQUNwQzs7Ozs7OztPQU9HO0lBQ0ksTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBc0M7UUFDM0QsT0FBTyxrQkFBa0IsQ0FBQyxrQkFBa0IsS0FBSyxJQUFJLENBQUM7SUFDeEQsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7O09BYUc7SUFDVSxhQUFhLENBQ3hCLFVBQW9DLEVBQ3BDLGtCQUFzQyxFQUN0QyxZQUFvQixFQUNwQixNQUFrQixFQUNsQixLQUFZOztZQUVaLE1BQU0sc0JBQXNCLEdBQUcsaUJBQU8sQ0FBQyxrQ0FBa0MsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDekYsTUFBTSxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDOUQsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQ3hELENBQUM7WUFDRixJQUFJLG1CQUFtQixJQUFJLElBQUksSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNuRSxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxVQUFVLENBQUM7WUFDZixJQUFJLGtCQUFrQixDQUFDLHlCQUF5QixFQUFFO2dCQUNoRCxNQUFNLFVBQVUsR0FBRyxNQUFNLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUM5RSxJQUFJLFVBQVUsSUFBSSxJQUFJLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQy9DLFVBQVUsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2lCQUN6RTthQUNGO1lBRUQsT0FBTztnQkFDTCxVQUFVLEVBQUUsVUFBVSxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDbEUsV0FBVyxFQUFFLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLG1CQUFtQixFQUFFLFlBQVksQ0FBQzthQUNoRyxDQUFDO1FBQ0osQ0FBQztLQUFBO0lBRUQ7Ozs7OztPQU1HO0lBQ0ksTUFBTSxDQUFDLGtCQUFrQixDQUFDLGNBQXFDO1FBQ3BFLElBQUksY0FBYyxJQUFJLElBQUksRUFBRTtZQUMxQixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLENBQUM7SUFDbEgsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNJLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxTQUFxQixFQUFFLFlBQW9CO1FBQ3JGLE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMzQixJQUFJLEVBQUUsaUJBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUM5QixRQUFRLEVBQUUsaUJBQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDaEQsS0FBSyxFQUFFLFlBQUssQ0FBQyxVQUFVLENBQUMsaUJBQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUQsUUFBUSxFQUFFLFlBQVk7U0FDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0NBQ0Y7QUFyRkQsb0NBcUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXRvbUlkZSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7XG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgTG9jYXRpb24sXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbn0gZnJvbSAnLi4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IHtcbiAgUG9pbnQsXG4gIFRleHRFZGl0b3IsXG4gIFJhbmdlLFxufSBmcm9tICdhdG9tJztcblxuLyoqXG4gKiBQdWJsaWM6IEFkYXB0cyB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGRlZmluaXRpb24gcHJvdmlkZXIgdG8gdGhlXG4gKiBBdG9tIElERSBVSSBEZWZpbml0aW9ucyBwYWNrYWdlIGZvciAnR28gVG8gRGVmaW5pdGlvbicgZnVuY3Rpb25hbGl0eS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGVmaW5pdGlvbkFkYXB0ZXIge1xuICAvKipcbiAgICogUHVibGljOiBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGFkYXB0ZXIgY2FuIGJlIHVzZWQgdG8gYWRhcHQgYSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIHNlcnZlckNhcGFiaWxpdGllcyBtYXRyaXggY29udGFpbmluZyBhIGRlZmluaXRpb25Qcm92aWRlci5cbiAgICpcbiAgICogQHBhcmFtIHNlcnZlckNhcGFiaWxpdGllcyBUaGUge1NlcnZlckNhcGFiaWxpdGllc30gb2YgdGhlIGxhbmd1YWdlIHNlcnZlciB0byBjb25zaWRlci5cbiAgICogQHJldHVybnMgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyBhZGFwdGVyIGNhbiBhZGFwdCB0aGUgc2VydmVyIGJhc2VkIG9uIHRoZVxuICAgKiAgIGdpdmVuIHNlcnZlckNhcGFiaWxpdGllcy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY2FuQWRhcHQoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICByZXR1cm4gc2VydmVyQ2FwYWJpbGl0aWVzLmRlZmluaXRpb25Qcm92aWRlciA9PT0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEdldCB0aGUgZGVmaW5pdGlvbnMgZm9yIGEgc3ltYm9sIGF0IGEgZ2l2ZW4ge1BvaW50fSB3aXRoaW4gYVxuICAgKiB7VGV4dEVkaXRvcn0gaW5jbHVkaW5nIG9wdGlvbmFsbHkgaGlnaGxpZ2h0aW5nIGFsbCBvdGhlciByZWZlcmVuY2VzXG4gICAqIHdpdGhpbiB0aGUgZG9jdW1lbnQgaWYgdGhlIGxhbmdhdWdlIHNlcnZlciBhbHNvIHN1cHBvcnRzIGhpZ2hsaWdodGluZy5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBwcm92aWRlIGRlZmluaXRpb25zIGFuZCBoaWdobGlnaHRzLlxuICAgKiBAcGFyYW0gc2VydmVyQ2FwYWJpbGl0aWVzIFRoZSB7U2VydmVyQ2FwYWJpbGl0aWVzfSBvZiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBiZSB1c2VkLlxuICAgKiBAcGFyYW0gbGFuZ3VhZ2VOYW1lIFRoZSBuYW1lIG9mIHRoZSBwcm9ncmFtbWluZyBsYW5ndWFnZS5cbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgc3ltYm9sIGFuZCBwb3RlbnRpYWwgaGlnaGxpZ2h0cy5cbiAgICogQHBhcmFtIHBvaW50IFRoZSBBdG9tIHtQb2ludH0gY29udGFpbmluZyB0aGUgcG9zaXRpb24gb2YgdGhlIHRleHQgdGhhdCByZXByZXNlbnRzIHRoZSBzeW1ib2xcbiAgICogICBmb3Igd2hpY2ggdGhlIGRlZmluaXRpb24gYW5kIGhpZ2hsaWdodHMgc2hvdWxkIGJlIHByb3ZpZGVkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBpbmRpY2F0aW5nIGFkYXB0ZXIgY2FuIGFkYXB0IHRoZSBzZXJ2ZXIgYmFzZWQgb24gdGhlXG4gICAqICAgZ2l2ZW4gc2VydmVyQ2FwYWJpbGl0aWVzLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdldERlZmluaXRpb24oXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzLFxuICAgIGxhbmd1YWdlTmFtZTogc3RyaW5nLFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBwb2ludDogUG9pbnQsXG4gICk6IFByb21pc2U8YXRvbUlkZS5EZWZpbml0aW9uUXVlcnlSZXN1bHQgfCBudWxsPiB7XG4gICAgY29uc3QgZG9jdW1lbnRQb3NpdGlvblBhcmFtcyA9IENvbnZlcnQuZWRpdG9yVG9UZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyhlZGl0b3IsIHBvaW50KTtcbiAgICBjb25zdCBkZWZpbml0aW9uTG9jYXRpb25zID0gRGVmaW5pdGlvbkFkYXB0ZXIubm9ybWFsaXplTG9jYXRpb25zKFxuICAgICAgYXdhaXQgY29ubmVjdGlvbi5nb3RvRGVmaW5pdGlvbihkb2N1bWVudFBvc2l0aW9uUGFyYW1zKSxcbiAgICApO1xuICAgIGlmIChkZWZpbml0aW9uTG9jYXRpb25zID09IG51bGwgfHwgZGVmaW5pdGlvbkxvY2F0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCBxdWVyeVJhbmdlO1xuICAgIGlmIChzZXJ2ZXJDYXBhYmlsaXRpZXMuZG9jdW1lbnRIaWdobGlnaHRQcm92aWRlcikge1xuICAgICAgY29uc3QgaGlnaGxpZ2h0cyA9IGF3YWl0IGNvbm5lY3Rpb24uZG9jdW1lbnRIaWdobGlnaHQoZG9jdW1lbnRQb3NpdGlvblBhcmFtcyk7XG4gICAgICBpZiAoaGlnaGxpZ2h0cyAhPSBudWxsICYmIGhpZ2hsaWdodHMubGVuZ3RoID4gMCkge1xuICAgICAgICBxdWVyeVJhbmdlID0gaGlnaGxpZ2h0cy5tYXAoKGgpID0+IENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKGgucmFuZ2UpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcXVlcnlSYW5nZTogcXVlcnlSYW5nZSB8fCBbVXRpbHMuZ2V0V29yZEF0UG9zaXRpb24oZWRpdG9yLCBwb2ludCldLFxuICAgICAgZGVmaW5pdGlvbnM6IERlZmluaXRpb25BZGFwdGVyLmNvbnZlcnRMb2NhdGlvbnNUb0RlZmluaXRpb25zKGRlZmluaXRpb25Mb2NhdGlvbnMsIGxhbmd1YWdlTmFtZSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IE5vcm1hbGl6ZSB0aGUgbG9jYXRpb25zIHNvIGEgc2luZ2xlIHtMb2NhdGlvbn0gYmVjb21lcyBhbiB7QXJyYXl9IG9mIGp1c3RcbiAgICogb25lLiBUaGUgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIHJldHVybiBlaXRoZXIgYXMgdGhlIHByb3RvY29sIGV2b2x2ZWQgYmV0d2VlbiB2MSBhbmQgdjIuXG4gICAqXG4gICAqIEBwYXJhbSBsb2NhdGlvblJlc3VsdCBFaXRoZXIgYSBzaW5nbGUge0xvY2F0aW9ufSBvYmplY3Qgb3IgYW4ge0FycmF5fSBvZiB7TG9jYXRpb25zfS5cbiAgICogQHJldHVybnMgQW4ge0FycmF5fSBvZiB7TG9jYXRpb259cyBvciB7bnVsbH0gaWYgdGhlIGxvY2F0aW9uUmVzdWx0IHdhcyBudWxsLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBub3JtYWxpemVMb2NhdGlvbnMobG9jYXRpb25SZXN1bHQ6IExvY2F0aW9uIHwgTG9jYXRpb25bXSk6IExvY2F0aW9uW10gfCBudWxsIHtcbiAgICBpZiAobG9jYXRpb25SZXN1bHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiAoQXJyYXkuaXNBcnJheShsb2NhdGlvblJlc3VsdCkgPyBsb2NhdGlvblJlc3VsdCA6IFtsb2NhdGlvblJlc3VsdF0pLmZpbHRlcigoZCkgPT4gZC5yYW5nZS5zdGFydCAhPSBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYW4ge0FycmF5fSBvZiB7TG9jYXRpb259IG9iamVjdHMgaW50byBhbiBBcnJheSBvZiB7RGVmaW5pdGlvbn1zLlxuICAgKlxuICAgKiBAcGFyYW0gbG9jYXRpb25zIEFuIHtBcnJheX0gb2Yge0xvY2F0aW9ufSBvYmplY3RzIHRvIGJlIGNvbnZlcnRlZC5cbiAgICogQHBhcmFtIGxhbmd1YWdlTmFtZSBUaGUgbmFtZSBvZiB0aGUgbGFuZ3VhZ2UgdGhlc2Ugb2JqZWN0cyBhcmUgd3JpdHRlbiBpbi5cbiAgICogQHJldHVybnMgQW4ge0FycmF5fSBvZiB7RGVmaW5pdGlvbn1zIHRoYXQgcmVwcmVzZW50ZWQgdGhlIGNvbnZlcnRlZCB7TG9jYXRpb259cy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY29udmVydExvY2F0aW9uc1RvRGVmaW5pdGlvbnMobG9jYXRpb25zOiBMb2NhdGlvbltdLCBsYW5ndWFnZU5hbWU6IHN0cmluZyk6IGF0b21JZGUuRGVmaW5pdGlvbltdIHtcbiAgICByZXR1cm4gbG9jYXRpb25zLm1hcCgoZCkgPT4gKHtcbiAgICAgIHBhdGg6IENvbnZlcnQudXJpVG9QYXRoKGQudXJpKSxcbiAgICAgIHBvc2l0aW9uOiBDb252ZXJ0LnBvc2l0aW9uVG9Qb2ludChkLnJhbmdlLnN0YXJ0KSxcbiAgICAgIHJhbmdlOiBSYW5nZS5mcm9tT2JqZWN0KENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKGQucmFuZ2UpKSxcbiAgICAgIGxhbmd1YWdlOiBsYW5ndWFnZU5hbWUsXG4gICAgfSkpO1xuICB9XG59XG4iXX0=