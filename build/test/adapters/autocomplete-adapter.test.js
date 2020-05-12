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
const autocomplete_adapter_1 = require("../../lib/adapters/autocomplete-adapter");
const ls = require("../../lib/languageclient");
const sinon = require("sinon");
const atom_1 = require("atom");
const chai_1 = require("chai");
const helpers_js_1 = require("../helpers.js");
function createRequest({ prefix = "", position = new atom_1.Point(123, 456), activatedManually = true, }) {
    return {
        editor: helpers_js_1.createFakeEditor(),
        bufferPosition: position,
        prefix,
        scopeDescriptor: { getScopesArray() { return ['some.scope']; } },
        activatedManually,
    };
}
// Required and optional properties as of LSP 3.14.0
function createCompletionItem(label, optional = {}) {
    return Object.assign({ label }, optional);
}
describe('AutoCompleteAdapter', () => {
    function createActiveServerSpy() {
        return {
            capabilities: { completionProvider: {} },
            connection: new ls.LanguageClientConnection(helpers_js_1.createSpyConnection()),
            disposable: new atom_1.CompositeDisposable(),
            process: undefined,
            projectPath: '/',
            additionalPaths: new Set(),
            considerDefinitionPath: (_) => { },
        };
    }
    const completionItems = [
        createCompletionItem('thisHasFiltertext', {
            kind: ls.CompletionItemKind.Keyword,
            detail: 'description1',
            documentation: 'a very exciting keyword',
            filterText: 'labrador',
            sortText: 'z',
        }),
        createCompletionItem('label2', {
            kind: ls.CompletionItemKind.Field,
            detail: 'description2',
            documentation: 'a very exciting field',
            filterText: 'rabbit',
            sortText: 'a',
        }),
        createCompletionItem('label3', {
            kind: ls.CompletionItemKind.Variable,
            detail: 'description3',
            documentation: 'a very exciting variable',
        }),
        createCompletionItem('filteredout', {
            kind: ls.CompletionItemKind.Snippet,
            detail: 'description4',
            documentation: 'should not appear',
            sortText: 'zzz',
        }),
    ];
    const request = createRequest({ prefix: 'lab' });
    describe('getSuggestions', () => {
        let server;
        let autoCompleteAdapter;
        function getResults(items, requestParams) {
            return __awaiter(this, void 0, void 0, function* () {
                sinon.stub(server.connection, 'completion').resolves(items);
                return autoCompleteAdapter.getSuggestions(server, createRequest(requestParams));
            });
        }
        beforeEach(() => {
            server = createActiveServerSpy();
            autoCompleteAdapter = new autocomplete_adapter_1.default();
        });
        it('gets AutoComplete suggestions via LSP given an AutoCompleteRequest', () => __awaiter(void 0, void 0, void 0, function* () {
            const results = yield getResults(completionItems, { prefix: '' });
            chai_1.expect(results.length).equals(completionItems.length);
        }));
        it('provides a filtered selection based on the filterKey', () => __awaiter(void 0, void 0, void 0, function* () {
            const results = yield getResults(completionItems, { prefix: 'lab' });
            chai_1.expect(results.length).equals(2);
            chai_1.expect(results.some((r) => r.displayText === 'thisHasFiltertext')).to.be.true;
            chai_1.expect(results.some((r) => r.displayText === 'label3')).to.be.true;
        }));
        it('uses the sortText property to arrange completions when there is no prefix', () => __awaiter(void 0, void 0, void 0, function* () {
            const sortedItems = [
                createCompletionItem('a', { sortText: 'c' }),
                createCompletionItem('b'),
                createCompletionItem('c', { sortText: 'a' }),
            ];
            const results = yield getResults(sortedItems, { prefix: '' });
            chai_1.expect(results.length).equals(sortedItems.length);
            chai_1.expect(results[0].displayText).equals('c');
            chai_1.expect(results[1].displayText).equals('b');
            chai_1.expect(results[2].displayText).equals('a');
        }));
        it('uses the filterText property to arrange completions when there is a prefix', () => __awaiter(void 0, void 0, void 0, function* () {
            const results = yield getResults(completionItems, { prefix: 'lab' });
            chai_1.expect(results.length).equals(2);
            chai_1.expect(results[0].displayText).equals('label3'); // shorter than 'labrador', so expected to be first
            chai_1.expect(results[1].displayText).equals('thisHasFiltertext');
        }));
    });
    describe('completeSuggestion', () => {
        const partialItems = [
            createCompletionItem('label1'),
            createCompletionItem('label2'),
            createCompletionItem('label3'),
        ];
        const server = createActiveServerSpy();
        sinon.stub(server.connection, 'completion').resolves(partialItems);
        sinon.stub(server.connection, 'completionItemResolve').resolves(createCompletionItem('label3', { detail: 'description3', documentation: 'a very exciting variable' }));
        it('resolves suggestions via LSP given an AutoCompleteRequest', () => __awaiter(void 0, void 0, void 0, function* () {
            const autoCompleteAdapter = new autocomplete_adapter_1.default();
            const results = yield autoCompleteAdapter.getSuggestions(server, request);
            const result = results.find((r) => r.displayText === 'label3');
            chai_1.expect(result).not.to.be.undefined;
            chai_1.expect(result.description).to.be.undefined;
            const resolvedItem = yield autoCompleteAdapter.completeSuggestion(server, result, request);
            chai_1.expect(resolvedItem && resolvedItem.description).equals('a very exciting variable');
        }));
    });
    describe('createCompletionParams', () => {
        it('creates CompletionParams from an AutocompleteRequest with no trigger', () => {
            const result = autocomplete_adapter_1.default.createCompletionParams(request, '', true);
            chai_1.expect(result.textDocument.uri).equals('file:///a/b/c/d.js');
            chai_1.expect(result.position).deep.equals({ line: 123, character: 456 });
            chai_1.expect(result.context && result.context.triggerKind).equals(ls.CompletionTriggerKind.Invoked);
            chai_1.expect(result.context && result.context.triggerCharacter).to.be.undefined;
        });
        it('creates CompletionParams from an AutocompleteRequest with a trigger', () => {
            const result = autocomplete_adapter_1.default.createCompletionParams(request, '.', true);
            chai_1.expect(result.textDocument.uri).equals('file:///a/b/c/d.js');
            chai_1.expect(result.position).deep.equals({ line: 123, character: 456 });
            chai_1.expect(result.context && result.context.triggerKind).equals(ls.CompletionTriggerKind.TriggerCharacter);
            chai_1.expect(result.context && result.context.triggerCharacter).equals('.');
        });
        it('creates CompletionParams from an AutocompleteRequest for a follow-up request', () => {
            const result = autocomplete_adapter_1.default.createCompletionParams(request, '.', false);
            chai_1.expect(result.textDocument.uri).equals('file:///a/b/c/d.js');
            chai_1.expect(result.position).deep.equals({ line: 123, character: 456 });
            chai_1.expect(result.context && result.context.triggerKind)
                .equals(ls.CompletionTriggerKind.TriggerForIncompleteCompletions);
            chai_1.expect(result.context && result.context.triggerCharacter).equals('.');
        });
    });
    describe('conversion of LSP completion to autocomplete+ completion', () => {
        const items = [
            createCompletionItem('align', {
                sortText: 'a',
                kind: ls.CompletionItemKind.Snippet,
                textEdit: {
                    range: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                    newText: 'hello world',
                },
            }),
            createCompletionItem('list', {
                sortText: 'b',
                kind: ls.CompletionItemKind.Constant,
                textEdit: {
                    range: { start: { line: 0, character: 8 }, end: { line: 0, character: 13 } },
                    newText: 'shifted',
                },
            }),
            createCompletionItem('minimal', {
                sortText: 'c',
            }),
            createCompletionItem('old', {
                sortText: 'd',
                documentation: 'doc string',
                insertText: 'inserted',
                insertTextFormat: ls.InsertTextFormat.Snippet,
            }),
            createCompletionItem('documented', {
                sortText: 'e',
                detail: 'details',
                documentation: {
                    kind: 'markdown',
                    value: 'documentation',
                },
            }),
        ];
        let server;
        let autoCompleteAdapter;
        beforeEach(() => {
            server = createActiveServerSpy();
            autoCompleteAdapter = new autocomplete_adapter_1.default();
        });
        it('converts LSP CompletionItem array to AutoComplete Suggestions array', () => __awaiter(void 0, void 0, void 0, function* () {
            const customRequest = createRequest({ prefix: '', position: new atom_1.Point(0, 10) });
            customRequest.editor.setText('foo #align bar');
            sinon.stub(server.connection, 'completion').resolves(items);
            const results = yield autoCompleteAdapter.getSuggestions(server, customRequest);
            chai_1.expect(results.length).equals(items.length);
            chai_1.expect(results[0].displayText).equals('align');
            chai_1.expect(results[0].text).equals('hello world');
            chai_1.expect(results[0].replacementPrefix).equals('#align');
            chai_1.expect(results[0].type).equals('snippet');
            chai_1.expect(results[1].displayText).equals('list');
            chai_1.expect(results[1].text).equals('shifted');
            chai_1.expect(results[1].replacementPrefix).equals('gn'); // TODO: support post replacement too
            chai_1.expect(results[1].type).equals('constant');
            chai_1.expect(results[2].displayText).equals('minimal');
            chai_1.expect(results[2].text).equals('minimal');
            chai_1.expect(results[2].replacementPrefix).equals(''); // we sent an empty prefix
            chai_1.expect(results[3].displayText).equals('old');
            chai_1.expect(results[3].snippet).equals('inserted');
            chai_1.expect(results[3].description).equals('doc string');
            chai_1.expect(results[3].descriptionMarkdown).equals('doc string');
            chai_1.expect(results[4].displayText).equals('documented');
            chai_1.expect(results[4].description).is.undefined;
            chai_1.expect(results[4].descriptionMarkdown).equals('documentation');
            chai_1.expect(results[4].rightLabel).equals('details');
        }));
        it('respects onDidConvertCompletionItem', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([createCompletionItem('label')]);
            const results = yield autoCompleteAdapter.getSuggestions(server, createRequest({}), (c, a, r) => {
                a.text = c.label + ' ok';
                a.displayText = r.scopeDescriptor.getScopesArray()[0];
            });
            chai_1.expect(results.length).equals(1);
            chai_1.expect(results[0].displayText).equals('some.scope');
            chai_1.expect(results[0].text).equals('label ok');
        }));
        it('converts empty array into an empty AutoComplete Suggestions array', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([]);
            const results = yield autoCompleteAdapter.getSuggestions(server, createRequest({}));
            chai_1.expect(results.length).equals(0);
        }));
        it('converts LSP CompletionItem to AutoComplete Suggestion without textEdit', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('label', {
                    insertText: 'insert',
                    filterText: 'filter',
                    kind: ls.CompletionItemKind.Keyword,
                    detail: 'keyword',
                    documentation: 'a truly useful keyword',
                }),
            ]);
            const result = (yield autoCompleteAdapter.getSuggestions(server, createRequest({})))[0];
            chai_1.expect(result.text).equals('insert');
            chai_1.expect(result.displayText).equals('label');
            chai_1.expect(result.type).equals('keyword');
            chai_1.expect(result.rightLabel).equals('keyword');
            chai_1.expect(result.description).equals('a truly useful keyword');
            chai_1.expect(result.descriptionMarkdown).equals('a truly useful keyword');
        }));
        it('converts LSP CompletionItem to AutoComplete Suggestion with textEdit', () => __awaiter(void 0, void 0, void 0, function* () {
            const customRequest = createRequest({
                prefix: '',
                position: new atom_1.Point(0, 10),
                activatedManually: false,
            });
            customRequest.editor.setText('foo #label bar');
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('label', {
                    insertText: 'insert',
                    filterText: 'filter',
                    kind: ls.CompletionItemKind.Variable,
                    detail: 'number',
                    documentation: 'a truly useful variable',
                    textEdit: {
                        range: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                        newText: 'newText',
                    },
                }),
            ]);
            const result = (yield autoCompleteAdapter.getSuggestions(server, customRequest))[0];
            chai_1.expect(result.displayText).equals('label');
            chai_1.expect(result.type).equals('variable');
            chai_1.expect(result.rightLabel).equals('number');
            chai_1.expect(result.description).equals('a truly useful variable');
            chai_1.expect(result.descriptionMarkdown).equals('a truly useful variable');
            chai_1.expect(result.replacementPrefix).equals('#label');
            chai_1.expect(result.text).equals('newText');
        }));
        it('converts LSP CompletionItem with insertText and filterText to AutoComplete Suggestion', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('label', {
                    insertText: 'insert',
                    filterText: 'filter',
                    kind: ls.CompletionItemKind.Keyword,
                    detail: 'detail',
                    documentation: 'a very exciting keyword',
                }),
                createCompletionItem('filteredOut', {
                    filterText: 'nop',
                }),
            ]);
            const results = yield autoCompleteAdapter.getSuggestions(server, createRequest({ prefix: 'fil' }));
            chai_1.expect(results.length).equals(1);
            const result = results[0];
            chai_1.expect(result.text).equals('insert');
            chai_1.expect(result.displayText).equals('label');
            chai_1.expect(result.type).equals('keyword');
            chai_1.expect(result.rightLabel).equals('detail');
            chai_1.expect(result.description).equals('a very exciting keyword');
            chai_1.expect(result.descriptionMarkdown).equals('a very exciting keyword');
        }));
        it('converts LSP CompletionItem with missing documentation to AutoComplete Suggestion', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('label', {
                    detail: 'detail',
                }),
            ]);
            const result = (yield autoCompleteAdapter.getSuggestions(server, createRequest({})))[0];
            chai_1.expect(result.rightLabel).equals('detail');
            chai_1.expect(result.description).equals(undefined);
            chai_1.expect(result.descriptionMarkdown).equals(undefined);
        }));
        it('converts LSP CompletionItem with markdown documentation to AutoComplete Suggestion', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('label', {
                    detail: 'detail',
                    documentation: { value: 'Some *markdown*', kind: 'markdown' },
                }),
            ]);
            const result = (yield autoCompleteAdapter.getSuggestions(server, createRequest({})))[0];
            chai_1.expect(result.rightLabel).equals('detail');
            chai_1.expect(result.description).equals(undefined);
            chai_1.expect(result.descriptionMarkdown).equals('Some *markdown*');
        }));
        it('converts LSP CompletionItem with plaintext documentation to AutoComplete Suggestion', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('label', {
                    detail: 'detail',
                    documentation: { value: 'Some plain text', kind: 'plaintext' },
                }),
            ]);
            const result = (yield autoCompleteAdapter.getSuggestions(server, createRequest({})))[0];
            chai_1.expect(result.rightLabel).equals('detail');
            chai_1.expect(result.description).equals('Some plain text');
            chai_1.expect(result.descriptionMarkdown).equals(undefined);
        }));
        it('converts LSP CompletionItem without insertText or filterText to AutoComplete Suggestion', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('label', {
                    kind: ls.CompletionItemKind.Keyword,
                    detail: 'detail',
                    documentation: 'A very useful keyword',
                }),
            ]);
            const result = (yield autoCompleteAdapter.getSuggestions(server, createRequest({})))[0];
            chai_1.expect(result.text).equals('label');
            chai_1.expect(result.displayText).equals('label');
            chai_1.expect(result.type).equals('keyword');
            chai_1.expect(result.rightLabel).equals('detail');
            chai_1.expect(result.description).equals('A very useful keyword');
            chai_1.expect(result.descriptionMarkdown).equals('A very useful keyword');
        }));
        it('does not do anything if there is no textEdit', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('', { filterText: 'rep' }),
            ]);
            const result = (yield autoCompleteAdapter.getSuggestions(server, createRequest({ prefix: 'rep' })))[0];
            chai_1.expect(result.text).equals('');
            chai_1.expect(result.displayText).equals('');
            chai_1.expect(result.replacementPrefix).equals('');
        }));
        it('applies changes from TextEdit to text', () => __awaiter(void 0, void 0, void 0, function* () {
            const customRequest = createRequest({ prefix: '', position: new atom_1.Point(0, 10) });
            customRequest.editor.setText('foo #align bar');
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('align', {
                    sortText: 'a',
                    textEdit: {
                        range: { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } },
                        newText: 'hello world',
                    },
                }),
            ]);
            const results = yield autoCompleteAdapter.getSuggestions(server, customRequest);
            chai_1.expect(results[0].displayText).equals('align');
            chai_1.expect(results[0].text).equals('hello world');
            chai_1.expect(results[0].replacementPrefix).equals('#align');
        }));
        it('updates the replacementPrefix when the editor text changes', () => __awaiter(void 0, void 0, void 0, function* () {
            const customRequest = createRequest({ prefix: '', position: new atom_1.Point(0, 8) });
            customRequest.editor.setText('foo #ali bar');
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('align', {
                    sortText: 'a',
                    textEdit: {
                        range: { start: { line: 0, character: 4 }, end: { line: 0, character: 8 } },
                        newText: 'hello world',
                    },
                }),
            ]);
            let result = (yield autoCompleteAdapter.getSuggestions(server, customRequest))[0];
            chai_1.expect(result.replacementPrefix).equals('#ali');
            customRequest.editor.setTextInBufferRange([[0, 8], [0, 8]], 'g');
            customRequest.bufferPosition = new atom_1.Point(0, 9);
            result = (yield autoCompleteAdapter.getSuggestions(server, customRequest))[0];
            chai_1.expect(result.replacementPrefix).equals('#alig');
            customRequest.editor.setTextInBufferRange([[0, 9], [0, 9]], 'n');
            customRequest.bufferPosition = new atom_1.Point(0, 10);
            result = (yield autoCompleteAdapter.getSuggestions(server, customRequest))[0];
            chai_1.expect(result.replacementPrefix).equals('#align');
            customRequest.editor.setTextInBufferRange([[0, 7], [0, 9]], '');
            customRequest.bufferPosition = new atom_1.Point(0, 7);
            result = (yield autoCompleteAdapter.getSuggestions(server, customRequest))[0];
            chai_1.expect(result.replacementPrefix).equals('#al');
        }));
    });
    describe('completionKindToSuggestionType', () => {
        it('converts LSP CompletionKinds to AutoComplete SuggestionTypes', () => {
            const variable = autocomplete_adapter_1.default.completionKindToSuggestionType(ls.CompletionItemKind.Variable);
            const constructor = autocomplete_adapter_1.default.completionKindToSuggestionType(ls.CompletionItemKind.Constructor);
            const module = autocomplete_adapter_1.default.completionKindToSuggestionType(ls.CompletionItemKind.Module);
            chai_1.expect(variable).equals('variable');
            chai_1.expect(constructor).equals('function');
            chai_1.expect(module).equals('module');
        });
        it('defaults to "value"', () => {
            const result = autocomplete_adapter_1.default.completionKindToSuggestionType(undefined);
            chai_1.expect(result).equals('value');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlLWFkYXB0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3QvYWRhcHRlcnMvYXV0b2NvbXBsZXRlLWFkYXB0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLGtGQUEwRTtBQUUxRSwrQ0FBK0M7QUFDL0MsK0JBQStCO0FBQy9CLCtCQUdjO0FBRWQsK0JBQThCO0FBQzlCLDhDQUFzRTtBQUl0RSxTQUFTLGFBQWEsQ0FBQyxFQUNyQixNQUFNLEdBQUcsRUFBRSxFQUNYLFFBQVEsR0FBRyxJQUFJLFlBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQzlCLGlCQUFpQixHQUFHLElBQUksR0FDekI7SUFDQyxPQUFPO1FBQ0wsTUFBTSxFQUFFLDZCQUFnQixFQUFFO1FBQzFCLGNBQWMsRUFBRSxRQUFRO1FBQ3hCLE1BQU07UUFDTixlQUFlLEVBQUUsRUFBRSxjQUFjLEtBQUssT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2hFLGlCQUFpQjtLQUNsQixDQUFDO0FBQ0osQ0FBQztBQUVELG9EQUFvRDtBQUNwRCxTQUFTLG9CQUFvQixDQUFDLEtBQWEsRUFBRSxXQWV6QyxFQUFFO0lBQ0osT0FBTyxnQkFDTCxLQUFLLElBQ0YsUUFBUSxDQUNNLENBQUM7QUFDdEIsQ0FBQztBQUVELFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsU0FBUyxxQkFBcUI7UUFDNUIsT0FBTztZQUNMLFlBQVksRUFBRSxFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRTtZQUN4QyxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsZ0NBQW1CLEVBQUUsQ0FBQztZQUNsRSxVQUFVLEVBQUUsSUFBSSwwQkFBbUIsRUFBRTtZQUNyQyxPQUFPLEVBQUUsU0FBZ0I7WUFDekIsV0FBVyxFQUFFLEdBQUc7WUFDaEIsZUFBZSxF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cEcsTUFBTSxXQUFXLEdBQUcsOEJBQW1CLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFHLE1BQU0sTUFBTSxHQUFHLDhCQUFtQixDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoRyxhQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BDLGFBQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdkMsYUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7WUFDN0IsTUFBTSxNQUFNLEdBQUcsOEJBQW1CLENBQUMsOEJBQThCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0UsYUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQXV0b0NvbXBsZXRlQWRhcHRlciBmcm9tICcuLi8uLi9saWIvYWRhcHRlcnMvYXV0b2NvbXBsZXRlLWFkYXB0ZXInO1xuaW1wb3J0IHsgQWN0aXZlU2VydmVyIH0gZnJvbSAnLi4vLi4vbGliL3NlcnZlci1tYW5hZ2VyLmpzJztcbmltcG9ydCAqIGFzIGxzIGZyb20gJy4uLy4uL2xpYi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQgKiBhcyBzaW5vbiBmcm9tICdzaW5vbic7XG5pbXBvcnQge1xuICBDb21wb3NpdGVEaXNwb3NhYmxlLFxuICBQb2ludCxcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgKiBhcyBhYyBmcm9tICdhdG9tL2F1dG9jb21wbGV0ZS1wbHVzJztcbmltcG9ydCB7IGV4cGVjdCB9IGZyb20gJ2NoYWknO1xuaW1wb3J0IHsgY3JlYXRlU3B5Q29ubmVjdGlvbiwgY3JlYXRlRmFrZUVkaXRvciB9IGZyb20gJy4uL2hlbHBlcnMuanMnO1xuaW1wb3J0IHsgVGV4dFN1Z2dlc3Rpb24sIFNuaXBwZXRTdWdnZXN0aW9uIH0gZnJvbSAnYXRvbS1pZGUnO1xuaW1wb3J0IHsgQ29tcGxldGlvbkl0ZW0sIE1hcmt1cENvbnRlbnQsIEluc2VydFRleHRGb3JtYXQsIFRleHRFZGl0LCBDb21tYW5kIH0gZnJvbSAnLi4vLi4vbGliL2xhbmd1YWdlY2xpZW50JztcblxuZnVuY3Rpb24gY3JlYXRlUmVxdWVzdCh7XG4gIHByZWZpeCA9IFwiXCIsXG4gIHBvc2l0aW9uID0gbmV3IFBvaW50KDEyMywgNDU2KSxcbiAgYWN0aXZhdGVkTWFudWFsbHkgPSB0cnVlLFxufSk6IGFjLlN1Z2dlc3Rpb25zUmVxdWVzdGVkRXZlbnQge1xuICByZXR1cm4ge1xuICAgIGVkaXRvcjogY3JlYXRlRmFrZUVkaXRvcigpLFxuICAgIGJ1ZmZlclBvc2l0aW9uOiBwb3NpdGlvbixcbiAgICBwcmVmaXgsXG4gICAgc2NvcGVEZXNjcmlwdG9yOiB7IGdldFNjb3Blc0FycmF5KCkgeyByZXR1cm4gWydzb21lLnNjb3BlJ107IH0gfSxcbiAgICBhY3RpdmF0ZWRNYW51YWxseSxcbiAgfTtcbn1cblxuLy8gUmVxdWlyZWQgYW5kIG9wdGlvbmFsIHByb3BlcnRpZXMgYXMgb2YgTFNQIDMuMTQuMFxuZnVuY3Rpb24gY3JlYXRlQ29tcGxldGlvbkl0ZW0obGFiZWw6IHN0cmluZywgb3B0aW9uYWw6IHtcbiAga2luZD86IG51bWJlcixcbiAgZGV0YWlsPzogc3RyaW5nLFxuICBkb2N1bWVudGF0aW9uPzogc3RyaW5nIHwgTWFya3VwQ29udGVudCxcbiAgZGVwcmVjYXRlZD86IGJvb2xlYW4sXG4gIHByZXNlbGVjdD86IGJvb2xlYW4sXG4gIHNvcnRUZXh0Pzogc3RyaW5nLFxuICBmaWx0ZXJUZXh0Pzogc3RyaW5nLFxuICBpbnNlcnRUZXh0Pzogc3RyaW5nLFxuICBpbnNlcnRUZXh0Rm9ybWF0PzogSW5zZXJ0VGV4dEZvcm1hdCxcbiAgdGV4dEVkaXQ/OiBUZXh0RWRpdCxcbiAgYWRkaXRpb25hbFRleHRFZGl0cz86IFRleHRFZGl0W10sXG4gIGNvbW1pdENoYXJhY3RlcnM/OiBzdHJpbmdbXVxuICBjb21tYW5kPzogQ29tbWFuZCxcbiAgZGF0YT86IGFueSxcbn0gPSB7fSk6IENvbXBsZXRpb25JdGVtIHtcbiAgcmV0dXJuIHtcbiAgICBsYWJlbCxcbiAgICAuLi5vcHRpb25hbCxcbiAgfSBhcyBDb21wbGV0aW9uSXRlbTtcbn1cblxuZGVzY3JpYmUoJ0F1dG9Db21wbGV0ZUFkYXB0ZXInLCAoKSA9PiB7XG4gIGZ1bmN0aW9uIGNyZWF0ZUFjdGl2ZVNlcnZlclNweSgpOiBBY3RpdmVTZXJ2ZXIge1xuICAgIHJldHVybiB7XG4gICAgICBjYXBhYmlsaXRpZXM6IHsgY29tcGxldGlvblByb3ZpZGVyOiB7fSB9LFxuICAgICAgY29ubmVjdGlvbjogbmV3IGxzLkxhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbihjcmVhdGVTcHlDb25uZWN0aW9uKCkpLFxuICAgICAgZGlzcG9zYWJsZTogbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKSxcbiAgICAgIHByb2Nlc3M6IHVuZGVmaW5lZCBhcyBhbnksXG4gICAgICBwcm9qZWN0UGF0aDogJy8nLFxuICAgICAgYWRkaXRpb25hbFBhdGhzOiBuZXcgU2V0KCksXG4gICAgICBjb25zaWRlckRlZmluaXRpb25QYXRoOiAoXzogc3RyaW5nKTogdm9pZCA9PiB7fSxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgY29tcGxldGlvbkl0ZW1zID0gW1xuICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCd0aGlzSGFzRmlsdGVydGV4dCcsIHtcbiAgICAgIGtpbmQ6IGxzLkNvbXBsZXRpb25JdGVtS2luZC5LZXl3b3JkLFxuICAgICAgZGV0YWlsOiAnZGVzY3JpcHRpb24xJyxcbiAgICAgIGRvY3VtZW50YXRpb246ICdhIHZlcnkgZXhjaXRpbmcga2V5d29yZCcsXG4gICAgICBmaWx0ZXJUZXh0OiAnbGFicmFkb3InLFxuICAgICAgc29ydFRleHQ6ICd6JyxcbiAgICB9KSxcbiAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwyJywge1xuICAgICAga2luZDogbHMuQ29tcGxldGlvbkl0ZW1LaW5kLkZpZWxkLFxuICAgICAgZGV0YWlsOiAnZGVzY3JpcHRpb24yJyxcbiAgICAgIGRvY3VtZW50YXRpb246ICdhIHZlcnkgZXhjaXRpbmcgZmllbGQnLFxuICAgICAgZmlsdGVyVGV4dDogJ3JhYmJpdCcsXG4gICAgICBzb3J0VGV4dDogJ2EnLFxuICAgIH0pLFxuICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbDMnLCB7XG4gICAgICBraW5kOiBscy5Db21wbGV0aW9uSXRlbUtpbmQuVmFyaWFibGUsXG4gICAgICBkZXRhaWw6ICdkZXNjcmlwdGlvbjMnLFxuICAgICAgZG9jdW1lbnRhdGlvbjogJ2EgdmVyeSBleGNpdGluZyB2YXJpYWJsZScsXG4gICAgfSksXG4gICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2ZpbHRlcmVkb3V0Jywge1xuICAgICAga2luZDogbHMuQ29tcGxldGlvbkl0ZW1LaW5kLlNuaXBwZXQsXG4gICAgICBkZXRhaWw6ICdkZXNjcmlwdGlvbjQnLFxuICAgICAgZG9jdW1lbnRhdGlvbjogJ3Nob3VsZCBub3QgYXBwZWFyJyxcbiAgICAgIHNvcnRUZXh0OiAnenp6JyxcbiAgICB9KSxcbiAgXTtcblxuICBjb25zdCByZXF1ZXN0ID0gY3JlYXRlUmVxdWVzdCh7cHJlZml4OiAnbGFiJ30pO1xuXG4gIGRlc2NyaWJlKCdnZXRTdWdnZXN0aW9ucycsICgpID0+IHtcbiAgICBsZXQgc2VydmVyOiBBY3RpdmVTZXJ2ZXI7XG4gICAgbGV0IGF1dG9Db21wbGV0ZUFkYXB0ZXI6IEF1dG9Db21wbGV0ZUFkYXB0ZXI7XG5cbiAgICBhc3luYyBmdW5jdGlvbiBnZXRSZXN1bHRzKFxuICAgICAgaXRlbXM6IENvbXBsZXRpb25JdGVtW10sXG4gICAgICByZXF1ZXN0UGFyYW1zOiB7cHJlZml4Pzogc3RyaW5nLCBwb2ludD86IFBvaW50fSxcbiAgICApOiBQcm9taXNlPGFjLkFueVN1Z2dlc3Rpb25bXT4ge1xuICAgICAgc2lub24uc3R1YihzZXJ2ZXIuY29ubmVjdGlvbiwgJ2NvbXBsZXRpb24nKS5yZXNvbHZlcyhpdGVtcyk7XG4gICAgICByZXR1cm4gYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGNyZWF0ZVJlcXVlc3QocmVxdWVzdFBhcmFtcykpO1xuICAgIH1cblxuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgc2VydmVyID0gY3JlYXRlQWN0aXZlU2VydmVyU3B5KCk7XG4gICAgICBhdXRvQ29tcGxldGVBZGFwdGVyID0gbmV3IEF1dG9Db21wbGV0ZUFkYXB0ZXIoKTtcbiAgICB9KTtcblxuICAgIGl0KCdnZXRzIEF1dG9Db21wbGV0ZSBzdWdnZXN0aW9ucyB2aWEgTFNQIGdpdmVuIGFuIEF1dG9Db21wbGV0ZVJlcXVlc3QnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgZ2V0UmVzdWx0cyhjb21wbGV0aW9uSXRlbXMsIHtwcmVmaXg6ICcnfSk7XG4gICAgICBleHBlY3QocmVzdWx0cy5sZW5ndGgpLmVxdWFscyhjb21wbGV0aW9uSXRlbXMubGVuZ3RoKTtcbiAgICB9KTtcblxuICAgIGl0KCdwcm92aWRlcyBhIGZpbHRlcmVkIHNlbGVjdGlvbiBiYXNlZCBvbiB0aGUgZmlsdGVyS2V5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGdldFJlc3VsdHMoY29tcGxldGlvbkl0ZW1zLCB7cHJlZml4OiAnbGFiJ30pO1xuICAgICAgZXhwZWN0KHJlc3VsdHMubGVuZ3RoKS5lcXVhbHMoMik7XG4gICAgICBleHBlY3QocmVzdWx0cy5zb21lKChyKSA9PiByLmRpc3BsYXlUZXh0ID09PSAndGhpc0hhc0ZpbHRlcnRleHQnKSkudG8uYmUudHJ1ZTtcbiAgICAgIGV4cGVjdChyZXN1bHRzLnNvbWUoKHIpID0+IHIuZGlzcGxheVRleHQgPT09ICdsYWJlbDMnKSkudG8uYmUudHJ1ZTtcbiAgICB9KTtcblxuICAgIGl0KCd1c2VzIHRoZSBzb3J0VGV4dCBwcm9wZXJ0eSB0byBhcnJhbmdlIGNvbXBsZXRpb25zIHdoZW4gdGhlcmUgaXMgbm8gcHJlZml4JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc29ydGVkSXRlbXMgPSBbXG4gICAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdhJywge3NvcnRUZXh0OiAnYyd9KSxcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2InKSxcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2MnLCB7c29ydFRleHQ6ICdhJ30pLFxuICAgICAgXTtcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBnZXRSZXN1bHRzKHNvcnRlZEl0ZW1zLCB7cHJlZml4OiAnJ30pO1xuXG4gICAgICBleHBlY3QocmVzdWx0cy5sZW5ndGgpLmVxdWFscyhzb3J0ZWRJdGVtcy5sZW5ndGgpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0uZGlzcGxheVRleHQpLmVxdWFscygnYycpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMV0uZGlzcGxheVRleHQpLmVxdWFscygnYicpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMl0uZGlzcGxheVRleHQpLmVxdWFscygnYScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3VzZXMgdGhlIGZpbHRlclRleHQgcHJvcGVydHkgdG8gYXJyYW5nZSBjb21wbGV0aW9ucyB3aGVuIHRoZXJlIGlzIGEgcHJlZml4JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGdldFJlc3VsdHMoY29tcGxldGlvbkl0ZW1zLCB7cHJlZml4OiAnbGFiJ30pO1xuICAgICAgZXhwZWN0KHJlc3VsdHMubGVuZ3RoKS5lcXVhbHMoMik7XG4gICAgICBleHBlY3QocmVzdWx0c1swXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdsYWJlbDMnKTsgLy8gc2hvcnRlciB0aGFuICdsYWJyYWRvcicsIHNvIGV4cGVjdGVkIHRvIGJlIGZpcnN0XG4gICAgICBleHBlY3QocmVzdWx0c1sxXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCd0aGlzSGFzRmlsdGVydGV4dCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY29tcGxldGVTdWdnZXN0aW9uJywgKCkgPT4ge1xuICAgIGNvbnN0IHBhcnRpYWxJdGVtcyA9IFtcbiAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbDEnKSxcbiAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbDInKSxcbiAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbDMnKSxcbiAgICBdO1xuXG4gICAgY29uc3Qgc2VydmVyOiBBY3RpdmVTZXJ2ZXIgPSBjcmVhdGVBY3RpdmVTZXJ2ZXJTcHkoKTtcbiAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKHBhcnRpYWxJdGVtcyk7XG4gICAgc2lub24uc3R1YihzZXJ2ZXIuY29ubmVjdGlvbiwgJ2NvbXBsZXRpb25JdGVtUmVzb2x2ZScpLnJlc29sdmVzKGNyZWF0ZUNvbXBsZXRpb25JdGVtKFxuICAgICAgJ2xhYmVsMycsIHtkZXRhaWw6ICdkZXNjcmlwdGlvbjMnLCBkb2N1bWVudGF0aW9uOiAnYSB2ZXJ5IGV4Y2l0aW5nIHZhcmlhYmxlJ30sXG4gICAgKSk7XG5cbiAgICBpdCgncmVzb2x2ZXMgc3VnZ2VzdGlvbnMgdmlhIExTUCBnaXZlbiBhbiBBdXRvQ29tcGxldGVSZXF1ZXN0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgYXV0b0NvbXBsZXRlQWRhcHRlciA9IG5ldyBBdXRvQ29tcGxldGVBZGFwdGVyKCk7XG4gICAgICBjb25zdCByZXN1bHRzOiBhYy5BbnlTdWdnZXN0aW9uW10gPSBhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgcmVxdWVzdCk7XG4gICAgICBjb25zdCByZXN1bHQgPSByZXN1bHRzLmZpbmQoKHIpID0+IHIuZGlzcGxheVRleHQgPT09ICdsYWJlbDMnKSE7XG4gICAgICBleHBlY3QocmVzdWx0KS5ub3QudG8uYmUudW5kZWZpbmVkO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZXNjcmlwdGlvbikudG8uYmUudW5kZWZpbmVkO1xuICAgICAgY29uc3QgcmVzb2x2ZWRJdGVtID0gYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5jb21wbGV0ZVN1Z2dlc3Rpb24oc2VydmVyLCByZXN1bHQsIHJlcXVlc3QpO1xuICAgICAgZXhwZWN0KHJlc29sdmVkSXRlbSAmJiByZXNvbHZlZEl0ZW0uZGVzY3JpcHRpb24pLmVxdWFscygnYSB2ZXJ5IGV4Y2l0aW5nIHZhcmlhYmxlJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdjcmVhdGVDb21wbGV0aW9uUGFyYW1zJywgKCkgPT4ge1xuICAgIGl0KCdjcmVhdGVzIENvbXBsZXRpb25QYXJhbXMgZnJvbSBhbiBBdXRvY29tcGxldGVSZXF1ZXN0IHdpdGggbm8gdHJpZ2dlcicsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IEF1dG9Db21wbGV0ZUFkYXB0ZXIuY3JlYXRlQ29tcGxldGlvblBhcmFtcyhyZXF1ZXN0LCAnJywgdHJ1ZSk7XG4gICAgICBleHBlY3QocmVzdWx0LnRleHREb2N1bWVudC51cmkpLmVxdWFscygnZmlsZTovLy9hL2IvYy9kLmpzJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnBvc2l0aW9uKS5kZWVwLmVxdWFscyh7IGxpbmU6IDEyMywgY2hhcmFjdGVyOiA0NTYgfSk7XG4gICAgICBleHBlY3QocmVzdWx0LmNvbnRleHQgJiYgcmVzdWx0LmNvbnRleHQudHJpZ2dlcktpbmQpLmVxdWFscyhscy5Db21wbGV0aW9uVHJpZ2dlcktpbmQuSW52b2tlZCk7XG4gICAgICBleHBlY3QocmVzdWx0LmNvbnRleHQgJiYgcmVzdWx0LmNvbnRleHQudHJpZ2dlckNoYXJhY3RlcikudG8uYmUudW5kZWZpbmVkO1xuICAgIH0pO1xuXG4gICAgaXQoJ2NyZWF0ZXMgQ29tcGxldGlvblBhcmFtcyBmcm9tIGFuIEF1dG9jb21wbGV0ZVJlcXVlc3Qgd2l0aCBhIHRyaWdnZXInLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBBdXRvQ29tcGxldGVBZGFwdGVyLmNyZWF0ZUNvbXBsZXRpb25QYXJhbXMocmVxdWVzdCwgJy4nLCB0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudGV4dERvY3VtZW50LnVyaSkuZXF1YWxzKCdmaWxlOi8vL2EvYi9jL2QuanMnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucG9zaXRpb24pLmRlZXAuZXF1YWxzKHsgbGluZTogMTIzLCBjaGFyYWN0ZXI6IDQ1NiB9KTtcbiAgICAgIGV4cGVjdChyZXN1bHQuY29udGV4dCAmJiByZXN1bHQuY29udGV4dC50cmlnZ2VyS2luZCkuZXF1YWxzKGxzLkNvbXBsZXRpb25UcmlnZ2VyS2luZC5UcmlnZ2VyQ2hhcmFjdGVyKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuY29udGV4dCAmJiByZXN1bHQuY29udGV4dC50cmlnZ2VyQ2hhcmFjdGVyKS5lcXVhbHMoJy4nKTtcbiAgICB9KTtcblxuICAgIGl0KCdjcmVhdGVzIENvbXBsZXRpb25QYXJhbXMgZnJvbSBhbiBBdXRvY29tcGxldGVSZXF1ZXN0IGZvciBhIGZvbGxvdy11cCByZXF1ZXN0JywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gQXV0b0NvbXBsZXRlQWRhcHRlci5jcmVhdGVDb21wbGV0aW9uUGFyYW1zKHJlcXVlc3QsICcuJywgZmFsc2UpO1xuICAgICAgZXhwZWN0KHJlc3VsdC50ZXh0RG9jdW1lbnQudXJpKS5lcXVhbHMoJ2ZpbGU6Ly8vYS9iL2MvZC5qcycpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5wb3NpdGlvbikuZGVlcC5lcXVhbHMoeyBsaW5lOiAxMjMsIGNoYXJhY3RlcjogNDU2IH0pO1xuICAgICAgZXhwZWN0KHJlc3VsdC5jb250ZXh0ICYmIHJlc3VsdC5jb250ZXh0LnRyaWdnZXJLaW5kKVxuICAgICAgICAuZXF1YWxzKGxzLkNvbXBsZXRpb25UcmlnZ2VyS2luZC5UcmlnZ2VyRm9ySW5jb21wbGV0ZUNvbXBsZXRpb25zKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuY29udGV4dCAmJiByZXN1bHQuY29udGV4dC50cmlnZ2VyQ2hhcmFjdGVyKS5lcXVhbHMoJy4nKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NvbnZlcnNpb24gb2YgTFNQIGNvbXBsZXRpb24gdG8gYXV0b2NvbXBsZXRlKyBjb21wbGV0aW9uJywgKCkgPT4ge1xuICAgIGNvbnN0IGl0ZW1zID0gW1xuICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2FsaWduJywge1xuICAgICAgICBzb3J0VGV4dDogJ2EnLFxuICAgICAgICBraW5kOiBscy5Db21wbGV0aW9uSXRlbUtpbmQuU25pcHBldCxcbiAgICAgICAgdGV4dEVkaXQ6IHtcbiAgICAgICAgICByYW5nZTogeyBzdGFydDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDQgfSwgZW5kOiB7IGxpbmU6IDAsICBjaGFyYWN0ZXI6IDEwIH0gfSxcbiAgICAgICAgICBuZXdUZXh0OiAnaGVsbG8gd29ybGQnLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGlzdCcsIHtcbiAgICAgICAgc29ydFRleHQ6ICdiJyxcbiAgICAgICAga2luZDogbHMuQ29tcGxldGlvbkl0ZW1LaW5kLkNvbnN0YW50LFxuICAgICAgICB0ZXh0RWRpdDoge1xuICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0OiB7IGxpbmU6IDAsIGNoYXJhY3RlcjogOCB9LCBlbmQ6IHsgbGluZTogMCwgY2hhcmFjdGVyOiAxMyB9IH0sXG4gICAgICAgICAgbmV3VGV4dDogJ3NoaWZ0ZWQnLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbWluaW1hbCcsIHtcbiAgICAgICAgc29ydFRleHQ6ICdjJyxcbiAgICAgIH0pLFxuICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ29sZCcsIHtcbiAgICAgICAgc29ydFRleHQ6ICdkJyxcbiAgICAgICAgZG9jdW1lbnRhdGlvbjogJ2RvYyBzdHJpbmcnLFxuICAgICAgICBpbnNlcnRUZXh0OiAnaW5zZXJ0ZWQnLFxuICAgICAgICBpbnNlcnRUZXh0Rm9ybWF0OiBscy5JbnNlcnRUZXh0Rm9ybWF0LlNuaXBwZXQsXG4gICAgICB9KSxcbiAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdkb2N1bWVudGVkJywge1xuICAgICAgICBzb3J0VGV4dDogJ2UnLFxuICAgICAgICBkZXRhaWw6ICdkZXRhaWxzJyxcbiAgICAgICAgZG9jdW1lbnRhdGlvbjogIHtcbiAgICAgICAgICBraW5kOiAnbWFya2Rvd24nLFxuICAgICAgICAgIHZhbHVlOiAnZG9jdW1lbnRhdGlvbicsXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICBdO1xuXG4gICAgbGV0IHNlcnZlcjogQWN0aXZlU2VydmVyO1xuICAgIGxldCBhdXRvQ29tcGxldGVBZGFwdGVyOiBBdXRvQ29tcGxldGVBZGFwdGVyO1xuXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBzZXJ2ZXIgPSBjcmVhdGVBY3RpdmVTZXJ2ZXJTcHkoKTtcbiAgICAgIGF1dG9Db21wbGV0ZUFkYXB0ZXIgPSBuZXcgQXV0b0NvbXBsZXRlQWRhcHRlcigpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2NvbnZlcnRzIExTUCBDb21wbGV0aW9uSXRlbSBhcnJheSB0byBBdXRvQ29tcGxldGUgU3VnZ2VzdGlvbnMgYXJyYXknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjdXN0b21SZXF1ZXN0ID0gY3JlYXRlUmVxdWVzdCh7cHJlZml4OiAnJywgcG9zaXRpb246IG5ldyBQb2ludCgwLCAxMCl9KTtcbiAgICAgIGN1c3RvbVJlcXVlc3QuZWRpdG9yLnNldFRleHQoJ2ZvbyAjYWxpZ24gYmFyJyk7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKGl0ZW1zKTtcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3VzdG9tUmVxdWVzdCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHRzLmxlbmd0aCkuZXF1YWxzKGl0ZW1zLmxlbmd0aCk7XG4gICAgICBleHBlY3QocmVzdWx0c1swXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdhbGlnbicpO1xuICAgICAgZXhwZWN0KChyZXN1bHRzWzBdIGFzIFRleHRTdWdnZXN0aW9uKS50ZXh0KS5lcXVhbHMoJ2hlbGxvIHdvcmxkJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1swXS5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCcjYWxpZ24nKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLnR5cGUpLmVxdWFscygnc25pcHBldCcpO1xuXG4gICAgICBleHBlY3QocmVzdWx0c1sxXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdsaXN0Jyk7XG4gICAgICBleHBlY3QoKHJlc3VsdHNbMV0gYXMgVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnc2hpZnRlZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMV0ucmVwbGFjZW1lbnRQcmVmaXgpLmVxdWFscygnZ24nKTsgLy8gVE9ETzogc3VwcG9ydCBwb3N0IHJlcGxhY2VtZW50IHRvb1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMV0udHlwZSkuZXF1YWxzKCdjb25zdGFudCcpO1xuXG4gICAgICBleHBlY3QocmVzdWx0c1syXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdtaW5pbWFsJyk7XG4gICAgICBleHBlY3QoKHJlc3VsdHNbMl0gYXMgVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnbWluaW1hbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMl0ucmVwbGFjZW1lbnRQcmVmaXgpLmVxdWFscygnJyk7IC8vIHdlIHNlbnQgYW4gZW1wdHkgcHJlZml4XG5cbiAgICAgIGV4cGVjdChyZXN1bHRzWzNdLmRpc3BsYXlUZXh0KS5lcXVhbHMoJ29sZCcpO1xuICAgICAgZXhwZWN0KChyZXN1bHRzWzNdIGFzIFNuaXBwZXRTdWdnZXN0aW9uKS5zbmlwcGV0KS5lcXVhbHMoJ2luc2VydGVkJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1szXS5kZXNjcmlwdGlvbikuZXF1YWxzKCdkb2Mgc3RyaW5nJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1szXS5kZXNjcmlwdGlvbk1hcmtkb3duKS5lcXVhbHMoJ2RvYyBzdHJpbmcnKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdHNbNF0uZGlzcGxheVRleHQpLmVxdWFscygnZG9jdW1lbnRlZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbNF0uZGVzY3JpcHRpb24pLmlzLnVuZGVmaW5lZDtcbiAgICAgIGV4cGVjdChyZXN1bHRzWzRdLmRlc2NyaXB0aW9uTWFya2Rvd24pLmVxdWFscygnZG9jdW1lbnRhdGlvbicpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbNF0ucmlnaHRMYWJlbCkuZXF1YWxzKCdkZXRhaWxzJyk7XG4gICAgfSk7XG5cbiAgICBpdCgncmVzcGVjdHMgb25EaWRDb252ZXJ0Q29tcGxldGlvbkl0ZW0nLCBhc3luYyAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwnKV0pO1xuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjcmVhdGVSZXF1ZXN0KHt9KSwgKGMsIGEsIHIpID0+IHtcbiAgICAgICAgKGEgYXMgYWMuVGV4dFN1Z2dlc3Rpb24pLnRleHQgPSBjLmxhYmVsICsgJyBvayc7XG4gICAgICAgIGEuZGlzcGxheVRleHQgPSByLnNjb3BlRGVzY3JpcHRvci5nZXRTY29wZXNBcnJheSgpWzBdO1xuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHRzLmxlbmd0aCkuZXF1YWxzKDEpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0uZGlzcGxheVRleHQpLmVxdWFscygnc29tZS5zY29wZScpO1xuICAgICAgZXhwZWN0KChyZXN1bHRzWzBdIGFzIGFjLlRleHRTdWdnZXN0aW9uKS50ZXh0KS5lcXVhbHMoJ2xhYmVsIG9rJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgZW1wdHkgYXJyYXkgaW50byBhbiBlbXB0eSBBdXRvQ29tcGxldGUgU3VnZ2VzdGlvbnMgYXJyYXknLCBhc3luYyAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtdKTtcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3JlYXRlUmVxdWVzdCh7fSkpO1xuICAgICAgZXhwZWN0KHJlc3VsdHMubGVuZ3RoKS5lcXVhbHMoMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25JdGVtIHRvIEF1dG9Db21wbGV0ZSBTdWdnZXN0aW9uIHdpdGhvdXQgdGV4dEVkaXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2xhYmVsJywge1xuICAgICAgICAgaW5zZXJ0VGV4dDogJ2luc2VydCcsXG4gICAgICAgICBmaWx0ZXJUZXh0OiAnZmlsdGVyJyxcbiAgICAgICAgIGtpbmQ6IGxzLkNvbXBsZXRpb25JdGVtS2luZC5LZXl3b3JkLFxuICAgICAgICAgZGV0YWlsOiAna2V5d29yZCcsXG4gICAgICAgICBkb2N1bWVudGF0aW9uOiAnYSB0cnVseSB1c2VmdWwga2V5d29yZCcsXG4gICAgICAgfSksXG4gICAgICBdKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IChhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3JlYXRlUmVxdWVzdCh7fSkpKVswXTtcbiAgICAgIGV4cGVjdCgocmVzdWx0IGFzIFRleHRTdWdnZXN0aW9uKS50ZXh0KS5lcXVhbHMoJ2luc2VydCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kaXNwbGF5VGV4dCkuZXF1YWxzKCdsYWJlbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC50eXBlKS5lcXVhbHMoJ2tleXdvcmQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmlnaHRMYWJlbCkuZXF1YWxzKCdrZXl3b3JkJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uKS5lcXVhbHMoJ2EgdHJ1bHkgdXNlZnVsIGtleXdvcmQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb25NYXJrZG93bikuZXF1YWxzKCdhIHRydWx5IHVzZWZ1bCBrZXl3b3JkJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25JdGVtIHRvIEF1dG9Db21wbGV0ZSBTdWdnZXN0aW9uIHdpdGggdGV4dEVkaXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjdXN0b21SZXF1ZXN0ID0gY3JlYXRlUmVxdWVzdCh7XG4gICAgICAgIHByZWZpeDogJycsXG4gICAgICAgIHBvc2l0aW9uOiBuZXcgUG9pbnQoMCwgMTApLFxuICAgICAgICBhY3RpdmF0ZWRNYW51YWxseTogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGN1c3RvbVJlcXVlc3QuZWRpdG9yLnNldFRleHQoJ2ZvbyAjbGFiZWwgYmFyJyk7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2xhYmVsJywge1xuICAgICAgICAgIGluc2VydFRleHQ6ICdpbnNlcnQnLFxuICAgICAgICAgIGZpbHRlclRleHQ6ICdmaWx0ZXInLFxuICAgICAgICAgIGtpbmQ6IGxzLkNvbXBsZXRpb25JdGVtS2luZC5WYXJpYWJsZSxcbiAgICAgICAgICBkZXRhaWw6ICdudW1iZXInLFxuICAgICAgICAgIGRvY3VtZW50YXRpb246ICdhIHRydWx5IHVzZWZ1bCB2YXJpYWJsZScsXG4gICAgICAgICAgdGV4dEVkaXQ6IHtcbiAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0OiB7IGxpbmU6IDAsIGNoYXJhY3RlcjogNCB9LCBlbmQ6IHsgbGluZTogMCwgIGNoYXJhY3RlcjogMTAgfSB9LFxuICAgICAgICAgICAgbmV3VGV4dDogJ25ld1RleHQnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgXSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IChhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3VzdG9tUmVxdWVzdCkpWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kaXNwbGF5VGV4dCkuZXF1YWxzKCdsYWJlbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC50eXBlKS5lcXVhbHMoJ3ZhcmlhYmxlJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnJpZ2h0TGFiZWwpLmVxdWFscygnbnVtYmVyJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uKS5lcXVhbHMoJ2EgdHJ1bHkgdXNlZnVsIHZhcmlhYmxlJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uTWFya2Rvd24pLmVxdWFscygnYSB0cnVseSB1c2VmdWwgdmFyaWFibGUnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmVwbGFjZW1lbnRQcmVmaXgpLmVxdWFscygnI2xhYmVsJyk7XG4gICAgICBleHBlY3QoKHJlc3VsdCBhcyBUZXh0U3VnZ2VzdGlvbikudGV4dCkuZXF1YWxzKCduZXdUZXh0Jyk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25JdGVtIHdpdGggaW5zZXJ0VGV4dCBhbmQgZmlsdGVyVGV4dCB0byBBdXRvQ29tcGxldGUgU3VnZ2VzdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW1xuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwnLCB7XG4gICAgICAgICAgaW5zZXJ0VGV4dDogJ2luc2VydCcsXG4gICAgICAgICAgZmlsdGVyVGV4dDogJ2ZpbHRlcicsXG4gICAgICAgICAga2luZDogbHMuQ29tcGxldGlvbkl0ZW1LaW5kLktleXdvcmQsXG4gICAgICAgICAgZGV0YWlsOiAnZGV0YWlsJyxcbiAgICAgICAgICBkb2N1bWVudGF0aW9uOiAnYSB2ZXJ5IGV4Y2l0aW5nIGtleXdvcmQnLFxuICAgICAgICB9KSxcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2ZpbHRlcmVkT3V0Jywge1xuICAgICAgICAgIGZpbHRlclRleHQ6ICdub3AnLFxuICAgICAgICB9KSxcbiAgICAgIF0pO1xuXG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGNyZWF0ZVJlcXVlc3Qoe3ByZWZpeDogJ2ZpbCd9KSk7XG4gICAgICBleHBlY3QocmVzdWx0cy5sZW5ndGgpLmVxdWFscygxKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gcmVzdWx0c1swXTtcbiAgICAgIGV4cGVjdCgocmVzdWx0IGFzIFRleHRTdWdnZXN0aW9uKS50ZXh0KS5lcXVhbHMoJ2luc2VydCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kaXNwbGF5VGV4dCkuZXF1YWxzKCdsYWJlbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC50eXBlKS5lcXVhbHMoJ2tleXdvcmQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmlnaHRMYWJlbCkuZXF1YWxzKCdkZXRhaWwnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb24pLmVxdWFscygnYSB2ZXJ5IGV4Y2l0aW5nIGtleXdvcmQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb25NYXJrZG93bikuZXF1YWxzKCdhIHZlcnkgZXhjaXRpbmcga2V5d29yZCcpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2NvbnZlcnRzIExTUCBDb21wbGV0aW9uSXRlbSB3aXRoIG1pc3NpbmcgZG9jdW1lbnRhdGlvbiB0byBBdXRvQ29tcGxldGUgU3VnZ2VzdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW1xuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwnLCB7XG4gICAgICAgICAgZGV0YWlsOiAnZGV0YWlsJyxcbiAgICAgICAgfSksXG4gICAgICBdKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gKGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjcmVhdGVSZXF1ZXN0KHt9KSkpWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yaWdodExhYmVsKS5lcXVhbHMoJ2RldGFpbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZXNjcmlwdGlvbikuZXF1YWxzKHVuZGVmaW5lZCk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uTWFya2Rvd24pLmVxdWFscyh1bmRlZmluZWQpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2NvbnZlcnRzIExTUCBDb21wbGV0aW9uSXRlbSB3aXRoIG1hcmtkb3duIGRvY3VtZW50YXRpb24gdG8gQXV0b0NvbXBsZXRlIFN1Z2dlc3Rpb24nLCBhc3luYyAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2xhYmVsJywge1xuICAgICAgICAgIGRldGFpbDogJ2RldGFpbCcsXG4gICAgICAgICAgZG9jdW1lbnRhdGlvbjogeyB2YWx1ZTogJ1NvbWUgKm1hcmtkb3duKicsIGtpbmQ6ICdtYXJrZG93bicgfSxcbiAgICAgICAgfSksXG4gICAgICBdKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gKGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjcmVhdGVSZXF1ZXN0KHt9KSkpWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yaWdodExhYmVsKS5lcXVhbHMoJ2RldGFpbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZXNjcmlwdGlvbikuZXF1YWxzKHVuZGVmaW5lZCk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uTWFya2Rvd24pLmVxdWFscygnU29tZSAqbWFya2Rvd24qJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25JdGVtIHdpdGggcGxhaW50ZXh0IGRvY3VtZW50YXRpb24gdG8gQXV0b0NvbXBsZXRlIFN1Z2dlc3Rpb24nLCBhc3luYyAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2xhYmVsJywge1xuICAgICAgICAgIGRldGFpbDogJ2RldGFpbCcsXG4gICAgICAgICAgZG9jdW1lbnRhdGlvbjogeyB2YWx1ZTogJ1NvbWUgcGxhaW4gdGV4dCcsIGtpbmQ6ICdwbGFpbnRleHQnIH0sXG4gICAgICAgIH0pLFxuICAgICAgXSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IChhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3JlYXRlUmVxdWVzdCh7fSkpKVswXTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmlnaHRMYWJlbCkuZXF1YWxzKCdkZXRhaWwnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb24pLmVxdWFscygnU29tZSBwbGFpbiB0ZXh0Jyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uTWFya2Rvd24pLmVxdWFscyh1bmRlZmluZWQpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2NvbnZlcnRzIExTUCBDb21wbGV0aW9uSXRlbSB3aXRob3V0IGluc2VydFRleHQgb3IgZmlsdGVyVGV4dCB0byBBdXRvQ29tcGxldGUgU3VnZ2VzdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW1xuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwnLCB7XG4gICAgICAgICAga2luZDogbHMuQ29tcGxldGlvbkl0ZW1LaW5kLktleXdvcmQsXG4gICAgICAgICAgZGV0YWlsOiAnZGV0YWlsJyxcbiAgICAgICAgICBkb2N1bWVudGF0aW9uOiAnQSB2ZXJ5IHVzZWZ1bCBrZXl3b3JkJyxcbiAgICAgICAgfSksXG4gICAgICBdKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gKGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjcmVhdGVSZXF1ZXN0KHt9KSkpWzBdO1xuICAgICAgZXhwZWN0KChyZXN1bHQgYXMgVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnbGFiZWwnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGlzcGxheVRleHQpLmVxdWFscygnbGFiZWwnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudHlwZSkuZXF1YWxzKCdrZXl3b3JkJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnJpZ2h0TGFiZWwpLmVxdWFscygnZGV0YWlsJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uKS5lcXVhbHMoJ0EgdmVyeSB1c2VmdWwga2V5d29yZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZXNjcmlwdGlvbk1hcmtkb3duKS5lcXVhbHMoJ0EgdmVyeSB1c2VmdWwga2V5d29yZCcpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2RvZXMgbm90IGRvIGFueXRoaW5nIGlmIHRoZXJlIGlzIG5vIHRleHRFZGl0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihzZXJ2ZXIuY29ubmVjdGlvbiwgJ2NvbXBsZXRpb24nKS5yZXNvbHZlcyhbXG4gICAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCcnLCB7ZmlsdGVyVGV4dDogJ3JlcCd9KSxcbiAgICAgIF0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSAoYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGNyZWF0ZVJlcXVlc3Qoe3ByZWZpeDogJ3JlcCd9KSkpWzBdO1xuICAgICAgZXhwZWN0KChyZXN1bHQgYXMgVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRpc3BsYXlUZXh0KS5lcXVhbHMoJycpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCcnKTtcbiAgICB9KTtcblxuICAgIGl0KCdhcHBsaWVzIGNoYW5nZXMgZnJvbSBUZXh0RWRpdCB0byB0ZXh0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY3VzdG9tUmVxdWVzdCA9IGNyZWF0ZVJlcXVlc3Qoe3ByZWZpeDogJycsIHBvc2l0aW9uOiBuZXcgUG9pbnQoMCwgMTApfSk7XG4gICAgICBjdXN0b21SZXF1ZXN0LmVkaXRvci5zZXRUZXh0KCdmb28gI2FsaWduIGJhcicpO1xuICAgICAgc2lub24uc3R1YihzZXJ2ZXIuY29ubmVjdGlvbiwgJ2NvbXBsZXRpb24nKS5yZXNvbHZlcyhbXG4gICAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdhbGlnbicsIHtcbiAgICAgICAgICBzb3J0VGV4dDogJ2EnLFxuICAgICAgICAgIHRleHRFZGl0OiB7XG4gICAgICAgICAgICByYW5nZTogeyBzdGFydDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDQgfSwgZW5kOiB7IGxpbmU6IDAsICBjaGFyYWN0ZXI6IDEwIH0gfSxcbiAgICAgICAgICAgIG5ld1RleHQ6ICdoZWxsbyB3b3JsZCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICBdKTtcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3VzdG9tUmVxdWVzdCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLmRpc3BsYXlUZXh0KS5lcXVhbHMoJ2FsaWduJyk7XG4gICAgICBleHBlY3QoKHJlc3VsdHNbMF0gYXMgVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnaGVsbG8gd29ybGQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLnJlcGxhY2VtZW50UHJlZml4KS5lcXVhbHMoJyNhbGlnbicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3VwZGF0ZXMgdGhlIHJlcGxhY2VtZW50UHJlZml4IHdoZW4gdGhlIGVkaXRvciB0ZXh0IGNoYW5nZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjdXN0b21SZXF1ZXN0ID0gY3JlYXRlUmVxdWVzdCh7cHJlZml4OiAnJywgcG9zaXRpb246IG5ldyBQb2ludCgwLCA4KX0pO1xuICAgICAgY3VzdG9tUmVxdWVzdC5lZGl0b3Iuc2V0VGV4dCgnZm9vICNhbGkgYmFyJyk7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2FsaWduJywge1xuICAgICAgICAgIHNvcnRUZXh0OiAnYScsXG4gICAgICAgICAgdGV4dEVkaXQ6IHtcbiAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0OiB7IGxpbmU6IDAsIGNoYXJhY3RlcjogNCB9LCBlbmQ6IHsgbGluZTogMCwgIGNoYXJhY3RlcjogOCB9IH0sXG4gICAgICAgICAgICBuZXdUZXh0OiAnaGVsbG8gd29ybGQnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgXSk7XG5cbiAgICAgIGxldCByZXN1bHQgPSAoYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGN1c3RvbVJlcXVlc3QpKVswXTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmVwbGFjZW1lbnRQcmVmaXgpLmVxdWFscygnI2FsaScpO1xuXG4gICAgICBjdXN0b21SZXF1ZXN0LmVkaXRvci5zZXRUZXh0SW5CdWZmZXJSYW5nZShbWzAsIDhdLCBbMCwgOF1dLCAnZycpO1xuICAgICAgY3VzdG9tUmVxdWVzdC5idWZmZXJQb3NpdGlvbiA9IG5ldyBQb2ludCgwLCA5KTtcbiAgICAgIHJlc3VsdCA9IChhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3VzdG9tUmVxdWVzdCkpWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCcjYWxpZycpO1xuXG4gICAgICBjdXN0b21SZXF1ZXN0LmVkaXRvci5zZXRUZXh0SW5CdWZmZXJSYW5nZShbWzAsIDldLCBbMCwgOV1dLCAnbicpO1xuICAgICAgY3VzdG9tUmVxdWVzdC5idWZmZXJQb3NpdGlvbiA9IG5ldyBQb2ludCgwLCAxMCk7XG4gICAgICByZXN1bHQgPSAoYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGN1c3RvbVJlcXVlc3QpKVswXTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmVwbGFjZW1lbnRQcmVmaXgpLmVxdWFscygnI2FsaWduJyk7XG5cbiAgICAgIGN1c3RvbVJlcXVlc3QuZWRpdG9yLnNldFRleHRJbkJ1ZmZlclJhbmdlKFtbMCwgN10sIFswLCA5XV0sICcnKTtcbiAgICAgIGN1c3RvbVJlcXVlc3QuYnVmZmVyUG9zaXRpb24gPSBuZXcgUG9pbnQoMCwgNyk7XG4gICAgICByZXN1bHQgPSAoYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGN1c3RvbVJlcXVlc3QpKVswXTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmVwbGFjZW1lbnRQcmVmaXgpLmVxdWFscygnI2FsJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdjb21wbGV0aW9uS2luZFRvU3VnZ2VzdGlvblR5cGUnLCAoKSA9PiB7XG4gICAgaXQoJ2NvbnZlcnRzIExTUCBDb21wbGV0aW9uS2luZHMgdG8gQXV0b0NvbXBsZXRlIFN1Z2dlc3Rpb25UeXBlcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHZhcmlhYmxlID0gQXV0b0NvbXBsZXRlQWRhcHRlci5jb21wbGV0aW9uS2luZFRvU3VnZ2VzdGlvblR5cGUobHMuQ29tcGxldGlvbkl0ZW1LaW5kLlZhcmlhYmxlKTtcbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gQXV0b0NvbXBsZXRlQWRhcHRlci5jb21wbGV0aW9uS2luZFRvU3VnZ2VzdGlvblR5cGUobHMuQ29tcGxldGlvbkl0ZW1LaW5kLkNvbnN0cnVjdG9yKTtcbiAgICAgIGNvbnN0IG1vZHVsZSA9IEF1dG9Db21wbGV0ZUFkYXB0ZXIuY29tcGxldGlvbktpbmRUb1N1Z2dlc3Rpb25UeXBlKGxzLkNvbXBsZXRpb25JdGVtS2luZC5Nb2R1bGUpO1xuICAgICAgZXhwZWN0KHZhcmlhYmxlKS5lcXVhbHMoJ3ZhcmlhYmxlJyk7XG4gICAgICBleHBlY3QoY29uc3RydWN0b3IpLmVxdWFscygnZnVuY3Rpb24nKTtcbiAgICAgIGV4cGVjdChtb2R1bGUpLmVxdWFscygnbW9kdWxlJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnZGVmYXVsdHMgdG8gXCJ2YWx1ZVwiJywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gQXV0b0NvbXBsZXRlQWRhcHRlci5jb21wbGV0aW9uS2luZFRvU3VnZ2VzdGlvblR5cGUodW5kZWZpbmVkKTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLmVxdWFscygndmFsdWUnKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==