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
        return !!serverCapabilities.definitionProvider;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbi1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2FkYXB0ZXJzL2RlZmluaXRpb24tYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUNBLHdDQUFpQztBQUNqQyxrQ0FBa0M7QUFNbEMsK0JBSWM7QUFFZDs7O0dBR0c7QUFDSCxNQUFxQixpQkFBaUI7SUFDcEM7Ozs7Ozs7T0FPRztJQUNJLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDO0lBQ2pELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7OztPQWFHO0lBQ1UsYUFBYSxDQUN4QixVQUFvQyxFQUNwQyxrQkFBc0MsRUFDdEMsWUFBb0IsRUFDcEIsTUFBa0IsRUFDbEIsS0FBWTs7WUFFWixNQUFNLHNCQUFzQixHQUFHLGlCQUFPLENBQUMsa0NBQWtDLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pGLE1BQU0sbUJBQW1CLEdBQUcsaUJBQWlCLENBQUMsa0JBQWtCLENBQzlELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUN4RCxDQUFDO1lBQ0YsSUFBSSxtQkFBbUIsSUFBSSxJQUFJLElBQUksbUJBQW1CLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDbkUsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQUksVUFBVSxDQUFDO1lBQ2YsSUFBSSxrQkFBa0IsQ0FBQyx5QkFBeUIsRUFBRTtnQkFDaEQsTUFBTSxVQUFVLEdBQUcsTUFBTSxVQUFVLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztnQkFDOUUsSUFBSSxVQUFVLElBQUksSUFBSSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO29CQUMvQyxVQUFVLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsaUJBQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztpQkFDekU7YUFDRjtZQUVELE9BQU87Z0JBQ0wsVUFBVSxFQUFFLFVBQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2xFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUM7YUFDaEcsQ0FBQztRQUNKLENBQUM7S0FBQTtJQUVEOzs7Ozs7T0FNRztJQUNJLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxjQUFxQztRQUNwRSxJQUFJLGNBQWMsSUFBSSxJQUFJLEVBQUU7WUFDMUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQ2xILENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxNQUFNLENBQUMsNkJBQTZCLENBQUMsU0FBcUIsRUFBRSxZQUFvQjtRQUNyRixPQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDM0IsSUFBSSxFQUFFLGlCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDOUIsUUFBUSxFQUFFLGlCQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ2hELEtBQUssRUFBRSxZQUFLLENBQUMsVUFBVSxDQUFDLGlCQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzVELFFBQVEsRUFBRSxZQUFZO1NBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUNGO0FBckZELG9DQXFGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGF0b21JZGUgZnJvbSAnYXRvbS1pZGUnO1xuaW1wb3J0IENvbnZlcnQgZnJvbSAnLi4vY29udmVydCc7XG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gIExvY2F0aW9uLFxuICBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG59IGZyb20gJy4uL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCB7XG4gIFBvaW50LFxuICBUZXh0RWRpdG9yLFxuICBSYW5nZSxcbn0gZnJvbSAnYXRvbSc7XG5cbi8qKlxuICogUHVibGljOiBBZGFwdHMgdGhlIGxhbmd1YWdlIHNlcnZlciBkZWZpbml0aW9uIHByb3ZpZGVyIHRvIHRoZVxuICogQXRvbSBJREUgVUkgRGVmaW5pdGlvbnMgcGFja2FnZSBmb3IgJ0dvIFRvIERlZmluaXRpb24nIGZ1bmN0aW9uYWxpdHkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERlZmluaXRpb25BZGFwdGVyIHtcbiAgLyoqXG4gICAqIFB1YmxpYzogRGV0ZXJtaW5lIHdoZXRoZXIgdGhpcyBhZGFwdGVyIGNhbiBiZSB1c2VkIHRvIGFkYXB0IGEgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqIGJhc2VkIG9uIHRoZSBzZXJ2ZXJDYXBhYmlsaXRpZXMgbWF0cml4IGNvbnRhaW5pbmcgYSBkZWZpbml0aW9uUHJvdmlkZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzZXJ2ZXJDYXBhYmlsaXRpZXMgVGhlIHtTZXJ2ZXJDYXBhYmlsaXRpZXN9IG9mIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdG8gY29uc2lkZXIuXG4gICAqIEByZXR1cm5zIEEge0Jvb2xlYW59IGluZGljYXRpbmcgYWRhcHRlciBjYW4gYWRhcHQgdGhlIHNlcnZlciBiYXNlZCBvbiB0aGVcbiAgICogICBnaXZlbiBzZXJ2ZXJDYXBhYmlsaXRpZXMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNhbkFkYXB0KHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhc2VydmVyQ2FwYWJpbGl0aWVzLmRlZmluaXRpb25Qcm92aWRlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEdldCB0aGUgZGVmaW5pdGlvbnMgZm9yIGEgc3ltYm9sIGF0IGEgZ2l2ZW4ge1BvaW50fSB3aXRoaW4gYVxuICAgKiB7VGV4dEVkaXRvcn0gaW5jbHVkaW5nIG9wdGlvbmFsbHkgaGlnaGxpZ2h0aW5nIGFsbCBvdGhlciByZWZlcmVuY2VzXG4gICAqIHdpdGhpbiB0aGUgZG9jdW1lbnQgaWYgdGhlIGxhbmdhdWdlIHNlcnZlciBhbHNvIHN1cHBvcnRzIGhpZ2hsaWdodGluZy5cbiAgICpcbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gQSB7TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9ufSB0byB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBwcm92aWRlIGRlZmluaXRpb25zIGFuZCBoaWdobGlnaHRzLlxuICAgKiBAcGFyYW0gc2VydmVyQ2FwYWJpbGl0aWVzIFRoZSB7U2VydmVyQ2FwYWJpbGl0aWVzfSBvZiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBiZSB1c2VkLlxuICAgKiBAcGFyYW0gbGFuZ3VhZ2VOYW1lIFRoZSBuYW1lIG9mIHRoZSBwcm9ncmFtbWluZyBsYW5ndWFnZS5cbiAgICogQHBhcmFtIGVkaXRvciBUaGUgQXRvbSB7VGV4dEVkaXRvcn0gY29udGFpbmluZyB0aGUgc3ltYm9sIGFuZCBwb3RlbnRpYWwgaGlnaGxpZ2h0cy5cbiAgICogQHBhcmFtIHBvaW50IFRoZSBBdG9tIHtQb2ludH0gY29udGFpbmluZyB0aGUgcG9zaXRpb24gb2YgdGhlIHRleHQgdGhhdCByZXByZXNlbnRzIHRoZSBzeW1ib2xcbiAgICogICBmb3Igd2hpY2ggdGhlIGRlZmluaXRpb24gYW5kIGhpZ2hsaWdodHMgc2hvdWxkIGJlIHByb3ZpZGVkLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBpbmRpY2F0aW5nIGFkYXB0ZXIgY2FuIGFkYXB0IHRoZSBzZXJ2ZXIgYmFzZWQgb24gdGhlXG4gICAqICAgZ2l2ZW4gc2VydmVyQ2FwYWJpbGl0aWVzLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdldERlZmluaXRpb24oXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzLFxuICAgIGxhbmd1YWdlTmFtZTogc3RyaW5nLFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBwb2ludDogUG9pbnQsXG4gICk6IFByb21pc2U8YXRvbUlkZS5EZWZpbml0aW9uUXVlcnlSZXN1bHQgfCBudWxsPiB7XG4gICAgY29uc3QgZG9jdW1lbnRQb3NpdGlvblBhcmFtcyA9IENvbnZlcnQuZWRpdG9yVG9UZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyhlZGl0b3IsIHBvaW50KTtcbiAgICBjb25zdCBkZWZpbml0aW9uTG9jYXRpb25zID0gRGVmaW5pdGlvbkFkYXB0ZXIubm9ybWFsaXplTG9jYXRpb25zKFxuICAgICAgYXdhaXQgY29ubmVjdGlvbi5nb3RvRGVmaW5pdGlvbihkb2N1bWVudFBvc2l0aW9uUGFyYW1zKSxcbiAgICApO1xuICAgIGlmIChkZWZpbml0aW9uTG9jYXRpb25zID09IG51bGwgfHwgZGVmaW5pdGlvbkxvY2F0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCBxdWVyeVJhbmdlO1xuICAgIGlmIChzZXJ2ZXJDYXBhYmlsaXRpZXMuZG9jdW1lbnRIaWdobGlnaHRQcm92aWRlcikge1xuICAgICAgY29uc3QgaGlnaGxpZ2h0cyA9IGF3YWl0IGNvbm5lY3Rpb24uZG9jdW1lbnRIaWdobGlnaHQoZG9jdW1lbnRQb3NpdGlvblBhcmFtcyk7XG4gICAgICBpZiAoaGlnaGxpZ2h0cyAhPSBudWxsICYmIGhpZ2hsaWdodHMubGVuZ3RoID4gMCkge1xuICAgICAgICBxdWVyeVJhbmdlID0gaGlnaGxpZ2h0cy5tYXAoKGgpID0+IENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKGgucmFuZ2UpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcXVlcnlSYW5nZTogcXVlcnlSYW5nZSB8fCBbVXRpbHMuZ2V0V29yZEF0UG9zaXRpb24oZWRpdG9yLCBwb2ludCldLFxuICAgICAgZGVmaW5pdGlvbnM6IERlZmluaXRpb25BZGFwdGVyLmNvbnZlcnRMb2NhdGlvbnNUb0RlZmluaXRpb25zKGRlZmluaXRpb25Mb2NhdGlvbnMsIGxhbmd1YWdlTmFtZSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IE5vcm1hbGl6ZSB0aGUgbG9jYXRpb25zIHNvIGEgc2luZ2xlIHtMb2NhdGlvbn0gYmVjb21lcyBhbiB7QXJyYXl9IG9mIGp1c3RcbiAgICogb25lLiBUaGUgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIHJldHVybiBlaXRoZXIgYXMgdGhlIHByb3RvY29sIGV2b2x2ZWQgYmV0d2VlbiB2MSBhbmQgdjIuXG4gICAqXG4gICAqIEBwYXJhbSBsb2NhdGlvblJlc3VsdCBFaXRoZXIgYSBzaW5nbGUge0xvY2F0aW9ufSBvYmplY3Qgb3IgYW4ge0FycmF5fSBvZiB7TG9jYXRpb25zfS5cbiAgICogQHJldHVybnMgQW4ge0FycmF5fSBvZiB7TG9jYXRpb259cyBvciB7bnVsbH0gaWYgdGhlIGxvY2F0aW9uUmVzdWx0IHdhcyBudWxsLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBub3JtYWxpemVMb2NhdGlvbnMobG9jYXRpb25SZXN1bHQ6IExvY2F0aW9uIHwgTG9jYXRpb25bXSk6IExvY2F0aW9uW10gfCBudWxsIHtcbiAgICBpZiAobG9jYXRpb25SZXN1bHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiAoQXJyYXkuaXNBcnJheShsb2NhdGlvblJlc3VsdCkgPyBsb2NhdGlvblJlc3VsdCA6IFtsb2NhdGlvblJlc3VsdF0pLmZpbHRlcigoZCkgPT4gZC5yYW5nZS5zdGFydCAhPSBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYW4ge0FycmF5fSBvZiB7TG9jYXRpb259IG9iamVjdHMgaW50byBhbiBBcnJheSBvZiB7RGVmaW5pdGlvbn1zLlxuICAgKlxuICAgKiBAcGFyYW0gbG9jYXRpb25zIEFuIHtBcnJheX0gb2Yge0xvY2F0aW9ufSBvYmplY3RzIHRvIGJlIGNvbnZlcnRlZC5cbiAgICogQHBhcmFtIGxhbmd1YWdlTmFtZSBUaGUgbmFtZSBvZiB0aGUgbGFuZ3VhZ2UgdGhlc2Ugb2JqZWN0cyBhcmUgd3JpdHRlbiBpbi5cbiAgICogQHJldHVybnMgQW4ge0FycmF5fSBvZiB7RGVmaW5pdGlvbn1zIHRoYXQgcmVwcmVzZW50ZWQgdGhlIGNvbnZlcnRlZCB7TG9jYXRpb259cy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY29udmVydExvY2F0aW9uc1RvRGVmaW5pdGlvbnMobG9jYXRpb25zOiBMb2NhdGlvbltdLCBsYW5ndWFnZU5hbWU6IHN0cmluZyk6IGF0b21JZGUuRGVmaW5pdGlvbltdIHtcbiAgICByZXR1cm4gbG9jYXRpb25zLm1hcCgoZCkgPT4gKHtcbiAgICAgIHBhdGg6IENvbnZlcnQudXJpVG9QYXRoKGQudXJpKSxcbiAgICAgIHBvc2l0aW9uOiBDb252ZXJ0LnBvc2l0aW9uVG9Qb2ludChkLnJhbmdlLnN0YXJ0KSxcbiAgICAgIHJhbmdlOiBSYW5nZS5mcm9tT2JqZWN0KENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKGQucmFuZ2UpKSxcbiAgICAgIGxhbmd1YWdlOiBsYW5ndWFnZU5hbWUsXG4gICAgfSkpO1xuICB9XG59XG4iXX0=