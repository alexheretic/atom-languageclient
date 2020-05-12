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
            ], (_actions) => _actions, (_action) => __awaiter(void 0, void 0, void 0, function* () { return true; }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1hY3Rpb24tYWRhcHRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVzdC9hZGFwdGVycy9jb2RlLWFjdGlvbi1hZGFwdGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSwrQkFBNkI7QUFDN0IsK0JBQThCO0FBQzlCLCtCQUErQjtBQUMvQiwrQ0FBK0M7QUFDL0MsZ0ZBQXVFO0FBQ3ZFLHNGQUE0RTtBQUM1RSw4Q0FBc0U7QUFFdEUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUN4QixFQUFFLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sTUFBTSxHQUFHLDZCQUFpQixDQUFDLFFBQVEsQ0FBQztnQkFDeEMsa0JBQWtCLEVBQUUsSUFBSTthQUN6QixDQUFDLENBQUM7WUFDSCxhQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1lBQ2xELE1BQU0sTUFBTSxHQUFHLDZCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM5QyxhQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEdBQVMsRUFBRTtZQUN4RCxNQUFNLFVBQVUsR0FBRyxnQ0FBbUIsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sY0FBYyxHQUFHLElBQUksRUFBRSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxD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LEVBQUUsY0FBYztpQkFDeEI7YUFDRixDQUFDLENBQUM7WUFFSCxhQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLGFBQU0sQ0FBQyxNQUFNLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0QsTUFBTSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDekIsYUFBTSxDQUFFLGNBQXNCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDO1lBQ2pFLGFBQU0sQ0FBRSxjQUFzQixDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDOUU7b0JBQ0UsT0FBTyxFQUFFLGFBQWE7b0JBQ3RCLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7aUJBQ3RCO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSYW5nZSB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IHsgZXhwZWN0IH0gZnJvbSAnY2hhaSc7XG5pbXBvcnQgKiBhcyBzaW5vbiBmcm9tICdzaW5vbic7XG5pbXBvcnQgKiBhcyBscyBmcm9tICcuLi8uLi9saWIvbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IENvZGVBY3Rpb25BZGFwdGVyIGZyb20gJy4uLy4uL2xpYi9hZGFwdGVycy9jb2RlLWFjdGlvbi1hZGFwdGVyJztcbmltcG9ydCBMaW50ZXJQdXNoVjJBZGFwdGVyIGZyb20gJy4uLy4uL2xpYi9hZGFwdGVycy9saW50ZXItcHVzaC12Mi1hZGFwdGVyJztcbmltcG9ydCB7IGNyZWF0ZVNweUNvbm5lY3Rpb24sIGNyZWF0ZUZha2VFZGl0b3IgfSBmcm9tICcuLi9oZWxwZXJzLmpzJztcblxuZGVzY3JpYmUoJ0NvZGVBY3Rpb25BZGFwdGVyJywgKCkgPT4ge1xuICBkZXNjcmliZSgnY2FuQWRhcHQnLCAoKSA9PiB7XG4gICAgaXQoJ3JldHVybnMgdHJ1ZSBpZiByYW5nZSBmb3JtYXR0aW5nIGlzIHN1cHBvcnRlZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IENvZGVBY3Rpb25BZGFwdGVyLmNhbkFkYXB0KHtcbiAgICAgICAgY29kZUFjdGlvblByb3ZpZGVyOiB0cnVlLFxuICAgICAgfSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50by5iZS50cnVlO1xuICAgIH0pO1xuXG4gICAgaXQoJ3JldHVybnMgZmFsc2UgaXQgbm8gZm9ybWF0dGluZyBzdXBwb3J0ZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBDb2RlQWN0aW9uQWRhcHRlci5jYW5BZGFwdCh7fSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50by5iZS5mYWxzZTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldENvZGVBY3Rpb25zJywgKCkgPT4ge1xuICAgIGl0KCdmZXRjaGVzIGNvZGUgYWN0aW9ucyBmcm9tIHRoZSBjb25uZWN0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29ubmVjdGlvbiA9IGNyZWF0ZVNweUNvbm5lY3Rpb24oKTtcbiAgICAgIGNvbnN0IGxhbmd1YWdlQ2xpZW50ID0gbmV3IGxzLkxhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbihjb25uZWN0aW9uKTtcbiAgICAgIGNvbnN0IHRlc3RDb21tYW5kOiBscy5Db21tYW5kID0ge1xuICAgICAgICBjb21tYW5kOiAndGVzdENvbW1hbmQnLFxuICAgICAgICB0aXRsZTogJ1Rlc3QgQ29tbWFuZCcsXG4gICAgICAgIGFyZ3VtZW50czogWydhJywgJ2InXSxcbiAgICAgIH07XG4gICAgICBzaW5vbi5zdHViKGxhbmd1YWdlQ2xpZW50LCAnY29kZUFjdGlvbicpLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKFt0ZXN0Q29tbWFuZF0pKTtcbiAgICAgIHNpbm9uLnNweShsYW5ndWFnZUNsaWVudCwgJ2V4ZWN1dGVDb21tYW5kJyk7XG5cbiAgICAgIGNvbnN0IGxpbnRlckFkYXB0ZXIgPSBuZXcgTGludGVyUHVzaFYyQWRhcHRlcihsYW5ndWFnZUNsaWVudCk7XG4gICAgICBzaW5vbi5zdHViKGxpbnRlckFkYXB0ZXIsICdnZXREaWFnbm9zdGljQ29kZScpLnJldHVybnMoJ3Rlc3QgY29kZScpO1xuXG4gICAgICBjb25zdCB0ZXN0UGF0aCA9ICcvdGVzdC50eHQnO1xuICAgICAgY29uc3QgYWN0aW9ucyA9IGF3YWl0IENvZGVBY3Rpb25BZGFwdGVyLmdldENvZGVBY3Rpb25zKFxuICAgICAgICBsYW5ndWFnZUNsaWVudCxcbiAgICAgICAgeyBjb2RlQWN0aW9uUHJvdmlkZXI6IHRydWUgfSxcbiAgICAgICAgbGludGVyQWRhcHRlcixcbiAgICAgICAgY3JlYXRlRmFrZUVkaXRvcih0ZXN0UGF0aCksXG4gICAgICAgIG5ldyBSYW5nZShbMSwgMl0sIFszLCA0XSksXG4gICAgICAgIFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmaWxlUGF0aDogdGVzdFBhdGgsXG4gICAgICAgICAgICB0eXBlOiAnRXJyb3InLFxuICAgICAgICAgICAgdGV4dDogJ3Rlc3QgbWVzc2FnZScsXG4gICAgICAgICAgICByYW5nZTogbmV3IFJhbmdlKFsxLCAyXSwgWzMsIDNdKSxcbiAgICAgICAgICAgIHByb3ZpZGVyTmFtZTogJ3Rlc3QgbGludGVyJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICAoX2FjdGlvbnMpID0+IF9hY3Rpb25zLFxuICAgICAgICBhc3luYyAoX2FjdGlvbikgPT4gdHJ1ZSxcbiAgICAgICk7XG5cbiAgICAgIGV4cGVjdCgobGFuZ3VhZ2VDbGllbnQgYXMgYW55KS5jb2RlQWN0aW9uLmNhbGxlZCkudG8uYmUudHJ1ZTtcbiAgICAgIGNvbnN0IGFyZ3MgPSAobGFuZ3VhZ2VDbGllbnQgYXMgYW55KS5jb2RlQWN0aW9uLmdldENhbGxzKClbMF0uYXJncztcbiAgICAgIGNvbnN0IHBhcmFtczogbHMuQ29kZUFjdGlvblBhcmFtcyA9IGFyZ3NbMF07XG4gICAgICBleHBlY3QocGFyYW1zLnRleHREb2N1bWVudC51cmkpLnRvLmVxdWFsKCdmaWxlOi8vJyArIHRlc3RQYXRoKTtcbiAgICAgIGV4cGVjdChwYXJhbXMucmFuZ2UpLnRvLmRlZXAuZXF1YWwoe1xuICAgICAgICBzdGFydDogeyBsaW5lOiAxLCBjaGFyYWN0ZXI6IDIgfSxcbiAgICAgICAgZW5kOiB7IGxpbmU6IDMsIGNoYXJhY3RlcjogNCB9LFxuICAgICAgfSk7XG4gICAgICBleHBlY3QocGFyYW1zLmNvbnRleHQuZGlhZ25vc3RpY3MpLnRvLmRlZXAuZXF1YWwoW1xuICAgICAgICB7XG4gICAgICAgICAgcmFuZ2U6IHtcbiAgICAgICAgICAgIHN0YXJ0OiB7IGxpbmU6IDEsIGNoYXJhY3RlcjogMiB9LFxuICAgICAgICAgICAgZW5kOiB7IGxpbmU6IDMsIGNoYXJhY3RlcjogMyB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2V2ZXJpdHk6IGxzLkRpYWdub3N0aWNTZXZlcml0eS5FcnJvcixcbiAgICAgICAgICBjb2RlOiAndGVzdCBjb2RlJyxcbiAgICAgICAgICBzb3VyY2U6ICd0ZXN0IGxpbnRlcicsXG4gICAgICAgICAgbWVzc2FnZTogJ3Rlc3QgbWVzc2FnZScsXG4gICAgICAgIH0sXG4gICAgICBdKTtcblxuICAgICAgZXhwZWN0KGFjdGlvbnMubGVuZ3RoKS50by5lcXVhbCgxKTtcbiAgICAgIGNvbnN0IGNvZGVBY3Rpb24gPSBhY3Rpb25zWzBdO1xuICAgICAgZXhwZWN0KGF3YWl0IGNvZGVBY3Rpb24uZ2V0VGl0bGUoKSkudG8uZXF1YWwoJ1Rlc3QgQ29tbWFuZCcpO1xuICAgICAgYXdhaXQgY29kZUFjdGlvbi5hcHBseSgpO1xuICAgICAgZXhwZWN0KChsYW5ndWFnZUNsaWVudCBhcyBhbnkpLmV4ZWN1dGVDb21tYW5kLmNhbGxlZCkudG8uYmUudHJ1ZTtcbiAgICAgIGV4cGVjdCgobGFuZ3VhZ2VDbGllbnQgYXMgYW55KS5leGVjdXRlQ29tbWFuZC5nZXRDYWxscygpWzBdLmFyZ3MpLnRvLmRlZXAuZXF1YWwoW1xuICAgICAgICB7XG4gICAgICAgICAgY29tbWFuZDogJ3Rlc3RDb21tYW5kJyxcbiAgICAgICAgICBhcmd1bWVudHM6IFsnYScsICdiJ10sXG4gICAgICAgIH0sXG4gICAgICBdKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==