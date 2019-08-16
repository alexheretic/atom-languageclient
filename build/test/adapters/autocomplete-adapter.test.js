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
        it('gets AutoComplete suggestions via LSP given an AutoCompleteRequest', () => __awaiter(this, void 0, void 0, function* () {
            const results = yield getResults(completionItems, { prefix: '' });
            chai_1.expect(results.length).equals(completionItems.length);
        }));
        it('provides a filtered selection based on the filterKey', () => __awaiter(this, void 0, void 0, function* () {
            const results = yield getResults(completionItems, { prefix: 'lab' });
            chai_1.expect(results.length).equals(2);
            chai_1.expect(results.some((r) => r.displayText === 'thisHasFiltertext')).to.be.true;
            chai_1.expect(results.some((r) => r.displayText === 'label3')).to.be.true;
        }));
        it('uses the sortText property to arrange completions when there is no prefix', () => __awaiter(this, void 0, void 0, function* () {
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
        it('uses the filterText property to arrange completions when there is a prefix', () => __awaiter(this, void 0, void 0, function* () {
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
        it('resolves suggestions via LSP given an AutoCompleteRequest', () => __awaiter(this, void 0, void 0, function* () {
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
        it('converts LSP CompletionItem array to AutoComplete Suggestions array', () => __awaiter(this, void 0, void 0, function* () {
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
        it('respects onDidConvertCompletionItem', () => __awaiter(this, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([createCompletionItem('label')]);
            const results = yield autoCompleteAdapter.getSuggestions(server, createRequest({}), (c, a, r) => {
                a.text = c.label + ' ok';
                a.displayText = r.scopeDescriptor.getScopesArray()[0];
            });
            chai_1.expect(results.length).equals(1);
            chai_1.expect(results[0].displayText).equals('some.scope');
            chai_1.expect(results[0].text).equals('label ok');
        }));
        it('converts empty array into an empty AutoComplete Suggestions array', () => __awaiter(this, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([]);
            const results = yield autoCompleteAdapter.getSuggestions(server, createRequest({}));
            chai_1.expect(results.length).equals(0);
        }));
        it('converts LSP CompletionItem to AutoComplete Suggestion without textEdit', () => __awaiter(this, void 0, void 0, function* () {
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
        it('converts LSP CompletionItem to AutoComplete Suggestion with textEdit', () => __awaiter(this, void 0, void 0, function* () {
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
        it('converts LSP CompletionItem with insertText and filterText to AutoComplete Suggestion', () => __awaiter(this, void 0, void 0, function* () {
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
        it('converts LSP CompletionItem with missing documentation to AutoComplete Suggestion', () => __awaiter(this, void 0, void 0, function* () {
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
        it('converts LSP CompletionItem with markdown documentation to AutoComplete Suggestion', () => __awaiter(this, void 0, void 0, function* () {
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
        it('converts LSP CompletionItem with plaintext documentation to AutoComplete Suggestion', () => __awaiter(this, void 0, void 0, function* () {
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
        it('converts LSP CompletionItem without insertText or filterText to AutoComplete Suggestion', () => __awaiter(this, void 0, void 0, function* () {
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
        it('does not do anything if there is no textEdit', () => __awaiter(this, void 0, void 0, function* () {
            sinon.stub(server.connection, 'completion').resolves([
                createCompletionItem('', { filterText: 'rep' }),
            ]);
            const result = (yield autoCompleteAdapter.getSuggestions(server, createRequest({ prefix: 'rep' })))[0];
            chai_1.expect(result.text).equals('');
            chai_1.expect(result.displayText).equals('');
            chai_1.expect(result.replacementPrefix).equals('');
        }));
        it('applies changes from TextEdit to text', () => __awaiter(this, void 0, void 0, function* () {
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
        it('updates the replacementPrefix when the editor text changes', () => __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2NvbXBsZXRlLWFkYXB0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3QvYWRhcHRlcnMvYXV0b2NvbXBsZXRlLWFkYXB0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsa0ZBQTBFO0FBRTFFLCtDQUErQztBQUMvQywrQkFBK0I7QUFDL0IsK0JBR2M7QUFFZCwrQkFBOEI7QUFDOUIsOENBQXNFO0FBSXRFLFNBQVMsYUFBYSxDQUFDLEVBQ3JCLE1BQU0sR0FBRyxFQUFFLEVBQ1gsUUFBUSxHQUFHLElBQUksWUFBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFDOUIsaUJBQWlCLEdBQUcsSUFBSSxHQUN6QjtJQUNDLE9BQU87UUFDTCxNQUFNLEVBQUUsNkJBQWdCLEVBQUU7UUFDMUIsY0FBYyxFQUFFLFFBQVE7UUFDeEIsTUFBTTtRQUNOLGVBQWUsRUFBRSxFQUFFLGNBQWMsS0FBSyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDaEUsaUJBQWlCO0tBQ2xCLENBQUM7QUFDSixDQUFDO0FBRUQsb0RBQW9EO0FBQ3BELFNBQVMsb0JBQW9CLENBQUMsS0FBYSxFQUFFLFdBZXpDLEVBQUU7SUFDSixPQUFPLGdCQUNMLEtBQUssSUFDRixRQUFRLENBQ00sQ0FBQztBQUN0QixDQUFDO0FBRUQsUUFBUSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNuQyxTQUFTLHFCQUFxQjtRQUM1QixPQUFPO1lBQ0wsWUFBWSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFO1lBQ3hDLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxnQ0FBbUIsRUFBRSxDQUFDO1lBQ2xFLFVBQVUsRUFBRSxJQUFJLDBCQUFtQixFQUFFO1lBQ3JDLE9BQU8sRUFBRSxTQUFnQjtZQUN6QixXQUFXLEVBQUUsR0FBRztZQUNoQixlQUFlLEVB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RyxNQUFNLFdBQVcsR0FBRyw4QkFBbUIsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDMUcsTUFBTSxNQUFNLEdBQUcsOEJBQW1CLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hHLGFBQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEMsYUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN2QyxhQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtZQUM3QixNQUFNLE1BQU0sR0FBRyw4QkFBbUIsQ0FBQyw4QkFBOEIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM3RSxhQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBBdXRvQ29tcGxldGVBZGFwdGVyIGZyb20gJy4uLy4uL2xpYi9hZGFwdGVycy9hdXRvY29tcGxldGUtYWRhcHRlcic7XG5pbXBvcnQgeyBBY3RpdmVTZXJ2ZXIgfSBmcm9tICcuLi8uLi9saWIvc2VydmVyLW1hbmFnZXIuanMnO1xuaW1wb3J0ICogYXMgbHMgZnJvbSAnLi4vLi4vbGliL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCAqIGFzIHNpbm9uIGZyb20gJ3Npbm9uJztcbmltcG9ydCB7XG4gIENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIFBvaW50LFxufSBmcm9tICdhdG9tJztcbmltcG9ydCAqIGFzIGFjIGZyb20gJ2F0b20vYXV0b2NvbXBsZXRlLXBsdXMnO1xuaW1wb3J0IHsgZXhwZWN0IH0gZnJvbSAnY2hhaSc7XG5pbXBvcnQgeyBjcmVhdGVTcHlDb25uZWN0aW9uLCBjcmVhdGVGYWtlRWRpdG9yIH0gZnJvbSAnLi4vaGVscGVycy5qcyc7XG5pbXBvcnQgeyBUZXh0U3VnZ2VzdGlvbiwgU25pcHBldFN1Z2dlc3Rpb24gfSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgeyBDb21wbGV0aW9uSXRlbSwgTWFya3VwQ29udGVudCwgSW5zZXJ0VGV4dEZvcm1hdCwgVGV4dEVkaXQsIENvbW1hbmQgfSBmcm9tICcuLi8uLi9saWIvbGFuZ3VhZ2VjbGllbnQnO1xuXG5mdW5jdGlvbiBjcmVhdGVSZXF1ZXN0KHtcbiAgcHJlZml4ID0gXCJcIixcbiAgcG9zaXRpb24gPSBuZXcgUG9pbnQoMTIzLCA0NTYpLFxuICBhY3RpdmF0ZWRNYW51YWxseSA9IHRydWUsXG59KTogYWMuU3VnZ2VzdGlvbnNSZXF1ZXN0ZWRFdmVudCB7XG4gIHJldHVybiB7XG4gICAgZWRpdG9yOiBjcmVhdGVGYWtlRWRpdG9yKCksXG4gICAgYnVmZmVyUG9zaXRpb246IHBvc2l0aW9uLFxuICAgIHByZWZpeCxcbiAgICBzY29wZURlc2NyaXB0b3I6IHsgZ2V0U2NvcGVzQXJyYXkoKSB7IHJldHVybiBbJ3NvbWUuc2NvcGUnXTsgfSB9LFxuICAgIGFjdGl2YXRlZE1hbnVhbGx5LFxuICB9O1xufVxuXG4vLyBSZXF1aXJlZCBhbmQgb3B0aW9uYWwgcHJvcGVydGllcyBhcyBvZiBMU1AgMy4xNC4wXG5mdW5jdGlvbiBjcmVhdGVDb21wbGV0aW9uSXRlbShsYWJlbDogc3RyaW5nLCBvcHRpb25hbDoge1xuICBraW5kPzogbnVtYmVyLFxuICBkZXRhaWw/OiBzdHJpbmcsXG4gIGRvY3VtZW50YXRpb24/OiBzdHJpbmcgfCBNYXJrdXBDb250ZW50LFxuICBkZXByZWNhdGVkPzogYm9vbGVhbixcbiAgcHJlc2VsZWN0PzogYm9vbGVhbixcbiAgc29ydFRleHQ/OiBzdHJpbmcsXG4gIGZpbHRlclRleHQ/OiBzdHJpbmcsXG4gIGluc2VydFRleHQ/OiBzdHJpbmcsXG4gIGluc2VydFRleHRGb3JtYXQ/OiBJbnNlcnRUZXh0Rm9ybWF0LFxuICB0ZXh0RWRpdD86IFRleHRFZGl0LFxuICBhZGRpdGlvbmFsVGV4dEVkaXRzPzogVGV4dEVkaXRbXSxcbiAgY29tbWl0Q2hhcmFjdGVycz86IHN0cmluZ1tdXG4gIGNvbW1hbmQ/OiBDb21tYW5kLFxuICBkYXRhPzogYW55LFxufSA9IHt9KTogQ29tcGxldGlvbkl0ZW0ge1xuICByZXR1cm4ge1xuICAgIGxhYmVsLFxuICAgIC4uLm9wdGlvbmFsLFxuICB9IGFzIENvbXBsZXRpb25JdGVtO1xufVxuXG5kZXNjcmliZSgnQXV0b0NvbXBsZXRlQWRhcHRlcicsICgpID0+IHtcbiAgZnVuY3Rpb24gY3JlYXRlQWN0aXZlU2VydmVyU3B5KCk6IEFjdGl2ZVNlcnZlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNhcGFiaWxpdGllczogeyBjb21wbGV0aW9uUHJvdmlkZXI6IHt9IH0sXG4gICAgICBjb25uZWN0aW9uOiBuZXcgbHMuTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uKGNyZWF0ZVNweUNvbm5lY3Rpb24oKSksXG4gICAgICBkaXNwb3NhYmxlOiBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpLFxuICAgICAgcHJvY2VzczogdW5kZWZpbmVkIGFzIGFueSxcbiAgICAgIHByb2plY3RQYXRoOiAnLycsXG4gICAgICBhZGRpdGlvbmFsUGF0aHM6IG5ldyBTZXQoKSxcbiAgICAgIGNvbnNpZGVyRGVmaW5pdGlvblBhdGg6IChfOiBzdHJpbmcpOiB2b2lkID0+IHt9LFxuICAgIH07XG4gIH1cblxuICBjb25zdCBjb21wbGV0aW9uSXRlbXMgPSBbXG4gICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ3RoaXNIYXNGaWx0ZXJ0ZXh0Jywge1xuICAgICAga2luZDogbHMuQ29tcGxldGlvbkl0ZW1LaW5kLktleXdvcmQsXG4gICAgICBkZXRhaWw6ICdkZXNjcmlwdGlvbjEnLFxuICAgICAgZG9jdW1lbnRhdGlvbjogJ2EgdmVyeSBleGNpdGluZyBrZXl3b3JkJyxcbiAgICAgIGZpbHRlclRleHQ6ICdsYWJyYWRvcicsXG4gICAgICBzb3J0VGV4dDogJ3onLFxuICAgIH0pLFxuICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbDInLCB7XG4gICAgICBraW5kOiBscy5Db21wbGV0aW9uSXRlbUtpbmQuRmllbGQsXG4gICAgICBkZXRhaWw6ICdkZXNjcmlwdGlvbjInLFxuICAgICAgZG9jdW1lbnRhdGlvbjogJ2EgdmVyeSBleGNpdGluZyBmaWVsZCcsXG4gICAgICBmaWx0ZXJUZXh0OiAncmFiYml0JyxcbiAgICAgIHNvcnRUZXh0OiAnYScsXG4gICAgfSksXG4gICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2xhYmVsMycsIHtcbiAgICAgIGtpbmQ6IGxzLkNvbXBsZXRpb25JdGVtS2luZC5WYXJpYWJsZSxcbiAgICAgIGRldGFpbDogJ2Rlc2NyaXB0aW9uMycsXG4gICAgICBkb2N1bWVudGF0aW9uOiAnYSB2ZXJ5IGV4Y2l0aW5nIHZhcmlhYmxlJyxcbiAgICB9KSxcbiAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnZmlsdGVyZWRvdXQnLCB7XG4gICAgICBraW5kOiBscy5Db21wbGV0aW9uSXRlbUtpbmQuU25pcHBldCxcbiAgICAgIGRldGFpbDogJ2Rlc2NyaXB0aW9uNCcsXG4gICAgICBkb2N1bWVudGF0aW9uOiAnc2hvdWxkIG5vdCBhcHBlYXInLFxuICAgICAgc29ydFRleHQ6ICd6enonLFxuICAgIH0pLFxuICBdO1xuXG4gIGNvbnN0IHJlcXVlc3QgPSBjcmVhdGVSZXF1ZXN0KHtwcmVmaXg6ICdsYWInfSk7XG5cbiAgZGVzY3JpYmUoJ2dldFN1Z2dlc3Rpb25zJywgKCkgPT4ge1xuICAgIGxldCBzZXJ2ZXI6IEFjdGl2ZVNlcnZlcjtcbiAgICBsZXQgYXV0b0NvbXBsZXRlQWRhcHRlcjogQXV0b0NvbXBsZXRlQWRhcHRlcjtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIGdldFJlc3VsdHMoXG4gICAgICBpdGVtczogQ29tcGxldGlvbkl0ZW1bXSxcbiAgICAgIHJlcXVlc3RQYXJhbXM6IHtwcmVmaXg/OiBzdHJpbmcsIHBvaW50PzogUG9pbnR9LFxuICAgICk6IFByb21pc2U8YWMuQW55U3VnZ2VzdGlvbltdPiB7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKGl0ZW1zKTtcbiAgICAgIHJldHVybiBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3JlYXRlUmVxdWVzdChyZXF1ZXN0UGFyYW1zKSk7XG4gICAgfVxuXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBzZXJ2ZXIgPSBjcmVhdGVBY3RpdmVTZXJ2ZXJTcHkoKTtcbiAgICAgIGF1dG9Db21wbGV0ZUFkYXB0ZXIgPSBuZXcgQXV0b0NvbXBsZXRlQWRhcHRlcigpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2dldHMgQXV0b0NvbXBsZXRlIHN1Z2dlc3Rpb25zIHZpYSBMU1AgZ2l2ZW4gYW4gQXV0b0NvbXBsZXRlUmVxdWVzdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBnZXRSZXN1bHRzKGNvbXBsZXRpb25JdGVtcywge3ByZWZpeDogJyd9KTtcbiAgICAgIGV4cGVjdChyZXN1bHRzLmxlbmd0aCkuZXF1YWxzKGNvbXBsZXRpb25JdGVtcy5sZW5ndGgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Byb3ZpZGVzIGEgZmlsdGVyZWQgc2VsZWN0aW9uIGJhc2VkIG9uIHRoZSBmaWx0ZXJLZXknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgZ2V0UmVzdWx0cyhjb21wbGV0aW9uSXRlbXMsIHtwcmVmaXg6ICdsYWInfSk7XG4gICAgICBleHBlY3QocmVzdWx0cy5sZW5ndGgpLmVxdWFscygyKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzLnNvbWUoKHIpID0+IHIuZGlzcGxheVRleHQgPT09ICd0aGlzSGFzRmlsdGVydGV4dCcpKS50by5iZS50cnVlO1xuICAgICAgZXhwZWN0KHJlc3VsdHMuc29tZSgocikgPT4gci5kaXNwbGF5VGV4dCA9PT0gJ2xhYmVsMycpKS50by5iZS50cnVlO1xuICAgIH0pO1xuXG4gICAgaXQoJ3VzZXMgdGhlIHNvcnRUZXh0IHByb3BlcnR5IHRvIGFycmFuZ2UgY29tcGxldGlvbnMgd2hlbiB0aGVyZSBpcyBubyBwcmVmaXgnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzb3J0ZWRJdGVtcyA9IFtcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2EnLCB7c29ydFRleHQ6ICdjJ30pLFxuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnYicpLFxuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnYycsIHtzb3J0VGV4dDogJ2EnfSksXG4gICAgICBdO1xuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGdldFJlc3VsdHMoc29ydGVkSXRlbXMsIHtwcmVmaXg6ICcnfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHRzLmxlbmd0aCkuZXF1YWxzKHNvcnRlZEl0ZW1zLmxlbmd0aCk7XG4gICAgICBleHBlY3QocmVzdWx0c1swXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdjJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1sxXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdiJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1syXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdhJyk7XG4gICAgfSk7XG5cbiAgICBpdCgndXNlcyB0aGUgZmlsdGVyVGV4dCBwcm9wZXJ0eSB0byBhcnJhbmdlIGNvbXBsZXRpb25zIHdoZW4gdGhlcmUgaXMgYSBwcmVmaXgnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgZ2V0UmVzdWx0cyhjb21wbGV0aW9uSXRlbXMsIHtwcmVmaXg6ICdsYWInfSk7XG4gICAgICBleHBlY3QocmVzdWx0cy5sZW5ndGgpLmVxdWFscygyKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLmRpc3BsYXlUZXh0KS5lcXVhbHMoJ2xhYmVsMycpOyAvLyBzaG9ydGVyIHRoYW4gJ2xhYnJhZG9yJywgc28gZXhwZWN0ZWQgdG8gYmUgZmlyc3RcbiAgICAgIGV4cGVjdChyZXN1bHRzWzFdLmRpc3BsYXlUZXh0KS5lcXVhbHMoJ3RoaXNIYXNGaWx0ZXJ0ZXh0Jyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdjb21wbGV0ZVN1Z2dlc3Rpb24nLCAoKSA9PiB7XG4gICAgY29uc3QgcGFydGlhbEl0ZW1zID0gW1xuICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2xhYmVsMScpLFxuICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2xhYmVsMicpLFxuICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2xhYmVsMycpLFxuICAgIF07XG5cbiAgICBjb25zdCBzZXJ2ZXI6IEFjdGl2ZVNlcnZlciA9IGNyZWF0ZUFjdGl2ZVNlcnZlclNweSgpO1xuICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMocGFydGlhbEl0ZW1zKTtcbiAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbkl0ZW1SZXNvbHZlJykucmVzb2x2ZXMoY3JlYXRlQ29tcGxldGlvbkl0ZW0oXG4gICAgICAnbGFiZWwzJywge2RldGFpbDogJ2Rlc2NyaXB0aW9uMycsIGRvY3VtZW50YXRpb246ICdhIHZlcnkgZXhjaXRpbmcgdmFyaWFibGUnfSxcbiAgICApKTtcblxuICAgIGl0KCdyZXNvbHZlcyBzdWdnZXN0aW9ucyB2aWEgTFNQIGdpdmVuIGFuIEF1dG9Db21wbGV0ZVJlcXVlc3QnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBhdXRvQ29tcGxldGVBZGFwdGVyID0gbmV3IEF1dG9Db21wbGV0ZUFkYXB0ZXIoKTtcbiAgICAgIGNvbnN0IHJlc3VsdHM6IGFjLkFueVN1Z2dlc3Rpb25bXSA9IGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCByZXF1ZXN0KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJlc3VsdHMuZmluZCgocikgPT4gci5kaXNwbGF5VGV4dCA9PT0gJ2xhYmVsMycpITtcbiAgICAgIGV4cGVjdChyZXN1bHQpLm5vdC50by5iZS51bmRlZmluZWQ7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uKS50by5iZS51bmRlZmluZWQ7XG4gICAgICBjb25zdCByZXNvbHZlZEl0ZW0gPSBhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmNvbXBsZXRlU3VnZ2VzdGlvbihzZXJ2ZXIsIHJlc3VsdCwgcmVxdWVzdCk7XG4gICAgICBleHBlY3QocmVzb2x2ZWRJdGVtICYmIHJlc29sdmVkSXRlbS5kZXNjcmlwdGlvbikuZXF1YWxzKCdhIHZlcnkgZXhjaXRpbmcgdmFyaWFibGUnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NyZWF0ZUNvbXBsZXRpb25QYXJhbXMnLCAoKSA9PiB7XG4gICAgaXQoJ2NyZWF0ZXMgQ29tcGxldGlvblBhcmFtcyBmcm9tIGFuIEF1dG9jb21wbGV0ZVJlcXVlc3Qgd2l0aCBubyB0cmlnZ2VyJywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gQXV0b0NvbXBsZXRlQWRhcHRlci5jcmVhdGVDb21wbGV0aW9uUGFyYW1zKHJlcXVlc3QsICcnLCB0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudGV4dERvY3VtZW50LnVyaSkuZXF1YWxzKCdmaWxlOi8vL2EvYi9jL2QuanMnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucG9zaXRpb24pLmRlZXAuZXF1YWxzKHsgbGluZTogMTIzLCBjaGFyYWN0ZXI6IDQ1NiB9KTtcbiAgICAgIGV4cGVjdChyZXN1bHQuY29udGV4dCAmJiByZXN1bHQuY29udGV4dC50cmlnZ2VyS2luZCkuZXF1YWxzKGxzLkNvbXBsZXRpb25UcmlnZ2VyS2luZC5JbnZva2VkKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuY29udGV4dCAmJiByZXN1bHQuY29udGV4dC50cmlnZ2VyQ2hhcmFjdGVyKS50by5iZS51bmRlZmluZWQ7XG4gICAgfSk7XG5cbiAgICBpdCgnY3JlYXRlcyBDb21wbGV0aW9uUGFyYW1zIGZyb20gYW4gQXV0b2NvbXBsZXRlUmVxdWVzdCB3aXRoIGEgdHJpZ2dlcicsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IEF1dG9Db21wbGV0ZUFkYXB0ZXIuY3JlYXRlQ29tcGxldGlvblBhcmFtcyhyZXF1ZXN0LCAnLicsIHRydWUpO1xuICAgICAgZXhwZWN0KHJlc3VsdC50ZXh0RG9jdW1lbnQudXJpKS5lcXVhbHMoJ2ZpbGU6Ly8vYS9iL2MvZC5qcycpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5wb3NpdGlvbikuZGVlcC5lcXVhbHMoeyBsaW5lOiAxMjMsIGNoYXJhY3RlcjogNDU2IH0pO1xuICAgICAgZXhwZWN0KHJlc3VsdC5jb250ZXh0ICYmIHJlc3VsdC5jb250ZXh0LnRyaWdnZXJLaW5kKS5lcXVhbHMobHMuQ29tcGxldGlvblRyaWdnZXJLaW5kLlRyaWdnZXJDaGFyYWN0ZXIpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5jb250ZXh0ICYmIHJlc3VsdC5jb250ZXh0LnRyaWdnZXJDaGFyYWN0ZXIpLmVxdWFscygnLicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2NyZWF0ZXMgQ29tcGxldGlvblBhcmFtcyBmcm9tIGFuIEF1dG9jb21wbGV0ZVJlcXVlc3QgZm9yIGEgZm9sbG93LXVwIHJlcXVlc3QnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBBdXRvQ29tcGxldGVBZGFwdGVyLmNyZWF0ZUNvbXBsZXRpb25QYXJhbXMocmVxdWVzdCwgJy4nLCBmYWxzZSk7XG4gICAgICBleHBlY3QocmVzdWx0LnRleHREb2N1bWVudC51cmkpLmVxdWFscygnZmlsZTovLy9hL2IvYy9kLmpzJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnBvc2l0aW9uKS5kZWVwLmVxdWFscyh7IGxpbmU6IDEyMywgY2hhcmFjdGVyOiA0NTYgfSk7XG4gICAgICBleHBlY3QocmVzdWx0LmNvbnRleHQgJiYgcmVzdWx0LmNvbnRleHQudHJpZ2dlcktpbmQpXG4gICAgICAgIC5lcXVhbHMobHMuQ29tcGxldGlvblRyaWdnZXJLaW5kLlRyaWdnZXJGb3JJbmNvbXBsZXRlQ29tcGxldGlvbnMpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5jb250ZXh0ICYmIHJlc3VsdC5jb250ZXh0LnRyaWdnZXJDaGFyYWN0ZXIpLmVxdWFscygnLicpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY29udmVyc2lvbiBvZiBMU1AgY29tcGxldGlvbiB0byBhdXRvY29tcGxldGUrIGNvbXBsZXRpb24nLCAoKSA9PiB7XG4gICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnYWxpZ24nLCB7XG4gICAgICAgIHNvcnRUZXh0OiAnYScsXG4gICAgICAgIGtpbmQ6IGxzLkNvbXBsZXRpb25JdGVtS2luZC5TbmlwcGV0LFxuICAgICAgICB0ZXh0RWRpdDoge1xuICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0OiB7IGxpbmU6IDAsIGNoYXJhY3RlcjogNCB9LCBlbmQ6IHsgbGluZTogMCwgIGNoYXJhY3RlcjogMTAgfSB9LFxuICAgICAgICAgIG5ld1RleHQ6ICdoZWxsbyB3b3JsZCcsXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsaXN0Jywge1xuICAgICAgICBzb3J0VGV4dDogJ2InLFxuICAgICAgICBraW5kOiBscy5Db21wbGV0aW9uSXRlbUtpbmQuQ29uc3RhbnQsXG4gICAgICAgIHRleHRFZGl0OiB7XG4gICAgICAgICAgcmFuZ2U6IHsgc3RhcnQ6IHsgbGluZTogMCwgY2hhcmFjdGVyOiA4IH0sIGVuZDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDEzIH0gfSxcbiAgICAgICAgICBuZXdUZXh0OiAnc2hpZnRlZCcsXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdtaW5pbWFsJywge1xuICAgICAgICBzb3J0VGV4dDogJ2MnLFxuICAgICAgfSksXG4gICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnb2xkJywge1xuICAgICAgICBzb3J0VGV4dDogJ2QnLFxuICAgICAgICBkb2N1bWVudGF0aW9uOiAnZG9jIHN0cmluZycsXG4gICAgICAgIGluc2VydFRleHQ6ICdpbnNlcnRlZCcsXG4gICAgICAgIGluc2VydFRleHRGb3JtYXQ6IGxzLkluc2VydFRleHRGb3JtYXQuU25pcHBldCxcbiAgICAgIH0pLFxuICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2RvY3VtZW50ZWQnLCB7XG4gICAgICAgIHNvcnRUZXh0OiAnZScsXG4gICAgICAgIGRldGFpbDogJ2RldGFpbHMnLFxuICAgICAgICBkb2N1bWVudGF0aW9uOiAge1xuICAgICAgICAgIGtpbmQ6ICdtYXJrZG93bicsXG4gICAgICAgICAgdmFsdWU6ICdkb2N1bWVudGF0aW9uJyxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgIF07XG5cbiAgICBsZXQgc2VydmVyOiBBY3RpdmVTZXJ2ZXI7XG4gICAgbGV0IGF1dG9Db21wbGV0ZUFkYXB0ZXI6IEF1dG9Db21wbGV0ZUFkYXB0ZXI7XG5cbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIHNlcnZlciA9IGNyZWF0ZUFjdGl2ZVNlcnZlclNweSgpO1xuICAgICAgYXV0b0NvbXBsZXRlQWRhcHRlciA9IG5ldyBBdXRvQ29tcGxldGVBZGFwdGVyKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25JdGVtIGFycmF5IHRvIEF1dG9Db21wbGV0ZSBTdWdnZXN0aW9ucyBhcnJheScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGN1c3RvbVJlcXVlc3QgPSBjcmVhdGVSZXF1ZXN0KHtwcmVmaXg6ICcnLCBwb3NpdGlvbjogbmV3IFBvaW50KDAsIDEwKX0pO1xuICAgICAgY3VzdG9tUmVxdWVzdC5lZGl0b3Iuc2V0VGV4dCgnZm9vICNhbGlnbiBiYXInKTtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoaXRlbXMpO1xuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjdXN0b21SZXF1ZXN0KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdHMubGVuZ3RoKS5lcXVhbHMoaXRlbXMubGVuZ3RoKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLmRpc3BsYXlUZXh0KS5lcXVhbHMoJ2FsaWduJyk7XG4gICAgICBleHBlY3QoKHJlc3VsdHNbMF0gYXMgVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnaGVsbG8gd29ybGQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzWzBdLnJlcGxhY2VtZW50UHJlZml4KS5lcXVhbHMoJyNhbGlnbicpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0udHlwZSkuZXF1YWxzKCdzbmlwcGV0Jyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHRzWzFdLmRpc3BsYXlUZXh0KS5lcXVhbHMoJ2xpc3QnKTtcbiAgICAgIGV4cGVjdCgocmVzdWx0c1sxXSBhcyBUZXh0U3VnZ2VzdGlvbikudGV4dCkuZXF1YWxzKCdzaGlmdGVkJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1sxXS5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCdnbicpOyAvLyBUT0RPOiBzdXBwb3J0IHBvc3QgcmVwbGFjZW1lbnQgdG9vXG4gICAgICBleHBlY3QocmVzdWx0c1sxXS50eXBlKS5lcXVhbHMoJ2NvbnN0YW50Jyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHRzWzJdLmRpc3BsYXlUZXh0KS5lcXVhbHMoJ21pbmltYWwnKTtcbiAgICAgIGV4cGVjdCgocmVzdWx0c1syXSBhcyBUZXh0U3VnZ2VzdGlvbikudGV4dCkuZXF1YWxzKCdtaW5pbWFsJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1syXS5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCcnKTsgLy8gd2Ugc2VudCBhbiBlbXB0eSBwcmVmaXhcblxuICAgICAgZXhwZWN0KHJlc3VsdHNbM10uZGlzcGxheVRleHQpLmVxdWFscygnb2xkJyk7XG4gICAgICBleHBlY3QoKHJlc3VsdHNbM10gYXMgU25pcHBldFN1Z2dlc3Rpb24pLnNuaXBwZXQpLmVxdWFscygnaW5zZXJ0ZWQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzWzNdLmRlc2NyaXB0aW9uKS5lcXVhbHMoJ2RvYyBzdHJpbmcnKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzWzNdLmRlc2NyaXB0aW9uTWFya2Rvd24pLmVxdWFscygnZG9jIHN0cmluZycpO1xuXG4gICAgICBleHBlY3QocmVzdWx0c1s0XS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdkb2N1bWVudGVkJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1s0XS5kZXNjcmlwdGlvbikuaXMudW5kZWZpbmVkO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbNF0uZGVzY3JpcHRpb25NYXJrZG93bikuZXF1YWxzKCdkb2N1bWVudGF0aW9uJyk7XG4gICAgICBleHBlY3QocmVzdWx0c1s0XS5yaWdodExhYmVsKS5lcXVhbHMoJ2RldGFpbHMnKTtcbiAgICB9KTtcblxuICAgIGl0KCdyZXNwZWN0cyBvbkRpZENvbnZlcnRDb21wbGV0aW9uSXRlbScsIGFzeW5jICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW2NyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbCcpXSk7XG4gICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGNyZWF0ZVJlcXVlc3Qoe30pLCAoYywgYSwgcikgPT4ge1xuICAgICAgICAoYSBhcyBhYy5UZXh0U3VnZ2VzdGlvbikudGV4dCA9IGMubGFiZWwgKyAnIG9rJztcbiAgICAgICAgYS5kaXNwbGF5VGV4dCA9IHIuc2NvcGVEZXNjcmlwdG9yLmdldFNjb3Blc0FycmF5KClbMF07XG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdHMubGVuZ3RoKS5lcXVhbHMoMSk7XG4gICAgICBleHBlY3QocmVzdWx0c1swXS5kaXNwbGF5VGV4dCkuZXF1YWxzKCdzb21lLnNjb3BlJyk7XG4gICAgICBleHBlY3QoKHJlc3VsdHNbMF0gYXMgYWMuVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnbGFiZWwgb2snKTtcbiAgICB9KTtcblxuICAgIGl0KCdjb252ZXJ0cyBlbXB0eSBhcnJheSBpbnRvIGFuIGVtcHR5IEF1dG9Db21wbGV0ZSBTdWdnZXN0aW9ucyBhcnJheScsIGFzeW5jICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW10pO1xuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjcmVhdGVSZXF1ZXN0KHt9KSk7XG4gICAgICBleHBlY3QocmVzdWx0cy5sZW5ndGgpLmVxdWFscygwKTtcbiAgICB9KTtcblxuICAgIGl0KCdjb252ZXJ0cyBMU1AgQ29tcGxldGlvbkl0ZW0gdG8gQXV0b0NvbXBsZXRlIFN1Z2dlc3Rpb24gd2l0aG91dCB0ZXh0RWRpdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW1xuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwnLCB7XG4gICAgICAgICBpbnNlcnRUZXh0OiAnaW5zZXJ0JyxcbiAgICAgICAgIGZpbHRlclRleHQ6ICdmaWx0ZXInLFxuICAgICAgICAga2luZDogbHMuQ29tcGxldGlvbkl0ZW1LaW5kLktleXdvcmQsXG4gICAgICAgICBkZXRhaWw6ICdrZXl3b3JkJyxcbiAgICAgICAgIGRvY3VtZW50YXRpb246ICdhIHRydWx5IHVzZWZ1bCBrZXl3b3JkJyxcbiAgICAgICB9KSxcbiAgICAgIF0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gKGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjcmVhdGVSZXF1ZXN0KHt9KSkpWzBdO1xuICAgICAgZXhwZWN0KChyZXN1bHQgYXMgVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnaW5zZXJ0Jyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRpc3BsYXlUZXh0KS5lcXVhbHMoJ2xhYmVsJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnR5cGUpLmVxdWFscygna2V5d29yZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yaWdodExhYmVsKS5lcXVhbHMoJ2tleXdvcmQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb24pLmVxdWFscygnYSB0cnVseSB1c2VmdWwga2V5d29yZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZXNjcmlwdGlvbk1hcmtkb3duKS5lcXVhbHMoJ2EgdHJ1bHkgdXNlZnVsIGtleXdvcmQnKTtcbiAgICB9KTtcblxuICAgIGl0KCdjb252ZXJ0cyBMU1AgQ29tcGxldGlvbkl0ZW0gdG8gQXV0b0NvbXBsZXRlIFN1Z2dlc3Rpb24gd2l0aCB0ZXh0RWRpdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGN1c3RvbVJlcXVlc3QgPSBjcmVhdGVSZXF1ZXN0KHtcbiAgICAgICAgcHJlZml4OiAnJyxcbiAgICAgICAgcG9zaXRpb246IG5ldyBQb2ludCgwLCAxMCksXG4gICAgICAgIGFjdGl2YXRlZE1hbnVhbGx5OiBmYWxzZSxcbiAgICAgIH0pO1xuICAgICAgY3VzdG9tUmVxdWVzdC5lZGl0b3Iuc2V0VGV4dCgnZm9vICNsYWJlbCBiYXInKTtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW1xuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwnLCB7XG4gICAgICAgICAgaW5zZXJ0VGV4dDogJ2luc2VydCcsXG4gICAgICAgICAgZmlsdGVyVGV4dDogJ2ZpbHRlcicsXG4gICAgICAgICAga2luZDogbHMuQ29tcGxldGlvbkl0ZW1LaW5kLlZhcmlhYmxlLFxuICAgICAgICAgIGRldGFpbDogJ251bWJlcicsXG4gICAgICAgICAgZG9jdW1lbnRhdGlvbjogJ2EgdHJ1bHkgdXNlZnVsIHZhcmlhYmxlJyxcbiAgICAgICAgICB0ZXh0RWRpdDoge1xuICAgICAgICAgICAgcmFuZ2U6IHsgc3RhcnQ6IHsgbGluZTogMCwgY2hhcmFjdGVyOiA0IH0sIGVuZDogeyBsaW5lOiAwLCAgY2hhcmFjdGVyOiAxMCB9IH0sXG4gICAgICAgICAgICBuZXdUZXh0OiAnbmV3VGV4dCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICBdKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gKGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjdXN0b21SZXF1ZXN0KSlbMF07XG4gICAgICBleHBlY3QocmVzdWx0LmRpc3BsYXlUZXh0KS5lcXVhbHMoJ2xhYmVsJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnR5cGUpLmVxdWFscygndmFyaWFibGUnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmlnaHRMYWJlbCkuZXF1YWxzKCdudW1iZXInKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb24pLmVxdWFscygnYSB0cnVseSB1c2VmdWwgdmFyaWFibGUnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb25NYXJrZG93bikuZXF1YWxzKCdhIHRydWx5IHVzZWZ1bCB2YXJpYWJsZScpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCcjbGFiZWwnKTtcbiAgICAgIGV4cGVjdCgocmVzdWx0IGFzIFRleHRTdWdnZXN0aW9uKS50ZXh0KS5lcXVhbHMoJ25ld1RleHQnKTtcbiAgICB9KTtcblxuICAgIGl0KCdjb252ZXJ0cyBMU1AgQ29tcGxldGlvbkl0ZW0gd2l0aCBpbnNlcnRUZXh0IGFuZCBmaWx0ZXJUZXh0IHRvIEF1dG9Db21wbGV0ZSBTdWdnZXN0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihzZXJ2ZXIuY29ubmVjdGlvbiwgJ2NvbXBsZXRpb24nKS5yZXNvbHZlcyhbXG4gICAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbCcsIHtcbiAgICAgICAgICBpbnNlcnRUZXh0OiAnaW5zZXJ0JyxcbiAgICAgICAgICBmaWx0ZXJUZXh0OiAnZmlsdGVyJyxcbiAgICAgICAgICBraW5kOiBscy5Db21wbGV0aW9uSXRlbUtpbmQuS2V5d29yZCxcbiAgICAgICAgICBkZXRhaWw6ICdkZXRhaWwnLFxuICAgICAgICAgIGRvY3VtZW50YXRpb246ICdhIHZlcnkgZXhjaXRpbmcga2V5d29yZCcsXG4gICAgICAgIH0pLFxuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnZmlsdGVyZWRPdXQnLCB7XG4gICAgICAgICAgZmlsdGVyVGV4dDogJ25vcCcsXG4gICAgICAgIH0pLFxuICAgICAgXSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3JlYXRlUmVxdWVzdCh7cHJlZml4OiAnZmlsJ30pKTtcbiAgICAgIGV4cGVjdChyZXN1bHRzLmxlbmd0aCkuZXF1YWxzKDEpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSByZXN1bHRzWzBdO1xuICAgICAgZXhwZWN0KChyZXN1bHQgYXMgVGV4dFN1Z2dlc3Rpb24pLnRleHQpLmVxdWFscygnaW5zZXJ0Jyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRpc3BsYXlUZXh0KS5lcXVhbHMoJ2xhYmVsJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnR5cGUpLmVxdWFscygna2V5d29yZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yaWdodExhYmVsKS5lcXVhbHMoJ2RldGFpbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZXNjcmlwdGlvbikuZXF1YWxzKCdhIHZlcnkgZXhjaXRpbmcga2V5d29yZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZXNjcmlwdGlvbk1hcmtkb3duKS5lcXVhbHMoJ2EgdmVyeSBleGNpdGluZyBrZXl3b3JkJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25JdGVtIHdpdGggbWlzc2luZyBkb2N1bWVudGF0aW9uIHRvIEF1dG9Db21wbGV0ZSBTdWdnZXN0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihzZXJ2ZXIuY29ubmVjdGlvbiwgJ2NvbXBsZXRpb24nKS5yZXNvbHZlcyhbXG4gICAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbCcsIHtcbiAgICAgICAgICBkZXRhaWw6ICdkZXRhaWwnLFxuICAgICAgICB9KSxcbiAgICAgIF0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSAoYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGNyZWF0ZVJlcXVlc3Qoe30pKSlbMF07XG4gICAgICBleHBlY3QocmVzdWx0LnJpZ2h0TGFiZWwpLmVxdWFscygnZGV0YWlsJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uKS5lcXVhbHModW5kZWZpbmVkKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb25NYXJrZG93bikuZXF1YWxzKHVuZGVmaW5lZCk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25JdGVtIHdpdGggbWFya2Rvd24gZG9jdW1lbnRhdGlvbiB0byBBdXRvQ29tcGxldGUgU3VnZ2VzdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW1xuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwnLCB7XG4gICAgICAgICAgZGV0YWlsOiAnZGV0YWlsJyxcbiAgICAgICAgICBkb2N1bWVudGF0aW9uOiB7IHZhbHVlOiAnU29tZSAqbWFya2Rvd24qJywga2luZDogJ21hcmtkb3duJyB9LFxuICAgICAgICB9KSxcbiAgICAgIF0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSAoYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGNyZWF0ZVJlcXVlc3Qoe30pKSlbMF07XG4gICAgICBleHBlY3QocmVzdWx0LnJpZ2h0TGFiZWwpLmVxdWFscygnZGV0YWlsJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uKS5lcXVhbHModW5kZWZpbmVkKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb25NYXJrZG93bikuZXF1YWxzKCdTb21lICptYXJrZG93bionKTtcbiAgICB9KTtcblxuICAgIGl0KCdjb252ZXJ0cyBMU1AgQ29tcGxldGlvbkl0ZW0gd2l0aCBwbGFpbnRleHQgZG9jdW1lbnRhdGlvbiB0byBBdXRvQ29tcGxldGUgU3VnZ2VzdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW1xuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnbGFiZWwnLCB7XG4gICAgICAgICAgZGV0YWlsOiAnZGV0YWlsJyxcbiAgICAgICAgICBkb2N1bWVudGF0aW9uOiB7IHZhbHVlOiAnU29tZSBwbGFpbiB0ZXh0Jywga2luZDogJ3BsYWludGV4dCcgfSxcbiAgICAgICAgfSksXG4gICAgICBdKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gKGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjcmVhdGVSZXF1ZXN0KHt9KSkpWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yaWdodExhYmVsKS5lcXVhbHMoJ2RldGFpbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZXNjcmlwdGlvbikuZXF1YWxzKCdTb21lIHBsYWluIHRleHQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb25NYXJrZG93bikuZXF1YWxzKHVuZGVmaW5lZCk7XG4gICAgfSk7XG5cbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25JdGVtIHdpdGhvdXQgaW5zZXJ0VGV4dCBvciBmaWx0ZXJUZXh0IHRvIEF1dG9Db21wbGV0ZSBTdWdnZXN0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgc2lub24uc3R1YihzZXJ2ZXIuY29ubmVjdGlvbiwgJ2NvbXBsZXRpb24nKS5yZXNvbHZlcyhbXG4gICAgICAgIGNyZWF0ZUNvbXBsZXRpb25JdGVtKCdsYWJlbCcsIHtcbiAgICAgICAgICBraW5kOiBscy5Db21wbGV0aW9uSXRlbUtpbmQuS2V5d29yZCxcbiAgICAgICAgICBkZXRhaWw6ICdkZXRhaWwnLFxuICAgICAgICAgIGRvY3VtZW50YXRpb246ICdBIHZlcnkgdXNlZnVsIGtleXdvcmQnLFxuICAgICAgICB9KSxcbiAgICAgIF0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSAoYXdhaXQgYXV0b0NvbXBsZXRlQWRhcHRlci5nZXRTdWdnZXN0aW9ucyhzZXJ2ZXIsIGNyZWF0ZVJlcXVlc3Qoe30pKSlbMF07XG4gICAgICBleHBlY3QoKHJlc3VsdCBhcyBUZXh0U3VnZ2VzdGlvbikudGV4dCkuZXF1YWxzKCdsYWJlbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kaXNwbGF5VGV4dCkuZXF1YWxzKCdsYWJlbCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC50eXBlKS5lcXVhbHMoJ2tleXdvcmQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmlnaHRMYWJlbCkuZXF1YWxzKCdkZXRhaWwnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVzY3JpcHRpb24pLmVxdWFscygnQSB2ZXJ5IHVzZWZ1bCBrZXl3b3JkJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRlc2NyaXB0aW9uTWFya2Rvd24pLmVxdWFscygnQSB2ZXJ5IHVzZWZ1bCBrZXl3b3JkJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnZG9lcyBub3QgZG8gYW55dGhpbmcgaWYgdGhlcmUgaXMgbm8gdGV4dEVkaXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJycsIHtmaWx0ZXJUZXh0OiAncmVwJ30pLFxuICAgICAgXSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IChhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3JlYXRlUmVxdWVzdCh7cHJlZml4OiAncmVwJ30pKSlbMF07XG4gICAgICBleHBlY3QoKHJlc3VsdCBhcyBUZXh0U3VnZ2VzdGlvbikudGV4dCkuZXF1YWxzKCcnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGlzcGxheVRleHQpLmVxdWFscygnJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnJlcGxhY2VtZW50UHJlZml4KS5lcXVhbHMoJycpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2FwcGxpZXMgY2hhbmdlcyBmcm9tIFRleHRFZGl0IHRvIHRleHQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjdXN0b21SZXF1ZXN0ID0gY3JlYXRlUmVxdWVzdCh7cHJlZml4OiAnJywgcG9zaXRpb246IG5ldyBQb2ludCgwLCAxMCl9KTtcbiAgICAgIGN1c3RvbVJlcXVlc3QuZWRpdG9yLnNldFRleHQoJ2ZvbyAjYWxpZ24gYmFyJyk7XG4gICAgICBzaW5vbi5zdHViKHNlcnZlci5jb25uZWN0aW9uLCAnY29tcGxldGlvbicpLnJlc29sdmVzKFtcbiAgICAgICAgY3JlYXRlQ29tcGxldGlvbkl0ZW0oJ2FsaWduJywge1xuICAgICAgICAgIHNvcnRUZXh0OiAnYScsXG4gICAgICAgICAgdGV4dEVkaXQ6IHtcbiAgICAgICAgICAgIHJhbmdlOiB7IHN0YXJ0OiB7IGxpbmU6IDAsIGNoYXJhY3RlcjogNCB9LCBlbmQ6IHsgbGluZTogMCwgIGNoYXJhY3RlcjogMTAgfSB9LFxuICAgICAgICAgICAgbmV3VGV4dDogJ2hlbGxvIHdvcmxkJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICAgIF0pO1xuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjdXN0b21SZXF1ZXN0KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0uZGlzcGxheVRleHQpLmVxdWFscygnYWxpZ24nKTtcbiAgICAgIGV4cGVjdCgocmVzdWx0c1swXSBhcyBUZXh0U3VnZ2VzdGlvbikudGV4dCkuZXF1YWxzKCdoZWxsbyB3b3JsZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdHNbMF0ucmVwbGFjZW1lbnRQcmVmaXgpLmVxdWFscygnI2FsaWduJyk7XG4gICAgfSk7XG5cbiAgICBpdCgndXBkYXRlcyB0aGUgcmVwbGFjZW1lbnRQcmVmaXggd2hlbiB0aGUgZWRpdG9yIHRleHQgY2hhbmdlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGN1c3RvbVJlcXVlc3QgPSBjcmVhdGVSZXF1ZXN0KHtwcmVmaXg6ICcnLCBwb3NpdGlvbjogbmV3IFBvaW50KDAsIDgpfSk7XG4gICAgICBjdXN0b21SZXF1ZXN0LmVkaXRvci5zZXRUZXh0KCdmb28gI2FsaSBiYXInKTtcbiAgICAgIHNpbm9uLnN0dWIoc2VydmVyLmNvbm5lY3Rpb24sICdjb21wbGV0aW9uJykucmVzb2x2ZXMoW1xuICAgICAgICBjcmVhdGVDb21wbGV0aW9uSXRlbSgnYWxpZ24nLCB7XG4gICAgICAgICAgc29ydFRleHQ6ICdhJyxcbiAgICAgICAgICB0ZXh0RWRpdDoge1xuICAgICAgICAgICAgcmFuZ2U6IHsgc3RhcnQ6IHsgbGluZTogMCwgY2hhcmFjdGVyOiA0IH0sIGVuZDogeyBsaW5lOiAwLCAgY2hhcmFjdGVyOiA4IH0gfSxcbiAgICAgICAgICAgIG5ld1RleHQ6ICdoZWxsbyB3b3JsZCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICBdKTtcblxuICAgICAgbGV0IHJlc3VsdCA9IChhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3VzdG9tUmVxdWVzdCkpWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCcjYWxpJyk7XG5cbiAgICAgIGN1c3RvbVJlcXVlc3QuZWRpdG9yLnNldFRleHRJbkJ1ZmZlclJhbmdlKFtbMCwgOF0sIFswLCA4XV0sICdnJyk7XG4gICAgICBjdXN0b21SZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uID0gbmV3IFBvaW50KDAsIDkpO1xuICAgICAgcmVzdWx0ID0gKGF3YWl0IGF1dG9Db21wbGV0ZUFkYXB0ZXIuZ2V0U3VnZ2VzdGlvbnMoc2VydmVyLCBjdXN0b21SZXF1ZXN0KSlbMF07XG4gICAgICBleHBlY3QocmVzdWx0LnJlcGxhY2VtZW50UHJlZml4KS5lcXVhbHMoJyNhbGlnJyk7XG5cbiAgICAgIGN1c3RvbVJlcXVlc3QuZWRpdG9yLnNldFRleHRJbkJ1ZmZlclJhbmdlKFtbMCwgOV0sIFswLCA5XV0sICduJyk7XG4gICAgICBjdXN0b21SZXF1ZXN0LmJ1ZmZlclBvc2l0aW9uID0gbmV3IFBvaW50KDAsIDEwKTtcbiAgICAgIHJlc3VsdCA9IChhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3VzdG9tUmVxdWVzdCkpWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCcjYWxpZ24nKTtcblxuICAgICAgY3VzdG9tUmVxdWVzdC5lZGl0b3Iuc2V0VGV4dEluQnVmZmVyUmFuZ2UoW1swLCA3XSwgWzAsIDldXSwgJycpO1xuICAgICAgY3VzdG9tUmVxdWVzdC5idWZmZXJQb3NpdGlvbiA9IG5ldyBQb2ludCgwLCA3KTtcbiAgICAgIHJlc3VsdCA9IChhd2FpdCBhdXRvQ29tcGxldGVBZGFwdGVyLmdldFN1Z2dlc3Rpb25zKHNlcnZlciwgY3VzdG9tUmVxdWVzdCkpWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yZXBsYWNlbWVudFByZWZpeCkuZXF1YWxzKCcjYWwnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NvbXBsZXRpb25LaW5kVG9TdWdnZXN0aW9uVHlwZScsICgpID0+IHtcbiAgICBpdCgnY29udmVydHMgTFNQIENvbXBsZXRpb25LaW5kcyB0byBBdXRvQ29tcGxldGUgU3VnZ2VzdGlvblR5cGVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgdmFyaWFibGUgPSBBdXRvQ29tcGxldGVBZGFwdGVyLmNvbXBsZXRpb25LaW5kVG9TdWdnZXN0aW9uVHlwZShscy5Db21wbGV0aW9uSXRlbUtpbmQuVmFyaWFibGUpO1xuICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBBdXRvQ29tcGxldGVBZGFwdGVyLmNvbXBsZXRpb25LaW5kVG9TdWdnZXN0aW9uVHlwZShscy5Db21wbGV0aW9uSXRlbUtpbmQuQ29uc3RydWN0b3IpO1xuICAgICAgY29uc3QgbW9kdWxlID0gQXV0b0NvbXBsZXRlQWRhcHRlci5jb21wbGV0aW9uS2luZFRvU3VnZ2VzdGlvblR5cGUobHMuQ29tcGxldGlvbkl0ZW1LaW5kLk1vZHVsZSk7XG4gICAgICBleHBlY3QodmFyaWFibGUpLmVxdWFscygndmFyaWFibGUnKTtcbiAgICAgIGV4cGVjdChjb25zdHJ1Y3RvcikuZXF1YWxzKCdmdW5jdGlvbicpO1xuICAgICAgZXhwZWN0KG1vZHVsZSkuZXF1YWxzKCdtb2R1bGUnKTtcbiAgICB9KTtcblxuICAgIGl0KCdkZWZhdWx0cyB0byBcInZhbHVlXCInLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBBdXRvQ29tcGxldGVBZGFwdGVyLmNvbXBsZXRpb25LaW5kVG9TdWdnZXN0aW9uVHlwZSh1bmRlZmluZWQpO1xuICAgICAgZXhwZWN0KHJlc3VsdCkuZXF1YWxzKCd2YWx1ZScpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19