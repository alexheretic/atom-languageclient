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
const ls = require("../lib/languageclient");
const sinon = require("sinon");
const chai_1 = require("chai");
const helpers_js_1 = require("./helpers.js");
const logger_1 = require("../lib/logger");
describe('LanguageClientConnection', () => {
    it('listens to the RPC connection it is given', () => {
        const rpc = helpers_js_1.createSpyConnection();
        new ls.LanguageClientConnection(rpc, new logger_1.NullLogger());
        chai_1.expect(rpc.listen.called).equals(true);
    });
    it('disposes of the connection when it is disposed', () => {
        const rpc = helpers_js_1.createSpyConnection();
        const lc = new ls.LanguageClientConnection(rpc, new logger_1.NullLogger());
        chai_1.expect(rpc.dispose.called).equals(false);
        lc.dispose();
        chai_1.expect(rpc.dispose.called).equals(true);
    });
    describe('send requests', () => {
        const textDocumentPositionParams = {
            textDocument: { uri: 'file:///1/z80.asm' },
            position: { line: 24, character: 32 },
        };
        let lc;
        beforeEach(() => {
            lc = new ls.LanguageClientConnection(helpers_js_1.createSpyConnection(), new logger_1.NullLogger());
            sinon.spy(lc, '_sendRequest');
        });
        it('sends a request for initialize', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = { capabilities: {} };
            yield lc.initialize(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('initialize');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for shutdown', () => __awaiter(void 0, void 0, void 0, function* () {
            yield lc.shutdown();
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('shutdown');
        }));
        it('sends a request for completion', () => __awaiter(void 0, void 0, void 0, function* () {
            yield lc.completion(textDocumentPositionParams);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/completion');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(textDocumentPositionParams);
        }));
        it('sends a request for completionItemResolve', () => __awaiter(void 0, void 0, void 0, function* () {
            const completionItem = { label: 'abc' };
            yield lc.completionItemResolve(completionItem);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('completionItem/resolve');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(completionItem);
        }));
        it('sends a request for hover', () => __awaiter(void 0, void 0, void 0, function* () {
            yield lc.hover(textDocumentPositionParams);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/hover');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(textDocumentPositionParams);
        }));
        it('sends a request for signatureHelp', () => __awaiter(void 0, void 0, void 0, function* () {
            yield lc.signatureHelp(textDocumentPositionParams);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/signatureHelp');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(textDocumentPositionParams);
        }));
        it('sends a request for gotoDefinition', () => __awaiter(void 0, void 0, void 0, function* () {
            yield lc.gotoDefinition(textDocumentPositionParams);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/definition');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(textDocumentPositionParams);
        }));
        it('sends a request for findReferences', () => __awaiter(void 0, void 0, void 0, function* () {
            yield lc.findReferences(textDocumentPositionParams);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/references');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(textDocumentPositionParams);
        }));
        it('sends a request for documentHighlight', () => __awaiter(void 0, void 0, void 0, function* () {
            yield lc.documentHighlight(textDocumentPositionParams);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/documentHighlight');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(textDocumentPositionParams);
        }));
        it('sends a request for documentSymbol', () => __awaiter(void 0, void 0, void 0, function* () {
            yield lc.documentSymbol(textDocumentPositionParams);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/documentSymbol');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(textDocumentPositionParams);
        }));
        it('sends a request for workspaceSymbol', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = { query: 'something' };
            yield lc.workspaceSymbol(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('workspace/symbol');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for codeAction', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                textDocument: textDocumentPositionParams.textDocument,
                range: {
                    start: { line: 1, character: 1 },
                    end: { line: 24, character: 32 },
                },
                context: { diagnostics: [] },
            };
            yield lc.codeAction(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/codeAction');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for codeLens', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                textDocument: textDocumentPositionParams.textDocument,
            };
            yield lc.codeLens(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/codeLens');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for codeLensResolve', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                range: {
                    start: { line: 1, character: 1 },
                    end: { line: 24, character: 32 },
                },
            };
            yield lc.codeLensResolve(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('codeLens/resolve');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for documentLink', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                textDocument: textDocumentPositionParams.textDocument,
            };
            yield lc.documentLink(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/documentLink');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for documentLinkResolve', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                range: {
                    start: { line: 1, character: 1 },
                    end: { line: 24, character: 32 },
                },
                target: 'abc.def.ghi',
            };
            yield lc.documentLinkResolve(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('documentLink/resolve');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for documentFormatting', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                textDocument: textDocumentPositionParams.textDocument,
                options: { tabSize: 6, insertSpaces: true, someValue: 'optional' },
            };
            yield lc.documentFormatting(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/formatting');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for documentRangeFormatting', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                textDocument: textDocumentPositionParams.textDocument,
                range: {
                    start: { line: 1, character: 1 },
                    end: { line: 24, character: 32 },
                },
                options: { tabSize: 6, insertSpaces: true, someValue: 'optional' },
            };
            yield lc.documentRangeFormatting(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/rangeFormatting');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for documentOnTypeFormatting', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                textDocument: textDocumentPositionParams.textDocument,
                position: { line: 1, character: 1 },
                ch: '}',
                options: { tabSize: 6, insertSpaces: true, someValue: 'optional' },
            };
            yield lc.documentOnTypeFormatting(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/onTypeFormatting');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
        it('sends a request for rename', () => __awaiter(void 0, void 0, void 0, function* () {
            const params = {
                textDocument: { uri: 'file:///a/b.txt' },
                position: { line: 1, character: 2 },
                newName: 'abstractConstructorFactory',
            };
            yield lc.rename(params);
            chai_1.expect(lc._sendRequest.called).equals(true);
            chai_1.expect(lc._sendRequest.getCall(0).args[0]).equals('textDocument/rename');
            chai_1.expect(lc._sendRequest.getCall(0).args[1]).equals(params);
        }));
    });
    describe('send notifications', () => {
        const textDocumentItem = {
            uri: 'file:///best/bits.js',
            languageId: 'javascript',
            text: 'function a() { return "b"; };',
            version: 1,
        };
        const versionedTextDocumentIdentifier = {
            uri: 'file:///best/bits.js',
            version: 1,
        };
        let lc;
        beforeEach(() => {
            lc = new ls.LanguageClientConnection(helpers_js_1.createSpyConnection(), new logger_1.NullLogger());
            sinon.stub(lc, '_sendNotification');
        });
        it('exit sends notification', () => {
            lc.exit();
            chai_1.expect(lc._sendNotification.called).equals(true);
            chai_1.expect(lc._sendNotification.getCall(0).args[0]).equals('exit');
            chai_1.expect(lc._sendNotification.getCall(0).args.length).equals(1);
        });
        it('initialized sends notification', () => {
            lc.initialized();
            chai_1.expect(lc._sendNotification.called).equals(true);
            chai_1.expect(lc._sendNotification.getCall(0).args[0]).equals('initialized');
            const expected = {};
            chai_1.expect(lc._sendNotification.getCall(0).args[1]).to.deep.equal(expected);
        });
        it('didChangeConfiguration sends notification', () => {
            const params = {
                settings: { a: { b: 'c' } },
            };
            lc.didChangeConfiguration(params);
            chai_1.expect(lc._sendNotification.called).equals(true);
            chai_1.expect(lc._sendNotification.getCall(0).args[0]).equals('workspace/didChangeConfiguration');
            chai_1.expect(lc._sendNotification.getCall(0).args[1]).equals(params);
        });
        it('didOpenTextDocument sends notification', () => {
            const params = {
                textDocument: textDocumentItem,
            };
            lc.didOpenTextDocument(params);
            chai_1.expect(lc._sendNotification.called).equals(true);
            chai_1.expect(lc._sendNotification.getCall(0).args[0]).equals('textDocument/didOpen');
            chai_1.expect(lc._sendNotification.getCall(0).args[1]).equals(params);
        });
        it('didChangeTextDocument sends notification', () => {
            const params = {
                textDocument: versionedTextDocumentIdentifier,
                contentChanges: [],
            };
            lc.didChangeTextDocument(params);
            chai_1.expect(lc._sendNotification.called).equals(true);
            chai_1.expect(lc._sendNotification.getCall(0).args[0]).equals('textDocument/didChange');
            chai_1.expect(lc._sendNotification.getCall(0).args[1]).equals(params);
        });
        it('didCloseTextDocument sends notification', () => {
            const params = {
                textDocument: textDocumentItem,
            };
            lc.didCloseTextDocument(params);
            chai_1.expect(lc._sendNotification.called).equals(true);
            chai_1.expect(lc._sendNotification.getCall(0).args[0]).equals('textDocument/didClose');
            chai_1.expect(lc._sendNotification.getCall(0).args[1]).equals(params);
        });
        it('didSaveTextDocument sends notification', () => {
            const params = {
                textDocument: textDocumentItem,
            };
            lc.didSaveTextDocument(params);
            chai_1.expect(lc._sendNotification.called).equals(true);
            chai_1.expect(lc._sendNotification.getCall(0).args[0]).equals('textDocument/didSave');
            chai_1.expect(lc._sendNotification.getCall(0).args[1]).equals(params);
        });
        it('didChangeWatchedFiles sends notification', () => {
            const params = { changes: [] };
            lc.didChangeWatchedFiles(params);
            chai_1.expect(lc._sendNotification.called).equals(true);
            chai_1.expect(lc._sendNotification.getCall(0).args[0]).equals('workspace/didChangeWatchedFiles');
            chai_1.expect(lc._sendNotification.getCall(0).args[1]).equals(params);
        });
    });
    describe('notification methods', () => {
        let lc;
        const eventMap = {};
        beforeEach(() => {
            lc = new ls.LanguageClientConnection(helpers_js_1.createSpyConnection(), new logger_1.NullLogger());
            sinon.stub(lc, '_onNotification').callsFake((message, callback) => {
                eventMap[message.method] = callback;
            });
        });
        it('onShowMessage calls back on window/showMessage', () => {
            let called = false;
            lc.onShowMessage(() => {
                called = true;
            });
            eventMap['window/showMessage']();
            chai_1.expect(called).equals(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VjbGllbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvbGFuZ3VhZ2VjbGllbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLDRDQUE0QztBQUM1QywrQkFBK0I7QUFDL0IsK0JBQThCO0FBQzlCLDZDQUFtRDtBQUNuRCwwQ0FBMkM7QUFFM0MsUUFBUSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN4QyxFQUFFLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1FBQ25ELE1BQU0sR0FBRyxHQUFHLGdDQUFtQixFQUFFLENBQUM7UUFFbEMsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLElBQUksbUJBQVUsRUFBRSxDQUFDLENBQUM7UUFDdkQsYUFBTSxDQUFFLEdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtRQUN4RCxNQUFNLEdBQUcsR0FBRyxnQ0FBbUIsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxJQUFJLG1CQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLGFBQU0sQ0FBRSxHQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsRCxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDYixhQUFNLENBQUUsR0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLDBCQUEw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ZW50IjpbImltcG9ydCAqIGFzIGxzIGZyb20gJy4uL2xpYi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQgKiBhcyBzaW5vbiBmcm9tICdzaW5vbic7XG5pbXBvcnQgeyBleHBlY3QgfSBmcm9tICdjaGFpJztcbmltcG9ydCB7IGNyZWF0ZVNweUNvbm5lY3Rpb24gfSBmcm9tICcuL2hlbHBlcnMuanMnO1xuaW1wb3J0IHsgTnVsbExvZ2dlciB9IGZyb20gJy4uL2xpYi9sb2dnZXInO1xuXG5kZXNjcmliZSgnTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uJywgKCkgPT4ge1xuICBpdCgnbGlzdGVucyB0byB0aGUgUlBDIGNvbm5lY3Rpb24gaXQgaXMgZ2l2ZW4nLCAoKSA9PiB7XG4gICAgY29uc3QgcnBjID0gY3JlYXRlU3B5Q29ubmVjdGlvbigpO1xuXG4gICAgbmV3IGxzLkxhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbihycGMsIG5ldyBOdWxsTG9nZ2VyKCkpO1xuICAgIGV4cGVjdCgocnBjIGFzIGFueSkubGlzdGVuLmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICB9KTtcblxuICBpdCgnZGlzcG9zZXMgb2YgdGhlIGNvbm5lY3Rpb24gd2hlbiBpdCBpcyBkaXNwb3NlZCcsICgpID0+IHtcbiAgICBjb25zdCBycGMgPSBjcmVhdGVTcHlDb25uZWN0aW9uKCk7XG4gICAgY29uc3QgbGMgPSBuZXcgbHMuTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uKHJwYywgbmV3IE51bGxMb2dnZXIoKSk7XG4gICAgZXhwZWN0KChycGMgYXMgYW55KS5kaXNwb3NlLmNhbGxlZCkuZXF1YWxzKGZhbHNlKTtcbiAgICBsYy5kaXNwb3NlKCk7XG4gICAgZXhwZWN0KChycGMgYXMgYW55KS5kaXNwb3NlLmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICB9KTtcblxuICBkZXNjcmliZSgnc2VuZCByZXF1ZXN0cycsICgpID0+IHtcbiAgICBjb25zdCB0ZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtczogbHMuVGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMgPSB7XG4gICAgICB0ZXh0RG9jdW1lbnQ6IHsgdXJpOiAnZmlsZTovLy8xL3o4MC5hc20nIH0sXG4gICAgICBwb3NpdGlvbjogeyBsaW5lOiAyNCwgY2hhcmFjdGVyOiAzMiB9LFxuICAgIH07XG4gICAgbGV0IGxjOiBhbnk7XG5cbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIGxjID0gbmV3IGxzLkxhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbihjcmVhdGVTcHlDb25uZWN0aW9uKCksIG5ldyBOdWxsTG9nZ2VyKCkpO1xuICAgICAgc2lub24uc3B5KGxjLCAnX3NlbmRSZXF1ZXN0Jyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciBpbml0aWFsaXplJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcGFyYW1zID0geyBjYXBhYmlsaXRpZXM6IHt9IH07XG4gICAgICBhd2FpdCBsYy5pbml0aWFsaXplKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCdpbml0aWFsaXplJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciBzaHV0ZG93bicsIGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGxjLnNodXRkb3duKCk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCdzaHV0ZG93bicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NlbmRzIGEgcmVxdWVzdCBmb3IgY29tcGxldGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGxjLmNvbXBsZXRpb24odGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMpO1xuXG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMF0pLmVxdWFscygndGV4dERvY3VtZW50L2NvbXBsZXRpb24nKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzFdKS5lcXVhbHModGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NlbmRzIGEgcmVxdWVzdCBmb3IgY29tcGxldGlvbkl0ZW1SZXNvbHZlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29tcGxldGlvbkl0ZW06IGxzLkNvbXBsZXRpb25JdGVtID0geyBsYWJlbDogJ2FiYycgfTtcbiAgICAgIGF3YWl0IGxjLmNvbXBsZXRpb25JdGVtUmVzb2x2ZShjb21wbGV0aW9uSXRlbSk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCdjb21wbGV0aW9uSXRlbS9yZXNvbHZlJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKGNvbXBsZXRpb25JdGVtKTtcbiAgICB9KTtcblxuICAgIGl0KCdzZW5kcyBhIHJlcXVlc3QgZm9yIGhvdmVyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgbGMuaG92ZXIodGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMpO1xuXG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMF0pLmVxdWFscygndGV4dERvY3VtZW50L2hvdmVyJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKTtcbiAgICB9KTtcblxuICAgIGl0KCdzZW5kcyBhIHJlcXVlc3QgZm9yIHNpZ25hdHVyZUhlbHAnLCBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBsYy5zaWduYXR1cmVIZWxwKHRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKTtcblxuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzBdKS5lcXVhbHMoJ3RleHREb2N1bWVudC9zaWduYXR1cmVIZWxwJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKTtcbiAgICB9KTtcblxuICAgIGl0KCdzZW5kcyBhIHJlcXVlc3QgZm9yIGdvdG9EZWZpbml0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgbGMuZ290b0RlZmluaXRpb24odGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMpO1xuXG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMF0pLmVxdWFscygndGV4dERvY3VtZW50L2RlZmluaXRpb24nKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzFdKS5lcXVhbHModGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NlbmRzIGEgcmVxdWVzdCBmb3IgZmluZFJlZmVyZW5jZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBsYy5maW5kUmVmZXJlbmNlcyh0ZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCd0ZXh0RG9jdW1lbnQvcmVmZXJlbmNlcycpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMV0pLmVxdWFscyh0ZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciBkb2N1bWVudEhpZ2hsaWdodCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGxjLmRvY3VtZW50SGlnaGxpZ2h0KHRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKTtcblxuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzBdKS5lcXVhbHMoJ3RleHREb2N1bWVudC9kb2N1bWVudEhpZ2hsaWdodCcpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMV0pLmVxdWFscyh0ZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciBkb2N1bWVudFN5bWJvbCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGxjLmRvY3VtZW50U3ltYm9sKHRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zKTtcblxuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzBdKS5lcXVhbHMoJ3RleHREb2N1bWVudC9kb2N1bWVudFN5bWJvbCcpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMV0pLmVxdWFscyh0ZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciB3b3Jrc3BhY2VTeW1ib2wnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXM6IGxzLldvcmtzcGFjZVN5bWJvbFBhcmFtcyA9IHsgcXVlcnk6ICdzb21ldGhpbmcnIH07XG4gICAgICBhd2FpdCBsYy53b3Jrc3BhY2VTeW1ib2wocGFyYW1zKTtcblxuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzBdKS5lcXVhbHMoJ3dvcmtzcGFjZS9zeW1ib2wnKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzFdKS5lcXVhbHMocGFyYW1zKTtcbiAgICB9KTtcblxuICAgIGl0KCdzZW5kcyBhIHJlcXVlc3QgZm9yIGNvZGVBY3Rpb24nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXM6IGxzLkNvZGVBY3Rpb25QYXJhbXMgPSB7XG4gICAgICAgIHRleHREb2N1bWVudDogdGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMudGV4dERvY3VtZW50LFxuICAgICAgICByYW5nZToge1xuICAgICAgICAgIHN0YXJ0OiB7IGxpbmU6IDEsIGNoYXJhY3RlcjogMSB9LFxuICAgICAgICAgIGVuZDogeyBsaW5lOiAyNCwgY2hhcmFjdGVyOiAzMiB9LFxuICAgICAgICB9LFxuICAgICAgICBjb250ZXh0OiB7IGRpYWdub3N0aWNzOiBbXSB9LFxuICAgICAgfTtcbiAgICAgIGF3YWl0IGxjLmNvZGVBY3Rpb24ocGFyYW1zKTtcblxuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzBdKS5lcXVhbHMoJ3RleHREb2N1bWVudC9jb2RlQWN0aW9uJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciBjb2RlTGVucycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHBhcmFtczogbHMuQ29kZUxlbnNQYXJhbXMgPSB7XG4gICAgICAgIHRleHREb2N1bWVudDogdGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMudGV4dERvY3VtZW50LFxuICAgICAgfTtcbiAgICAgIGF3YWl0IGxjLmNvZGVMZW5zKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCd0ZXh0RG9jdW1lbnQvY29kZUxlbnMnKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuZ2V0Q2FsbCgwKS5hcmdzWzFdKS5lcXVhbHMocGFyYW1zKTtcbiAgICB9KTtcblxuICAgIGl0KCdzZW5kcyBhIHJlcXVlc3QgZm9yIGNvZGVMZW5zUmVzb2x2ZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHBhcmFtczogbHMuQ29kZUxlbnMgPSB7XG4gICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgc3RhcnQ6IHsgbGluZTogMSwgY2hhcmFjdGVyOiAxIH0sXG4gICAgICAgICAgZW5kOiB7IGxpbmU6IDI0LCBjaGFyYWN0ZXI6IDMyIH0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgICAgYXdhaXQgbGMuY29kZUxlbnNSZXNvbHZlKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCdjb2RlTGVucy9yZXNvbHZlJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciBkb2N1bWVudExpbmsnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXM6IGxzLkRvY3VtZW50TGlua1BhcmFtcyA9IHtcbiAgICAgICAgdGV4dERvY3VtZW50OiB0ZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcy50ZXh0RG9jdW1lbnQsXG4gICAgICB9O1xuICAgICAgYXdhaXQgbGMuZG9jdW1lbnRMaW5rKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCd0ZXh0RG9jdW1lbnQvZG9jdW1lbnRMaW5rJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciBkb2N1bWVudExpbmtSZXNvbHZlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcGFyYW1zOiBscy5Eb2N1bWVudExpbmsgPSB7XG4gICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgc3RhcnQ6IHsgbGluZTogMSwgY2hhcmFjdGVyOiAxIH0sXG4gICAgICAgICAgZW5kOiB7IGxpbmU6IDI0LCBjaGFyYWN0ZXI6IDMyIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHRhcmdldDogJ2FiYy5kZWYuZ2hpJyxcbiAgICAgIH07XG4gICAgICBhd2FpdCBsYy5kb2N1bWVudExpbmtSZXNvbHZlKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCdkb2N1bWVudExpbmsvcmVzb2x2ZScpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMV0pLmVxdWFscyhwYXJhbXMpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NlbmRzIGEgcmVxdWVzdCBmb3IgZG9jdW1lbnRGb3JtYXR0aW5nJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcGFyYW1zOiBscy5Eb2N1bWVudEZvcm1hdHRpbmdQYXJhbXMgPSB7XG4gICAgICAgIHRleHREb2N1bWVudDogdGV4dERvY3VtZW50UG9zaXRpb25QYXJhbXMudGV4dERvY3VtZW50LFxuICAgICAgICBvcHRpb25zOiB7IHRhYlNpemU6IDYsIGluc2VydFNwYWNlczogdHJ1ZSwgc29tZVZhbHVlOiAnb3B0aW9uYWwnIH0sXG4gICAgICB9O1xuICAgICAgYXdhaXQgbGMuZG9jdW1lbnRGb3JtYXR0aW5nKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCd0ZXh0RG9jdW1lbnQvZm9ybWF0dGluZycpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMV0pLmVxdWFscyhwYXJhbXMpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NlbmRzIGEgcmVxdWVzdCBmb3IgZG9jdW1lbnRSYW5nZUZvcm1hdHRpbmcnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXM6IGxzLkRvY3VtZW50UmFuZ2VGb3JtYXR0aW5nUGFyYW1zID0ge1xuICAgICAgICB0ZXh0RG9jdW1lbnQ6IHRleHREb2N1bWVudFBvc2l0aW9uUGFyYW1zLnRleHREb2N1bWVudCxcbiAgICAgICAgcmFuZ2U6IHtcbiAgICAgICAgICBzdGFydDogeyBsaW5lOiAxLCBjaGFyYWN0ZXI6IDEgfSxcbiAgICAgICAgICBlbmQ6IHsgbGluZTogMjQsIGNoYXJhY3RlcjogMzIgfSxcbiAgICAgICAgfSxcbiAgICAgICAgb3B0aW9uczogeyB0YWJTaXplOiA2LCBpbnNlcnRTcGFjZXM6IHRydWUsIHNvbWVWYWx1ZTogJ29wdGlvbmFsJyB9LFxuICAgICAgfTtcbiAgICAgIGF3YWl0IGxjLmRvY3VtZW50UmFuZ2VGb3JtYXR0aW5nKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCd0ZXh0RG9jdW1lbnQvcmFuZ2VGb3JtYXR0aW5nJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2VuZHMgYSByZXF1ZXN0IGZvciBkb2N1bWVudE9uVHlwZUZvcm1hdHRpbmcnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXM6IGxzLkRvY3VtZW50T25UeXBlRm9ybWF0dGluZ1BhcmFtcyA9IHtcbiAgICAgICAgdGV4dERvY3VtZW50OiB0ZXh0RG9jdW1lbnRQb3NpdGlvblBhcmFtcy50ZXh0RG9jdW1lbnQsXG4gICAgICAgIHBvc2l0aW9uOiB7IGxpbmU6IDEsIGNoYXJhY3RlcjogMSB9LFxuICAgICAgICBjaDogJ30nLFxuICAgICAgICBvcHRpb25zOiB7IHRhYlNpemU6IDYsIGluc2VydFNwYWNlczogdHJ1ZSwgc29tZVZhbHVlOiAnb3B0aW9uYWwnIH0sXG4gICAgICB9O1xuICAgICAgYXdhaXQgbGMuZG9jdW1lbnRPblR5cGVGb3JtYXR0aW5nKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZFJlcXVlc3QuY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCd0ZXh0RG9jdW1lbnQvb25UeXBlRm9ybWF0dGluZycpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMV0pLmVxdWFscyhwYXJhbXMpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3NlbmRzIGEgcmVxdWVzdCBmb3IgcmVuYW1lJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcGFyYW1zOiBscy5SZW5hbWVQYXJhbXMgPSB7XG4gICAgICAgIHRleHREb2N1bWVudDogeyB1cmk6ICdmaWxlOi8vL2EvYi50eHQnIH0sXG4gICAgICAgIHBvc2l0aW9uOiB7IGxpbmU6IDEsIGNoYXJhY3RlcjogMiB9LFxuICAgICAgICBuZXdOYW1lOiAnYWJzdHJhY3RDb25zdHJ1Y3RvckZhY3RvcnknLFxuICAgICAgfTtcbiAgICAgIGF3YWl0IGxjLnJlbmFtZShwYXJhbXMpO1xuXG4gICAgICBleHBlY3QobGMuX3NlbmRSZXF1ZXN0LmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMF0pLmVxdWFscygndGV4dERvY3VtZW50L3JlbmFtZScpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kUmVxdWVzdC5nZXRDYWxsKDApLmFyZ3NbMV0pLmVxdWFscyhwYXJhbXMpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnc2VuZCBub3RpZmljYXRpb25zJywgKCkgPT4ge1xuICAgIGNvbnN0IHRleHREb2N1bWVudEl0ZW06IGxzLlRleHREb2N1bWVudEl0ZW0gPSB7XG4gICAgICB1cmk6ICdmaWxlOi8vL2Jlc3QvYml0cy5qcycsXG4gICAgICBsYW5ndWFnZUlkOiAnamF2YXNjcmlwdCcsXG4gICAgICB0ZXh0OiAnZnVuY3Rpb24gYSgpIHsgcmV0dXJuIFwiYlwiOyB9OycsXG4gICAgICB2ZXJzaW9uOiAxLFxuICAgIH07XG4gICAgY29uc3QgdmVyc2lvbmVkVGV4dERvY3VtZW50SWRlbnRpZmllcjogbHMuVmVyc2lvbmVkVGV4dERvY3VtZW50SWRlbnRpZmllciA9IHtcbiAgICAgIHVyaTogJ2ZpbGU6Ly8vYmVzdC9iaXRzLmpzJyxcbiAgICAgIHZlcnNpb246IDEsXG4gICAgfTtcblxuICAgIGxldCBsYzogYW55O1xuXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBsYyA9IG5ldyBscy5MYW5ndWFnZUNsaWVudENvbm5lY3Rpb24oY3JlYXRlU3B5Q29ubmVjdGlvbigpLCBuZXcgTnVsbExvZ2dlcigpKTtcbiAgICAgIHNpbm9uLnN0dWIobGMsICdfc2VuZE5vdGlmaWNhdGlvbicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2V4aXQgc2VuZHMgbm90aWZpY2F0aW9uJywgKCkgPT4ge1xuICAgICAgbGMuZXhpdCgpO1xuXG4gICAgICBleHBlY3QobGMuX3NlbmROb3RpZmljYXRpb24uY2FsbGVkKS5lcXVhbHModHJ1ZSk7XG4gICAgICBleHBlY3QobGMuX3NlbmROb3RpZmljYXRpb24uZ2V0Q2FsbCgwKS5hcmdzWzBdKS5lcXVhbHMoJ2V4aXQnKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5nZXRDYWxsKDApLmFyZ3MubGVuZ3RoKS5lcXVhbHMoMSk7XG4gICAgfSk7XG5cbiAgICBpdCgnaW5pdGlhbGl6ZWQgc2VuZHMgbm90aWZpY2F0aW9uJywgKCkgPT4ge1xuICAgICAgbGMuaW5pdGlhbGl6ZWQoKTtcblxuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCdpbml0aWFsaXplZCcpO1xuICAgICAgY29uc3QgZXhwZWN0ZWQ6IGxzLkluaXRpYWxpemVkUGFyYW1zID0ge307XG4gICAgICBleHBlY3QobGMuX3NlbmROb3RpZmljYXRpb24uZ2V0Q2FsbCgwKS5hcmdzWzFdKS50by5kZWVwLmVxdWFsKGV4cGVjdGVkKTtcbiAgICB9KTtcblxuICAgIGl0KCdkaWRDaGFuZ2VDb25maWd1cmF0aW9uIHNlbmRzIG5vdGlmaWNhdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IHBhcmFtczogbHMuRGlkQ2hhbmdlQ29uZmlndXJhdGlvblBhcmFtcyA9IHtcbiAgICAgICAgc2V0dGluZ3M6IHsgYTogeyBiOiAnYycgfSB9LFxuICAgICAgfTtcbiAgICAgIGxjLmRpZENoYW5nZUNvbmZpZ3VyYXRpb24ocGFyYW1zKTtcblxuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCd3b3Jrc3BhY2UvZGlkQ2hhbmdlQ29uZmlndXJhdGlvbicpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnZGlkT3BlblRleHREb2N1bWVudCBzZW5kcyBub3RpZmljYXRpb24nLCAoKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXM6IGxzLkRpZE9wZW5UZXh0RG9jdW1lbnRQYXJhbXMgPSB7XG4gICAgICAgIHRleHREb2N1bWVudDogdGV4dERvY3VtZW50SXRlbSxcbiAgICAgIH07XG4gICAgICBsYy5kaWRPcGVuVGV4dERvY3VtZW50KHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5nZXRDYWxsKDApLmFyZ3NbMF0pLmVxdWFscygndGV4dERvY3VtZW50L2RpZE9wZW4nKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5nZXRDYWxsKDApLmFyZ3NbMV0pLmVxdWFscyhwYXJhbXMpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2RpZENoYW5nZVRleHREb2N1bWVudCBzZW5kcyBub3RpZmljYXRpb24nLCAoKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXM6IGxzLkRpZENoYW5nZVRleHREb2N1bWVudFBhcmFtcyA9IHtcbiAgICAgICAgdGV4dERvY3VtZW50OiB2ZXJzaW9uZWRUZXh0RG9jdW1lbnRJZGVudGlmaWVyLFxuICAgICAgICBjb250ZW50Q2hhbmdlczogW10sXG4gICAgICB9O1xuICAgICAgbGMuZGlkQ2hhbmdlVGV4dERvY3VtZW50KHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5nZXRDYWxsKDApLmFyZ3NbMF0pLmVxdWFscygndGV4dERvY3VtZW50L2RpZENoYW5nZScpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnZGlkQ2xvc2VUZXh0RG9jdW1lbnQgc2VuZHMgbm90aWZpY2F0aW9uJywgKCkgPT4ge1xuICAgICAgY29uc3QgcGFyYW1zOiBscy5EaWRDbG9zZVRleHREb2N1bWVudFBhcmFtcyA9IHtcbiAgICAgICAgdGV4dERvY3VtZW50OiB0ZXh0RG9jdW1lbnRJdGVtLFxuICAgICAgfTtcbiAgICAgIGxjLmRpZENsb3NlVGV4dERvY3VtZW50KHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5nZXRDYWxsKDApLmFyZ3NbMF0pLmVxdWFscygndGV4dERvY3VtZW50L2RpZENsb3NlJyk7XG4gICAgICBleHBlY3QobGMuX3NlbmROb3RpZmljYXRpb24uZ2V0Q2FsbCgwKS5hcmdzWzFdKS5lcXVhbHMocGFyYW1zKTtcbiAgICB9KTtcblxuICAgIGl0KCdkaWRTYXZlVGV4dERvY3VtZW50IHNlbmRzIG5vdGlmaWNhdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IHBhcmFtczogbHMuRGlkU2F2ZVRleHREb2N1bWVudFBhcmFtcyA9IHtcbiAgICAgICAgdGV4dERvY3VtZW50OiB0ZXh0RG9jdW1lbnRJdGVtLFxuICAgICAgfTtcbiAgICAgIGxjLmRpZFNhdmVUZXh0RG9jdW1lbnQocGFyYW1zKTtcblxuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmNhbGxlZCkuZXF1YWxzKHRydWUpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmdldENhbGwoMCkuYXJnc1swXSkuZXF1YWxzKCd0ZXh0RG9jdW1lbnQvZGlkU2F2ZScpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG5cbiAgICBpdCgnZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzIHNlbmRzIG5vdGlmaWNhdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IHBhcmFtczogbHMuRGlkQ2hhbmdlV2F0Y2hlZEZpbGVzUGFyYW1zID0geyBjaGFuZ2VzOiBbXSB9O1xuICAgICAgbGMuZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzKHBhcmFtcyk7XG5cbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5jYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICAgIGV4cGVjdChsYy5fc2VuZE5vdGlmaWNhdGlvbi5nZXRDYWxsKDApLmFyZ3NbMF0pLmVxdWFscygnd29ya3NwYWNlL2RpZENoYW5nZVdhdGNoZWRGaWxlcycpO1xuICAgICAgZXhwZWN0KGxjLl9zZW5kTm90aWZpY2F0aW9uLmdldENhbGwoMCkuYXJnc1sxXSkuZXF1YWxzKHBhcmFtcyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdub3RpZmljYXRpb24gbWV0aG9kcycsICgpID0+IHtcbiAgICBsZXQgbGM6IGFueTtcbiAgICBjb25zdCBldmVudE1hcDogeyBba2V5OiBzdHJpbmddOiBhbnkgfSA9IHt9O1xuXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBsYyA9IG5ldyBscy5MYW5ndWFnZUNsaWVudENvbm5lY3Rpb24oY3JlYXRlU3B5Q29ubmVjdGlvbigpLCBuZXcgTnVsbExvZ2dlcigpKTtcbiAgICAgIHNpbm9uLnN0dWIobGMsICdfb25Ob3RpZmljYXRpb24nKS5jYWxsc0Zha2UoKG1lc3NhZ2UsIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIGV2ZW50TWFwW21lc3NhZ2UubWV0aG9kXSA9IGNhbGxiYWNrO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnb25TaG93TWVzc2FnZSBjYWxscyBiYWNrIG9uIHdpbmRvdy9zaG93TWVzc2FnZScsICgpID0+IHtcbiAgICAgIGxldCBjYWxsZWQgPSBmYWxzZTtcbiAgICAgIGxjLm9uU2hvd01lc3NhZ2UoKCkgPT4ge1xuICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgfSk7XG4gICAgICBldmVudE1hcFsnd2luZG93L3Nob3dNZXNzYWdlJ10oKTtcbiAgICAgIGV4cGVjdChjYWxsZWQpLmVxdWFscyh0cnVlKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==