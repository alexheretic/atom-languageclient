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
        return serverCapabilities.documentSymbolProvider === true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS12aWV3LWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvb3V0bGluZS12aWV3LWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUNBLHdDQUFpQztBQUNqQyxrQ0FBa0M7QUFFbEMsc0RBTTJCO0FBQzNCLCtCQUdjO0FBRWQ7OztHQUdHO0FBQ0gsTUFBcUIsa0JBQWtCO0lBQXZDO1FBRVUsd0JBQW1CLEdBQStELElBQUksT0FBTyxFQUFFLENBQUM7SUE0VDFHLENBQUM7SUExVEM7Ozs7Ozs7T0FPRztJQUNJLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sa0JBQWtCLENBQUMsc0JBQXNCLEtBQUssSUFBSSxDQUFDO0lBQzVELENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNVLFVBQVUsQ0FBQyxVQUFvQyxFQUFFLE1BQWtCOztZQUM5RSxNQUFNLE9BQU8sR0FBRyxNQUFNLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUM5RyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBWSxFQUFFLGlCQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUMvRyxDQUFDO1lBRUYsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDeEIsT0FBTztvQkFDTCxZQUFZLEVBQUUsRUFBRTtpQkFDakIsQ0FBQzthQUNIO1lBRUQsSUFBSyxPQUFPLENBQUMsQ0FBQyxDQUFvQixDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUU7Z0JBQy9ELGdFQUFnRTtnQkFDaEUsT0FBTztvQkFDTCxZQUFZLEVBQUUsa0JBQWtCLENBQUMsOEJBQThCLENBQzdELE9BQTJCLENBQUM7aUJBQy9CLENBQUM7YUFDSDtpQkFB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Z0JBQ3pCLE9BQU8sYUFBYSxDQUFDO1lBQ3ZCLEtBQUssMkJBQVUsQ0FBQyxNQUFNLENBQUM7WUFDdkIsS0FBSywyQkFBVSxDQUFDLFFBQVE7Z0JBQ3RCLE9BQU8sUUFBUSxDQUFDO1lBQ2xCLEtBQUssMkJBQVUsQ0FBQyxNQUFNO2dCQUNwQixPQUFPLFFBQVEsQ0FBQztZQUNsQjtnQkFDRSxPQUFPLE9BQU8sQ0FBQztTQUNsQjtJQUNILENBQUM7Q0FDRjtBQTlURCxxQ0E4VEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhdG9tSWRlIGZyb20gJ2F0b20taWRlJztcbmltcG9ydCBDb252ZXJ0IGZyb20gJy4uL2NvbnZlcnQnO1xuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UgfSBmcm9tICd2c2NvZGUtanNvbnJwYyc7XG5pbXBvcnQge1xuICBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gIFN5bWJvbEtpbmQsXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbiAgU3ltYm9sSW5mb3JtYXRpb24sXG4gIERvY3VtZW50U3ltYm9sLFxufSBmcm9tICcuLi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQge1xuICBQb2ludCxcbiAgVGV4dEVkaXRvcixcbn0gZnJvbSAnYXRvbSc7XG5cbi8qKlxuICogUHVibGljOiBBZGFwdHMgdGhlIGRvY3VtZW50U3ltYm9sUHJvdmlkZXIgb2YgdGhlIGxhbmd1YWdlIHNlcnZlciB0byB0aGUgT3V0bGluZSBWaWV3XG4gKiBzdXBwbGllZCBieSBBdG9tIElERSBVSS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgT3V0bGluZVZpZXdBZGFwdGVyIHtcblxuICBwcml2YXRlIF9jYW5jZWxsYXRpb25Ub2tlbnM6IFdlYWtNYXA8TGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLCBDYW5jZWxsYXRpb25Ub2tlblNvdXJjZT4gPSBuZXcgV2Vha01hcCgpO1xuXG4gIC8qKlxuICAgKiBQdWJsaWM6IERldGVybWluZSB3aGV0aGVyIHRoaXMgYWRhcHRlciBjYW4gYmUgdXNlZCB0byBhZGFwdCBhIGxhbmd1YWdlIHNlcnZlclxuICAgKiBiYXNlZCBvbiB0aGUgc2VydmVyQ2FwYWJpbGl0aWVzIG1hdHJpeCBjb250YWluaW5nIGEgZG9jdW1lbnRTeW1ib2xQcm92aWRlci5cbiAgICpcbiAgICogQHBhcmFtIHNlcnZlckNhcGFiaWxpdGllcyBUaGUge1NlcnZlckNhcGFiaWxpdGllc30gb2YgdGhlIGxhbmd1YWdlIHNlcnZlciB0byBjb25zaWRlci5cbiAgICogQHJldHVybnMgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyBhZGFwdGVyIGNhbiBhZGFwdCB0aGUgc2VydmVyIGJhc2VkIG9uIHRoZVxuICAgKiAgIGdpdmVuIHNlcnZlckNhcGFiaWxpdGllcy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY2FuQWRhcHQoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICByZXR1cm4gc2VydmVyQ2FwYWJpbGl0aWVzLmRvY3VtZW50U3ltYm9sUHJvdmlkZXIgPT09IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBPYnRhaW4gdGhlIE91dGxpbmUgZm9yIGRvY3VtZW50IHZpYSB0aGUge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gYXMgaWRlbnRpZmllZFxuICAgKiBieSB0aGUge1RleHRFZGl0b3J9LlxuICAgKlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIGJlIHF1ZXJpZWRcbiAgICogICBmb3IgdGhlIG91dGxpbmUuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIHRleHQgdGhlIE91dGxpbmUgc2hvdWxkIHJlcHJlc2VudC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gY29udGFpbmluZyB0aGUge091dGxpbmV9IG9mIHRoaXMgZG9jdW1lbnQuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZ2V0T3V0bGluZShjb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sIGVkaXRvcjogVGV4dEVkaXRvcik6IFByb21pc2U8YXRvbUlkZS5PdXRsaW5lIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBVdGlscy5kb1dpdGhDYW5jZWxsYXRpb25Ub2tlbihjb25uZWN0aW9uLCB0aGlzLl9jYW5jZWxsYXRpb25Ub2tlbnMsIChjYW5jZWxsYXRpb25Ub2tlbikgPT5cbiAgICAgIGNvbm5lY3Rpb24uZG9jdW1lbnRTeW1ib2woeyB0ZXh0RG9jdW1lbnQ6IENvbnZlcnQuZWRpdG9yVG9UZXh0RG9jdW1lbnRJZGVudGlmaWVyKGVkaXRvcikgfSwgY2FuY2VsbGF0aW9uVG9rZW4pLFxuICAgICk7XG5cbiAgICBpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG91dGxpbmVUcmVlczogW10sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICgocmVzdWx0c1swXSBhcyBEb2N1bWVudFN5bWJvbCkuc2VsZWN0aW9uUmFuZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gSWYgdGhlIHNlcnZlciBpcyBnaXZpbmcgYmFjayB0aGUgbmV3ZXIgRG9jdW1lbnRTeW1ib2wgZm9ybWF0LlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3V0bGluZVRyZWVzOiBPdXRsaW5lVmlld0FkYXB0ZXIuY3JlYXRlSGllcmFyY2hpY2FsT3V0bGluZVRyZWVzKFxuICAgICAgICAgIHJlc3VsdHMgYXMgRG9jdW1lbnRTeW1ib2xbXSksXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGUgc2VydmVyIGlzIGdpdmluZyBiYWNrIHRoZSBvcmlnaW5hbCBTeW1ib2xJbmZvcm1hdGlvbiBmb3JtYXQuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBvdXRsaW5lVHJlZXM6IE91dGxpbmVWaWV3QWRhcHRlci5jcmVhdGVPdXRsaW5lVHJlZXMoXG4gICAgICAgICAgcmVzdWx0cyBhcyBTeW1ib2xJbmZvcm1hdGlvbltdKSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ3JlYXRlIGFuIHtBcnJheX0gb2Yge091dGxpbmVUcmVlfXMgZnJvbSB0aGUgQXJyYXkgb2Yge0RvY3VtZW50U3ltYm9sfSByZWNpZXZlZFxuICAgKiBmcm9tIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuIFRoaXMgaW5jbHVkZXMgY29udmVydGluZyBhbGwgdGhlIGNoaWxkcmVuIG5vZGVzIGluIHRoZSBlbnRpcmVcbiAgICogaGllcmFyY2h5LlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9scyBBbiB7QXJyYXl9IG9mIHtEb2N1bWVudFN5bWJvbH1zIHJlY2VpdmVkIGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0XG4gICAqICAgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byBhbiB7QXJyYXl9IG9mIHtPdXRsaW5lVHJlZX0uXG4gICAqIEByZXR1cm5zIEFuIHtBcnJheX0gb2Yge091dGxpbmVUcmVlfSBjb250YWluaW5nIHRoZSBnaXZlbiBzeW1ib2xzIHRoYXQgdGhlIE91dGxpbmUgVmlldyBjYW4gZGlzcGxheS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY3JlYXRlSGllcmFyY2hpY2FsT3V0bGluZVRyZWVzKHN5bWJvbHM6IERvY3VtZW50U3ltYm9sW10pOiBhdG9tSWRlLk91dGxpbmVUcmVlW10ge1xuICAgIC8vIFNvcnQgYWxsIHRoZSBpbmNvbWluZyBzeW1ib2xzXG4gICAgc3ltYm9scy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICBpZiAoYS5yYW5nZS5zdGFydC5saW5lICE9PSBiLnJhbmdlLnN0YXJ0LmxpbmUpIHtcbiAgICAgICAgcmV0dXJuIGEucmFuZ2Uuc3RhcnQubGluZSAtIGIucmFuZ2Uuc3RhcnQubGluZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGEucmFuZ2Uuc3RhcnQuY2hhcmFjdGVyICE9PSBiLnJhbmdlLnN0YXJ0LmNoYXJhY3Rlcikge1xuICAgICAgICByZXR1cm4gYS5yYW5nZS5zdGFydC5jaGFyYWN0ZXIgLSBiLnJhbmdlLnN0YXJ0LmNoYXJhY3RlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGEucmFuZ2UuZW5kLmxpbmUgIT09IGIucmFuZ2UuZW5kLmxpbmUpIHtcbiAgICAgICAgcmV0dXJuIGEucmFuZ2UuZW5kLmxpbmUgLSBiLnJhbmdlLmVuZC5saW5lO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYS5yYW5nZS5lbmQuY2hhcmFjdGVyIC0gYi5yYW5nZS5lbmQuY2hhcmFjdGVyO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN5bWJvbHMubWFwKChzeW1ib2wpID0+IHtcbiAgICAgIGNvbnN0IHRyZWUgPSBPdXRsaW5lVmlld0FkYXB0ZXIuaGllcmFyY2hpY2FsU3ltYm9sVG9PdXRsaW5lKHN5bWJvbCk7XG5cbiAgICAgIGlmIChzeW1ib2wuY2hpbGRyZW4gIT0gbnVsbCkge1xuICAgICAgICB0cmVlLmNoaWxkcmVuID0gT3V0bGluZVZpZXdBZGFwdGVyLmNyZWF0ZUhpZXJhcmNoaWNhbE91dGxpbmVUcmVlcyhcbiAgICAgICAgICBzeW1ib2wuY2hpbGRyZW4pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJlZTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENyZWF0ZSBhbiB7QXJyYXl9IG9mIHtPdXRsaW5lVHJlZX1zIGZyb20gdGhlIEFycmF5IG9mIHtTeW1ib2xJbmZvcm1hdGlvbn0gcmVjaWV2ZWRcbiAgICogZnJvbSB0aGUgbGFuZ3VhZ2Ugc2VydmVyLiBUaGlzIGluY2x1ZGVzIGRldGVybWluaW5nIHRoZSBhcHByb3ByaWF0ZSBjaGlsZCBhbmQgcGFyZW50XG4gICAqIHJlbGF0aW9uc2hpcHMgZm9yIHRoZSBoaWVyYXJjaHkuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2xzIEFuIHtBcnJheX0gb2Yge1N5bWJvbEluZm9ybWF0aW9ufXMgcmVjZWl2ZWQgZnJvbSB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXRcbiAgICogICBzaG91bGQgYmUgY29udmVydGVkIHRvIGFuIHtPdXRsaW5lVHJlZX0uXG4gICAqIEByZXR1cm5zIEFuIHtPdXRsaW5lVHJlZX0gY29udGFpbmluZyB0aGUgZ2l2ZW4gc3ltYm9scyB0aGF0IHRoZSBPdXRsaW5lIFZpZXcgY2FuIGRpc3BsYXkuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGNyZWF0ZU91dGxpbmVUcmVlcyhzeW1ib2xzOiBTeW1ib2xJbmZvcm1hdGlvbltdKTogYXRvbUlkZS5PdXRsaW5lVHJlZVtdIHtcbiAgICBzeW1ib2xzLnNvcnQoXG4gICAgICAoYSwgYikgPT5cbiAgICAgICAgKGEubG9jYXRpb24ucmFuZ2Uuc3RhcnQubGluZSA9PT0gYi5sb2NhdGlvbi5yYW5nZS5zdGFydC5saW5lXG4gICAgICAgICAgPyBhLmxvY2F0aW9uLnJhbmdlLnN0YXJ0LmNoYXJhY3RlciAtIGIubG9jYXRpb24ucmFuZ2Uuc3RhcnQuY2hhcmFjdGVyXG4gICAgICAgICAgOiBhLmxvY2F0aW9uLnJhbmdlLnN0YXJ0LmxpbmUgLSBiLmxvY2F0aW9uLnJhbmdlLnN0YXJ0LmxpbmUpLFxuICAgICk7XG5cbiAgICAvLyBUZW1wb3JhcmlseSBrZWVwIGNvbnRhaW5lck5hbWUgdGhyb3VnaCB0aGUgY29udmVyc2lvbiBwcm9jZXNzXG4gICAgLy8gQWxzbyBmaWx0ZXIgb3V0IHN5bWJvbHMgd2l0aG91dCBhIG5hbWUgLSBpdCdzIHBhcnQgb2YgdGhlIHNwZWMgYnV0IHNvbWUgZG9uJ3QgaW5jbHVkZSBpdFxuICAgIGNvbnN0IGFsbEl0ZW1zID0gc3ltYm9scy5maWx0ZXIoKHN5bWJvbCkgPT4gc3ltYm9sLm5hbWUpLm1hcCgoc3ltYm9sKSA9PiAoe1xuICAgICAgY29udGFpbmVyTmFtZTogc3ltYm9sLmNvbnRhaW5lck5hbWUsXG4gICAgICBvdXRsaW5lOiBPdXRsaW5lVmlld0FkYXB0ZXIuc3ltYm9sVG9PdXRsaW5lKHN5bWJvbCksXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIGEgbWFwIG9mIGNvbnRhaW5lcnMgYnkgbmFtZSB3aXRoIGFsbCBpdGVtcyB0aGF0IGhhdmUgdGhhdCBuYW1lXG4gICAgY29uc3QgY29udGFpbmVycyA9IGFsbEl0ZW1zLnJlZHVjZSgobWFwLCBpdGVtKSA9PiB7XG4gICAgICBjb25zdCBuYW1lID0gaXRlbS5vdXRsaW5lLnJlcHJlc2VudGF0aXZlTmFtZTtcbiAgICAgIGlmIChuYW1lICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgY29udGFpbmVyID0gbWFwLmdldChuYW1lKTtcbiAgICAgICAgaWYgKGNvbnRhaW5lciA9PSBudWxsKSB7XG4gICAgICAgICAgbWFwLnNldChuYW1lLCBbaXRlbS5vdXRsaW5lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29udGFpbmVyLnB1c2goaXRlbS5vdXRsaW5lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG1hcDtcbiAgICB9LCBuZXcgTWFwKCkpO1xuXG4gICAgY29uc3Qgcm9vdHM6IGF0b21JZGUuT3V0bGluZVRyZWVbXSA9IFtdO1xuXG4gICAgLy8gUHV0IGVhY2ggaXRlbSB3aXRoaW4gaXRzIHBhcmVudCBhbmQgZXh0cmFjdCBvdXQgdGhlIHJvb3RzXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGFsbEl0ZW1zKSB7XG4gICAgICBjb25zdCBjb250YWluZXJOYW1lID0gaXRlbS5jb250YWluZXJOYW1lO1xuICAgICAgY29uc3QgY2hpbGQgPSBpdGVtLm91dGxpbmU7XG4gICAgICBpZiAoY29udGFpbmVyTmFtZSA9PSBudWxsIHx8IGNvbnRhaW5lck5hbWUgPT09ICcnKSB7XG4gICAgICAgIHJvb3RzLnB1c2goaXRlbS5vdXRsaW5lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBvc3NpYmxlUGFyZW50cyA9IGNvbnRhaW5lcnMuZ2V0KGNvbnRhaW5lck5hbWUpO1xuICAgICAgICBsZXQgY2xvc2VzdFBhcmVudCA9IE91dGxpbmVWaWV3QWRhcHRlci5fZ2V0Q2xvc2VzdFBhcmVudChwb3NzaWJsZVBhcmVudHMsIGNoaWxkKTtcbiAgICAgICAgaWYgKGNsb3Nlc3RQYXJlbnQgPT0gbnVsbCkge1xuICAgICAgICAgIGNsb3Nlc3RQYXJlbnQgPSB7XG4gICAgICAgICAgICBwbGFpblRleHQ6IGNvbnRhaW5lck5hbWUsXG4gICAgICAgICAgICByZXByZXNlbnRhdGl2ZU5hbWU6IGNvbnRhaW5lck5hbWUsXG4gICAgICAgICAgICBzdGFydFBvc2l0aW9uOiBuZXcgUG9pbnQoMCwgMCksXG4gICAgICAgICAgICBjaGlsZHJlbjogW2NoaWxkXSxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJvb3RzLnB1c2goY2xvc2VzdFBhcmVudCk7XG4gICAgICAgICAgaWYgKHBvc3NpYmxlUGFyZW50cyA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb250YWluZXJzLnNldChjb250YWluZXJOYW1lLCBbY2xvc2VzdFBhcmVudF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3NzaWJsZVBhcmVudHMucHVzaChjbG9zZXN0UGFyZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2xvc2VzdFBhcmVudC5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByb290cztcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIF9nZXRDbG9zZXN0UGFyZW50KFxuICAgIGNhbmRpZGF0ZXM6IGF0b21JZGUuT3V0bGluZVRyZWVbXSB8IG51bGwsXG4gICAgY2hpbGQ6IGF0b21JZGUuT3V0bGluZVRyZWUsXG4gICk6IGF0b21JZGUuT3V0bGluZVRyZWUgfCBudWxsIHtcbiAgICBpZiAoY2FuZGlkYXRlcyA9PSBudWxsIHx8IGNhbmRpZGF0ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgcGFyZW50OiBhdG9tSWRlLk91dGxpbmVUcmVlIHwgdW5kZWZpbmVkO1xuICAgIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgIGlmIChcbiAgICAgICAgY2FuZGlkYXRlICE9PSBjaGlsZCAmJlxuICAgICAgICBjYW5kaWRhdGUuc3RhcnRQb3NpdGlvbi5pc0xlc3NUaGFuT3JFcXVhbChjaGlsZC5zdGFydFBvc2l0aW9uKSAmJlxuICAgICAgICAoY2FuZGlkYXRlLmVuZFBvc2l0aW9uID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAoY2hpbGQuZW5kUG9zaXRpb24gJiYgY2FuZGlkYXRlLmVuZFBvc2l0aW9uLmlzR3JlYXRlclRoYW5PckVxdWFsKGNoaWxkLmVuZFBvc2l0aW9uKSkpXG4gICAgICApIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHBhcmVudCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgKHBhcmVudC5zdGFydFBvc2l0aW9uLmlzTGVzc1RoYW5PckVxdWFsKGNhbmRpZGF0ZS5zdGFydFBvc2l0aW9uKSB8fFxuICAgICAgICAgICAgKHBhcmVudC5lbmRQb3NpdGlvbiAhPSBudWxsICYmXG4gICAgICAgICAgICAgIGNhbmRpZGF0ZS5lbmRQb3NpdGlvbiAmJlxuICAgICAgICAgICAgICBwYXJlbnQuZW5kUG9zaXRpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWwoY2FuZGlkYXRlLmVuZFBvc2l0aW9uKSkpXG4gICAgICAgICkge1xuICAgICAgICAgIHBhcmVudCA9IGNhbmRpZGF0ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwYXJlbnQgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENvbnZlcnQgYW4gaW5kaXZpZHVhbCB7RG9jdW1lbnRTeW1ib2x9IGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlclxuICAgKiB0byBhbiB7T3V0bGluZVRyZWV9IGZvciB1c2UgYnkgdGhlIE91dGxpbmUgVmlldy4gSXQgZG9lcyBOT1QgcmVjdXJzaXZlbHlcbiAgICogcHJvY2VzcyB0aGUgZ2l2ZW4gc3ltYm9sJ3MgY2hpbGRyZW4gKGlmIGFueSkuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgVGhlIHtEb2N1bWVudFN5bWJvbH0gdG8gY29udmVydCB0byBhbiB7T3V0bGluZVRyZWV9LlxuICAgKiBAcmV0dXJucyBUaGUge091dGxpbmVUcmVlfSBjb3JyZXNwb25kaW5nIHRvIHRoZSBnaXZlbiB7RG9jdW1lbnRTeW1ib2x9LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBoaWVyYXJjaGljYWxTeW1ib2xUb091dGxpbmUoc3ltYm9sOiBEb2N1bWVudFN5bWJvbCk6IGF0b21JZGUuT3V0bGluZVRyZWUge1xuICAgIGNvbnN0IGljb24gPSBPdXRsaW5lVmlld0FkYXB0ZXIuc3ltYm9sS2luZFRvRW50aXR5S2luZChzeW1ib2wua2luZCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9rZW5pemVkVGV4dDogW1xuICAgICAgICB7XG4gICAgICAgICAga2luZDogT3V0bGluZVZpZXdBZGFwdGVyLnN5bWJvbEtpbmRUb1Rva2VuS2luZChzeW1ib2wua2luZCksXG4gICAgICAgICAgdmFsdWU6IHN5bWJvbC5uYW1lLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGljb246IGljb24gIT0gbnVsbCA/IGljb24gOiB1bmRlZmluZWQsXG4gICAgICByZXByZXNlbnRhdGl2ZU5hbWU6IHN5bWJvbC5uYW1lLFxuICAgICAgc3RhcnRQb3NpdGlvbjogQ29udmVydC5wb3NpdGlvblRvUG9pbnQoc3ltYm9sLnNlbGVjdGlvblJhbmdlLnN0YXJ0KSxcbiAgICAgIGVuZFBvc2l0aW9uOiBDb252ZXJ0LnBvc2l0aW9uVG9Qb2ludChzeW1ib2wuc2VsZWN0aW9uUmFuZ2UuZW5kKSxcbiAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhbiBpbmRpdmlkdWFsIHtTeW1ib2xJbmZvcm1hdGlvbn0gZnJvbSB0aGUgbGFuZ3VhZ2Ugc2VydmVyXG4gICAqIHRvIGFuIHtPdXRsaW5lVHJlZX0gZm9yIHVzZSBieSB0aGUgT3V0bGluZSBWaWV3LlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIFRoZSB7U3ltYm9sSW5mb3JtYXRpb259IHRvIGNvbnZlcnQgdG8gYW4ge091dGxpbmVUcmVlfS5cbiAgICogQHJldHVybnMgVGhlIHtPdXRsaW5lVHJlZX0gZXF1aXZhbGVudCB0byB0aGUgZ2l2ZW4ge1N5bWJvbEluZm9ybWF0aW9ufS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgc3ltYm9sVG9PdXRsaW5lKHN5bWJvbDogU3ltYm9sSW5mb3JtYXRpb24pOiBhdG9tSWRlLk91dGxpbmVUcmVlIHtcbiAgICBjb25zdCBpY29uID0gT3V0bGluZVZpZXdBZGFwdGVyLnN5bWJvbEtpbmRUb0VudGl0eUtpbmQoc3ltYm9sLmtpbmQpO1xuICAgIHJldHVybiB7XG4gICAgICB0b2tlbml6ZWRUZXh0OiBbXG4gICAgICAgIHtcbiAgICAgICAgICBraW5kOiBPdXRsaW5lVmlld0FkYXB0ZXIuc3ltYm9sS2luZFRvVG9rZW5LaW5kKHN5bWJvbC5raW5kKSxcbiAgICAgICAgICB2YWx1ZTogc3ltYm9sLm5hbWUsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgaWNvbjogaWNvbiAhPSBudWxsID8gaWNvbiA6IHVuZGVmaW5lZCxcbiAgICAgIHJlcHJlc2VudGF0aXZlTmFtZTogc3ltYm9sLm5hbWUsXG4gICAgICBzdGFydFBvc2l0aW9uOiBDb252ZXJ0LnBvc2l0aW9uVG9Qb2ludChzeW1ib2wubG9jYXRpb24ucmFuZ2Uuc3RhcnQpLFxuICAgICAgZW5kUG9zaXRpb246IENvbnZlcnQucG9zaXRpb25Ub1BvaW50KHN5bWJvbC5sb2NhdGlvbi5yYW5nZS5lbmQpLFxuICAgICAgY2hpbGRyZW46IFtdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGEgc3ltYm9sIGtpbmQgaW50byBhbiBvdXRsaW5lIGVudGl0eSBraW5kIHVzZWQgdG8gZGV0ZXJtaW5lXG4gICAqIHRoZSBzdHlsaW5nIHN1Y2ggYXMgdGhlIGFwcHJvcHJpYXRlIGljb24gaW4gdGhlIE91dGxpbmUgVmlldy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCBUaGUgbnVtZXJpYyBzeW1ib2wga2luZCByZWNlaXZlZCBmcm9tIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqIEByZXR1cm5zIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZXF1aXZhbGVudCBPdXRsaW5lVmlldyBlbnRpdHkga2luZC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgc3ltYm9sS2luZFRvRW50aXR5S2luZChzeW1ib2w6IG51bWJlcik6IHN0cmluZyB8IG51bGwge1xuICAgIHN3aXRjaCAoc3ltYm9sKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuQXJyYXk6XG4gICAgICAgIHJldHVybiAndHlwZS1hcnJheSc7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuQm9vbGVhbjpcbiAgICAgICAgcmV0dXJuICd0eXBlLWJvb2xlYW4nO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkNsYXNzOlxuICAgICAgICByZXR1cm4gJ3R5cGUtY2xhc3MnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkNvbnN0YW50OlxuICAgICAgICByZXR1cm4gJ3R5cGUtY29uc3RhbnQnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkNvbnN0cnVjdG9yOlxuICAgICAgICByZXR1cm4gJ3R5cGUtY29uc3RydWN0b3InO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLkVudW06XG4gICAgICAgIHJldHVybiAndHlwZS1lbnVtJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5GaWVsZDpcbiAgICAgICAgcmV0dXJuICd0eXBlLWZpZWxkJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5GaWxlOlxuICAgICAgICByZXR1cm4gJ3R5cGUtZmlsZSc7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuRnVuY3Rpb246XG4gICAgICAgIHJldHVybiAndHlwZS1mdW5jdGlvbic7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuSW50ZXJmYWNlOlxuICAgICAgICByZXR1cm4gJ3R5cGUtaW50ZXJmYWNlJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5NZXRob2Q6XG4gICAgICAgIHJldHVybiAndHlwZS1tZXRob2QnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLk1vZHVsZTpcbiAgICAgICAgcmV0dXJuICd0eXBlLW1vZHVsZSc7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuTmFtZXNwYWNlOlxuICAgICAgICByZXR1cm4gJ3R5cGUtbmFtZXNwYWNlJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5OdW1iZXI6XG4gICAgICAgIHJldHVybiAndHlwZS1udW1iZXInO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlBhY2thZ2U6XG4gICAgICAgIHJldHVybiAndHlwZS1wYWNrYWdlJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5Qcm9wZXJ0eTpcbiAgICAgICAgcmV0dXJuICd0eXBlLXByb3BlcnR5JztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5TdHJpbmc6XG4gICAgICAgIHJldHVybiAndHlwZS1zdHJpbmcnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlZhcmlhYmxlOlxuICAgICAgICByZXR1cm4gJ3R5cGUtdmFyaWFibGUnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlN0cnVjdDpcbiAgICAgICAgcmV0dXJuICd0eXBlLWNsYXNzJztcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5FbnVtTWVtYmVyOlxuICAgICAgICByZXR1cm4gJ3R5cGUtY29uc3RhbnQnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhIHN5bWJvbCBraW5kIHRvIHRoZSBhcHByb3ByaWF0ZSB0b2tlbiBraW5kIHVzZWQgdG8gc3ludGF4XG4gICAqIGhpZ2hsaWdodCB0aGUgc3ltYm9sIG5hbWUgaW4gdGhlIE91dGxpbmUgVmlldy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCBUaGUgbnVtZXJpYyBzeW1ib2wga2luZCByZWNlaXZlZCBmcm9tIHRoZSBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqIEByZXR1cm5zIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZXF1aXZhbGVudCBzeW50YXggdG9rZW4ga2luZC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgc3ltYm9sS2luZFRvVG9rZW5LaW5kKHN5bWJvbDogbnVtYmVyKTogYXRvbUlkZS5Ub2tlbktpbmQge1xuICAgIHN3aXRjaCAoc3ltYm9sKSB7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuQ2xhc3M6XG4gICAgICAgIHJldHVybiAndHlwZSc7XG4gICAgICBjYXNlIFN5bWJvbEtpbmQuQ29uc3RydWN0b3I6XG4gICAgICAgIHJldHVybiAnY29uc3RydWN0b3InO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLk1ldGhvZDpcbiAgICAgIGNhc2UgU3ltYm9sS2luZC5GdW5jdGlvbjpcbiAgICAgICAgcmV0dXJuICdtZXRob2QnO1xuICAgICAgY2FzZSBTeW1ib2xLaW5kLlN0cmluZzpcbiAgICAgICAgcmV0dXJuICdzdHJpbmcnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICdwbGFpbic7XG4gICAgfVxuICB9XG59XG4iXX0=