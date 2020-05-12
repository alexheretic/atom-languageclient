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
const invariant = require("assert");
const atom_1 = require("atom");
const chai_1 = require("chai");
const sinon = require("sinon");
const ls = require("../../lib/languageclient");
const datatip_adapter_1 = require("../../lib/adapters/datatip-adapter");
const helpers_js_1 = require("../helpers.js");
describe('DatatipAdapter', () => {
    let fakeEditor;
    let connection;
    beforeEach(() => {
        connection = new ls.LanguageClientConnection(helpers_js_1.createSpyConnection());
        fakeEditor = helpers_js_1.createFakeEditor();
    });
    describe('canAdapt', () => {
        it('returns true if hoverProvider is supported', () => {
            const result = datatip_adapter_1.default.canAdapt({ hoverProvider: true });
            chai_1.expect(result).to.be.true;
        });
        it('returns false if hoverProvider not supported', () => {
            const result = datatip_adapter_1.default.canAdapt({});
            chai_1.expect(result).to.be.false;
        });
    });
    describe('getDatatip', () => {
        it('calls LSP document/hover at the given position', () => __awaiter(void 0, void 0, void 0, function* () {
            sinon.stub(connection, 'hover').resolves({
                range: {
                    start: { line: 0, character: 1 },
                    end: { line: 0, character: 2 },
                },
                contents: ['test', { language: 'testlang', value: 'test snippet' }],
            });
            const grammarSpy = sinon.spy(atom.grammars, 'grammarForScopeName');
            const datatipAdapter = new datatip_adapter_1.default();
            const datatip = yield datatipAdapter.getDatatip(connection, fakeEditor, new atom_1.Point(0, 0));
            chai_1.expect(datatip).to.be.ok;
            invariant(datatip != null);
            if (datatip) {
                chai_1.expect(datatip.range.start.row).equal(0);
                chai_1.expect(datatip.range.start.column).equal(1);
                chai_1.expect(datatip.range.end.row).equal(0);
                chai_1.expect(datatip.range.end.column).equal(2);
                chai_1.expect(datatip.markedStrings).to.have.lengthOf(2);
                chai_1.expect(datatip.markedStrings[0]).eql({ type: 'markdown', value: 'test' });
                const snippet = datatip.markedStrings[1];
                chai_1.expect(snippet.type).equal('snippet');
                invariant(snippet.type === 'snippet');
                chai_1.expect(snippet.grammar.scopeName).equal('text.plain.null-grammar');
                chai_1.expect(snippet.value).equal('test snippet');
                chai_1.expect(grammarSpy.calledWith('source.testlang')).to.be.true;
            }
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YXRpcC1hZGFwdGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0L2FkYXB0ZXJzL2RhdGF0aXAtYWRhcHRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsb0NBQXFDO0FBQ3JDLCtCQUE2QjtBQUM3QiwrQkFBOEI7QUFDOUIsK0JBQStCO0FBQy9CLCtDQUErQztBQUMvQyx3RUFBZ0U7QUFDaEUsOENBQXNFO0FBRXRFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsSUFBSSxVQUFlLENBQUM7SUFDcEIsSUFBSSxVQUFlLENBQUM7SUFFcEIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLFVBQVUsR0FBRyxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxnQ0FBbUIsRUFBRSxDQUFDLENBQUM7UUFDcEUsVUFBVSxHQUFHLDZCQUFnQixFQUFFLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUN4QixFQUFFLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1lBQ3BELE1BQU0sTUFBTSxHQUFHLHlCQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDaEUsYUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtZQUN0RCxNQUFNLE1BQU0sR0FBRyx5QkFBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQyxhQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJ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aWFudCA9IHJlcXVpcmUoJ2Fzc2VydCcpO1xuaW1wb3J0IHsgUG9pbnQgfSBmcm9tICdhdG9tJztcbmltcG9ydCB7IGV4cGVjdCB9IGZyb20gJ2NoYWknO1xuaW1wb3J0ICogYXMgc2lub24gZnJvbSAnc2lub24nO1xuaW1wb3J0ICogYXMgbHMgZnJvbSAnLi4vLi4vbGliL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCBEYXRhdGlwQWRhcHRlciBmcm9tICcuLi8uLi9saWIvYWRhcHRlcnMvZGF0YXRpcC1hZGFwdGVyJztcbmltcG9ydCB7IGNyZWF0ZVNweUNvbm5lY3Rpb24sIGNyZWF0ZUZha2VFZGl0b3IgfSBmcm9tICcuLi9oZWxwZXJzLmpzJztcblxuZGVzY3JpYmUoJ0RhdGF0aXBBZGFwdGVyJywgKCkgPT4ge1xuICBsZXQgZmFrZUVkaXRvcjogYW55O1xuICBsZXQgY29ubmVjdGlvbjogYW55O1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGNvbm5lY3Rpb24gPSBuZXcgbHMuTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uKGNyZWF0ZVNweUNvbm5lY3Rpb24oKSk7XG4gICAgZmFrZUVkaXRvciA9IGNyZWF0ZUZha2VFZGl0b3IoKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NhbkFkYXB0JywgKCkgPT4ge1xuICAgIGl0KCdyZXR1cm5zIHRydWUgaWYgaG92ZXJQcm92aWRlciBpcyBzdXBwb3J0ZWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBEYXRhdGlwQWRhcHRlci5jYW5BZGFwdCh7IGhvdmVyUHJvdmlkZXI6IHRydWUgfSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50by5iZS50cnVlO1xuICAgIH0pO1xuXG4gICAgaXQoJ3JldHVybnMgZmFsc2UgaWYgaG92ZXJQcm92aWRlciBub3Qgc3VwcG9ydGVkJywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gRGF0YXRpcEFkYXB0ZXIuY2FuQWRhcHQoe30pO1xuICAgICAgZXhwZWN0KHJlc3VsdCkudG8uYmUuZmFsc2U7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXREYXRhdGlwJywgKCkgPT4ge1xuICAgIGl0KCdjYWxscyBMU1AgZG9jdW1lbnQvaG92ZXIgYXQgdGhlIGdpdmVuIHBvc2l0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgc2lub24uc3R1Yihjb25uZWN0aW9uLCAnaG92ZXInKS5yZXNvbHZlcyh7XG4gICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgc3RhcnQ6IHsgbGluZTogMCwgY2hhcmFjdGVyOiAxIH0sXG4gICAgICAgICAgZW5kOiB7IGxpbmU6IDAsIGNoYXJhY3RlcjogMiB9LFxuICAgICAgICB9LFxuICAgICAgICBjb250ZW50czogWyd0ZXN0JywgeyBsYW5ndWFnZTogJ3Rlc3RsYW5nJywgdmFsdWU6ICd0ZXN0IHNuaXBwZXQnIH1dLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGdyYW1tYXJTcHkgPSBzaW5vbi5zcHkoYXRvbS5ncmFtbWFycywgJ2dyYW1tYXJGb3JTY29wZU5hbWUnKTtcblxuICAgICAgY29uc3QgZGF0YXRpcEFkYXB0ZXIgPSBuZXcgRGF0YXRpcEFkYXB0ZXIoKTtcbiAgICAgIGNvbnN0IGRhdGF0aXAgPSBhd2FpdCBkYXRhdGlwQWRhcHRlci5nZXREYXRhdGlwKGNvbm5lY3Rpb24sIGZha2VFZGl0b3IsIG5ldyBQb2ludCgwLCAwKSk7XG4gICAgICBleHBlY3QoZGF0YXRpcCkudG8uYmUub2s7XG4gICAgICBpbnZhcmlhbnQoZGF0YXRpcCAhPSBudWxsKTtcblxuICAgICAgaWYgKGRhdGF0aXApIHtcbiAgICAgICAgZXhwZWN0KGRhdGF0aXAucmFuZ2Uuc3RhcnQucm93KS5lcXVhbCgwKTtcbiAgICAgICAgZXhwZWN0KGRhdGF0aXAucmFuZ2Uuc3RhcnQuY29sdW1uKS5lcXVhbCgxKTtcbiAgICAgICAgZXhwZWN0KGRhdGF0aXAucmFuZ2UuZW5kLnJvdykuZXF1YWwoMCk7XG4gICAgICAgIGV4cGVjdChkYXRhdGlwLnJhbmdlLmVuZC5jb2x1bW4pLmVxdWFsKDIpO1xuXG4gICAgICAgIGV4cGVjdChkYXRhdGlwLm1hcmtlZFN0cmluZ3MpLnRvLmhhdmUubGVuZ3RoT2YoMik7XG4gICAgICAgIGV4cGVjdChkYXRhdGlwLm1hcmtlZFN0cmluZ3NbMF0pLmVxbCh7IHR5cGU6ICdtYXJrZG93bicsIHZhbHVlOiAndGVzdCcgfSk7XG5cbiAgICAgICAgY29uc3Qgc25pcHBldCA9IGRhdGF0aXAubWFya2VkU3RyaW5nc1sxXTtcbiAgICAgICAgZXhwZWN0KHNuaXBwZXQudHlwZSkuZXF1YWwoJ3NuaXBwZXQnKTtcbiAgICAgICAgaW52YXJpYW50KHNuaXBwZXQudHlwZSA9PT0gJ3NuaXBwZXQnKTtcbiAgICAgICAgZXhwZWN0KChzbmlwcGV0IGFzIGFueSkuZ3JhbW1hci5zY29wZU5hbWUpLmVxdWFsKCd0ZXh0LnBsYWluLm51bGwtZ3JhbW1hcicpO1xuICAgICAgICBleHBlY3Qoc25pcHBldC52YWx1ZSkuZXF1YWwoJ3Rlc3Qgc25pcHBldCcpO1xuXG4gICAgICAgIGV4cGVjdChncmFtbWFyU3B5LmNhbGxlZFdpdGgoJ3NvdXJjZS50ZXN0bGFuZycpKS50by5iZS50cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19