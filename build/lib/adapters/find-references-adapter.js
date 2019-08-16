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
 * Public: Adapts the language server definition provider to the
 * Atom IDE UI Definitions package for 'Go To Definition' functionality.
 */
class FindReferencesAdapter {
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing a referencesProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities) {
        return serverCapabilities.referencesProvider === true;
    }
    /**
     * Public: Get the references for a specific symbol within the document as represented by
     * the {TextEditor} and {Point} within it via the language server.
     *
     * @param connection A {LanguageClientConnection} to the language server that will be queried
     *   for the references.
     * @param editor The Atom {TextEditor} containing the text the references should relate to.
     * @param point The Atom {Point} containing the point within the text the references should relate to.
     * @returns A {Promise} containing a {FindReferencesReturn} with all the references the language server
     *   could find.
     */
    getReferences(connection, editor, point, projectRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            const locations = yield connection.findReferences(FindReferencesAdapter.createReferenceParams(editor, point));
            if (locations == null) {
                return null;
            }
            const references = locations.map(FindReferencesAdapter.locationToReference);
            return {
                type: 'data',
                baseUri: projectRoot || '',
                referencedSymbolName: FindReferencesAdapter.getReferencedSymbolName(editor, point, references),
                references,
            };
        });
    }
    /**
     * Public: Create a {ReferenceParams} from a given {TextEditor} for a specific {Point}.
     *
     * @param editor A {TextEditor} that represents the document.
     * @param point A {Point} within the document.
     * @returns A {ReferenceParams} built from the given parameters.
     */
    static createReferenceParams(editor, point) {
        return {
            textDocument: convert_1.default.editorToTextDocumentIdentifier(editor),
            position: convert_1.default.pointToPosition(point),
            context: { includeDeclaration: true },
        };
    }
    /**
     * Public: Convert a {Location} into a {Reference}.
     *
     * @param location A {Location} to convert.
     * @returns A {Reference} equivalent to the given {Location}.
     */
    static locationToReference(location) {
        return {
            uri: convert_1.default.uriToPath(location.uri),
            name: null,
            range: convert_1.default.lsRangeToAtomRange(location.range),
        };
    }
    /** Public: Get a symbol name from a {TextEditor} for a specific {Point} in the document. */
    static getReferencedSymbolName(editor, point, references) {
        if (references.length === 0) {
            return '';
        }
        const currentReference = references.find((r) => r.range.containsPoint(point)) || references[0];
        return editor.getBuffer().getTextInRange(currentReference.range);
    }
}
exports.default = FindReferencesAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvZmluZC1yZWZlcmVuY2VzLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUNBLHdDQUFpQztBQVlqQzs7O0dBR0c7QUFDSCxNQUFxQixxQkFBcUI7SUFDeEM7Ozs7Ozs7T0FPRztJQUNJLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sa0JBQWtCLENBQUMsa0JBQWtCLEtBQUssSUFBSSxDQUFDO0lBQ3hELENBQUM7SUFFRDs7Ozs7Ozs7OztPQVVHO0lBQ1UsYUFBYSxDQUN4QixVQUFvQyxFQUNwQyxNQUFrQixFQUNsQixLQUFZLEVBQ1osV0FBMEI7O1lBRTFCLE1BQU0sU0FBUyxHQUFHLE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FDL0MscUJBQXFCLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUMzRCxDQUFDO1lBQ0YsSUFBSSxTQUFTLElBQUksSUFBSSxFQUFFO2dCQUNyQixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsTUFBTSxVQUFVLEdBQXdCLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNqRyxPQUFPO2dCQUNMLElBQUksRUFBRSxNQUFNO2dCQUNaLE9BQU8sRUFBRSxXQUFXLElBQUksRUFBRTtnQkFDMUIsb0JBQW9CLEVBQUUscUJBQXFCLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUM7Z0JBQzlGLFVBQVU7YUFDWCxDQUFDO1FBQ0osQ0FBQztLQUFBO0lBRUQ7Ozs7OztPQU1HO0lBQ0ksTUFBTSxDQUFDLHFCQUFxQixDQUFDLE1BQWtCLEVBQUUsS0FBWTtRQUNsRSxPQUFPO1lBQ0wsWUFBWSxFQUFFLGlCQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxDQUFDO1lBQzVELFFBQVEsRUFBRSxpQkFBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7WUFDeEMsT0FBTyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFO1NBQ3RDLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBa0I7UUFDbEQsT0FBTztZQUNMLEdBQUcsRUFBRSxpQkFBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1lBQ3BDLElBQUksRUFBRSxJQUFJO1lBQ1YsS0FBSyxFQUFFLGlCQUFPLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztTQUNsRCxDQUFDO0lBQ0osQ0FBQztJQUVELDRGQUE0RjtJQUNyRixNQUFNLENBQUMsdUJBQXVCLENBQ25DLE1BQWtCLEVBQ2xCLEtBQVksRUFDWixVQUErQjtRQUUvQixJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzNCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFDRCxNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9GLE9BQU8sTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuRSxDQUFDO0NBQ0Y7QUF2RkQsd0NBdUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXRvbUlkZSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCB7XG4gIFBvaW50LFxuICBUZXh0RWRpdG9yLFxufSBmcm9tICdhdG9tJztcbmltcG9ydCB7XG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgTG9jYXRpb24sXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbiAgUmVmZXJlbmNlUGFyYW1zLFxufSBmcm9tICcuLi9sYW5ndWFnZWNsaWVudCc7XG5cbi8qKlxuICogUHVibGljOiBBZGFwdHMgdGhlIGxhbmd1YWdlIHNlcnZlciBkZWZpbml0aW9uIHByb3ZpZGVyIHRvIHRoZVxuICogQXRvbSBJREUgVUkgRGVmaW5pdGlvbnMgcGFja2FnZSBmb3IgJ0dvIFRvIERlZmluaXRpb24nIGZ1bmN0aW9uYWxpdHkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbmRSZWZlcmVuY2VzQWRhcHRlciB7XG4gIC8qKlxuICAgKiBQdWJsaWM6IERldGVybWluZSB3aGV0aGVyIHRoaXMgYWRhcHRlciBjYW4gYmUgdXNlZCB0byBhZGFwdCBhIGxhbmd1YWdlIHNlcnZlclxuICAgKiBiYXNlZCBvbiB0aGUgc2VydmVyQ2FwYWJpbGl0aWVzIG1hdHJpeCBjb250YWluaW5nIGEgcmVmZXJlbmNlc1Byb3ZpZGVyLlxuICAgKlxuICAgKiBAcGFyYW0gc2VydmVyQ2FwYWJpbGl0aWVzIFRoZSB7U2VydmVyQ2FwYWJpbGl0aWVzfSBvZiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRvIGNvbnNpZGVyLlxuICAgKiBAcmV0dXJucyBBIHtCb29sZWFufSBpbmRpY2F0aW5nIGFkYXB0ZXIgY2FuIGFkYXB0IHRoZSBzZXJ2ZXIgYmFzZWQgb24gdGhlXG4gICAqICAgZ2l2ZW4gc2VydmVyQ2FwYWJpbGl0aWVzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjYW5BZGFwdChzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBzZXJ2ZXJDYXBhYmlsaXRpZXMucmVmZXJlbmNlc1Byb3ZpZGVyID09PSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogR2V0IHRoZSByZWZlcmVuY2VzIGZvciBhIHNwZWNpZmljIHN5bWJvbCB3aXRoaW4gdGhlIGRvY3VtZW50IGFzIHJlcHJlc2VudGVkIGJ5XG4gICAqIHRoZSB7VGV4dEVkaXRvcn0gYW5kIHtQb2ludH0gd2l0aGluIGl0IHZpYSB0aGUgbGFuZ3VhZ2Ugc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIGJlIHF1ZXJpZWRcbiAgICogICBmb3IgdGhlIHJlZmVyZW5jZXMuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIHRleHQgdGhlIHJlZmVyZW5jZXMgc2hvdWxkIHJlbGF0ZSB0by5cbiAgICogQHBhcmFtIHBvaW50IFRoZSBBdG9tIHtQb2ludH0gY29udGFpbmluZyB0aGUgcG9pbnQgd2l0aGluIHRoZSB0ZXh0IHRoZSByZWZlcmVuY2VzIHNob3VsZCByZWxhdGUgdG8uXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYSB7RmluZFJlZmVyZW5jZXNSZXR1cm59IHdpdGggYWxsIHRoZSByZWZlcmVuY2VzIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogICBjb3VsZCBmaW5kLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdldFJlZmVyZW5jZXMoXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBwb2ludDogUG9pbnQsXG4gICAgcHJvamVjdFJvb3Q6IHN0cmluZyB8IG51bGwsXG4gICk6IFByb21pc2U8YXRvbUlkZS5GaW5kUmVmZXJlbmNlc1JldHVybiB8IG51bGw+IHtcbiAgICBjb25zdCBsb2NhdGlvbnMgPSBhd2FpdCBjb25uZWN0aW9uLmZpbmRSZWZlcmVuY2VzKFxuICAgICAgRmluZFJlZmVyZW5jZXNBZGFwdGVyLmNyZWF0ZVJlZmVyZW5jZVBhcmFtcyhlZGl0b3IsIHBvaW50KSxcbiAgICApO1xuICAgIGlmIChsb2NhdGlvbnMgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcmVmZXJlbmNlczogYXRvbUlkZS5SZWZlcmVuY2VbXSA9IGxvY2F0aW9ucy5tYXAoRmluZFJlZmVyZW5jZXNBZGFwdGVyLmxvY2F0aW9uVG9SZWZlcmVuY2UpO1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnZGF0YScsXG4gICAgICBiYXNlVXJpOiBwcm9qZWN0Um9vdCB8fCAnJyxcbiAgICAgIHJlZmVyZW5jZWRTeW1ib2xOYW1lOiBGaW5kUmVmZXJlbmNlc0FkYXB0ZXIuZ2V0UmVmZXJlbmNlZFN5bWJvbE5hbWUoZWRpdG9yLCBwb2ludCwgcmVmZXJlbmNlcyksXG4gICAgICByZWZlcmVuY2VzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUgYSB7UmVmZXJlbmNlUGFyYW1zfSBmcm9tIGEgZ2l2ZW4ge1RleHRFZGl0b3J9IGZvciBhIHNwZWNpZmljIHtQb2ludH0uXG4gICAqXG4gICAqIEBwYXJhbSBlZGl0b3IgQSB7VGV4dEVkaXRvcn0gdGhhdCByZXByZXNlbnRzIHRoZSBkb2N1bWVudC5cbiAgICogQHBhcmFtIHBvaW50IEEge1BvaW50fSB3aXRoaW4gdGhlIGRvY3VtZW50LlxuICAgKiBAcmV0dXJucyBBIHtSZWZlcmVuY2VQYXJhbXN9IGJ1aWx0IGZyb20gdGhlIGdpdmVuIHBhcmFtZXRlcnMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNyZWF0ZVJlZmVyZW5jZVBhcmFtcyhlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50OiBQb2ludCk6IFJlZmVyZW5jZVBhcmFtcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHREb2N1bWVudDogQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudElkZW50aWZpZXIoZWRpdG9yKSxcbiAgICAgIHBvc2l0aW9uOiBDb252ZXJ0LnBvaW50VG9Qb3NpdGlvbihwb2ludCksXG4gICAgICBjb250ZXh0OiB7IGluY2x1ZGVEZWNsYXJhdGlvbjogdHJ1ZSB9LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGEge0xvY2F0aW9ufSBpbnRvIGEge1JlZmVyZW5jZX0uXG4gICAqXG4gICAqIEBwYXJhbSBsb2NhdGlvbiBBIHtMb2NhdGlvbn0gdG8gY29udmVydC5cbiAgICogQHJldHVybnMgQSB7UmVmZXJlbmNlfSBlcXVpdmFsZW50IHRvIHRoZSBnaXZlbiB7TG9jYXRpb259LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBsb2NhdGlvblRvUmVmZXJlbmNlKGxvY2F0aW9uOiBMb2NhdGlvbik6IGF0b21JZGUuUmVmZXJlbmNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXJpOiBDb252ZXJ0LnVyaVRvUGF0aChsb2NhdGlvbi51cmkpLFxuICAgICAgbmFtZTogbnVsbCxcbiAgICAgIHJhbmdlOiBDb252ZXJ0LmxzUmFuZ2VUb0F0b21SYW5nZShsb2NhdGlvbi5yYW5nZSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBQdWJsaWM6IEdldCBhIHN5bWJvbCBuYW1lIGZyb20gYSB7VGV4dEVkaXRvcn0gZm9yIGEgc3BlY2lmaWMge1BvaW50fSBpbiB0aGUgZG9jdW1lbnQuICovXG4gIHB1YmxpYyBzdGF0aWMgZ2V0UmVmZXJlbmNlZFN5bWJvbE5hbWUoXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHBvaW50OiBQb2ludCxcbiAgICByZWZlcmVuY2VzOiBhdG9tSWRlLlJlZmVyZW5jZVtdLFxuICApOiBzdHJpbmcge1xuICAgIGlmIChyZWZlcmVuY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICBjb25zdCBjdXJyZW50UmVmZXJlbmNlID0gcmVmZXJlbmNlcy5maW5kKChyKSA9PiByLnJhbmdlLmNvbnRhaW5zUG9pbnQocG9pbnQpKSB8fCByZWZlcmVuY2VzWzBdO1xuICAgIHJldHVybiBlZGl0b3IuZ2V0QnVmZmVyKCkuZ2V0VGV4dEluUmFuZ2UoY3VycmVudFJlZmVyZW5jZS5yYW5nZSk7XG4gIH1cbn1cbiJdfQ==