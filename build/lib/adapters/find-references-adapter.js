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
        return !!serverCapabilities.referencesProvider;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1yZWZlcmVuY2VzLWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvZmluZC1yZWZlcmVuY2VzLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFDQSx3Q0FBaUM7QUFZakM7OztHQUdHO0FBQ0gsTUFBcUIscUJBQXFCO0lBQ3hDOzs7Ozs7O09BT0c7SUFDSSxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFzQztRQUMzRCxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNVLGFBQWEsQ0FDeEIsVUFBb0MsRUFDcEMsTUFBa0IsRUFDbEIsS0FBWSxFQUNaLFdBQTBCOztZQUUxQixNQUFNLFNBQVMsR0FBRyxNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQy9DLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FDM0QsQ0FBQztZQUNGLElBQUksU0FBUyxJQUFJLElBQUksRUFBRTtnQkFDckIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE1BQU0sVUFBVSxHQUF3QixTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDakcsT0FBTztnQkFDTCxJQUFJLEVBQUUsTUFBTTtnQkFDWixPQUFPLEVBQUUsV0FBVyxJQUFJLEVBQUU7Z0JBQzFCLG9CQUFvQixFQUFFLHFCQUFxQixDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDO2dCQUM5RixVQUFVO2FBQ1gsQ0FBQztRQUNKLENBQUM7S0FBQTtJQUVEOzs7Ozs7T0FNRztJQUNJLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxNQUFrQixFQUFFLEtBQVk7UUFDbEUsT0FBTztZQUNMLFlBQVksRUFBRSxpQkFBTyxDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQztZQUM1RCxRQUFRLEVBQUUsaUJBQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1lBQ3hDLE9BQU8sRUFBRSxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRTtTQUN0QyxDQUFDO0lBQ0osQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLG1CQUFtQixDQUFDLFFBQWtCO1FBQ2xELE9BQU87WUFDTCxHQUFHLEVBQUUsaUJBQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxJQUFJLEVBQUUsSUFBSTtZQUNWLEtBQUssRUFBRSxpQkFBTyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7U0FDbEQsQ0FBQztJQUNKLENBQUM7SUFFRCw0RkFBNEY7SUFDckYsTUFBTSxDQUFDLHVCQUF1QixDQUNuQyxNQUFrQixFQUNsQixLQUFZLEVBQ1osVUFBK0I7UUFFL0IsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMzQixPQUFPLEVBQUUsQ0FBQztTQUNYO1FBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvRixPQUFPLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNGO0FBdkZELHdDQXVGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGF0b21JZGUgZnJvbSAnYXRvbS1pZGUnO1xuaW1wb3J0IENvbnZlcnQgZnJvbSAnLi4vY29udmVydCc7XG5pbXBvcnQge1xuICBQb2ludCxcbiAgVGV4dEVkaXRvcixcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQge1xuICBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gIExvY2F0aW9uLFxuICBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG4gIFJlZmVyZW5jZVBhcmFtcyxcbn0gZnJvbSAnLi4vbGFuZ3VhZ2VjbGllbnQnO1xuXG4vKipcbiAqIFB1YmxpYzogQWRhcHRzIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgZGVmaW5pdGlvbiBwcm92aWRlciB0byB0aGVcbiAqIEF0b20gSURFIFVJIERlZmluaXRpb25zIHBhY2thZ2UgZm9yICdHbyBUbyBEZWZpbml0aW9uJyBmdW5jdGlvbmFsaXR5LlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaW5kUmVmZXJlbmNlc0FkYXB0ZXIge1xuICAvKipcbiAgICogUHVibGljOiBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGFkYXB0ZXIgY2FuIGJlIHVzZWQgdG8gYWRhcHQgYSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIHNlcnZlckNhcGFiaWxpdGllcyBtYXRyaXggY29udGFpbmluZyBhIHJlZmVyZW5jZXNQcm92aWRlci5cbiAgICpcbiAgICogQHBhcmFtIHNlcnZlckNhcGFiaWxpdGllcyBUaGUge1NlcnZlckNhcGFiaWxpdGllc30gb2YgdGhlIGxhbmd1YWdlIHNlcnZlciB0byBjb25zaWRlci5cbiAgICogQHJldHVybnMgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyBhZGFwdGVyIGNhbiBhZGFwdCB0aGUgc2VydmVyIGJhc2VkIG9uIHRoZVxuICAgKiAgIGdpdmVuIHNlcnZlckNhcGFiaWxpdGllcy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY2FuQWRhcHQoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISFzZXJ2ZXJDYXBhYmlsaXRpZXMucmVmZXJlbmNlc1Byb3ZpZGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogR2V0IHRoZSByZWZlcmVuY2VzIGZvciBhIHNwZWNpZmljIHN5bWJvbCB3aXRoaW4gdGhlIGRvY3VtZW50IGFzIHJlcHJlc2VudGVkIGJ5XG4gICAqIHRoZSB7VGV4dEVkaXRvcn0gYW5kIHtQb2ludH0gd2l0aGluIGl0IHZpYSB0aGUgbGFuZ3VhZ2Ugc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIGJlIHF1ZXJpZWRcbiAgICogICBmb3IgdGhlIHJlZmVyZW5jZXMuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIHRleHQgdGhlIHJlZmVyZW5jZXMgc2hvdWxkIHJlbGF0ZSB0by5cbiAgICogQHBhcmFtIHBvaW50IFRoZSBBdG9tIHtQb2ludH0gY29udGFpbmluZyB0aGUgcG9pbnQgd2l0aGluIHRoZSB0ZXh0IHRoZSByZWZlcmVuY2VzIHNob3VsZCByZWxhdGUgdG8uXG4gICAqIEByZXR1cm5zIEEge1Byb21pc2V9IGNvbnRhaW5pbmcgYSB7RmluZFJlZmVyZW5jZXNSZXR1cm59IHdpdGggYWxsIHRoZSByZWZlcmVuY2VzIHRoZSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogICBjb3VsZCBmaW5kLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdldFJlZmVyZW5jZXMoXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBwb2ludDogUG9pbnQsXG4gICAgcHJvamVjdFJvb3Q6IHN0cmluZyB8IG51bGwsXG4gICk6IFByb21pc2U8YXRvbUlkZS5GaW5kUmVmZXJlbmNlc1JldHVybiB8IG51bGw+IHtcbiAgICBjb25zdCBsb2NhdGlvbnMgPSBhd2FpdCBjb25uZWN0aW9uLmZpbmRSZWZlcmVuY2VzKFxuICAgICAgRmluZFJlZmVyZW5jZXNBZGFwdGVyLmNyZWF0ZVJlZmVyZW5jZVBhcmFtcyhlZGl0b3IsIHBvaW50KSxcbiAgICApO1xuICAgIGlmIChsb2NhdGlvbnMgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcmVmZXJlbmNlczogYXRvbUlkZS5SZWZlcmVuY2VbXSA9IGxvY2F0aW9ucy5tYXAoRmluZFJlZmVyZW5jZXNBZGFwdGVyLmxvY2F0aW9uVG9SZWZlcmVuY2UpO1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnZGF0YScsXG4gICAgICBiYXNlVXJpOiBwcm9qZWN0Um9vdCB8fCAnJyxcbiAgICAgIHJlZmVyZW5jZWRTeW1ib2xOYW1lOiBGaW5kUmVmZXJlbmNlc0FkYXB0ZXIuZ2V0UmVmZXJlbmNlZFN5bWJvbE5hbWUoZWRpdG9yLCBwb2ludCwgcmVmZXJlbmNlcyksXG4gICAgICByZWZlcmVuY2VzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUgYSB7UmVmZXJlbmNlUGFyYW1zfSBmcm9tIGEgZ2l2ZW4ge1RleHRFZGl0b3J9IGZvciBhIHNwZWNpZmljIHtQb2ludH0uXG4gICAqXG4gICAqIEBwYXJhbSBlZGl0b3IgQSB7VGV4dEVkaXRvcn0gdGhhdCByZXByZXNlbnRzIHRoZSBkb2N1bWVudC5cbiAgICogQHBhcmFtIHBvaW50IEEge1BvaW50fSB3aXRoaW4gdGhlIGRvY3VtZW50LlxuICAgKiBAcmV0dXJucyBBIHtSZWZlcmVuY2VQYXJhbXN9IGJ1aWx0IGZyb20gdGhlIGdpdmVuIHBhcmFtZXRlcnMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNyZWF0ZVJlZmVyZW5jZVBhcmFtcyhlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50OiBQb2ludCk6IFJlZmVyZW5jZVBhcmFtcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHREb2N1bWVudDogQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudElkZW50aWZpZXIoZWRpdG9yKSxcbiAgICAgIHBvc2l0aW9uOiBDb252ZXJ0LnBvaW50VG9Qb3NpdGlvbihwb2ludCksXG4gICAgICBjb250ZXh0OiB7IGluY2x1ZGVEZWNsYXJhdGlvbjogdHJ1ZSB9LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGEge0xvY2F0aW9ufSBpbnRvIGEge1JlZmVyZW5jZX0uXG4gICAqXG4gICAqIEBwYXJhbSBsb2NhdGlvbiBBIHtMb2NhdGlvbn0gdG8gY29udmVydC5cbiAgICogQHJldHVybnMgQSB7UmVmZXJlbmNlfSBlcXVpdmFsZW50IHRvIHRoZSBnaXZlbiB7TG9jYXRpb259LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBsb2NhdGlvblRvUmVmZXJlbmNlKGxvY2F0aW9uOiBMb2NhdGlvbik6IGF0b21JZGUuUmVmZXJlbmNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXJpOiBDb252ZXJ0LnVyaVRvUGF0aChsb2NhdGlvbi51cmkpLFxuICAgICAgbmFtZTogbnVsbCxcbiAgICAgIHJhbmdlOiBDb252ZXJ0LmxzUmFuZ2VUb0F0b21SYW5nZShsb2NhdGlvbi5yYW5nZSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBQdWJsaWM6IEdldCBhIHN5bWJvbCBuYW1lIGZyb20gYSB7VGV4dEVkaXRvcn0gZm9yIGEgc3BlY2lmaWMge1BvaW50fSBpbiB0aGUgZG9jdW1lbnQuICovXG4gIHB1YmxpYyBzdGF0aWMgZ2V0UmVmZXJlbmNlZFN5bWJvbE5hbWUoXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHBvaW50OiBQb2ludCxcbiAgICByZWZlcmVuY2VzOiBhdG9tSWRlLlJlZmVyZW5jZVtdLFxuICApOiBzdHJpbmcge1xuICAgIGlmIChyZWZlcmVuY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICBjb25zdCBjdXJyZW50UmVmZXJlbmNlID0gcmVmZXJlbmNlcy5maW5kKChyKSA9PiByLnJhbmdlLmNvbnRhaW5zUG9pbnQocG9pbnQpKSB8fCByZWZlcmVuY2VzWzBdO1xuICAgIHJldHVybiBlZGl0b3IuZ2V0QnVmZmVyKCkuZ2V0VGV4dEluUmFuZ2UoY3VycmVudFJlZmVyZW5jZS5yYW5nZSk7XG4gIH1cbn1cbiJdfQ==