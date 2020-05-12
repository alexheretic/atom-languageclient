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
const atom_1 = require("atom");
const chai_1 = require("chai");
const sinon = require("sinon");
const ls = require("../../lib/languageclient");
const code_action_adapter_1 = require("../../lib/adapters/code-action-adapter");
const linter_push_v2_adapter_1 = require("../../lib/adapters/linter-push-v2-adapter");
const helpers_js_1 = require("../helpers.js");
describe('CodeActionAdapter', () => {
    describe('canAdapt', () => {
        it('returns true if range formatting is supported', () => {
            const result = code_action_adapter_1.default.canAdapt({
                codeActionProvider: true,
            });
            chai_1.expect(result).to.be.true;
        });
        it('returns false it no formatting supported', () => {
            const result = code_action_adapter_1.default.canAdapt({});
            chai_1.expect(result).to.be.false;
        });
    });
    describe('getCodeActions', () => {
        it('fetches code actions from the connection', () => __awaiter(void 0, void 0, void 0, function* () {
            const connection = helpers_js_1.createSpyConnection();
            const languageClient = new ls.LanguageClientConnection(connection);
            const testCommand = {
                command: 'testCommand',
                title: 'Test Command',
                arguments: ['a', 'b'],
            };
            sinon.stub(languageClient, 'codeAction').returns(Promise.resolve([testCommand]));
            sinon.spy(languageClient, 'executeCommand');
            const linterAdapter = new linter_push_v2_adapter_1.default(languageClient);
            sinon.stub(linterAdapter, 'getDiagnosticCode').returns('test code');
            const testPath = '/test.txt';
            const actions = yield code_action_adapter_1.default.getCodeActions(languageClient, { codeActionProvider: true }, linterAdapter, helpers_js_1.createFakeEditor(testPath), new atom_1.Range([1, 2], [3, 4]), [
                {
                    filePath: testPath,
                    type: 'Error',
                    text: 'test message',
                    range: new atom_1.Range([1, 2], [3, 3]),
                    providerName: 'test linter',
                },
            ]);
            chai_1.expect(languageClient.codeAction.called).to.be.true;
            const args = languageClient.codeAction.getCalls()[0].args;
            const params = args[0];
            chai_1.expect(params.textDocument.uri).to.equal('file://' + testPath);
            chai_1.expect(params.range).to.deep.equal({
                start: { line: 1, character: 2 },
                end: { line: 3, character: 4 },
            });
            chai_1.expect(params.context.diagnostics).to.deep.equal([
                {
                    range: {
                        start: { line: 1, character: 2 },
                        end: { line: 3, character: 3 },
                    },
                    severity: ls.DiagnosticSeverity.Error,
                    code: 'test code',
                    source: 'test linter',
                    message: 'test message',
                },
            ]);
            chai_1.expect(actions.length).to.equal(1);
            const codeAction = actions[0];
            chai_1.expect(yield codeAction.getTitle()).to.equal('Test Command');
            yield codeAction.apply();
            chai_1.expect(languageClient.executeCommand.called).to.be.true;
            chai_1.expect(languageClient.executeCommand.getCalls()[0].args).to.deep.equal([
                {
                    command: 'testCommand',
                    arguments: ['a', 'b'],
                },
            ]);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1hY3Rpb24tYWRhcHRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVzdC9hZGFwdGVycy9jb2RlLWFjdGlvbi1hZGFwdGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSwrQkFBNkI7QUFDN0IsK0JBQThCO0FBQzlCLCtCQUErQjtBQUMvQiwrQ0FBK0M7QUFDL0MsZ0ZBQXVFO0FBQ3ZFLHNGQUE0RTtBQUM1RSw4Q0FBc0U7QUFFdEUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUN4QixFQUFFLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sTUFBTSxHQUFHLDZCQUFpQixDQUFDLFFBQVEsQ0FBQztnQkFDeEMsa0JBQWtCLEVBQUUsSUFBSTthQUN6QixDQUFDLENBQUM7WUFDSCxhQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1lBQ2xELE1BQU0sTUFBTSxHQUFHLDZCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM5QyxhQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEdBQVMsRUFBRTtZQUN4RCxNQUFNLFVBQVUsR0FBRyxnQ0FBbUIsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sY0FBYyxHQUFHLElBQUksRUFBRSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxD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Q0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsYUFBTSxDQUFDLE1BQU0sVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM3RCxNQUFNLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN6QixhQUFNLENBQUUsY0FBc0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7WUFDakUsYUFBTSxDQUFFLGNBQXNCLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUM5RTtvQkFDRSxPQUFPLEVBQUUsYUFBYTtvQkFDdEIsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztpQkFDdEI7YUFDRixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJhbmdlIH0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgeyBleHBlY3QgfSBmcm9tICdjaGFpJztcbmltcG9ydCAqIGFzIHNpbm9uIGZyb20gJ3Npbm9uJztcbmltcG9ydCAqIGFzIGxzIGZyb20gJy4uLy4uL2xpYi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQgQ29kZUFjdGlvbkFkYXB0ZXIgZnJvbSAnLi4vLi4vbGliL2FkYXB0ZXJzL2NvZGUtYWN0aW9uLWFkYXB0ZXInO1xuaW1wb3J0IExpbnRlclB1c2hWMkFkYXB0ZXIgZnJvbSAnLi4vLi4vbGliL2FkYXB0ZXJzL2xpbnRlci1wdXNoLXYyLWFkYXB0ZXInO1xuaW1wb3J0IHsgY3JlYXRlU3B5Q29ubmVjdGlvbiwgY3JlYXRlRmFrZUVkaXRvciB9IGZyb20gJy4uL2hlbHBlcnMuanMnO1xuXG5kZXNjcmliZSgnQ29kZUFjdGlvbkFkYXB0ZXInLCAoKSA9PiB7XG4gIGRlc2NyaWJlKCdjYW5BZGFwdCcsICgpID0+IHtcbiAgICBpdCgncmV0dXJucyB0cnVlIGlmIHJhbmdlIGZvcm1hdHRpbmcgaXMgc3VwcG9ydGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gQ29kZUFjdGlvbkFkYXB0ZXIuY2FuQWRhcHQoe1xuICAgICAgICBjb2RlQWN0aW9uUHJvdmlkZXI6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvLmJlLnRydWU7XG4gICAgfSk7XG5cbiAgICBpdCgncmV0dXJucyBmYWxzZSBpdCBubyBmb3JtYXR0aW5nIHN1cHBvcnRlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IENvZGVBY3Rpb25BZGFwdGVyLmNhbkFkYXB0KHt9KTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvLmJlLmZhbHNlO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0Q29kZUFjdGlvbnMnLCAoKSA9PiB7XG4gICAgaXQoJ2ZldGNoZXMgY29kZSBhY3Rpb25zIGZyb20gdGhlIGNvbm5lY3Rpb24nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb25uZWN0aW9uID0gY3JlYXRlU3B5Q29ubmVjdGlvbigpO1xuICAgICAgY29uc3QgbGFuZ3VhZ2VDbGllbnQgPSBuZXcgbHMuTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uKGNvbm5lY3Rpb24pO1xuICAgICAgY29uc3QgdGVzdENvbW1hbmQ6IGxzLkNvbW1hbmQgPSB7XG4gICAgICAgIGNvbW1hbmQ6ICd0ZXN0Q29tbWFuZCcsXG4gICAgICAgIHRpdGxlOiAnVGVzdCBDb21tYW5kJyxcbiAgICAgICAgYXJndW1lbnRzOiBbJ2EnLCAnYiddLFxuICAgICAgfTtcbiAgICAgIHNpbm9uLnN0dWIobGFuZ3VhZ2VDbGllbnQsICdjb2RlQWN0aW9uJykucmV0dXJucyhQcm9taXNlLnJlc29sdmUoW3Rlc3RDb21tYW5kXSkpO1xuICAgICAgc2lub24uc3B5KGxhbmd1YWdlQ2xpZW50LCAnZXhlY3V0ZUNvbW1hbmQnKTtcblxuICAgICAgY29uc3QgbGludGVyQWRhcHRlciA9IG5ldyBMaW50ZXJQdXNoVjJBZGFwdGVyKGxhbmd1YWdlQ2xpZW50KTtcbiAgICAgIHNpbm9uLnN0dWIobGludGVyQWRhcHRlciwgJ2dldERpYWdub3N0aWNDb2RlJykucmV0dXJucygndGVzdCBjb2RlJyk7XG5cbiAgICAgIGNvbnN0IHRlc3RQYXRoID0gJy90ZXN0LnR4dCc7XG4gICAgICBjb25zdCBhY3Rpb25zID0gYXdhaXQgQ29kZUFjdGlvbkFkYXB0ZXIuZ2V0Q29kZUFjdGlvbnMoXG4gICAgICAgIGxhbmd1YWdlQ2xpZW50LFxuICAgICAgICB7IGNvZGVBY3Rpb25Qcm92aWRlcjogdHJ1ZSB9LFxuICAgICAgICBsaW50ZXJBZGFwdGVyLFxuICAgICAgICBjcmVhdGVGYWtlRWRpdG9yKHRlc3RQYXRoKSxcbiAgICAgICAgbmV3IFJhbmdlKFsxLCAyXSwgWzMsIDRdKSxcbiAgICAgICAgW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpbGVQYXRoOiB0ZXN0UGF0aCxcbiAgICAgICAgICAgIHR5cGU6ICdFcnJvcicsXG4gICAgICAgICAgICB0ZXh0OiAndGVzdCBtZXNzYWdlJyxcbiAgICAgICAgICAgIHJhbmdlOiBuZXcgUmFuZ2UoWzEsIDJdLCBbMywgM10pLFxuICAgICAgICAgICAgcHJvdmlkZXJOYW1lOiAndGVzdCBsaW50ZXInLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICApO1xuXG4gICAgICBleHBlY3QoKGxhbmd1YWdlQ2xpZW50IGFzIGFueSkuY29kZUFjdGlvbi5jYWxsZWQpLnRvLmJlLnRydWU7XG4gICAgICBjb25zdCBhcmdzID0gKGxhbmd1YWdlQ2xpZW50IGFzIGFueSkuY29kZUFjdGlvbi5nZXRDYWxscygpWzBdLmFyZ3M7XG4gICAgICBjb25zdCBwYXJhbXM6IGxzLkNvZGVBY3Rpb25QYXJhbXMgPSBhcmdzWzBdO1xuICAgICAgZXhwZWN0KHBhcmFtcy50ZXh0RG9jdW1lbnQudXJpKS50by5lcXVhbCgnZmlsZTovLycgKyB0ZXN0UGF0aCk7XG4gICAgICBleHBlY3QocGFyYW1zLnJhbmdlKS50by5kZWVwLmVxdWFsKHtcbiAgICAgICAgc3RhcnQ6IHsgbGluZTogMSwgY2hhcmFjdGVyOiAyIH0sXG4gICAgICAgIGVuZDogeyBsaW5lOiAzLCBjaGFyYWN0ZXI6IDQgfSxcbiAgICAgIH0pO1xuICAgICAgZXhwZWN0KHBhcmFtcy5jb250ZXh0LmRpYWdub3N0aWNzKS50by5kZWVwLmVxdWFsKFtcbiAgICAgICAge1xuICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICBzdGFydDogeyBsaW5lOiAxLCBjaGFyYWN0ZXI6IDIgfSxcbiAgICAgICAgICAgIGVuZDogeyBsaW5lOiAzLCBjaGFyYWN0ZXI6IDMgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNldmVyaXR5OiBscy5EaWFnbm9zdGljU2V2ZXJpdHkuRXJyb3IsXG4gICAgICAgICAgY29kZTogJ3Rlc3QgY29kZScsXG4gICAgICAgICAgc291cmNlOiAndGVzdCBsaW50ZXInLFxuICAgICAgICAgIG1lc3NhZ2U6ICd0ZXN0IG1lc3NhZ2UnLFxuICAgICAgICB9LFxuICAgICAgXSk7XG5cbiAgICAgIGV4cGVjdChhY3Rpb25zLmxlbmd0aCkudG8uZXF1YWwoMSk7XG4gICAgICBjb25zdCBjb2RlQWN0aW9uID0gYWN0aW9uc1swXTtcbiAgICAgIGV4cGVjdChhd2FpdCBjb2RlQWN0aW9uLmdldFRpdGxlKCkpLnRvLmVxdWFsKCdUZXN0IENvbW1hbmQnKTtcbiAgICAgIGF3YWl0IGNvZGVBY3Rpb24uYXBwbHkoKTtcbiAgICAgIGV4cGVjdCgobGFuZ3VhZ2VDbGllbnQgYXMgYW55KS5leGVjdXRlQ29tbWFuZC5jYWxsZWQpLnRvLmJlLnRydWU7XG4gICAgICBleHBlY3QoKGxhbmd1YWdlQ2xpZW50IGFzIGFueSkuZXhlY3V0ZUNvbW1hbmQuZ2V0Q2FsbHMoKVswXS5hcmdzKS50by5kZWVwLmVxdWFsKFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbW1hbmQ6ICd0ZXN0Q29tbWFuZCcsXG4gICAgICAgICAgYXJndW1lbnRzOiBbJ2EnLCAnYiddLFxuICAgICAgICB9LFxuICAgICAgXSk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG4iXX0=