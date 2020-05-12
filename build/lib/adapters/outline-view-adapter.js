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
const languageclient_1 = require("../languageclient");
const atom_1 = require("atom");
/**
 * Public: Adapts the documentSymbolProvider of the language server to the Outline View
 * supplied by Atom IDE UI.
 */
class OutlineViewAdapter {
    constructor() {
        this._cancellationTokens = new WeakMap();
    }
    /**
     * Public: Determine whether this adapter can be used to adapt a language server
     * based on the serverCapabilities matrix containing a documentSymbolProvider.
     *
     * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
     * @returns A {Boolean} indicating adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities) {
        return !!serverCapabilities.documentSymbolProvider;
    }
    /**
     * Public: Obtain the Outline for document via the {LanguageClientConnection} as identified
     * by the {TextEditor}.
     *
     * @param connection A {LanguageClientConnection} to the language server that will be queried
     *   for the outline.
     * @param editor The Atom {TextEditor} containing the text the Outline should represent.
     * @returns A {Promise} containing the {Outline} of this document.
     */
    getOutline(connection, editor) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield Utils.doWithCancellationToken(connection, this._cancellationTokens, (cancellationToken) => connection.documentSymbol({ textDocument: convert_1.default.editorToTextDocumentIdentifier(editor) }, cancellationToken));
            if (results.length === 0) {
                return {
                    outlineTrees: [],
                };
            }
            if (results[0].selectionRange !== undefined) {
                // If the server is giving back the newer DocumentSymbol format.
                return {
                    outlineTrees: OutlineViewAdapter.createHierarchicalOutlineTrees(results),
                };
            }
            else {
                // If the server is giving back the original SymbolInformation format.
                return {
                    outlineTrees: OutlineViewAdapter.createOutlineTrees(results),
                };
            }
        });
    }
    /**
     * Public: Create an {Array} of {OutlineTree}s from the Array of {DocumentSymbol} recieved
     * from the language server. This includes converting all the children nodes in the entire
     * hierarchy.
     *
     * @param symbols An {Array} of {DocumentSymbol}s received from the language server that
     *   should be converted to an {Array} of {OutlineTree}.
     * @returns An {Array} of {OutlineTree} containing the given symbols that the Outline View can display.
     */
    static createHierarchicalOutlineTrees(symbols) {
        // Sort all the incoming symbols
        symbols.sort((a, b) => {
            if (a.range.start.line !== b.range.start.line) {
                return a.range.start.line - b.range.start.line;
            }
            if (a.range.start.character !== b.range.start.character) {
                return a.range.start.character - b.range.start.character;
            }
            if (a.range.end.line !== b.range.end.line) {
                return a.range.end.line - b.range.end.line;
            }
            return a.range.end.character - b.range.end.character;
        });
        return symbols.map((symbol) => {
            const tree = OutlineViewAdapter.hierarchicalSymbolToOutline(symbol);
            if (symbol.children != null) {
                tree.children = OutlineViewAdapter.createHierarchicalOutlineTrees(symbol.children);
            }
            return tree;
        });
    }
    /**
     * Public: Create an {Array} of {OutlineTree}s from the Array of {SymbolInformation} recieved
     * from the language server. This includes determining the appropriate child and parent
     * relationships for the hierarchy.
     *
     * @param symbols An {Array} of {SymbolInformation}s received from the language server that
     *   should be converted to an {OutlineTree}.
     * @returns An {OutlineTree} containing the given symbols that the Outline View can display.
     */
    static createOutlineTrees(symbols) {
        symbols.sort((a, b) => (a.location.range.start.line === b.location.range.start.line
            ? a.location.range.start.character - b.location.range.start.character
            : a.location.range.start.line - b.location.range.start.line));
        // Temporarily keep containerName through the conversion process
        // Also filter out symbols without a name - it's part of the spec but some don't include it
        const allItems = symbols.filter((symbol) => symbol.name).map((symbol) => ({
            containerName: symbol.containerName,
            outline: OutlineViewAdapter.symbolToOutline(symbol),
        }));
        // Create a map of containers by name with all items that have that name
        const containers = allItems.reduce((map, item) => {
            const name = item.outline.representativeName;
            if (name != null) {
                const container = map.get(name);
                if (container == null) {
                    map.set(name, [item.outline]);
                }
                else {
                    container.push(item.outline);
                }
            }
            return map;
        }, new Map());
        const roots = [];
        // Put each item within its parent and extract out the roots
        for (const item of allItems) {
            const containerName = item.containerName;
            const child = item.outline;
            if (containerName == null || containerName === '') {
                roots.push(item.outline);
            }
            else {
                const possibleParents = containers.get(containerName);
                let closestParent = OutlineViewAdapter._getClosestParent(possibleParents, child);
                if (closestParent == null) {
                    closestParent = {
                        plainText: containerName,
                        representativeName: containerName,
                        startPosition: new atom_1.Point(0, 0),
                        children: [child],
                    };
                    roots.push(closestParent);
                    if (possibleParents == null) {
                        containers.set(containerName, [closestParent]);
                    }
                    else {
                        possibleParents.push(closestParent);
                    }
                }
                else {
                    closestParent.children.push(child);
                }
            }
        }
        return roots;
    }
    static _getClosestParent(candidates, child) {
        if (candidates == null || candidates.length === 0) {
            return null;
        }
        let parent;
        for (const candidate of candidates) {
            if (candidate !== child &&
                candidate.startPosition.isLessThanOrEqual(child.startPosition) &&
                (candidate.endPosition === undefined ||
                    (child.endPosition && candidate.endPosition.isGreaterThanOrEqual(child.endPosition)))) {
                if (parent === undefined ||
                    (parent.startPosition.isLessThanOrEqual(candidate.startPosition) ||
                        (parent.endPosition != null &&
                            candidate.endPosition &&
                            parent.endPosition.isGreaterThanOrEqual(candidate.endPosition)))) {
                    parent = candidate;
                }
            }
        }
        return parent || null;
    }
    /**
     * Public: Convert an individual {DocumentSymbol} from the language server
     * to an {OutlineTree} for use by the Outline View. It does NOT recursively
     * process the given symbol's children (if any).
     *
     * @param symbol The {DocumentSymbol} to convert to an {OutlineTree}.
     * @returns The {OutlineTree} corresponding to the given {DocumentSymbol}.
     */
    static hierarchicalSymbolToOutline(symbol) {
        const icon = OutlineViewAdapter.symbolKindToEntityKind(symbol.kind);
        return {
            tokenizedText: [
                {
                    kind: OutlineViewAdapter.symbolKindToTokenKind(symbol.kind),
                    value: symbol.name,
                },
            ],
            icon: icon != null ? icon : undefined,
            representativeName: symbol.name,
            startPosition: convert_1.default.positionToPoint(symbol.selectionRange.start),
            endPosition: convert_1.default.positionToPoint(symbol.selectionRange.end),
            children: [],
        };
    }
    /**
     * Public: Convert an individual {SymbolInformation} from the language server
     * to an {OutlineTree} for use by the Outline View.
     *
     * @param symbol The {SymbolInformation} to convert to an {OutlineTree}.
     * @returns The {OutlineTree} equivalent to the given {SymbolInformation}.
     */
    static symbolToOutline(symbol) {
        const icon = OutlineViewAdapter.symbolKindToEntityKind(symbol.kind);
        return {
            tokenizedText: [
                {
                    kind: OutlineViewAdapter.symbolKindToTokenKind(symbol.kind),
                    value: symbol.name,
                },
            ],
            icon: icon != null ? icon : undefined,
            representativeName: symbol.name,
            startPosition: convert_1.default.positionToPoint(symbol.location.range.start),
            endPosition: convert_1.default.positionToPoint(symbol.location.range.end),
            children: [],
        };
    }
    /**
     * Public: Convert a symbol kind into an outline entity kind used to determine
     * the styling such as the appropriate icon in the Outline View.
     *
     * @param symbol The numeric symbol kind received from the language server.
     * @returns A string representing the equivalent OutlineView entity kind.
     */
    static symbolKindToEntityKind(symbol) {
        switch (symbol) {
            case languageclient_1.SymbolKind.Array:
                return 'type-array';
            case languageclient_1.SymbolKind.Boolean:
                return 'type-boolean';
            case languageclient_1.SymbolKind.Class:
                return 'type-class';
            case languageclient_1.SymbolKind.Constant:
                return 'type-constant';
            case languageclient_1.SymbolKind.Constructor:
                return 'type-constructor';
            case languageclient_1.SymbolKind.Enum:
                return 'type-enum';
            case languageclient_1.SymbolKind.Field:
                return 'type-field';
            case languageclient_1.SymbolKind.File:
                return 'type-file';
            case languageclient_1.SymbolKind.Function:
                return 'type-function';
            case languageclient_1.SymbolKind.Interface:
                return 'type-interface';
            case languageclient_1.SymbolKind.Method:
                return 'type-method';
            case languageclient_1.SymbolKind.Module:
                return 'type-module';
            case languageclient_1.SymbolKind.Namespace:
                return 'type-namespace';
            case languageclient_1.SymbolKind.Number:
                return 'type-number';
            case languageclient_1.SymbolKind.Package:
                return 'type-package';
            case languageclient_1.SymbolKind.Property:
                return 'type-property';
            case languageclient_1.SymbolKind.String:
                return 'type-string';
            case languageclient_1.SymbolKind.Variable:
                return 'type-variable';
            case languageclient_1.SymbolKind.Struct:
                return 'type-class';
            case languageclient_1.SymbolKind.EnumMember:
                return 'type-constant';
            default:
                return null;
        }
    }
    /**
     * Public: Convert a symbol kind to the appropriate token kind used to syntax
     * highlight the symbol name in the Outline View.
     *
     * @param symbol The numeric symbol kind received from the language server.
     * @returns A string representing the equivalent syntax token kind.
     */
    static symbolKindToTokenKind(symbol) {
        switch (symbol) {
            case languageclient_1.SymbolKind.Class:
                return 'type';
            case languageclient_1.SymbolKind.Constructor:
                return 'constructor';
            case languageclient_1.SymbolKind.Method:
            case languageclient_1.SymbolKind.Function:
                return 'method';
            case languageclient_1.SymbolKind.String:
                return 'string';
            default:
                return 'plain';
        }
    }
}
exports.default = OutlineViewAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS12aWV3LWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvb3V0bGluZS12aWV3LWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFDQSx3Q0FBaUM7QUFDakMsa0NBQWtDO0FBRWxDLHNEQU0yQjtBQUMzQiwrQkFHYztBQUVkOzs7R0FHRztBQUNILE1BQXFCLGtCQUFrQjtJQUF2QztRQUVVLHdCQUFtQixHQUErRCxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBNFQxRyxDQUFDO0lBMVRDOzs7Ozs7O09BT0c7SUFDSSxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFzQztRQUMzRCxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQztJQUNyRCxDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDVSxVQUFVLENBQUMsVUFBb0MsRUFBRSxNQUFrQjs7WUFDOUUsTUFBTSxPQUFPLEdBQUcsTUFBTSxLQUFLLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FDOUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFlBQVksRUFBRSxpQkFBTyxDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FDL0csQ0FBQztZQUVGLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3hCLE9BQU87b0JBQ0wsWUFBWSxFQUFFLEVBQUU7aUJBQ2pCLENBQUM7YUFDSDtZQUVELElBQUssT0FBTyxDQUFDLENBQUMsQ0FBb0IsQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO2dCQUMvRCxnRUFBZ0U7Z0JBQ2hFLE9BQU87b0JBQ0wsWUFBWSxFQUFFLGtCQUFrQixDQUFDLDhCQUE4QixDQUM3RCxPQUEyQixDQUFDO2lCQUMvQixDQUFDO2FBQ0g7aUJB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O2dCQUN6QixPQUFPLGFBQWEsQ0FBQztZQUN2QixLQUFLLDJCQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3ZCLEtBQUssMkJBQVUsQ0FBQyxRQUFRO2dCQUN0QixPQUFPLFFBQVEsQ0FBQztZQUNsQixLQUFLLDJCQUFVLENBQUMsTUFBTTtnQkFDcEIsT0FBTyxRQUFRLENBQUM7WUFDbEI7Z0JBQ0UsT0FBTyxPQUFPLENBQUM7U0FDbEI7SUFDSCxDQUFDO0NBQ0Y7QUE5VEQscUNBOFRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXRvbUlkZSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IENhbmNlbGxhdGlvblRva2VuU291cmNlIH0gZnJvbSAndnNjb2RlLWpzb25ycGMnO1xuaW1wb3J0IHtcbiAgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICBTeW1ib2xLaW5kLFxuICBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG4gIFN5bWJvbEluZm9ybWF0aW9uLFxuICBEb2N1bWVudFN5bWJvbCxcbn0gZnJvbSAnLi4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IHtcbiAgUG9pbnQsXG4gIFRleHRFZGl0b3IsXG59IGZyb20gJ2F0b20nO1xuXG4vKipcbiAqIFB1YmxpYzogQWRhcHRzIHRoZSBkb2N1bWVudFN5bWJvbFByb3ZpZGVyIG9mIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdG8gdGhlIE91dGxpbmUgVmlld1xuICogc3VwcGxpZWQgYnkgQXRvbSBJREUgVUkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE91dGxpbmVWaWV3QWRhcHRlciB7XG5cbiAgcHJpdmF0ZSBfY2FuY2VsbGF0aW9uVG9rZW5zOiBXZWFrTWFwPExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbiwgQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2U+ID0gbmV3IFdlYWtNYXAoKTtcblxuICAvKipcbiAgICogUHVibGljOiBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGFkYXB0ZXIgY2FuIGJlIHVzZWQgdG8gYWRhcHQgYSBsYW5ndWFnZSBzZXJ2ZXJcbiAgICogYmFzZWQgb24gdGhlIHNlcnZlckNhcGFiaWxpdGllcyBtYXRyaXggY29udGFpbmluZyBhIGRvY3VtZW50U3ltYm9sUHJvdmlkZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzZXJ2ZXJDYXBhYmlsaXRpZXMgVGhlIHtTZXJ2ZXJDYXBhYmlsaXRpZXN9IG9mIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdG8gY29uc2lkZXIuXG4gICAqIEByZXR1cm5zIEEge0Jvb2xlYW59IGluZGljYXRpbmcgYWRhcHRlciBjYW4gYWRhcHQgdGhlIHNlcnZlciBiYXNlZCBvbiB0aGVcbiAgICogICBnaXZlbiBzZXJ2ZXJDYXBhYmlsaXRpZXMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNhbkFkYXB0KHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhc2VydmVyQ2FwYWJpbGl0aWVzLmRvY3VtZW50U3ltYm9sUHJvdmlkZXI7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBPYnRhaW4gdGhlIE91dGxpbmUgZm9yIGRvY3VtZW50IHZpYSB0aGUge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gYXMgaWRlbnRpZmllZFxuICAgKiBieSB0aGUge1RleHRFZGl0b3J9LlxuICAgKlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIGJlIHF1ZXJpZWRcbiAgICogICBmb3IgdGhlIG91dGxpbmUuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIHRleHQgdGhlIE91dGxpbmUgc2hvdWxkIHJlcHJlc2VudC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyB0aGUge091dGxpbmV9IG9mIHRoaXMgZG9jdW1lbnQuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZ2V0T3V0bGluZShjb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sIGVkaXRvcjogVGV4dEVkaXRvcik6IFByb21pc2U8YXRvbUlkZS5PdXRsaW5lIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBVdGlscy5kb1dpdGhDYW5jZWxsYXRpb25Ub2tlbihjb25uZWN0aW9uLCB0aGlzLl9jYW5jZWxsYXRpb25Ub2tlbnMsIChjYW5jZWxsYXRpb25Ub2tlbikgPT5cbiAgICAgIGNvbm5lY3Rpb24uZG9jdW1lbnRTeW1ib2woeyB0ZXh0RG9jdW1lbnQ6IENvbnZlcnQuZWRpdG9yVG9UZXh0RG9jdW1lbnRJZGVudGlmaWVyKGVkaXRvcikgfSwgY2FuY2VsbGF0aW9uVG9rZW4pLFxuICAgICk7XG5cbiAgICBpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG91dGxpbmVUcmVlczogW10sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICgocmVzdWx0c1swXSBhcyBEb2N1bWVudFN5bWJvbCkuc2VsZWN0aW9uUmFuZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gSWYgdGhlIHNlcnZlciBpcyBnaXZpbmcgYmFjayB0aGUgbmV3ZXIgRG9jdW1lbnRTeW1ib2wgZm9ybWF0LlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3V0bGluZVRyZWVzOiBPdXRsaW5lVmlld0FkYXB0ZXIuY3JlYXRlSGllcmFyY2hpY2FsT3V0bGluZVRyZWVzKFxuICAgICAgICAgIHJlc3VsdHMgYXMgRG9jdW1lbnRTeW1ib2xbXSksXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGUgc2VydmVyIGlzIGdpdmluZyBiYWNrIHRoZSBvcmlnaW5hbCBTeW1ib2xJbmZvcm1hdGlvbiBmb3JtYXQuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBvdXRsaW5lVHJlZXM6IE91dGxpbmVWaWV3QWRhcHRlci5jcmVhdGVPdXRsaW5lVHJlZXMoXG4gICAgICAgICAgcmVzdWx0cyBhcyBTeW1ib2xJbmZvcm1hdGlvbltdKSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIGFuIHtBcnJheX0gb2Yge091dGxpbmVUcmVlfXMgZnJvbSB0aGUgQXJyYXkgb2Yge0RvY3VtZW50U3ltYm9sfSByZWNpZXZlZFxuICAgKiBmcm9tIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuIFRoaXMgaW5jbHVkZXMgY29udmVydGluZyBhbGwgdGhlIGNoaWxkcmVuIG5vZGVzIGluIHRoZSBlbnRpcmVcbiAgICogaGllcmFyY2h5LlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9scyBBbiB7QXJyYXl9IG9mIHtEb2N1bWVudFN5bWJvbH1zIHJlY2VpdmVkIGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0XG4gICAqICAgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byBhbiB7QXJyYXl9IG9mIHtPdXRsaW5lVHJlZX0uXG4gICAqIEByZXR1cm5zIEFuIHtBcnJheX0gb2Yge091dGxpbmVUcmVlfSBjb250YWluaW5nIHRoZSBnaXZlbiBzeW1ib2xzIHRoYXQgdGhlIE91dGxpbmUgVmlldyBjYW4gZGlzcGxheS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY3JlYXRlSGllcmFyY2hpY2FsT3V0bGluZVRyZWVzKHN5bWJvbHM6IERvY3VtZW50U3ltYm9sW10pOiBhdG9tSWRlLk91dGxpbmVUcmVlW10ge1xuICAgIC8vIFNvcnQgYWxsIHRoZSBpbmNvbWluZyBzeW1ib2xzXG4gICAgc3ltYm9scy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICBpZiAoYS5yYW5nZS5zdGFydC5saW5lICE9PSBiLnJhbmdlLnN0YXJ0LmxpbmUpIHtcbiAgICAgICAgcmV0dXJuIGEucmFuZ2Uuc3RhcnQubGluZSAtIGIucmFuZ2Uuc3RhcnQubGluZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGEucmFuZ2Uuc3RhcnQuY2hhcmFjdGVyICE9PSBiLnJhbmdlLnN0YXJ0LmNoYXJhY3Rlcikge1xuICAgICAgICByZXR1cm4gYS5yYW5nZS5zdGFydC5jaGFyYWN0ZXIgLSBiLnJhbmdlLnN0YXJ0LmNoYXJhY3RlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGEucmFuZ2UuZW5kLmxpbmUgIT09IGIucmFuZ2UuZW5kLmxpbmUpIHtcbiAgICAgICAgcmV0dXJuIGEucmFuZ2UuZW5kLmxpbmUgLSBiLnJhbmdlLmVuZC5saW5lO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYS5yYW5nZS5lbmQuY2hhcmFjdGVyIC0gYi5yYW5nZS5lbmQuY2hhcmFjdGVyO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN5bWJvbHMubWFwKChzeW1ib2wpID0+IHtcbiAgICAgIGNvbnN0IHRyZWUgPSBPdXRsaW5lVmlld0FkYXB0ZXIuaGllcmFyY2hpY2FsU3ltYm9sVG9PdXRsaW5lKHN5bWJvbCk7XG5cbiAgICAgIGlmIChzeW1ib2wuY2hpbGRyZW4gIT0gbnVsbCkge1xuICAgICAgICB0cmVlLmNoaWxkcmVuID0gT3V0bGluZVZpZXdBZGFwdGVyLmNyZWF0ZUhpZXJhcmNoaWNhbE91dGxpbmVUcmVlcyhcbiAgICAgICAgICBzeW1ib2wuY2hpbGRyZW4pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJlZTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSBhbiB7QXJyYXl9IG9mIHtPdXRsaW5lVHJlZX1zIGZyb20gdGhlIEFycmF5IG9mIHtTeW1ib2xJbmZvcm1hdGlvbn0gcmVjaWV2ZWRcbiAgICogZnJvbSB0aGUgbGFuZ3VhZ2Ugc2VydmVyLiBUaGlzIGluY2x1ZGVzIGRldGVybWluaW5nIHRoZSBhcHByb3ByaWF0ZSBjaGlsZCBhbmQgcGFyZW50XG4gICAqIHJlbGF0aW9uc2hpcHMgZm9yIHRoZSBoaWVyYXJjaHkuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2xzIEFuIHtBcnJheX0gb2Yge1N5bWJvbEluZm9ybWF0aW9ufXMgcmVjZWl2ZWQgZnJvbSB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXRcbiAgICogICBzaG91bGQgYmUgY29udmVydGVkIHRvIGFuIHtPdXRsaW5lVHJlZX0uXG4gICAqIEByZXR1cm5zIEFuIHtPdXRsaW5lVHJlZX0gY29udGFpbmluZyB0aGUgZ2l2ZW4gc3ltYm9scyB0aGF0IHRoZSBPdXRsaW5lIFZpZXcgY2FuIGRpc3BsYXkuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNyZWF0ZU91dGxpbmVUcmVlcyhzeW1ib2xzOiBTeW1ib2xJbmZvcm1hdGlvbltdKTogYXRvbUlkZS5PdXRsaW5lVHJlZVtdIHtcbiAgICBzeW1ib2xzLnNvcnQoXG4gICAgICAoYSwgYikgPT5cbiAgICAgICAgKGEubG9jYXRpb24ucmFuZ2Uuc3RhcnQubGluZSA9PT0gYi5sb2NhdGlvbi5yYW5nZS5zdGFydC5saW5lXG4gICAgICAgICAgPyBhLmxvY2F0aW9uLnJhbmdlLnN0YXJ0LmNoYXJhY3RlciAtIGIubG9jYXRpb24ucmFuZ2Uuc3RhcnQuY2hhcmFjdGVyXG4gICAgICAgICAgOiBhLmxvY2F0aW9uLnJhbmdlLnN0YXJ0LmxpbmUgLSBiLmxvY2F0aW9uLnJhbmdlLnN0YXJ0LmxpbmUpLFxuICAgICk7XG5cbiAgICAvLyBUZW1wb3JhcmlseSBrZWVwIGNvbnRhaW5lck5hbWUgdGhyb3VnaCB0aGUgY29udmVyc2lvbiBwcm9jZXNzXG4gICAgLy8gQWxzbyBmaWx0ZXIgb3V0IHN5bWJvbHMgd2l0aG91dCBhIG5hbWUgLSBpdCdzIHBhcnQgb2YgdGhlIHNwZWMgYnV0IHNvbWUgZG9uJ3QgaW5jbHVkZSBpdFxuICAgIGNvbnN0IGFsbEl0ZW1zID0gc3ltYm9scy5maWx0ZXIoKHN5bWJvbCkgPT4gc3ltYm9sLm5hbWUpLm1hcCgoc3ltYm9sKSA9PiAoe1xuICAgICAgY29udGFpbmVyTmFtZTogc3ltYm9sLmNvbnRhaW5lck5hbWUsXG4gICAgICBvdXRsaW5lOiBPdXRsaW5lVmlld0FkYXB0ZXIuc3ltYm9sVG9PdXRsaW5lKHN5bWJvbCksXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIGEgbWFwIG9mIGNvbnRhaW5lcnMgYnkgbmFtZSB3aXRoIGFsbCBpdGVtcyB0aGF0IGhhdmUgdGhhdCBuYW1lXG4gICAgY29uc3QgY29udGFpbmVycyA9IGFsbEl0ZW1zLnJlZHVjZSgobWFwLCBpdGVtKSA9PiB7XG4gICAgICBjb25zdCBuYW1lID0gaXRlbS5vdXRsaW5lLnJlcHJlc2VudGF0aXZlTmFtZTtcbiAgICAgIGlmIChuYW1lICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbWFwLmdldChuYW1lKTtcbiAgICAgICAgaWYgKGNvbnRhaW5lciA9PSBudWxsKSB7XG4gICAgICAgICAgbWFwLnNldChuYW1lLCBbaXRlbS5vdXRsaW5lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29udGFpbmVyLnB1c2goaXRlbS5vdXRsaW5lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG1hcDtcbiAgICB9LCBuZXcgTWFwKCkpO1xuXG4gICAgY29uc3Qgcm9vdHM6IGF0b21JZGUuT3V0bGluZVRyZWVbXSA9IFtdO1xuXG4gICAgLy8gUHV0IGVhY2ggaXRlbSB3aXRoaW4gaXRzIHBhcmVudCBhbmQgZXh0cmFjdCBvdXQgdGhlIHJvb3RzXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGFsbEl0ZW1zKSB7XG4gICAgICBjb25zdCBjb250YWluZXJOYW1lID0gaXRlbS5jb250YWluZXJOYW1lO1xuICAgICAgY29uc3QgY2hpbGQgPSBpdGVtLm91dGxpbmU7XG4gICAgICBpZiAoY29udGFpbmVyTmFtZSA9PSBudWxsIHx8IGNvbnRhaW5lck5hbWUgPT09ICcnKSB7XG4gICAgICAgIHJvb3RzLnB1c2goaXRlbS5vdXRsaW5lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBvc3NpYmxlUGFyZW50cyA9IGNvbnRhaW5lcnMuZ2V0KGNvbnRhaW5lck5hbWUpO1xuICAgICAgICBsZXQgY2xvc2VzdFBhcmVudCA9IE91dGxpbmVWaWV3QWRhcHRlci5fZ2V0Q2xvc2VzdFBhcmVudChwb3NzaWJsZVBhcmVudHMsIGNoaWxkKTtcbiAgICAgICAgaWYgKGNsb3Nlc3RQYXJlbnQgPT0gbnVsbCkge1xuICAgICAgICAgIGNsb3Nlc3RQYXJlbnQgPSB7XG4gICAgICAgICAgICBwbGFpblRleHQ6IGNvbnRhaW5lck5hbWUsXG4gICAgICAgICAgICByZXByZXNlbnRhdGl2ZU5hbWU6IGNvbnRhaW5lck5hbWUsXG4gICAgICAgICAgICBzdGFydFBvc2l0aW9uOiBuZXcgUG9pbnQoMCwgMCksXG4gICAgICAgICAgICBjaGlsZHJlbjogW2NoaWxkXSxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJvb3RzLnB1c2goY2xvc2VzdFBhcmVudCk7XG4gICAgICAgICAgaWYgKHBvc3NpYmxlUGFyZW50cyA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb250YWluZXJzLnNldChjb250YWluZXJOYW1lLCBbY2xvc2VzdFBhcmVudF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3NzaWJsZVBhcmVudHMucHVzaChjbG9zZXN0UGFyZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2xvc2VzdFBhcmVudC5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByb290cztcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIF9nZXRDbG9zZXN0UGFyZW50KFxuICAgIGNhbmRpZGF0ZXM6IGF0b21JZGUuT3V0bGluZVRyZWVbXSB8IG51bGwsXG4gICAgY2hpbGQ6IGF0b21JZGUuT3V0bGluZVRyZWUsXG4gICk6IGF0b21JZGUuT3V0bGluZVRyZWUgfCBudWxsIHtcbiAgICBpZiAoY2FuZGlkYXRlcyA9PSBudWxsIHx8IGNhbmRpZGF0ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgcGFyZW50OiBhdG9tSWRlLk91dGxpbmVUcmVlIHwgdW5kZWZpbmVkO1xuICAgIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgIGlmIChcbiAgICAgICAgY2FuZGlkYXRlICE9PSBjaGlsZCAmJlxuICAgICAgICBjYW5kaWRhdGUuc3RhcnRQb3NpdGlvbi5pc0xlc3NUaGFuT3JFcXVhbChjaGlsZC5zdGFydFBvc2l0aW9uKSAmJlxuICAgICAgICAoY2FuZGlkYXRlLmVuZFBvc2l0aW9uID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAoY2hpbGQuZW5kUG9zaXRpb24gJiYgY2FuZGlkYXRlLmVuZFBvc2l0aW9uLmlzR3JlYXRlclRoYW5PckVxdWFsKGNoaWxkLmVuZFBvc2l0aW9uKSkpXG4gICAgICApIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHBhcmVudCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgKHBhcmVudC5zdGFydFBvc2l0aW9uLmlzTGVzc1RoYW5PckVxdWFsKGNhbmRpZGF0ZS5zdGFydFBvc2l0aW9uKSB8fFxuICAgICAgICAgICAgKHBhcmVudC5lbmRQb3NpdGlvbiAhPSBudWxsICYmXG4gICAgICAgICAgICAgIGNhbmRpZGF0ZS5lbmRQb3NpdGlvbiAmJlxuICAgICAgICAgICAgICBwYXJlbnQuZW5kUG9zaXRpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWwoY2FuZGlkYXRlLmVuZFBvc2l0aW9uKSkpXG4gICAgICAgICkge1xuICAgICAgICAgIHBhcmVudCA9IGNhbmRpZGF0ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwYXJlbnQgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYW4gaW5kaXZpZHVhbCB7RG9jdW1lbnRTeW1ib2x9IGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlclxuICAgKiB0byBhbiB7T3V0bGluZVRyZWV9IGZvciB1c2UgYnkgdGhlIE91dGxpbmUgVmlldy4gSXQgZG9lcyBOT1QgcmVjdXJzaXZlbHlcbiAgICogcHJvY2VzcyB0aGUgZ2l2ZW4gc3ltYm9sJ3MgY2hpbGRyZW4gKGlmIGFueSkuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgVGhlIHtEb2N1bWVudFN5bWJvbH0gdG8gY29udmVydCB0byBhbiB7T3V0bGluZVRyZWV9LlxuICAgKiBAcmV0dXJucyBUaGUge091dGxpbmVUcmVlfSBjb3JyZXNwb25kaW5nIHRvIHRoZSBnaXZlbiB7RG9jdW1lbnRTeW1ib2x9LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBoaWVyYXJjaGljYWxTeW1ib2xUb091dGxpbmUoc3ltYm9sOiBEb2N1bWVudFN5bWJvbCk6IGF0b21JZGUuT3V0bGluZVRyZWUge1xuICAgIGNvbnN0IGljb24gPSBPdXRsaW5lVmlld0FkYXB0ZXIuc3ltYm9sS2luZFRvRW50aXR5S2luZChzeW1ib2wua2luZCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9rZW5pemVkVGV4dDogW1xuICAgICAgICB7XG4gICAgICAgICAga2luZDogT3V0bGluZVZpZXdBZGFwdGVyLnN5bWJvbEtpbmRUb1Rva2VuS2luZChzeW1ib2wua2luZCksXG4gICAgICAgICAgdmFsdWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGljb246IGljb24gIT0gbnVsbCA/IGljb24gOiB1bmRlZmluZWQsXG4gICAgICByZXByZXNlbnRhdGl2ZU5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgc3RhcnRQb3NpdGlvbjogQ29udmVydC5wb3NpdGlvblRvUG9pbnQoc3ltYm9sLnNlbGVjdGlvblJhbmdlLnN0YXJ0KSxcbiAgICAgIGVuZFBvc2l0aW9uOiBDb252ZXJ0LnBvc2l0aW9uVG9Qb2ludChzeW1ib2wuc2VsZWN0aW9uUmFuZ2UuZW5kKSxcbiAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhbiBpbmRpdmlkdWFsIHtTeW1ib2xJbmZvcm1hdGlvbn0gZnJvbSB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqIHRvIGFuIHtPdXRsaW5lVHJlZX0gZm9yIHVzZSBieSB0aGUgT3V0bGluZSBWaWV3LlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIFRoZSB7U3ltYm9sSW5mb3JtYXRpb259IHRvIGNvbnZlcnQgdG8gYW4ge091dGxpbmVUcmVlfS5cbiAgICogQHJldHVybnMgVGhlIHtPdXRsaW5lVHJlZX0gZXF1aXZhbGVudCB0byB0aGUgZ2l2ZW4ge1N5bWJvbEluZm9ybWF0aW9ufS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgc3ltYm9sVG9PdXRsaW5lKHN5bWJvbDogU3ltYm9sSW5mb3JtYXRpb24pOiBhdG9tSWRlLk91dGxpbmVUcmVlIHtcbiAgICBjb25zdCBpY29uID0gT3V0bGluZVZpZXdBZGFwdGVyLnN5bWJvbEtpbmRUb0VudGl0eUtpbmQoc3ltYm9sLmtpbmQpO1xuICAgIHJldHVybiB7XG4gICAgICB0b2tlbml6ZWRUZXh0OiBbXG4gICAgICAgIHtcbiAgICAgICAgICBraW5kOiBPdXRsaW5lVmlld0FkYXB0ZXIuc3ltYm9sS2luZFRvVG9rZW5LaW5kKHN5bWJvbC5raW5kKSxcbiAgICAgICAgICB2YWx1ZTogc3ltYm9sLm5hbWUsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgaWNvbjogaWNvbiAhPSBudWxsID8gaWNvbiA6IHVuZGVmaW5lZCxcbiAgICAgIHJlcHJlc2VudGF0aXZlTmFtZTogc3ltYm9sLm5hbWUsXG4gICAgICBzdGFydFBvc2l0aW9uOiBDb252ZXJ0LnBvc2l0aW9uVG9Qb2ludChzeW1ib2wubG9jYXRpb24ucmFuZ2Uuc3RhcnQpLFxuICAgICAgZW5kUG9zaXRpb246IENvbnZlcnQucG9zaXRpb25Ub1BvaW50KHN5bWJvbC5sb2NhdGlvbi5yYW5nZS5lbmQpLFxuICAgICAgY2hpbGRyZW46IFtdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGEgc3ltYm9sIGtpbmQgaW50byBhbiBvdXRsaW5lIGVudGl0eSBraW5kIHVzZWQgdG8gZGV0ZXJtaW5lXG4gICAqIHRoZSBzdHlsaW5nIHN1Y2ggYXMgdGhlIGFwcHJvcHJpYXRlIGljb24gaW4gdGhlIE91dGxpbmUgVmlldy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCBUaGUgbnVtZXJpYyBzeW1ib2wga2luZCByZWNlaXZlZCBmcm9tIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqIEByZXR1cm5zIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZXF1aXZhbGVudCBPdXRsaW5lVmlldyBlbnRpdHkga2luZC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgc3ltYm9sS2luZFRvRW50aXR5S2luZChzeW1ib2w6IG51bWJlcik6IHN0cmluZyB8IG51bGwge1xuICAgIHN3aXRjaCAoc3ltYm9sKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuQXJyYXk6XG4gICAgICAgIHJldHVybiAndHlwZS1hcnJheSc7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuQm9vbGVhbjpcbiAgICAgICAgcmV0dXJuICd0eXBlLWJvb2xlYW4nO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkNsYXNzOlxuICAgICAgICByZXR1cm4gJ3R5cGUtY2xhc3MnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkNvbnN0YW50OlxuICAgICAgICByZXR1cm4gJ3R5cGUtY29uc3RhbnQnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkNvbnN0cnVjdG9yOlxuICAgICAgICByZXR1cm4gJ3R5cGUtY29uc3RydWN0b3InO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkVudW06XG4gICAgICAgIHJldHVybiAndHlwZS1lbnVtJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5GaWVsZDpcbiAgICAgICAgcmV0dXJuICd0eXBlLWZpZWxkJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5GaWxlOlxuICAgICAgICByZXR1cm4gJ3R5cGUtZmlsZSc7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRnVuY3Rpb246XG4gICAgICAgIHJldHVybiAndHlwZS1mdW5jdGlvbic7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuSW50ZXJmYWNlOlxuICAgICAgICByZXR1cm4gJ3R5cGUtaW50ZXJmYWNlJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5NZXRob2Q6XG4gICAgICAgIHJldHVybiAndHlwZS1tZXRob2QnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLk1vZHVsZTpcbiAgICAgICAgcmV0dXJuICd0eXBlLW1vZHVsZSc7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuTmFtZXNwYWNlOlxuICAgICAgICByZXR1cm4gJ3R5cGUtbmFtZXNwYWNlJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5OdW1iZXI6XG4gICAgICAgIHJldHVybiAndHlwZS1udW1iZXInO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlBhY2thZ2U6XG4gICAgICAgIHJldHVybiAndHlwZS1wYWNrYWdlJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5Qcm9wZXJ0eTpcbiAgICAgICAgcmV0dXJuICd0eXBlLXByb3BlcnR5JztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5TdHJpbmc6XG4gICAgICAgIHJldHVybiAndHlwZS1zdHJpbmcnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOlxuICAgICAgICByZXR1cm4gJ3R5cGUtdmFyaWFibGUnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlN0cnVjdDpcbiAgICAgICAgcmV0dXJuICd0eXBlLWNsYXNzJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FbnVtTWVtYmVyOlxuICAgICAgICByZXR1cm4gJ3R5cGUtY29uc3RhbnQnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhIHN5bWJvbCBraW5kIHRvIHRoZSBhcHByb3ByaWF0ZSB0b2tlbiBraW5kIHVzZWQgdG8gc3ludGF4XG4gICAqIGhpZ2hsaWdodCB0aGUgc3ltYm9sIG5hbWUgaW4gdGhlIE91dGxpbmUgVmlldy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCBUaGUgbnVtZXJpYyBzeW1ib2wga2luZCByZWNlaXZlZCBmcm9tIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqIEByZXR1cm5zIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZXF1aXZhbGVudCBzeW50YXggdG9rZW4ga2luZC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgc3ltYm9sS2luZFRvVG9rZW5LaW5kKHN5bWJvbDogbnVtYmVyKTogYXRvbUlkZS5Ub2tlbktpbmQge1xuICAgIHN3aXRjaCAoc3ltYm9sKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuQ2xhc3M6XG4gICAgICAgIHJldHVybiAndHlwZSc7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuQ29uc3RydWN0b3I6XG4gICAgICAgIHJldHVybiAnY29uc3RydWN0b3InO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLk1ldGhvZDpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5GdW5jdGlvbjpcbiAgICAgICAgcmV0dXJuICdtZXRob2QnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlN0cmluZzpcbiAgICAgICAgcmV0dXJuICdzdHJpbmcnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICdwbGFpbic7XG4gICAgfVxuICB9XG59XG4iXX0=