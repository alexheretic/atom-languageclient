"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ls = require("./languageclient");
const URL = require("url");
const atom_1 = require("atom");
/**
 * Public: Class that contains a number of helper methods for general conversions
 * between the language server protocol and Atom/Atom packages.
 */
class Convert {
    /**
     * Public: Convert a path to a Uri.
     *
     * @param filePath A file path to convert to a Uri.
     * @returns The Uri corresponding to the path. e.g. file:///a/b/c.txt
     */
    static pathToUri(filePath) {
        let newPath = filePath.replace(/\\/g, '/');
        if (newPath[0] !== '/') {
            newPath = `/${newPath}`;
        }
        return encodeURI(`file://${newPath}`).replace(/[?#]/g, encodeURIComponent);
    }
    /**
     * Public: Convert a Uri to a path.
     *
     * @param uri A Uri to convert to a file path.
     * @returns A file path corresponding to the Uri. e.g. /a/b/c.txt
     *   If the Uri does not begin file: then it is returned as-is to allow Atom
     *   to deal with http/https sources in the future.
     */
    static uriToPath(uri) {
        const url = URL.parse(uri);
        if (url.protocol !== 'file:' || url.path === undefined) {
            return uri;
        }
        let filePath = decodeURIComponent(url.path);
        if (process.platform === 'win32') {
            // Deal with Windows drive names
            if (filePath[0] === '/') {
                filePath = filePath.substr(1);
            }
            return filePath.replace(/\//g, '\\');
        }
        return filePath;
    }
    /**
     * Public: Convert an Atom {Point} to a language server {Position}.
     *
     * @param point An Atom {Point} to convert from.
     * @returns The {Position} representation of the Atom {PointObject}.
     */
    static pointToPosition(point) {
        return { line: point.row, character: point.column };
    }
    /**
     * Public: Convert a language server {Position} into an Atom {PointObject}.
     *
     * @param position A language server {Position} to convert from.
     * @returns The Atom {PointObject} representation of the given {Position}.
     */
    static positionToPoint(position) {
        return new atom_1.Point(position.line, position.character);
    }
    /**
     * Public: Convert a language server {Range} into an Atom {Range}.
     *
     * @param range A language server {Range} to convert from.
     * @returns The Atom {Range} representation of the given language server {Range}.
     */
    static lsRangeToAtomRange(range) {
        return new atom_1.Range(Convert.positionToPoint(range.start), Convert.positionToPoint(range.end));
    }
    /**
     * Public: Convert an Atom {Range} into an language server {Range}.
     *
     * @param range An Atom {Range} to convert from.
     * @returns The language server {Range} representation of the given Atom {Range}.
     */
    static atomRangeToLSRange(range) {
        return {
            start: Convert.pointToPosition(range.start),
            end: Convert.pointToPosition(range.end),
        };
    }
    /**
     * Public: Create a {TextDocumentIdentifier} from an Atom {TextEditor}.
     *
     * @param editor A {TextEditor} that will be used to form the uri property.
     * @returns A {TextDocumentIdentifier} that has a `uri` property with the Uri for the
     *   given editor's path.
     */
    static editorToTextDocumentIdentifier(editor) {
        return { uri: Convert.pathToUri(editor.getPath() || '') };
    }
    /**
     * Public: Create a {TextDocumentPositionParams} from a {TextEditor} and optional {Point}.
     *
     * @param editor A {TextEditor} that will be used to form the uri property.
     * @param point An optional {Point} that will supply the position property. If not specified
     *   the current cursor position will be used.
     * @returns A {TextDocumentPositionParams} that has textDocument property with the editors {TextDocumentIdentifier}
     *   and a position property with the supplied point (or current cursor position when not specified).
     */
    static editorToTextDocumentPositionParams(editor, point) {
        return {
            textDocument: Convert.editorToTextDocumentIdentifier(editor),
            position: Convert.pointToPosition(point != null ? point : editor.getCursorBufferPosition()),
        };
    }
    /**
     * Public: Create a string of scopes for the atom text editor using the data-grammar
     * selector from an {Array} of grammarScope strings.
     *
     * @param grammarScopes An {Array} of grammar scope string to convert from.
     * @returns A single comma-separated list of CSS selectors targetting the grammars of Atom text editors.
     *   e.g. `['c', 'cpp']` =>
     *   `'atom-text-editor[data-grammar='c'], atom-text-editor[data-grammar='cpp']`
     */
    static grammarScopesToTextEditorScopes(grammarScopes) {
        return grammarScopes
            .map((g) => `atom-text-editor[data-grammar="${Convert.encodeHTMLAttribute(g.replace(/\./g, ' '))}"]`)
            .join(', ');
    }
    /**
     * Public: Encode a string so that it can be safely used within a HTML attribute - i.e. replacing all
     * quoted values with their HTML entity encoded versions.  e.g. `Hello"` becomes `Hello&quot;`
     *
     * @param s A string to be encoded.
     * @returns A string that is HTML attribute encoded by replacing &, <, >, " and ' with their HTML entity
     *   named equivalents.
     */
    static encodeHTMLAttribute(s) {
        const attributeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;',
        };
        return s.replace(/[&<>'"]/g, (c) => attributeMap[c]);
    }
    /**
     * Public: Convert an Atom File Event as received from atom.project.onDidChangeFiles and convert
     * it into an Array of Language Server Protocol {FileEvent} objects. Normally this will be a 1-to-1
     * but renames will be represented by a deletion and a subsequent creation as LSP does not know about
     * renames.
     *
     * @param fileEvent An {atom$ProjectFileEvent} to be converted.
     * @returns An array of LSP {ls.FileEvent} objects that equivalent conversions to the fileEvent parameter.
     */
    static atomFileEventToLSFileEvents(fileEvent) {
        switch (fileEvent.action) {
            case 'created':
                return [{ uri: Convert.pathToUri(fileEvent.path), type: ls.FileChangeType.Created }];
            case 'modified':
                return [{ uri: Convert.pathToUri(fileEvent.path), type: ls.FileChangeType.Changed }];
            case 'deleted':
                return [{ uri: Convert.pathToUri(fileEvent.path), type: ls.FileChangeType.Deleted }];
            case 'renamed': {
                const results = [];
                if (fileEvent.oldPath) {
                    results.push({ uri: Convert.pathToUri(fileEvent.oldPath), type: ls.FileChangeType.Deleted });
                }
                if (fileEvent.path) {
                    results.push({ uri: Convert.pathToUri(fileEvent.path), type: ls.FileChangeType.Created });
                }
                return results;
            }
            default:
                return [];
        }
    }
    static atomIdeDiagnosticToLSDiagnostic(diagnostic) {
        return {
            range: Convert.atomRangeToLSRange(diagnostic.range),
            severity: Convert.diagnosticTypeToLSSeverity(diagnostic.type),
            source: diagnostic.providerName,
            message: diagnostic.text || '',
        };
    }
    static diagnosticTypeToLSSeverity(type) {
        switch (type) {
            case 'Error':
                return ls.DiagnosticSeverity.Error;
            case 'Warning':
                return ls.DiagnosticSeverity.Warning;
            case 'Info':
                return ls.DiagnosticSeverity.Information;
            default:
                throw Error(`Unexpected diagnostic type ${type}`);
        }
    }
    /**
     * Public: Convert an array of language server protocol {TextEdit} objects to an
     * equivalent array of Atom {TextEdit} objects.
     *
     * @param textEdits The language server protocol {TextEdit} objects to convert.
     * @returns An {Array} of Atom {TextEdit} objects.
     */
    static convertLsTextEdits(textEdits) {
        return (textEdits || []).map(Convert.convertLsTextEdit);
    }
    /**
     * Public: Convert a language server protocol {TextEdit} object to the
     * Atom equivalent {TextEdit}.
     *
     * @param textEdits The language server protocol {TextEdit} objects to convert.
     * @returns An Atom {TextEdit} object.
     */
    static convertLsTextEdit(textEdit) {
        return {
            oldRange: Convert.lsRangeToAtomRange(textEdit.range),
            newText: textEdit.newText,
        };
    }
}
exports.default = Convert;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9jb252ZXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsdUNBQXVDO0FBQ3ZDLDJCQUEyQjtBQUMzQiwrQkFLYztBQU9kOzs7R0FHRztBQUNILE1BQXFCLE9BQU87SUFDMUI7Ozs7O09BS0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQWdCO1FBQ3RDLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtZQUN0QixPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztTQUN6QjtRQUNELE9BQU8sU0FBUyxDQUFDLFVBQVUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQVc7UUFDakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixJQUFJLEdBQUcsQ0FBQyxRQUFRLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQ3RELE9BQU8sR0FBRyxDQUFDO1NBQ1o7UUFFRCxJQUFJLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRTtZQUNoQyxnQ0FBZ0M7WUFDaEMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO2dCQUN2QixRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMvQjtZQUNELE9BQU8sUUFBUSxDQUFD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LEtBQUssQ0FBQztZQUNuRCxRQUFRLEVBQUUsT0FBTyxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDN0QsTUFBTSxFQUFFLFVBQVUsQ0FBQyxZQUFZO1lBQy9CLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUU7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFFTSxNQUFNLENBQUMsMEJBQTBCLENBQUMsSUFBb0I7UUFDM0QsUUFBUSxJQUFJLEVBQUU7WUFDWixLQUFLLE9BQU87Z0JBQ1YsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1lBQ3JDLEtBQUssU0FBUztnQkFDWixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7WUFDdkMsS0FBSyxNQUFNO2dCQUNULE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQztZQUMzQztnQkFDRSxNQUFNLEtBQUssQ0FBQyw4QkFBOEIsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUNyRDtJQUNILENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxNQUFNLENBQUMsa0JBQWtCLENBQUMsU0FBK0I7UUFDOUQsT0FBTyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNJLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFxQjtRQUNuRCxPQUFPO1lBQ0wsUUFBUSxFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQ3BELE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztTQUMxQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBak9ELDBCQWlPQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0ICogYXMgbHMgZnJvbSAnLi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQgKiBhcyBVUkwgZnJvbSAndXJsJztcbmltcG9ydCB7XG4gIFBvaW50LFxuICBGaWxlc3lzdGVtQ2hhbmdlLFxuICBSYW5nZSxcbiAgVGV4dEVkaXRvcixcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQge1xuICBEaWFnbm9zdGljLFxuICBEaWFnbm9zdGljVHlwZSxcbiAgVGV4dEVkaXQsXG59IGZyb20gJ2F0b20taWRlJztcblxuLyoqXG4gKiBQdWJsaWM6IENsYXNzIHRoYXQgY29udGFpbnMgYSBudW1iZXIgb2YgaGVscGVyIG1ldGhvZHMgZm9yIGdlbmVyYWwgY29udmVyc2lvbnNcbiAqIGJldHdlZW4gdGhlIGxhbmd1YWdlIHNlcnZlciBwcm90b2NvbCBhbmQgQXRvbS9BdG9tIHBhY2thZ2VzLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb252ZXJ0IHtcbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhIHBhdGggdG8gYSBVcmkuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlUGF0aCBBIGZpbGUgcGF0aCB0byBjb252ZXJ0IHRvIGEgVXJpLlxuICAgKiBAcmV0dXJucyBUaGUgVXJpIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHBhdGguIGUuZy4gZmlsZTovLy9hL2IvYy50eHRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgcGF0aFRvVXJpKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGxldCBuZXdQYXRoID0gZmlsZVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmIChuZXdQYXRoWzBdICE9PSAnLycpIHtcbiAgICAgIG5ld1BhdGggPSBgLyR7bmV3UGF0aH1gO1xuICAgIH1cbiAgICByZXR1cm4gZW5jb2RlVVJJKGBmaWxlOi8vJHtuZXdQYXRofWApLnJlcGxhY2UoL1s/I10vZywgZW5jb2RlVVJJQ29tcG9uZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYSBVcmkgdG8gYSBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gdXJpIEEgVXJpIHRvIGNvbnZlcnQgdG8gYSBmaWxlIHBhdGguXG4gICAqIEByZXR1cm5zIEEgZmlsZSBwYXRoIGNvcnJlc3BvbmRpbmcgdG8gdGhlIFVyaS4gZS5nLiAvYS9iL2MudHh0XG4gICAqICAgSWYgdGhlIFVyaSBkb2VzIG5vdCBiZWdpbiBmaWxlOiB0aGVuIGl0IGlzIHJldHVybmVkIGFzLWlzIHRvIGFsbG93IEF0b21cbiAgICogICB0byBkZWFsIHdpdGggaHR0cC9odHRwcyBzb3VyY2VzIGluIHRoZSBmdXR1cmUuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHVyaVRvUGF0aCh1cmk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gVVJMLnBhcnNlKHVyaSk7XG4gICAgaWYgKHVybC5wcm90b2NvbCAhPT0gJ2ZpbGU6JyB8fCB1cmwucGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdXJpO1xuICAgIH1cblxuICAgIGxldCBmaWxlUGF0aCA9IGRlY29kZVVSSUNvbXBvbmVudCh1cmwucGF0aCk7XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICAgIC8vIERlYWwgd2l0aCBXaW5kb3dzIGRyaXZlIG5hbWVzXG4gICAgICBpZiAoZmlsZVBhdGhbMF0gPT09ICcvJykge1xuICAgICAgICBmaWxlUGF0aCA9IGZpbGVQYXRoLnN1YnN0cigxKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC9cXC8vZywgJ1xcXFwnKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGVQYXRoO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhbiBBdG9tIHtQb2ludH0gdG8gYSBsYW5ndWFnZSBzZXJ2ZXIge1Bvc2l0aW9ufS5cbiAgICpcbiAgICogQHBhcmFtIHBvaW50IEFuIEF0b20ge1BvaW50fSB0byBjb252ZXJ0IGZyb20uXG4gICAqIEByZXR1cm5zIFRoZSB7UG9zaXRpb259IHJlcHJlc2VudGF0aW9uIG9mIHRoZSBBdG9tIHtQb2ludE9iamVjdH0uXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHBvaW50VG9Qb3NpdGlvbihwb2ludDogUG9pbnQpOiBscy5Qb3NpdGlvbiB7XG4gICAgcmV0dXJuIHsgbGluZTogcG9pbnQucm93LCBjaGFyYWN0ZXI6IHBvaW50LmNvbHVtbiB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhIGxhbmd1YWdlIHNlcnZlciB7UG9zaXRpb259IGludG8gYW4gQXRvbSB7UG9pbnRPYmplY3R9LlxuICAgKlxuICAgKiBAcGFyYW0gcG9zaXRpb24gQSBsYW5ndWFnZSBzZXJ2ZXIge1Bvc2l0aW9ufSB0byBjb252ZXJ0IGZyb20uXG4gICAqIEByZXR1cm5zIFRoZSBBdG9tIHtQb2ludE9iamVjdH0gcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIHtQb3NpdGlvbn0uXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHBvc2l0aW9uVG9Qb2ludChwb3NpdGlvbjogbHMuUG9zaXRpb24pOiBQb2ludCB7XG4gICAgcmV0dXJuIG5ldyBQb2ludChwb3NpdGlvbi5saW5lLCBwb3NpdGlvbi5jaGFyYWN0ZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhIGxhbmd1YWdlIHNlcnZlciB7UmFuZ2V9IGludG8gYW4gQXRvbSB7UmFuZ2V9LlxuICAgKlxuICAgKiBAcGFyYW0gcmFuZ2UgQSBsYW5ndWFnZSBzZXJ2ZXIge1JhbmdlfSB0byBjb252ZXJ0IGZyb20uXG4gICAqIEByZXR1cm5zIFRoZSBBdG9tIHtSYW5nZX0gcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGxhbmd1YWdlIHNlcnZlciB7UmFuZ2V9LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBsc1JhbmdlVG9BdG9tUmFuZ2UocmFuZ2U6IGxzLlJhbmdlKTogUmFuZ2Uge1xuICAgIHJldHVybiBuZXcgUmFuZ2UoQ29udmVydC5wb3NpdGlvblRvUG9pbnQocmFuZ2Uuc3RhcnQpLCBDb252ZXJ0LnBvc2l0aW9uVG9Qb2ludChyYW5nZS5lbmQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYW4gQXRvbSB7UmFuZ2V9IGludG8gYW4gbGFuZ3VhZ2Ugc2VydmVyIHtSYW5nZX0uXG4gICAqXG4gICAqIEBwYXJhbSByYW5nZSBBbiBBdG9tIHtSYW5nZX0gdG8gY29udmVydCBmcm9tLlxuICAgKiBAcmV0dXJucyBUaGUgbGFuZ3VhZ2Ugc2VydmVyIHtSYW5nZX0gcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIEF0b20ge1JhbmdlfS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXRvbVJhbmdlVG9MU1JhbmdlKHJhbmdlOiBSYW5nZSk6IGxzLlJhbmdlIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhcnQ6IENvbnZlcnQucG9pbnRUb1Bvc2l0aW9uKHJhbmdlLnN0YXJ0KSxcbiAgICAgIGVuZDogQ29udmVydC5wb2ludFRvUG9zaXRpb24ocmFuZ2UuZW5kKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIGEge1RleHREb2N1bWVudElkZW50aWZpZXJ9IGZyb20gYW4gQXRvbSB7VGV4dEVkaXRvcn0uXG4gICAqXG4gICAqIEBwYXJhbSBlZGl0b3IgQSB7VGV4dEVkaXRvcn0gdGhhdCB3aWxsIGJlIHVzZWQgdG8gZm9ybSB0aGUgdXJpIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyBBIHtUZXh0RG9jdW1lbnRJZGVudGlmaWVyfSB0aGF0IGhhcyBhIGB1cmlgIHByb3BlcnR5IHdpdGggdGhlIFVyaSBmb3IgdGhlXG4gICAqICAgZ2l2ZW4gZWRpdG9yJ3MgcGF0aC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZWRpdG9yVG9UZXh0RG9jdW1lbnRJZGVudGlmaWVyKGVkaXRvcjogVGV4dEVkaXRvcik6IGxzLlRleHREb2N1bWVudElkZW50aWZpZXIge1xuICAgIHJldHVybiB7IHVyaTogQ29udmVydC5wYXRoVG9VcmkoZWRpdG9yLmdldFBhdGgoKSB8fCAnJykgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSBhIHtUZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtc30gZnJvbSBhIHtUZXh0RWRpdG9yfSBhbmQgb3B0aW9uYWwge1BvaW50fS5cbiAgICpcbiAgICogQHBhcmFtIGVkaXRvciBBIHtUZXh0RWRpdG9yfSB0aGF0IHdpbGwgYmUgdXNlZCB0byBmb3JtIHRoZSB1cmkgcHJvcGVydHkuXG4gICAqIEBwYXJhbSBwb2ludCBBbiBvcHRpb25hbCB7UG9pbnR9IHRoYXQgd2lsbCBzdXBwbHkgdGhlIHBvc2l0aW9uIHByb3BlcnR5LiBJZiBub3Qgc3BlY2lmaWVkXG4gICAqICAgdGhlIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgdXNlZC5cbiAgICogQHJldHVybnMgQSB7VGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXN9IHRoYXQgaGFzIHRleHREb2N1bWVudCBwcm9wZXJ0eSB3aXRoIHRoZSBlZGl0b3JzIHtUZXh0RG9jdW1lbnRJZGVudGlmaWVyfVxuICAgKiAgIGFuZCBhIHBvc2l0aW9uIHByb3BlcnR5IHdpdGggdGhlIHN1cHBsaWVkIHBvaW50IChvciBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB3aGVuIG5vdCBzcGVjaWZpZWQpLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBlZGl0b3JUb1RleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKFxuICAgIGVkaXRvcjogVGV4dEVkaXRvcixcbiAgICBwb2ludD86IFBvaW50LFxuICApOiBscy5UZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHREb2N1bWVudDogQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudElkZW50aWZpZXIoZWRpdG9yKSxcbiAgICAgIHBvc2l0aW9uOiBDb252ZXJ0LnBvaW50VG9Qb3NpdGlvbihwb2ludCAhPSBudWxsID8gcG9pbnQgOiBlZGl0b3IuZ2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oKSksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSBhIHN0cmluZyBvZiBzY29wZXMgZm9yIHRoZSBhdG9tIHRleHQgZWRpdG9yIHVzaW5nIHRoZSBkYXRhLWdyYW1tYXJcbiAgICogc2VsZWN0b3IgZnJvbSBhbiB7QXJyYXl9IG9mIGdyYW1tYXJTY29wZSBzdHJpbmdzLlxuICAgKlxuICAgKiBAcGFyYW0gZ3JhbW1hclNjb3BlcyBBbiB7QXJyYXl9IG9mIGdyYW1tYXIgc2NvcGUgc3RyaW5nIHRvIGNvbnZlcnQgZnJvbS5cbiAgICogQHJldHVybnMgQSBzaW5nbGUgY29tbWEtc2VwYXJhdGVkIGxpc3Qgb2YgQ1NTIHNlbGVjdG9ycyB0YXJnZXR0aW5nIHRoZSBncmFtbWFycyBvZiBBdG9tIHRleHQgZWRpdG9ycy5cbiAgICogICBlLmcuIGBbJ2MnLCAnY3BwJ11gID0+XG4gICAqICAgYCdhdG9tLXRleHQtZWRpdG9yW2RhdGEtZ3JhbW1hcj0nYyddLCBhdG9tLXRleHQtZWRpdG9yW2RhdGEtZ3JhbW1hcj0nY3BwJ11gXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGdyYW1tYXJTY29wZXNUb1RleHRFZGl0b3JTY29wZXMoZ3JhbW1hclNjb3Blczogc3RyaW5nW10pOiBzdHJpbmcge1xuICAgIHJldHVybiBncmFtbWFyU2NvcGVzXG4gICAgICAubWFwKChnKSA9PiBgYXRvbS10ZXh0LWVkaXRvcltkYXRhLWdyYW1tYXI9XCIke0NvbnZlcnQuZW5jb2RlSFRNTEF0dHJpYnV0ZShnLnJlcGxhY2UoL1xcLi9nLCAnICcpKX1cIl1gKVxuICAgICAgLmpvaW4oJywgJyk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBFbmNvZGUgYSBzdHJpbmcgc28gdGhhdCBpdCBjYW4gYmUgc2FmZWx5IHVzZWQgd2l0aGluIGEgSFRNTCBhdHRyaWJ1dGUgLSBpLmUuIHJlcGxhY2luZyBhbGxcbiAgICogcXVvdGVkIHZhbHVlcyB3aXRoIHRoZWlyIEhUTUwgZW50aXR5IGVuY29kZWQgdmVyc2lvbnMuICBlLmcuIGBIZWxsb1wiYCBiZWNvbWVzIGBIZWxsbyZxdW90O2BcbiAgICpcbiAgICogQHBhcmFtIHMgQSBzdHJpbmcgdG8gYmUgZW5jb2RlZC5cbiAgICogQHJldHVybnMgQSBzdHJpbmcgdGhhdCBpcyBIVE1MIGF0dHJpYnV0ZSBlbmNvZGVkIGJ5IHJlcGxhY2luZyAmLCA8LCA+LCBcIiBhbmQgJyB3aXRoIHRoZWlyIEhUTUwgZW50aXR5XG4gICAqICAgbmFtZWQgZXF1aXZhbGVudHMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGVuY29kZUhUTUxBdHRyaWJ1dGUoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBhdHRyaWJ1dGVNYXA6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0gPSB7XG4gICAgICAnJic6ICcmYW1wOycsXG4gICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICc+JzogJyZndDsnLFxuICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICBcIidcIjogJyZhcG9zOycsXG4gICAgfTtcbiAgICByZXR1cm4gcy5yZXBsYWNlKC9bJjw+J1wiXS9nLCAoYykgPT4gYXR0cmlidXRlTWFwW2NdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYW4gQXRvbSBGaWxlIEV2ZW50IGFzIHJlY2VpdmVkIGZyb20gYXRvbS5wcm9qZWN0Lm9uRGlkQ2hhbmdlRmlsZXMgYW5kIGNvbnZlcnRcbiAgICogaXQgaW50byBhbiBBcnJheSBvZiBMYW5ndWFnZSBTZXJ2ZXIgUHJvdG9jb2wge0ZpbGVFdmVudH0gb2JqZWN0cy4gTm9ybWFsbHkgdGhpcyB3aWxsIGJlIGEgMS10by0xXG4gICAqIGJ1dCByZW5hbWVzIHdpbGwgYmUgcmVwcmVzZW50ZWQgYnkgYSBkZWxldGlvbiBhbmQgYSBzdWJzZXF1ZW50IGNyZWF0aW9uIGFzIExTUCBkb2VzIG5vdCBrbm93IGFib3V0XG4gICAqIHJlbmFtZXMuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlRXZlbnQgQW4ge2F0b20kUHJvamVjdEZpbGVFdmVudH0gdG8gYmUgY29udmVydGVkLlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBMU1Age2xzLkZpbGVFdmVudH0gb2JqZWN0cyB0aGF0IGVxdWl2YWxlbnQgY29udmVyc2lvbnMgdG8gdGhlIGZpbGVFdmVudCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGF0b21GaWxlRXZlbnRUb0xTRmlsZUV2ZW50cyhmaWxlRXZlbnQ6IEZpbGVzeXN0ZW1DaGFuZ2UpOiBscy5GaWxlRXZlbnRbXSB7XG4gICAgc3dpdGNoIChmaWxlRXZlbnQuYWN0aW9uKSB7XG4gICAgICBjYXNlICdjcmVhdGVkJzpcbiAgICAgICAgcmV0dXJuIFt7IHVyaTogQ29udmVydC5wYXRoVG9VcmkoZmlsZUV2ZW50LnBhdGgpLCB0eXBlOiBscy5GaWxlQ2hhbmdlVHlwZS5DcmVhdGVkIH1dO1xuICAgICAgY2FzZSAnbW9kaWZpZWQnOlxuICAgICAgICByZXR1cm4gW3sgdXJpOiBDb252ZXJ0LnBhdGhUb1VyaShmaWxlRXZlbnQucGF0aCksIHR5cGU6IGxzLkZpbGVDaGFuZ2VUeXBlLkNoYW5nZWQgfV07XG4gICAgICBjYXNlICdkZWxldGVkJzpcbiAgICAgICAgcmV0dXJuIFt7IHVyaTogQ29udmVydC5wYXRoVG9VcmkoZmlsZUV2ZW50LnBhdGgpLCB0eXBlOiBscy5GaWxlQ2hhbmdlVHlwZS5EZWxldGVkIH1dO1xuICAgICAgY2FzZSAncmVuYW1lZCc6IHtcbiAgICAgICAgY29uc3QgcmVzdWx0czogQXJyYXk8eyB1cmk6IHN0cmluZywgdHlwZTogbHMuRmlsZUNoYW5nZVR5cGUgfT4gPSBbXTtcbiAgICAgICAgaWYgKGZpbGVFdmVudC5vbGRQYXRoKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHsgdXJpOiBDb252ZXJ0LnBhdGhUb1VyaShmaWxlRXZlbnQub2xkUGF0aCksIHR5cGU6IGxzLkZpbGVDaGFuZ2VUeXBlLkRlbGV0ZWQgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbGVFdmVudC5wYXRoKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHsgdXJpOiBDb252ZXJ0LnBhdGhUb1VyaShmaWxlRXZlbnQucGF0aCksIHR5cGU6IGxzLkZpbGVDaGFuZ2VUeXBlLkNyZWF0ZWQgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHN0YXRpYyBhdG9tSWRlRGlhZ25vc3RpY1RvTFNEaWFnbm9zdGljKGRpYWdub3N0aWM6IERpYWdub3N0aWMpOiBscy5EaWFnbm9zdGljIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmFuZ2U6IENvbnZlcnQuYXRvbVJhbmdlVG9MU1JhbmdlKGRpYWdub3N0aWMucmFuZ2UpLFxuICAgICAgc2V2ZXJpdHk6IENvbnZlcnQuZGlhZ25vc3RpY1R5cGVUb0xTU2V2ZXJpdHkoZGlhZ25vc3RpYy50eXBlKSxcbiAgICAgIHNvdXJjZTogZGlhZ25vc3RpYy5wcm92aWRlck5hbWUsXG4gICAgICBtZXNzYWdlOiBkaWFnbm9zdGljLnRleHQgfHwgJycsXG4gICAgfTtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgZGlhZ25vc3RpY1R5cGVUb0xTU2V2ZXJpdHkodHlwZTogRGlhZ25vc3RpY1R5cGUpOiBscy5EaWFnbm9zdGljU2V2ZXJpdHkge1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnRXJyb3InOlxuICAgICAgICByZXR1cm4gbHMuRGlhZ25vc3RpY1NldmVyaXR5LkVycm9yO1xuICAgICAgY2FzZSAnV2FybmluZyc6XG4gICAgICAgIHJldHVybiBscy5EaWFnbm9zdGljU2V2ZXJpdHkuV2FybmluZztcbiAgICAgIGNhc2UgJ0luZm8nOlxuICAgICAgICByZXR1cm4gbHMuRGlhZ25vc3RpY1NldmVyaXR5LkluZm9ybWF0aW9uO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgRXJyb3IoYFVuZXhwZWN0ZWQgZGlhZ25vc3RpYyB0eXBlICR7dHlwZX1gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGFuIGFycmF5IG9mIGxhbmd1YWdlIHNlcnZlciBwcm90b2NvbCB7VGV4dEVkaXR9IG9iamVjdHMgdG8gYW5cbiAgICogZXF1aXZhbGVudCBhcnJheSBvZiBBdG9tIHtUZXh0RWRpdH0gb2JqZWN0cy5cbiAgICpcbiAgICogQHBhcmFtIHRleHRFZGl0cyBUaGUgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIHtUZXh0RWRpdH0gb2JqZWN0cyB0byBjb252ZXJ0LlxuICAgKiBAcmV0dXJucyBBbiB7QXJyYXl9IG9mIEF0b20ge1RleHRFZGl0fSBvYmplY3RzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjb252ZXJ0THNUZXh0RWRpdHModGV4dEVkaXRzOiBscy5UZXh0RWRpdFtdIHwgbnVsbCk6IFRleHRFZGl0W10ge1xuICAgIHJldHVybiAodGV4dEVkaXRzIHx8IFtdKS5tYXAoQ29udmVydC5jb252ZXJ0THNUZXh0RWRpdCk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGEgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIHtUZXh0RWRpdH0gb2JqZWN0IHRvIHRoZVxuICAgKiBBdG9tIGVxdWl2YWxlbnQge1RleHRFZGl0fS5cbiAgICpcbiAgICogQHBhcmFtIHRleHRFZGl0cyBUaGUgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sIHtUZXh0RWRpdH0gb2JqZWN0cyB0byBjb252ZXJ0LlxuICAgKiBAcmV0dXJucyBBbiBBdG9tIHtUZXh0RWRpdH0gb2JqZWN0LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjb252ZXJ0THNUZXh0RWRpdCh0ZXh0RWRpdDogbHMuVGV4dEVkaXQpOiBUZXh0RWRpdCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9sZFJhbmdlOiBDb252ZXJ0LmxzUmFuZ2VUb0F0b21SYW5nZSh0ZXh0RWRpdC5yYW5nZSksXG4gICAgICBuZXdUZXh0OiB0ZXh0RWRpdC5uZXdUZXh0LFxuICAgIH07XG4gIH1cbn1cbiJdfQ==