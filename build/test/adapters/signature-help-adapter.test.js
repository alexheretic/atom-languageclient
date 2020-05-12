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
const signature_help_adapter_1 = require("../../lib/adapters/signature-help-adapter");
const helpers_1 = require("../helpers");
const chai_1 = require("chai");
const sinon = require("sinon");
describe('SignatureHelpAdapter', () => {
    describe('canAdapt', () => {
        it('checks for signatureHelpProvider', () => {
            chai_1.expect(signature_help_adapter_1.default.canAdapt({})).to.equal(false);
            chai_1.expect(signature_help_adapter_1.default.canAdapt({ signatureHelpProvider: {} })).to.equal(true);
        });
    });
    describe('can attach to a server', () => {
        it('subscribes to onPublishDiagnostics', () => __awaiter(void 0, void 0, void 0, function* () {
            const connection = helpers_1.createSpyConnection();
            connection.signatureHelp = sinon.stub().resolves({ signatures: [] });
            const adapter = new signature_help_adapter_1.default({
                connection,
                capabilities: {
                    signatureHelpProvider: {
                        triggerCharacters: ['(', ','],
                    },
                },
            }, ['source.js']);
            const spy = sinon.stub().returns(new atom_1.Disposable());
            adapter.attach(spy);
            chai_1.expect(spy.calledOnce).to.be.true;
            const provider = spy.firstCall.args[0];
            chai_1.expect(provider.priority).to.equal(1);
            chai_1.expect(provider.grammarScopes).to.deep.equal(['source.js']);
            chai_1.expect(provider.triggerCharacters).to.deep.equal(new Set(['(', ',']));
            chai_1.expect(typeof provider.getSignatureHelp).to.equal('function');
            const result = yield provider.getSignatureHelp(helpers_1.createFakeEditor('test.txt'), new atom_1.Point(0, 1));
            chai_1.expect(connection.signatureHelp.calledOnce).to.be.true;
            const params = connection.signatureHelp.firstCall.args[0];
            chai_1.expect(params).to.deep.equal({
                textDocument: { uri: 'file:///test.txt' },
                position: { line: 0, character: 1 },
            });
            chai_1.expect(result).to.deep.equal({ signatures: [] });
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmF0dXJlLWhlbHAtYWRhcHRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdGVzdC9hZGFwdGVycy9zaWduYXR1cmUtaGVscC1hZGFwdGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSwrQkFBeUM7QUFDekMsc0ZBQTZFO0FBQzdFLHdDQUFtRTtBQUNuRSwrQkFBOEI7QUFDOUIsK0JBQStCO0FBRS9CLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsUUFBUSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDeEIsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtZQUMxQyxhQUFNLENBQUMsZ0NBQW9CLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMxRCxhQUFNLENBQUMsZ0NBQW9CLENBQUMsUUFBUSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEYsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDdEMsRUFBRSxDQUFDLG9DQUFvQyxFQUFFLEdBQVMsRUFBRTtZQUNsRCxNQUFNLFVBQVUsR0FBRyw2QkFBbUIsRUFBRSxDQUFDO1lBQ3hDLFVBQWtCLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUU5RSxNQUFNLE9BQU8sR0FBRyxJQUFJLGdDQUFvQixDQUN0QztnQkFDRSxVQUFVO2dCQUNWLFlBQVksRUFBRTtvQkFDWixxQkFBcUIsRUFBRTt3QkFDckIsaUJBQWlCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO3FCQUM5QjtpQkFDRjthQUNLLEVBQ1IsQ0FBQyxXQUFXLENBQUMsQ0FDZCxDQUFDO1lBQ0YsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLGlCQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEIsYUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztZQUNsQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxhQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEMsYUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDNUQsYUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RSxhQUFNLENBQUMsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRTlELE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLGdCQUFnQixDQUFDLDBCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksWUFBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlGLGFBQU0sQ0FBRSxVQUFrQixDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztZQUNoRSxNQUFNLE1BQU0sR0FBSSxVQUFrQixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25FLGFBQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDM0IsWUFBWSxFQUFFLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFO2dCQUN6QyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUU7YUFDcEMsQ0FBQyxDQUFDO1lBQ0gsYUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEaXNwb3NhYmxlLCBQb2ludCB9IGZyb20gJ2F0b20nO1xuaW1wb3J0IFNpZ25hdHVyZUhlbHBBZGFwdGVyIGZyb20gJy4uLy4uL2xpYi9hZGFwdGVycy9zaWduYXR1cmUtaGVscC1hZGFwdGVyJztcbmltcG9ydCB7IGNyZWF0ZUZha2VFZGl0b3IsIGNyZWF0ZVNweUNvbm5lY3Rpb24gfSBmcm9tICcuLi9oZWxwZXJzJztcbmltcG9ydCB7IGV4cGVjdCB9IGZyb20gJ2NoYWknO1xuaW1wb3J0ICogYXMgc2lub24gZnJvbSAnc2lub24nO1xuXG5kZXNjcmliZSgnU2lnbmF0dXJlSGVscEFkYXB0ZXInLCAoKSA9PiB7XG4gIGRlc2NyaWJlKCdjYW5BZGFwdCcsICgpID0+IHtcbiAgICBpdCgnY2hlY2tzIGZvciBzaWduYXR1cmVIZWxwUHJvdmlkZXInLCAoKSA9PiB7XG4gICAgICBleHBlY3QoU2lnbmF0dXJlSGVscEFkYXB0ZXIuY2FuQWRhcHQoe30pKS50by5lcXVhbChmYWxzZSk7XG4gICAgICBleHBlY3QoU2lnbmF0dXJlSGVscEFkYXB0ZXIuY2FuQWRhcHQoeyBzaWduYXR1cmVIZWxwUHJvdmlkZXI6IHt9IH0pKS50by5lcXVhbCh0cnVlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NhbiBhdHRhY2ggdG8gYSBzZXJ2ZXInLCAoKSA9PiB7XG4gICAgaXQoJ3N1YnNjcmliZXMgdG8gb25QdWJsaXNoRGlhZ25vc3RpY3MnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb25uZWN0aW9uID0gY3JlYXRlU3B5Q29ubmVjdGlvbigpO1xuICAgICAgKGNvbm5lY3Rpb24gYXMgYW55KS5zaWduYXR1cmVIZWxwID0gc2lub24uc3R1YigpLnJlc29sdmVzKHsgc2lnbmF0dXJlczogW10gfSk7XG5cbiAgICAgIGNvbnN0IGFkYXB0ZXIgPSBuZXcgU2lnbmF0dXJlSGVscEFkYXB0ZXIoXG4gICAgICAgIHtcbiAgICAgICAgICBjb25uZWN0aW9uLFxuICAgICAgICAgIGNhcGFiaWxpdGllczoge1xuICAgICAgICAgICAgc2lnbmF0dXJlSGVscFByb3ZpZGVyOiB7XG4gICAgICAgICAgICAgIHRyaWdnZXJDaGFyYWN0ZXJzOiBbJygnLCAnLCddLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9IGFzIGFueSxcbiAgICAgICAgWydzb3VyY2UuanMnXSxcbiAgICAgICk7XG4gICAgICBjb25zdCBzcHkgPSBzaW5vbi5zdHViKCkucmV0dXJucyhuZXcgRGlzcG9zYWJsZSgpKTtcbiAgICAgIGFkYXB0ZXIuYXR0YWNoKHNweSk7XG4gICAgICBleHBlY3Qoc3B5LmNhbGxlZE9uY2UpLnRvLmJlLnRydWU7XG4gICAgICBjb25zdCBwcm92aWRlciA9IHNweS5maXJzdENhbGwuYXJnc1swXTtcbiAgICAgIGV4cGVjdChwcm92aWRlci5wcmlvcml0eSkudG8uZXF1YWwoMSk7XG4gICAgICBleHBlY3QocHJvdmlkZXIuZ3JhbW1hclNjb3BlcykudG8uZGVlcC5lcXVhbChbJ3NvdXJjZS5qcyddKTtcbiAgICAgIGV4cGVjdChwcm92aWRlci50cmlnZ2VyQ2hhcmFjdGVycykudG8uZGVlcC5lcXVhbChuZXcgU2V0KFsnKCcsICcsJ10pKTtcbiAgICAgIGV4cGVjdCh0eXBlb2YgcHJvdmlkZXIuZ2V0U2lnbmF0dXJlSGVscCkudG8uZXF1YWwoJ2Z1bmN0aW9uJyk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyLmdldFNpZ25hdHVyZUhlbHAoY3JlYXRlRmFrZUVkaXRvcigndGVzdC50eHQnKSwgbmV3IFBvaW50KDAsIDEpKTtcbiAgICAgIGV4cGVjdCgoY29ubmVjdGlvbiBhcyBhbnkpLnNpZ25hdHVyZUhlbHAuY2FsbGVkT25jZSkudG8uYmUudHJ1ZTtcbiAgICAgIGNvbnN0IHBhcmFtcyA9IChjb25uZWN0aW9uIGFzIGFueSkuc2lnbmF0dXJlSGVscC5maXJzdENhbGwuYXJnc1swXTtcbiAgICAgIGV4cGVjdChwYXJhbXMpLnRvLmRlZXAuZXF1YWwoe1xuICAgICAgICB0ZXh0RG9jdW1lbnQ6IHsgdXJpOiAnZmlsZTovLy90ZXN0LnR4dCcgfSxcbiAgICAgICAgcG9zaXRpb246IHsgbGluZTogMCwgY2hhcmFjdGVyOiAxIH0sXG4gICAgICB9KTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvLmRlZXAuZXF1YWwoeyBzaWduYXR1cmVzOiBbXSB9KTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==