"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const outline_view_adapter_1 = require("../../lib/adapters/outline-view-adapter");
const ls = require("../../lib/languageclient");
const chai_1 = require("chai");
const atom_1 = require("atom");
describe('OutlineViewAdapter', () => {
    const createRange = (a, b, c, d) => ({ start: { line: a, character: b }, end: { line: c, character: d } });
    const createLocation = (a, b, c, d) => ({
        uri: '',
        range: createRange(a, b, c, d),
    });
    describe('canAdapt', () => {
        it('returns true if documentSymbolProvider is supported', () => {
            const result = outline_view_adapter_1.default.canAdapt({ documentSymbolProvider: true });
            chai_1.expect(result).to.be.true;
        });
        it('returns false if documentSymbolProvider not supported', () => {
            const result = outline_view_adapter_1.default.canAdapt({});
            chai_1.expect(result).to.be.false;
        });
    });
    describe('createHierarchicalOutlineTrees', () => {
        it('creates an empty array given an empty array', () => {
            const result = outline_view_adapter_1.default.createHierarchicalOutlineTrees([]);
            chai_1.expect(result).to.deep.equal([]);
        });
        it('converts symbols without the children field', () => {
            const sourceItem = {
                name: 'test',
                kind: ls.SymbolKind.Function,
                range: createRange(1, 1, 2, 2),
                selectionRange: createRange(1, 1, 2, 2),
            };
            const expected = [outline_view_adapter_1.default.hierarchicalSymbolToOutline(sourceItem)];
            const result = outline_view_adapter_1.default.createHierarchicalOutlineTrees([sourceItem]);
            chai_1.expect(result).to.deep.equal(expected);
        });
        it('converts symbols with an empty children list', () => {
            const sourceItem = {
                name: 'test',
                kind: ls.SymbolKind.Function,
                range: createRange(1, 1, 2, 2),
                selectionRange: createRange(1, 1, 2, 2),
                children: [],
            };
            const expected = [outline_view_adapter_1.default.hierarchicalSymbolToOutline(sourceItem)];
            const result = outline_view_adapter_1.default.createHierarchicalOutlineTrees([sourceItem]);
            chai_1.expect(result).to.deep.equal(expected);
        });
        it('sorts symbols by location', () => {
            const sourceA = {
                name: 'test',
                kind: ls.SymbolKind.Function,
                range: createRange(2, 2, 3, 3),
                selectionRange: createRange(2, 2, 3, 3),
            };
            const sourceB = {
                name: 'test',
                kind: ls.SymbolKind.Function,
                range: createRange(1, 1, 2, 2),
                selectionRange: createRange(1, 1, 2, 2),
            };
            const expected = [
                outline_view_adapter_1.default.hierarchicalSymbolToOutline(sourceB),
                outline_view_adapter_1.default.hierarchicalSymbolToOutline(sourceA),
            ];
            const result = outline_view_adapter_1.default.createHierarchicalOutlineTrees([
                sourceA,
                sourceB,
            ]);
            chai_1.expect(result).to.deep.equal(expected);
        });
        it('converts symbols with children', () => {
            const sourceChildA = {
                name: 'childA',
                kind: ls.SymbolKind.Function,
                range: createRange(2, 2, 3, 3),
                selectionRange: createRange(2, 2, 3, 3),
            };
            const sourceChildB = {
                name: 'childB',
                kind: ls.SymbolKind.Function,
                range: createRange(1, 1, 2, 2),
                selectionRange: createRange(1, 1, 2, 2),
            };
            const sourceParent = {
                name: 'parent',
                kind: ls.SymbolKind.Function,
                range: createRange(1, 1, 3, 3),
                selectionRange: createRange(1, 1, 3, 3),
                children: [sourceChildA, sourceChildB],
            };
            const expectedParent = outline_view_adapter_1.default.hierarchicalSymbolToOutline(sourceParent);
            expectedParent.children = [
                outline_view_adapter_1.default.hierarchicalSymbolToOutline(sourceChildB),
                outline_view_adapter_1.default.hierarchicalSymbolToOutline(sourceChildA),
            ];
            const result = outline_view_adapter_1.default.createHierarchicalOutlineTrees([
                sourceParent,
            ]);
            chai_1.expect(result).to.deep.equal([expectedParent]);
        });
    });
    describe('createOutlineTrees', () => {
        it('creates an empty array given an empty array', () => {
            const result = outline_view_adapter_1.default.createOutlineTrees([]);
            chai_1.expect(result).to.deep.equal([]);
        });
        it('creates a single converted root item from a single source item', () => {
            const sourceItem = { kind: ls.SymbolKind.Namespace, name: 'R', location: createLocation(5, 6, 7, 8) };
            const expected = outline_view_adapter_1.default.symbolToOutline(sourceItem);
            const result = outline_view_adapter_1.default.createOutlineTrees([sourceItem]);
            chai_1.expect(result).to.deep.equal([expected]);
        });
        it('creates an empty root container with a single source item when containerName missing', () => {
            const sourceItem = {
                kind: ls.SymbolKind.Class,
                name: 'Program',
                location: createLocation(1, 2, 3, 4),
            };
            const expected = outline_view_adapter_1.default.symbolToOutline(sourceItem);
            sourceItem.containerName = 'missing';
            const result = outline_view_adapter_1.default.createOutlineTrees([sourceItem]);
            chai_1.expect(result.length).to.equal(1);
            chai_1.expect(result[0].representativeName).to.equal('missing');
            chai_1.expect(result[0].startPosition.row).to.equal(0);
            chai_1.expect(result[0].startPosition.column).to.equal(0);
            chai_1.expect(result[0].children).to.deep.equal([expected]);
        });
        // tslint:disable-next-line:max-line-length
        it('creates an empty root container with a single source item when containerName is missing and matches own name', () => {
            const sourceItem = {
                kind: ls.SymbolKind.Class,
                name: 'simple',
                location: createLocation(1, 2, 3, 4),
            };
            const expected = outline_view_adapter_1.default.symbolToOutline(sourceItem);
            sourceItem.containerName = 'simple';
            const result = outline_view_adapter_1.default.createOutlineTrees([sourceItem]);
            chai_1.expect(result.length).to.equal(1);
            chai_1.expect(result[0].representativeName).to.equal('simple');
            chai_1.expect(result[0].startPosition.row).to.equal(0);
            chai_1.expect(result[0].startPosition.column).to.equal(0);
            chai_1.expect(result[0].children).to.deep.equal([expected]);
        });
        it('creates a simple named hierarchy', () => {
            const sourceItems = [
                { kind: ls.SymbolKind.Namespace, name: 'java.com', location: createLocation(1, 0, 10, 0) },
                {
                    kind: ls.SymbolKind.Class,
                    name: 'Program',
                    location: createLocation(2, 0, 7, 0),
                    containerName: 'java.com',
                },
                {
                    kind: ls.SymbolKind.Function,
                    name: 'main',
                    location: createLocation(4, 0, 5, 0),
                    containerName: 'Program',
                },
            ];
            const result = outline_view_adapter_1.default.createOutlineTrees(sourceItems);
            chai_1.expect(result.length).to.equal(1);
            chai_1.expect(result[0].children.length).to.equal(1);
            chai_1.expect(result[0].children[0].representativeName).to.equal('Program');
            chai_1.expect(result[0].children[0].children.length).to.equal(1);
            chai_1.expect(result[0].children[0].children[0].representativeName).to.equal('main');
        });
        it('retains duplicate named items', () => {
            const sourceItems = [
                { kind: ls.SymbolKind.Namespace, name: 'duplicate', location: createLocation(1, 0, 5, 0) },
                { kind: ls.SymbolKind.Namespace, name: 'duplicate', location: createLocation(6, 0, 10, 0) },
                {
                    kind: ls.SymbolKind.Function,
                    name: 'main',
                    location: createLocation(7, 0, 8, 0),
                    containerName: 'duplicate',
                },
            ];
            const result = outline_view_adapter_1.default.createOutlineTrees(sourceItems);
            chai_1.expect(result.length).to.equal(2);
            chai_1.expect(result[0].representativeName).to.equal('duplicate');
            chai_1.expect(result[1].representativeName).to.equal('duplicate');
        });
        it('disambiguates containerName based on range', () => {
            const sourceItems = [
                { kind: ls.SymbolKind.Namespace, name: 'duplicate', location: createLocation(1, 0, 5, 0) },
                { kind: ls.SymbolKind.Namespace, name: 'duplicate', location: createLocation(6, 0, 10, 0) },
                {
                    kind: ls.SymbolKind.Function,
                    name: 'main',
                    location: createLocation(7, 0, 8, 0),
                    containerName: 'duplicate',
                },
            ];
            const result = outline_view_adapter_1.default.createOutlineTrees(sourceItems);
            chai_1.expect(result[1].children.length).to.equal(1);
            chai_1.expect(result[1].children[0].representativeName).to.equal('main');
        });
        it("does not become it's own parent", () => {
            const sourceItems = [
                { kind: ls.SymbolKind.Namespace, name: 'duplicate', location: createLocation(1, 0, 10, 0) },
                {
                    kind: ls.SymbolKind.Namespace,
                    name: 'duplicate',
                    location: createLocation(6, 0, 7, 0),
                    containerName: 'duplicate',
                },
            ];
            const result = outline_view_adapter_1.default.createOutlineTrees(sourceItems);
            chai_1.expect(result.length).to.equal(1);
            const outline = result[0];
            chai_1.expect(outline.endPosition).to.not.be.undefined;
            if (outline.endPosition) {
                chai_1.expect(outline.endPosition.row).to.equal(10);
                chai_1.expect(outline.children.length).to.equal(1);
                const outlineChild = outline.children[0];
                chai_1.expect(outlineChild.endPosition).to.not.be.undefined;
                if (outlineChild.endPosition) {
                    chai_1.expect(outlineChild.endPosition.row).to.equal(7);
                }
            }
        });
        it('parents to the innnermost named container', () => {
            const sourceItems = [
                { kind: ls.SymbolKind.Namespace, name: 'turtles', location: createLocation(1, 0, 10, 0) },
                {
                    kind: ls.SymbolKind.Namespace,
                    name: 'turtles',
                    location: createLocation(4, 0, 8, 0),
                    containerName: 'turtles',
                },
                { kind: ls.SymbolKind.Class, name: 'disc', location: createLocation(4, 0, 5, 0), containerName: 'turtles' },
            ];
            const result = outline_view_adapter_1.default.createOutlineTrees(sourceItems);
            chai_1.expect(result.length).to.equal(1);
            const outline = result[0];
            chai_1.expect(outline).to.not.be.undefined;
            if (outline) {
                chai_1.expect(outline.endPosition).to.not.be.undefined;
                if (outline.endPosition) {
                    chai_1.expect(outline.endPosition.row).to.equal(10);
                    chai_1.expect(outline.children.length).to.equal(1);
                    const outlineChild = outline.children[0];
                    chai_1.expect(outlineChild.endPosition).to.not.be.undefined;
                    if (outlineChild.endPosition) {
                        chai_1.expect(outlineChild.endPosition.row).to.equal(8);
                        chai_1.expect(outlineChild.children.length).to.equal(1);
                        const outlineGrandChild = outlineChild.children[0];
                        chai_1.expect(outlineGrandChild.endPosition).to.not.be.undefined;
                        if (outlineGrandChild.endPosition) {
                            chai_1.expect(outlineGrandChild.endPosition.row).to.equal(5);
                        }
                    }
                }
            }
        });
    });
    describe('hierarchicalSymbolToOutline', () => {
        it('converts an individual item', () => {
            const sourceItem = {
                name: 'test',
                kind: ls.SymbolKind.Function,
                range: createRange(1, 1, 2, 2),
                selectionRange: createRange(1, 1, 2, 2),
            };
            const expected = {
                tokenizedText: [
                    {
                        kind: 'method',
                        value: 'test',
                    },
                ],
                icon: 'type-function',
                representativeName: 'test',
                startPosition: new atom_1.Point(1, 1),
                endPosition: new atom_1.Point(2, 2),
                children: [],
            };
            const result = outline_view_adapter_1.default.hierarchicalSymbolToOutline(sourceItem);
            chai_1.expect(result).to.deep.equal(expected);
        });
    });
    describe('symbolToOutline', () => {
        it('converts an individual item', () => {
            const sourceItem = { kind: ls.SymbolKind.Class, name: 'Program', location: createLocation(1, 2, 3, 4) };
            const result = outline_view_adapter_1.default.symbolToOutline(sourceItem);
            chai_1.expect(result.icon).to.equal('type-class');
            chai_1.expect(result.representativeName).to.equal('Program');
            chai_1.expect(result.children).to.deep.equal([]);
            chai_1.expect(result.tokenizedText).to.not.be.undefined;
            if (result.tokenizedText) {
                chai_1.expect(result.tokenizedText[0].kind).to.equal('type');
                chai_1.expect(result.tokenizedText[0].value).to.equal('Program');
                chai_1.expect(result.startPosition.row).to.equal(1);
                chai_1.expect(result.startPosition.column).to.equal(2);
                chai_1.expect(result.endPosition).to.not.be.undefined;
                if (result.endPosition) {
                    chai_1.expect(result.endPosition.row).to.equal(3);
                    chai_1.expect(result.endPosition.column).to.equal(4);
                }
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS12aWV3LWFkYXB0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3QvYWRhcHRlcnMvb3V0bGluZS12aWV3LWFkYXB0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGtGQUF5RTtBQUN6RSwrQ0FBK0M7QUFDL0MsK0JBQThCO0FBQzlCLCtCQUE2QjtBQUU3QixRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBTSxFQUFFLENBQU0sRUFBRSxDQUFNLEVBQUUsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUN0RCxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQ3JFLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRyxDQUFDLENBQU0sRUFBRSxDQUFNLEVBQUUsQ0FBTSxFQUFFLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxRCxHQUFHLEVBQUUsRUFBRTtRQUNQLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQy9CLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLEVBQUUsQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7WUFDN0QsTUFBTSxNQUFNLEdBQUcsOEJBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3RSxhQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsdURB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TUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDL0M7YUFDRjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBPdXRsaW5lVmlld0FkYXB0ZXIgZnJvbSAnLi4vLi4vbGliL2FkYXB0ZXJzL291dGxpbmUtdmlldy1hZGFwdGVyJztcbmltcG9ydCAqIGFzIGxzIGZyb20gJy4uLy4uL2xpYi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQgeyBleHBlY3QgfSBmcm9tICdjaGFpJztcbmltcG9ydCB7IFBvaW50IH0gZnJvbSAnYXRvbSc7XG5cbmRlc2NyaWJlKCdPdXRsaW5lVmlld0FkYXB0ZXInLCAoKSA9PiB7XG4gIGNvbnN0IGNyZWF0ZVJhbmdlID0gKGE6IGFueSwgYjogYW55LCBjOiBhbnksIGQ6IGFueSkgPT4gKFxuICAgIHsgc3RhcnQ6IHsgbGluZTogYSwgY2hhcmFjdGVyOiBiIH0sIGVuZDogeyBsaW5lOiBjLCBjaGFyYWN0ZXI6IGQgfSB9XG4gICk7XG5cbiAgY29uc3QgY3JlYXRlTG9jYXRpb24gPSAoYTogYW55LCBiOiBhbnksIGM6IGFueSwgZDogYW55KSA9PiAoe1xuICAgIHVyaTogJycsXG4gICAgcmFuZ2U6IGNyZWF0ZVJhbmdlKGEsIGIsIGMsIGQpLFxuICB9KTtcblxuICBkZXNjcmliZSgnY2FuQWRhcHQnLCAoKSA9PiB7XG4gICAgaXQoJ3JldHVybnMgdHJ1ZSBpZiBkb2N1bWVudFN5bWJvbFByb3ZpZGVyIGlzIHN1cHBvcnRlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IE91dGxpbmVWaWV3QWRhcHRlci5jYW5BZGFwdCh7IGRvY3VtZW50U3ltYm9sUHJvdmlkZXI6IHRydWUgfSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50by5iZS50cnVlO1xuICAgIH0pO1xuXG4gICAgaXQoJ3JldHVybnMgZmFsc2UgaWYgZG9jdW1lbnRTeW1ib2xQcm92aWRlciBub3Qgc3VwcG9ydGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gT3V0bGluZVZpZXdBZGFwdGVyLmNhbkFkYXB0KHt9KTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvLmJlLmZhbHNlO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY3JlYXRlSGllcmFyY2hpY2FsT3V0bGluZVRyZWVzJywgKCkgPT4ge1xuICAgIGl0KCdjcmVhdGVzIGFuIGVtcHR5IGFycmF5IGdpdmVuIGFuIGVtcHR5IGFycmF5JywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gT3V0bGluZVZpZXdBZGFwdGVyLmNyZWF0ZUhpZXJhcmNoaWNhbE91dGxpbmVUcmVlcyhbXSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50by5kZWVwLmVxdWFsKFtdKTtcbiAgICB9KTtcblxuICAgIGl0KCdjb252ZXJ0cyBzeW1ib2xzIHdpdGhvdXQgdGhlIGNoaWxkcmVuIGZpZWxkJywgKCkgPT4ge1xuICAgICAgY29uc3Qgc291cmNlSXRlbSA9IHtcbiAgICAgICAgbmFtZTogJ3Rlc3QnLFxuICAgICAgICBraW5kOiBscy5TeW1ib2xLaW5kLkZ1bmN0aW9uLFxuICAgICAgICByYW5nZTogY3JlYXRlUmFuZ2UoMSwgMSwgMiwgMiksXG4gICAgICAgIHNlbGVjdGlvblJhbmdlOiBjcmVhdGVSYW5nZSgxLCAxLCAyLCAyKSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cGVjdGVkID0gW091dGxpbmVWaWV3QWRhcHRlci5oaWVyYXJjaGljYWxTeW1ib2xUb091dGxpbmUoc291cmNlSXRlbSldO1xuICAgICAgY29uc3QgcmVzdWx0ID0gT3V0bGluZVZpZXdBZGFwdGVyLmNyZWF0ZUhpZXJhcmNoaWNhbE91dGxpbmVUcmVlcyhbc291cmNlSXRlbV0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50by5kZWVwLmVxdWFsKGV4cGVjdGVkKTtcbiAgICB9KTtcblxuICAgIGl0KCdjb252ZXJ0cyBzeW1ib2xzIHdpdGggYW4gZW1wdHkgY2hpbGRyZW4gbGlzdCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHNvdXJjZUl0ZW0gPSB7XG4gICAgICAgIG5hbWU6ICd0ZXN0JyxcbiAgICAgICAga2luZDogbHMuU3ltYm9sS2luZC5GdW5jdGlvbixcbiAgICAgICAgcmFuZ2U6IGNyZWF0ZVJhbmdlKDEsIDEsIDIsIDIpLFxuICAgICAgICBzZWxlY3Rpb25SYW5nZTogY3JlYXRlUmFuZ2UoMSwgMSwgMiwgMiksXG4gICAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV4cGVjdGVkID0gW091dGxpbmVWaWV3QWRhcHRlci5oaWVyYXJjaGljYWxTeW1ib2xUb091dGxpbmUoc291cmNlSXRlbSldO1xuICAgICAgY29uc3QgcmVzdWx0ID0gT3V0bGluZVZpZXdBZGFwdGVyLmNyZWF0ZUhpZXJhcmNoaWNhbE91dGxpbmVUcmVlcyhbc291cmNlSXRlbV0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50by5kZWVwLmVxdWFsKGV4cGVjdGVkKTtcbiAgICB9KTtcblxuICAgIGl0KCdzb3J0cyBzeW1ib2xzIGJ5IGxvY2F0aW9uJywgKCkgPT4ge1xuICAgICAgY29uc3Qgc291cmNlQSA9IHtcbiAgICAgICAgbmFtZTogJ3Rlc3QnLFxuICAgICAgICBraW5kOiBscy5TeW1ib2xLaW5kLkZ1bmN0aW9uLFxuICAgICAgICByYW5nZTogY3JlYXRlUmFuZ2UoMiwgMiwgMywgMyksXG4gICAgICAgIHNlbGVjdGlvblJhbmdlOiBjcmVhdGVSYW5nZSgyLCAyLCAzLCAzKSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHNvdXJjZUIgPSB7XG4gICAgICAgIG5hbWU6ICd0ZXN0JyxcbiAgICAgICAga2luZDogbHMuU3ltYm9sS2luZC5GdW5jdGlvbixcbiAgICAgICAgcmFuZ2U6IGNyZWF0ZVJhbmdlKDEsIDEsIDIsIDIpLFxuICAgICAgICBzZWxlY3Rpb25SYW5nZTogY3JlYXRlUmFuZ2UoMSwgMSwgMiwgMiksXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBleHBlY3RlZCA9IFtcbiAgICAgICAgT3V0bGluZVZpZXdBZGFwdGVyLmhpZXJhcmNoaWNhbFN5bWJvbFRvT3V0bGluZShzb3VyY2VCKSxcbiAgICAgICAgT3V0bGluZVZpZXdBZGFwdGVyLmhpZXJhcmNoaWNhbFN5bWJvbFRvT3V0bGluZShzb3VyY2VBKSxcbiAgICAgIF07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IE91dGxpbmVWaWV3QWRhcHRlci5jcmVhdGVIaWVyYXJjaGljYWxPdXRsaW5lVHJlZXMoW1xuICAgICAgICBzb3VyY2VBLFxuICAgICAgICBzb3VyY2VCLFxuICAgICAgXSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvLmRlZXAuZXF1YWwoZXhwZWN0ZWQpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2NvbnZlcnRzIHN5bWJvbHMgd2l0aCBjaGlsZHJlbicsICgpID0+IHtcbiAgICAgIGNvbnN0IHNvdXJjZUNoaWxkQSA9IHtcbiAgICAgICAgbmFtZTogJ2NoaWxkQScsXG4gICAgICAgIGtpbmQ6IGxzLlN5bWJvbEtpbmQuRnVuY3Rpb24sXG4gICAgICAgIHJhbmdlOiBjcmVhdGVSYW5nZSgyLCAyLCAzLCAzKSxcbiAgICAgICAgc2VsZWN0aW9uUmFuZ2U6IGNyZWF0ZVJhbmdlKDIsIDIsIDMsIDMpLFxuICAgICAgfTtcblxuICAgICAgY29uc3Qgc291cmNlQ2hpbGRCID0ge1xuICAgICAgICBuYW1lOiAnY2hpbGRCJyxcbiAgICAgICAga2luZDogbHMuU3ltYm9sS2luZC5GdW5jdGlvbixcbiAgICAgICAgcmFuZ2U6IGNyZWF0ZVJhbmdlKDEsIDEsIDIsIDIpLFxuICAgICAgICBzZWxlY3Rpb25SYW5nZTogY3JlYXRlUmFuZ2UoMSwgMSwgMiwgMiksXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBzb3VyY2VQYXJlbnQgPSB7XG4gICAgICAgIG5hbWU6ICdwYXJlbnQnLFxuICAgICAgICBraW5kOiBscy5TeW1ib2xLaW5kLkZ1bmN0aW9uLFxuICAgICAgICByYW5nZTogY3JlYXRlUmFuZ2UoMSwgMSwgMywgMyksXG4gICAgICAgIHNlbGVjdGlvblJhbmdlOiBjcmVhdGVSYW5nZSgxLCAxLCAzLCAzKSxcbiAgICAgICAgY2hpbGRyZW46IFtzb3VyY2VDaGlsZEEsIHNvdXJjZUNoaWxkQl0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBleHBlY3RlZFBhcmVudCA9IE91dGxpbmVWaWV3QWRhcHRlci5oaWVyYXJjaGljYWxTeW1ib2xUb091dGxpbmUoXG4gICAgICAgIHNvdXJjZVBhcmVudCk7XG5cbiAgICAgIGV4cGVjdGVkUGFyZW50LmNoaWxkcmVuID0gW1xuICAgICAgICBPdXRsaW5lVmlld0FkYXB0ZXIuaGllcmFyY2hpY2FsU3ltYm9sVG9PdXRsaW5lKHNvdXJjZUNoaWxkQiksXG4gICAgICAgIE91dGxpbmVWaWV3QWRhcHRlci5oaWVyYXJjaGljYWxTeW1ib2xUb091dGxpbmUoc291cmNlQ2hpbGRBKSxcbiAgICAgIF07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IE91dGxpbmVWaWV3QWRhcHRlci5jcmVhdGVIaWVyYXJjaGljYWxPdXRsaW5lVHJlZXMoW1xuICAgICAgICBzb3VyY2VQYXJlbnQsXG4gICAgICBdKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG8uZGVlcC5lcXVhbChbZXhwZWN0ZWRQYXJlbnRdKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NyZWF0ZU91dGxpbmVUcmVlcycsICgpID0+IHtcbiAgICBpdCgnY3JlYXRlcyBhbiBlbXB0eSBhcnJheSBnaXZlbiBhbiBlbXB0eSBhcnJheScsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IE91dGxpbmVWaWV3QWRhcHRlci5jcmVhdGVPdXRsaW5lVHJlZXMoW10pO1xuICAgICAgZXhwZWN0KHJlc3VsdCkudG8uZGVlcC5lcXVhbChbXSk7XG4gICAgfSk7XG5cbiAgICBpdCgnY3JlYXRlcyBhIHNpbmdsZSBjb252ZXJ0ZWQgcm9vdCBpdGVtIGZyb20gYSBzaW5nbGUgc291cmNlIGl0ZW0nLCAoKSA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VJdGVtID0geyBraW5kOiBscy5TeW1ib2xLaW5kLk5hbWVzcGFjZSwgbmFtZTogJ1InLCBsb2NhdGlvbjogY3JlYXRlTG9jYXRpb24oNSwgNiwgNywgOCkgfTtcbiAgICAgIGNvbnN0IGV4cGVjdGVkID0gT3V0bGluZVZpZXdBZGFwdGVyLnN5bWJvbFRvT3V0bGluZShzb3VyY2VJdGVtKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IE91dGxpbmVWaWV3QWRhcHRlci5jcmVhdGVPdXRsaW5lVHJlZXMoW3NvdXJjZUl0ZW1dKTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvLmRlZXAuZXF1YWwoW2V4cGVjdGVkXSk7XG4gICAgfSk7XG5cbiAgICBpdCgnY3JlYXRlcyBhbiBlbXB0eSByb290IGNvbnRhaW5lciB3aXRoIGEgc2luZ2xlIHNvdXJjZSBpdGVtIHdoZW4gY29udGFpbmVyTmFtZSBtaXNzaW5nJywgKCkgPT4ge1xuICAgICAgY29uc3Qgc291cmNlSXRlbTogbHMuU3ltYm9sSW5mb3JtYXRpb24gPSB7XG4gICAgICAgIGtpbmQ6IGxzLlN5bWJvbEtpbmQuQ2xhc3MsXG4gICAgICAgIG5hbWU6ICdQcm9ncmFtJyxcbiAgICAgICAgbG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uKDEsIDIsIDMsIDQpLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGV4cGVjdGVkID0gT3V0bGluZVZpZXdBZGFwdGVyLnN5bWJvbFRvT3V0bGluZShzb3VyY2VJdGVtKTtcbiAgICAgIHNvdXJjZUl0ZW0uY29udGFpbmVyTmFtZSA9ICdtaXNzaW5nJztcbiAgICAgIGNvbnN0IHJlc3VsdCA9IE91dGxpbmVWaWV3QWRhcHRlci5jcmVhdGVPdXRsaW5lVHJlZXMoW3NvdXJjZUl0ZW1dKTtcbiAgICAgIGV4cGVjdChyZXN1bHQubGVuZ3RoKS50by5lcXVhbCgxKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0ucmVwcmVzZW50YXRpdmVOYW1lKS50by5lcXVhbCgnbWlzc2luZycpO1xuICAgICAgZXhwZWN0KHJlc3VsdFswXS5zdGFydFBvc2l0aW9uLnJvdykudG8uZXF1YWwoMCk7XG4gICAgICBleHBlY3QocmVzdWx0WzBdLnN0YXJ0UG9zaXRpb24uY29sdW1uKS50by5lcXVhbCgwKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uY2hpbGRyZW4pLnRvLmRlZXAuZXF1YWwoW2V4cGVjdGVkXSk7XG4gICAgfSk7XG5cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgaXQoJ2NyZWF0ZXMgYW4gZW1wdHkgcm9vdCBjb250YWluZXIgd2l0aCBhIHNpbmdsZSBzb3VyY2UgaXRlbSB3aGVuIGNvbnRhaW5lck5hbWUgaXMgbWlzc2luZyBhbmQgbWF0Y2hlcyBvd24gbmFtZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHNvdXJjZUl0ZW06IGxzLlN5bWJvbEluZm9ybWF0aW9uID0ge1xuICAgICAgICBraW5kOiBscy5TeW1ib2xLaW5kLkNsYXNzLFxuICAgICAgICBuYW1lOiAnc2ltcGxlJyxcbiAgICAgICAgbG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uKDEsIDIsIDMsIDQpLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGV4cGVjdGVkID0gT3V0bGluZVZpZXdBZGFwdGVyLnN5bWJvbFRvT3V0bGluZShzb3VyY2VJdGVtKTtcbiAgICAgIHNvdXJjZUl0ZW0uY29udGFpbmVyTmFtZSA9ICdzaW1wbGUnO1xuICAgICAgY29uc3QgcmVzdWx0ID0gT3V0bGluZVZpZXdBZGFwdGVyLmNyZWF0ZU91dGxpbmVUcmVlcyhbc291cmNlSXRlbV0pO1xuICAgICAgZXhwZWN0KHJlc3VsdC5sZW5ndGgpLnRvLmVxdWFsKDEpO1xuICAgICAgZXhwZWN0KHJlc3VsdFswXS5yZXByZXNlbnRhdGl2ZU5hbWUpLnRvLmVxdWFsKCdzaW1wbGUnKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uc3RhcnRQb3NpdGlvbi5yb3cpLnRvLmVxdWFsKDApO1xuICAgICAgZXhwZWN0KHJlc3VsdFswXS5zdGFydFBvc2l0aW9uLmNvbHVtbikudG8uZXF1YWwoMCk7XG4gICAgICBleHBlY3QocmVzdWx0WzBdLmNoaWxkcmVuKS50by5kZWVwLmVxdWFsKFtleHBlY3RlZF0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ2NyZWF0ZXMgYSBzaW1wbGUgbmFtZWQgaGllcmFyY2h5JywgKCkgPT4ge1xuICAgICAgY29uc3Qgc291cmNlSXRlbXMgPSBbXG4gICAgICAgIHsga2luZDogbHMuU3ltYm9sS2luZC5OYW1lc3BhY2UsIG5hbWU6ICdqYXZhLmNvbScsIGxvY2F0aW9uOiBjcmVhdGVMb2NhdGlvbigxLCAwLCAxMCwgMCkgfSxcbiAgICAgICAge1xuICAgICAgICAgIGtpbmQ6IGxzLlN5bWJvbEtpbmQuQ2xhc3MsXG4gICAgICAgICAgbmFtZTogJ1Byb2dyYW0nLFxuICAgICAgICAgIGxvY2F0aW9uOiBjcmVhdGVMb2NhdGlvbigyLCAwLCA3LCAwKSxcbiAgICAgICAgICBjb250YWluZXJOYW1lOiAnamF2YS5jb20nLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAga2luZDogbHMuU3ltYm9sS2luZC5GdW5jdGlvbixcbiAgICAgICAgICBuYW1lOiAnbWFpbicsXG4gICAgICAgICAgbG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uKDQsIDAsIDUsIDApLFxuICAgICAgICAgIGNvbnRhaW5lck5hbWU6ICdQcm9ncmFtJyxcbiAgICAgICAgfSxcbiAgICAgIF07XG4gICAgICBjb25zdCByZXN1bHQgPSBPdXRsaW5lVmlld0FkYXB0ZXIuY3JlYXRlT3V0bGluZVRyZWVzKHNvdXJjZUl0ZW1zKTtcbiAgICAgIGV4cGVjdChyZXN1bHQubGVuZ3RoKS50by5lcXVhbCgxKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uY2hpbGRyZW4ubGVuZ3RoKS50by5lcXVhbCgxKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uY2hpbGRyZW5bMF0ucmVwcmVzZW50YXRpdmVOYW1lKS50by5lcXVhbCgnUHJvZ3JhbScpO1xuICAgICAgZXhwZWN0KHJlc3VsdFswXS5jaGlsZHJlblswXS5jaGlsZHJlbi5sZW5ndGgpLnRvLmVxdWFsKDEpO1xuICAgICAgZXhwZWN0KHJlc3VsdFswXS5jaGlsZHJlblswXS5jaGlsZHJlblswXS5yZXByZXNlbnRhdGl2ZU5hbWUpLnRvLmVxdWFsKCdtYWluJyk7XG4gICAgfSk7XG5cbiAgICBpdCgncmV0YWlucyBkdXBsaWNhdGUgbmFtZWQgaXRlbXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VJdGVtcyA9IFtcbiAgICAgICAgeyBraW5kOiBscy5TeW1ib2xLaW5kLk5hbWVzcGFjZSwgbmFtZTogJ2R1cGxpY2F0ZScsIGxvY2F0aW9uOiBjcmVhdGVMb2NhdGlvbigxLCAwLCA1LCAwKSB9LFxuICAgICAgICB7IGtpbmQ6IGxzLlN5bWJvbEtpbmQuTmFtZXNwYWNlLCBuYW1lOiAnZHVwbGljYXRlJywgbG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uKDYsIDAsIDEwLCAwKSB9LFxuICAgICAgICB7XG4gICAgICAgICAga2luZDogbHMuU3ltYm9sS2luZC5GdW5jdGlvbixcbiAgICAgICAgICBuYW1lOiAnbWFpbicsXG4gICAgICAgICAgbG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uKDcsIDAsIDgsIDApLFxuICAgICAgICAgIGNvbnRhaW5lck5hbWU6ICdkdXBsaWNhdGUnLFxuICAgICAgICB9LFxuICAgICAgXTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IE91dGxpbmVWaWV3QWRhcHRlci5jcmVhdGVPdXRsaW5lVHJlZXMoc291cmNlSXRlbXMpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5sZW5ndGgpLnRvLmVxdWFsKDIpO1xuICAgICAgZXhwZWN0KHJlc3VsdFswXS5yZXByZXNlbnRhdGl2ZU5hbWUpLnRvLmVxdWFsKCdkdXBsaWNhdGUnKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMV0ucmVwcmVzZW50YXRpdmVOYW1lKS50by5lcXVhbCgnZHVwbGljYXRlJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnZGlzYW1iaWd1YXRlcyBjb250YWluZXJOYW1lIGJhc2VkIG9uIHJhbmdlJywgKCkgPT4ge1xuICAgICAgY29uc3Qgc291cmNlSXRlbXMgPSBbXG4gICAgICAgIHsga2luZDogbHMuU3ltYm9sS2luZC5OYW1lc3BhY2UsIG5hbWU6ICdkdXBsaWNhdGUnLCBsb2NhdGlvbjogY3JlYXRlTG9jYXRpb24oMSwgMCwgNSwgMCkgfSxcbiAgICAgICAgeyBraW5kOiBscy5TeW1ib2xLaW5kLk5hbWVzcGFjZSwgbmFtZTogJ2R1cGxpY2F0ZScsIGxvY2F0aW9uOiBjcmVhdGVMb2NhdGlvbig2LCAwLCAxMCwgMCkgfSxcbiAgICAgICAge1xuICAgICAgICAgIGtpbmQ6IGxzLlN5bWJvbEtpbmQuRnVuY3Rpb24sXG4gICAgICAgICAgbmFtZTogJ21haW4nLFxuICAgICAgICAgIGxvY2F0aW9uOiBjcmVhdGVMb2NhdGlvbig3LCAwLCA4LCAwKSxcbiAgICAgICAgICBjb250YWluZXJOYW1lOiAnZHVwbGljYXRlJyxcbiAgICAgICAgfSxcbiAgICAgIF07XG4gICAgICBjb25zdCByZXN1bHQgPSBPdXRsaW5lVmlld0FkYXB0ZXIuY3JlYXRlT3V0bGluZVRyZWVzKHNvdXJjZUl0ZW1zKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMV0uY2hpbGRyZW4ubGVuZ3RoKS50by5lcXVhbCgxKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMV0uY2hpbGRyZW5bMF0ucmVwcmVzZW50YXRpdmVOYW1lKS50by5lcXVhbCgnbWFpbicpO1xuICAgIH0pO1xuXG4gICAgaXQoXCJkb2VzIG5vdCBiZWNvbWUgaXQncyBvd24gcGFyZW50XCIsICgpID0+IHtcbiAgICAgIGNvbnN0IHNvdXJjZUl0ZW1zID0gW1xuICAgICAgICB7IGtpbmQ6IGxzLlN5bWJvbEtpbmQuTmFtZXNwYWNlLCBuYW1lOiAnZHVwbGljYXRlJywgbG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uKDEsIDAsIDEwLCAwKSB9LFxuICAgICAgICB7XG4gICAgICAgICAga2luZDogbHMuU3ltYm9sS2luZC5OYW1lc3BhY2UsXG4gICAgICAgICAgbmFtZTogJ2R1cGxpY2F0ZScsXG4gICAgICAgICAgbG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uKDYsIDAsIDcsIDApLFxuICAgICAgICAgIGNvbnRhaW5lck5hbWU6ICdkdXBsaWNhdGUnLFxuICAgICAgICB9LFxuICAgICAgXTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gT3V0bGluZVZpZXdBZGFwdGVyLmNyZWF0ZU91dGxpbmVUcmVlcyhzb3VyY2VJdGVtcyk7XG4gICAgICBleHBlY3QocmVzdWx0Lmxlbmd0aCkudG8uZXF1YWwoMSk7XG5cbiAgICAgIGNvbnN0IG91dGxpbmUgPSByZXN1bHRbMF07XG4gICAgICBleHBlY3Qob3V0bGluZS5lbmRQb3NpdGlvbikudG8ubm90LmJlLnVuZGVmaW5lZDtcbiAgICAgIGlmIChvdXRsaW5lLmVuZFBvc2l0aW9uKSB7XG4gICAgICAgIGV4cGVjdChvdXRsaW5lLmVuZFBvc2l0aW9uLnJvdykudG8uZXF1YWwoMTApO1xuICAgICAgICBleHBlY3Qob3V0bGluZS5jaGlsZHJlbi5sZW5ndGgpLnRvLmVxdWFsKDEpO1xuXG4gICAgICAgIGNvbnN0IG91dGxpbmVDaGlsZCA9IG91dGxpbmUuY2hpbGRyZW5bMF07XG4gICAgICAgIGV4cGVjdChvdXRsaW5lQ2hpbGQuZW5kUG9zaXRpb24pLnRvLm5vdC5iZS51bmRlZmluZWQ7XG4gICAgICAgIGlmIChvdXRsaW5lQ2hpbGQuZW5kUG9zaXRpb24pIHtcbiAgICAgICAgICBleHBlY3Qob3V0bGluZUNoaWxkLmVuZFBvc2l0aW9uLnJvdykudG8uZXF1YWwoNyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGl0KCdwYXJlbnRzIHRvIHRoZSBpbm5uZXJtb3N0IG5hbWVkIGNvbnRhaW5lcicsICgpID0+IHtcbiAgICAgIGNvbnN0IHNvdXJjZUl0ZW1zID0gW1xuICAgICAgICB7IGtpbmQ6IGxzLlN5bWJvbEtpbmQuTmFtZXNwYWNlLCBuYW1lOiAndHVydGxlcycsIGxvY2F0aW9uOiBjcmVhdGVMb2NhdGlvbigxLCAwLCAxMCwgMCkgfSxcbiAgICAgICAge1xuICAgICAgICAgIGtpbmQ6IGxzLlN5bWJvbEtpbmQuTmFtZXNwYWNlLFxuICAgICAgICAgIG5hbWU6ICd0dXJ0bGVzJyxcbiAgICAgICAgICBsb2NhdGlvbjogY3JlYXRlTG9jYXRpb24oNCwgMCwgOCwgMCksXG4gICAgICAgICAgY29udGFpbmVyTmFtZTogJ3R1cnRsZXMnLFxuICAgICAgICB9LFxuICAgICAgICB7IGtpbmQ6IGxzLlN5bWJvbEtpbmQuQ2xhc3MsIG5hbWU6ICdkaXNjJywgbG9jYXRpb246IGNyZWF0ZUxvY2F0aW9uKDQsIDAsIDUsIDApLCBjb250YWluZXJOYW1lOiAndHVydGxlcycgfSxcbiAgICAgIF07XG4gICAgICBjb25zdCByZXN1bHQgPSBPdXRsaW5lVmlld0FkYXB0ZXIuY3JlYXRlT3V0bGluZVRyZWVzKHNvdXJjZUl0ZW1zKTtcbiAgICAgIGV4cGVjdChyZXN1bHQubGVuZ3RoKS50by5lcXVhbCgxKTtcblxuICAgICAgY29uc3Qgb3V0bGluZSA9IHJlc3VsdFswXTtcbiAgICAgIGV4cGVjdChvdXRsaW5lKS50by5ub3QuYmUudW5kZWZpbmVkO1xuICAgICAgaWYgKG91dGxpbmUpIHtcbiAgICAgICAgZXhwZWN0KG91dGxpbmUuZW5kUG9zaXRpb24pLnRvLm5vdC5iZS51bmRlZmluZWQ7XG4gICAgICAgIGlmIChvdXRsaW5lLmVuZFBvc2l0aW9uKSB7XG4gICAgICAgICAgZXhwZWN0KG91dGxpbmUuZW5kUG9zaXRpb24ucm93KS50by5lcXVhbCgxMCk7XG4gICAgICAgICAgZXhwZWN0KG91dGxpbmUuY2hpbGRyZW4ubGVuZ3RoKS50by5lcXVhbCgxKTtcblxuICAgICAgICAgIGNvbnN0IG91dGxpbmVDaGlsZCA9IG91dGxpbmUuY2hpbGRyZW5bMF07XG4gICAgICAgICAgZXhwZWN0KG91dGxpbmVDaGlsZC5lbmRQb3NpdGlvbikudG8ubm90LmJlLnVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAob3V0bGluZUNoaWxkLmVuZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICBleHBlY3Qob3V0bGluZUNoaWxkLmVuZFBvc2l0aW9uLnJvdykudG8uZXF1YWwoOCk7XG4gICAgICAgICAgICBleHBlY3Qob3V0bGluZUNoaWxkLmNoaWxkcmVuLmxlbmd0aCkudG8uZXF1YWwoMSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG91dGxpbmVHcmFuZENoaWxkID0gb3V0bGluZUNoaWxkLmNoaWxkcmVuWzBdO1xuICAgICAgICAgICAgZXhwZWN0KG91dGxpbmVHcmFuZENoaWxkLmVuZFBvc2l0aW9uKS50by5ub3QuYmUudW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG91dGxpbmVHcmFuZENoaWxkLmVuZFBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgIGV4cGVjdChvdXRsaW5lR3JhbmRDaGlsZC5lbmRQb3NpdGlvbi5yb3cpLnRvLmVxdWFsKDUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnaGllcmFyY2hpY2FsU3ltYm9sVG9PdXRsaW5lJywgKCkgPT4ge1xuICAgIGl0KCdjb252ZXJ0cyBhbiBpbmRpdmlkdWFsIGl0ZW0nLCAoKSA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VJdGVtID0ge1xuICAgICAgICBuYW1lOiAndGVzdCcsXG4gICAgICAgIGtpbmQ6IGxzLlN5bWJvbEtpbmQuRnVuY3Rpb24sXG4gICAgICAgIHJhbmdlOiBjcmVhdGVSYW5nZSgxLCAxLCAyLCAyKSxcbiAgICAgICAgc2VsZWN0aW9uUmFuZ2U6IGNyZWF0ZVJhbmdlKDEsIDEsIDIsIDIpLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZXhwZWN0ZWQgPSB7XG4gICAgICAgIHRva2VuaXplZFRleHQ6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBraW5kOiAnbWV0aG9kJyxcbiAgICAgICAgICAgIHZhbHVlOiAndGVzdCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgaWNvbjogJ3R5cGUtZnVuY3Rpb24nLFxuICAgICAgICByZXByZXNlbnRhdGl2ZU5hbWU6ICd0ZXN0JyxcbiAgICAgICAgc3RhcnRQb3NpdGlvbjogbmV3IFBvaW50KDEsIDEpLFxuICAgICAgICBlbmRQb3NpdGlvbjogbmV3IFBvaW50KDIsIDIpLFxuICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBPdXRsaW5lVmlld0FkYXB0ZXIuaGllcmFyY2hpY2FsU3ltYm9sVG9PdXRsaW5lKHNvdXJjZUl0ZW0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50by5kZWVwLmVxdWFsKGV4cGVjdGVkKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3N5bWJvbFRvT3V0bGluZScsICgpID0+IHtcbiAgICBpdCgnY29udmVydHMgYW4gaW5kaXZpZHVhbCBpdGVtJywgKCkgPT4ge1xuICAgICAgY29uc3Qgc291cmNlSXRlbSA9IHsga2luZDogbHMuU3ltYm9sS2luZC5DbGFzcywgbmFtZTogJ1Byb2dyYW0nLCBsb2NhdGlvbjogY3JlYXRlTG9jYXRpb24oMSwgMiwgMywgNCkgfTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IE91dGxpbmVWaWV3QWRhcHRlci5zeW1ib2xUb091dGxpbmUoc291cmNlSXRlbSk7XG4gICAgICBleHBlY3QocmVzdWx0Lmljb24pLnRvLmVxdWFsKCd0eXBlLWNsYXNzJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnJlcHJlc2VudGF0aXZlTmFtZSkudG8uZXF1YWwoJ1Byb2dyYW0nKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuY2hpbGRyZW4pLnRvLmRlZXAuZXF1YWwoW10pO1xuICAgICAgZXhwZWN0KHJlc3VsdC50b2tlbml6ZWRUZXh0KS50by5ub3QuYmUudW5kZWZpbmVkO1xuICAgICAgaWYgKHJlc3VsdC50b2tlbml6ZWRUZXh0KSB7XG4gICAgICAgIGV4cGVjdChyZXN1bHQudG9rZW5pemVkVGV4dFswXS5raW5kKS50by5lcXVhbCgndHlwZScpO1xuICAgICAgICBleHBlY3QocmVzdWx0LnRva2VuaXplZFRleHRbMF0udmFsdWUpLnRvLmVxdWFsKCdQcm9ncmFtJyk7XG4gICAgICAgIGV4cGVjdChyZXN1bHQuc3RhcnRQb3NpdGlvbi5yb3cpLnRvLmVxdWFsKDEpO1xuICAgICAgICBleHBlY3QocmVzdWx0LnN0YXJ0UG9zaXRpb24uY29sdW1uKS50by5lcXVhbCgyKTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5lbmRQb3NpdGlvbikudG8ubm90LmJlLnVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHJlc3VsdC5lbmRQb3NpdGlvbikge1xuICAgICAgICAgIGV4cGVjdChyZXN1bHQuZW5kUG9zaXRpb24ucm93KS50by5lcXVhbCgzKTtcbiAgICAgICAgICBleHBlY3QocmVzdWx0LmVuZFBvc2l0aW9uLmNvbHVtbikudG8uZXF1YWwoNCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==