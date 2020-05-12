"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const atom_1 = require("atom");
function createSpyConnection() {
    return {
        listen: sinon.spy(),
        onClose: sinon.spy(),
        onError: sinon.spy(),
        onDispose: sinon.spy(),
        onUnhandledNotification: sinon.spy(),
        onRequest: sinon.spy(),
        onNotification: sinon.spy(),
        dispose: sinon.spy(),
        sendRequest: sinon.spy(),
        sendNotification: sinon.spy(),
        trace: sinon.spy(),
        inspect: sinon.spy(),
        onProgress: sinon.spy(),
        sendProgress: sinon.spy(),
        onUnhandledProgress: sinon.spy(),
    };
}
exports.createSpyConnection = createSpyConnection;
function createFakeEditor(path) {
    const editor = new atom_1.TextEditor();
    sinon.stub(editor, 'getSelectedBufferRange');
    sinon.spy(editor, 'setTextInBufferRange');
    editor.setTabLength(4);
    editor.setSoftTabs(true);
    editor.getBuffer().setPath(path || '/a/b/c/d.js');
    return editor;
}
exports.createFakeEditor = createFakeEditor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUErQjtBQUUvQiwrQkFBa0M7QUFFbEMsU0FBZ0IsbUJBQW1CO0lBQ2pDLE9BQU87UUFDTCxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNuQixPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNwQixPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNwQixTQUFTLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUN0Qix1QkFBdUIsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ3BDLFNBQVMsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ3RCLGNBQWMsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQzNCLE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ3BCLFdBQVcsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ3hCLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDN0IsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDbEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDcEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDdkIsWUFBWSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDekIsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRTtLQUNqQyxDQUFDO0FBQ0osQ0FBQztBQWxCRCxrREFrQkM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFhO0lBQzVDLE1BQU0sTUFBTSxHQUFHLElBQUksaUJBQVUsRUFBRSxDQUFDO0lBQ2hDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLHdCQUF3QixDQUFDLENBQUM7SUFDN0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztJQUMxQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksYUFBYSxDQUFDLENBQUM7SUFDbEQsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQVJELDRDQVFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgc2lub24gZnJvbSAnc2lub24nO1xuaW1wb3J0ICogYXMgcnBjIGZyb20gJ3ZzY29kZS1qc29ucnBjJztcbmltcG9ydCB7IFRleHRFZGl0b3IgfSBmcm9tICdhdG9tJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNweUNvbm5lY3Rpb24oKTogcnBjLk1lc3NhZ2VDb25uZWN0aW9uIHtcbiAgcmV0dXJuIHtcbiAgICBsaXN0ZW46IHNpbm9uLnNweSgpLFxuICAgIG9uQ2xvc2U6IHNpbm9uLnNweSgpLFxuICAgIG9uRXJyb3I6IHNpbm9uLnNweSgpLFxuICAgIG9uRGlzcG9zZTogc2lub24uc3B5KCksXG4gICAgb25VbmhhbmRsZWROb3RpZmljYXRpb246IHNpbm9uLnNweSgpLFxuICAgIG9uUmVxdWVzdDogc2lub24uc3B5KCksXG4gICAgb25Ob3RpZmljYXRpb246IHNpbm9uLnNweSgpLFxuICAgIGRpc3Bvc2U6IHNpbm9uLnNweSgpLFxuICAgIHNlbmRSZXF1ZXN0OiBzaW5vbi5zcHkoKSxcbiAgICBzZW5kTm90aWZpY2F0aW9uOiBzaW5vbi5zcHkoKSxcbiAgICB0cmFjZTogc2lub24uc3B5KCksXG4gICAgaW5zcGVjdDogc2lub24uc3B5KCksXG4gICAgb25Qcm9ncmVzczogc2lub24uc3B5KCksXG4gICAgc2VuZFByb2dyZXNzOiBzaW5vbi5zcHkoKSxcbiAgICBvblVuaGFuZGxlZFByb2dyZXNzOiBzaW5vbi5zcHkoKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUZha2VFZGl0b3IocGF0aD86IHN0cmluZyk6IFRleHRFZGl0b3Ige1xuICBjb25zdCBlZGl0b3IgPSBuZXcgVGV4dEVkaXRvcigpO1xuICBzaW5vbi5zdHViKGVkaXRvciwgJ2dldFNlbGVjdGVkQnVmZmVyUmFuZ2UnKTtcbiAgc2lub24uc3B5KGVkaXRvciwgJ3NldFRleHRJbkJ1ZmZlclJhbmdlJyk7XG4gIGVkaXRvci5zZXRUYWJMZW5ndGgoNCk7XG4gIGVkaXRvci5zZXRTb2Z0VGFicyh0cnVlKTtcbiAgZWRpdG9yLmdldEJ1ZmZlcigpLnNldFBhdGgocGF0aCB8fCAnL2EvYi9jL2QuanMnKTtcbiAgcmV0dXJuIGVkaXRvcjtcbn1cbiJdfQ==