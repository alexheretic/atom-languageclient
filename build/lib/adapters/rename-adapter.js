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
class RenameAdapter {
    static canAdapt(serverCapabilities) {
        return serverCapabilities.renameProvider === true;
    }
    static getRename(connection, editor, point, newName) {
        return __awaiter(this, void 0, void 0, function* () {
            const edit = yield connection.rename(RenameAdapter.createRenameParams(editor, point, newName));
            if (edit === null) {
                return null;
            }
            if (edit.documentChanges) {
                return RenameAdapter.convertDocumentChanges(edit.documentChanges);
            }
            else if (edit.changes) {
                return RenameAdapter.convertChanges(edit.changes);
            }
            else {
                return null;
            }
        });
    }
    static createRenameParams(editor, point, newName) {
        return {
            textDocument: convert_1.default.editorToTextDocumentIdentifier(editor),
            position: convert_1.default.pointToPosition(point),
            newName,
        };
    }
    static convertChanges(changes) {
        const result = new Map();
        Object.keys(changes).forEach((uri) => {
            result.set(convert_1.default.uriToPath(uri), convert_1.default.convertLsTextEdits(changes[uri]));
        });
        return result;
    }
    static convertDocumentChanges(documentChanges) {
        const result = new Map();
        documentChanges.forEach((documentEdit) => {
            result.set(convert_1.default.uriToPath(documentEdit.textDocument.uri), convert_1.default.convertLsTextEdits(documentEdit.edits));
        });
        return result;
    }
}
exports.default = RenameAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lLWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvcmVuYW1lLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUNBLHdDQUFpQztBQWFqQyxNQUFxQixhQUFhO0lBQ3pCLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sa0JBQWtCLENBQUMsY0FBYyxLQUFLLElBQUksQ0FBQztJQUNwRCxDQUFDO0lBRU0sTUFBTSxDQUFPLFNBQVMsQ0FDM0IsVUFBb0MsRUFDcEMsTUFBa0IsRUFDbEIsS0FBWSxFQUNaLE9BQWU7O1lBRWYsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUNsQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FDekQsQ0FBQztZQUNGLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDakIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDeEIsT0FBTyxhQUFhLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQ25FO2lCQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDdkIsT0FBTyxhQUFhLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNuRDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQzthQUNiO1FBQ0gsQ0FBQztLQUFBO0lBRU0sTUFBTSxDQUFDLGtCQUFrQixDQUFDLE1BQWtCLEVBQUUsS0FBWSxFQUFFLE9BQWU7UUFDaEYsT0FBTztZQUNMLFlBQVksRUFBRSxpQkFBTyxDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQztZQUM1RCxRQUFRLEVBQUUsaUJBQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1lBQ3hDLE9BQU87U0FDUixDQUFDO0lBQ0osQ0FBQztJQUVNLE1BQU0sQ0FBQyxjQUFjLENBQzFCLE9BQXNDO1FBRXRDLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNuQyxNQUFNLENBQUMsR0FBRyxDQUNSLGlCQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUN0QixpQkFBTyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUN6QyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRU0sTUFBTSxDQUFDLHNCQUFzQixDQUNsQyxlQUFtQztRQUVuQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRTtZQUN2QyxNQUFNLENBQUMsR0FBRyxDQUNSLGlCQUFPLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQ2hELGlCQUFPLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUMvQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUE1REQsZ0NBNERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXRvbUlkZSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCB7XG4gIFBvaW50LFxuICBUZXh0RWRpdG9yLFxufSBmcm9tICdhdG9tJztcbmltcG9ydCB7XG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgUmVuYW1lUGFyYW1zLFxuICBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG4gIFRleHREb2N1bWVudEVkaXQsXG4gIFRleHRFZGl0LFxufSBmcm9tICcuLi9sYW5ndWFnZWNsaWVudCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlbmFtZUFkYXB0ZXIge1xuICBwdWJsaWMgc3RhdGljIGNhbkFkYXB0KHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHNlcnZlckNhcGFiaWxpdGllcy5yZW5hbWVQcm92aWRlciA9PT0gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgZ2V0UmVuYW1lKFxuICAgIGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcG9pbnQ6IFBvaW50LFxuICAgIG5ld05hbWU6IHN0cmluZyxcbiAgKTogUHJvbWlzZTxNYXA8YXRvbUlkZS5JZGVVcmksIGF0b21JZGUuVGV4dEVkaXRbXT4gfCBudWxsPiB7XG4gICAgY29uc3QgZWRpdCA9IGF3YWl0IGNvbm5lY3Rpb24ucmVuYW1lKFxuICAgICAgUmVuYW1lQWRhcHRlci5jcmVhdGVSZW5hbWVQYXJhbXMoZWRpdG9yLCBwb2ludCwgbmV3TmFtZSksXG4gICAgKTtcbiAgICBpZiAoZWRpdCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGVkaXQuZG9jdW1lbnRDaGFuZ2VzKSB7XG4gICAgICByZXR1cm4gUmVuYW1lQWRhcHRlci5jb252ZXJ0RG9jdW1lbnRDaGFuZ2VzKGVkaXQuZG9jdW1lbnRDaGFuZ2VzKTtcbiAgICB9IGVsc2UgaWYgKGVkaXQuY2hhbmdlcykge1xuICAgICAgcmV0dXJuIFJlbmFtZUFkYXB0ZXIuY29udmVydENoYW5nZXMoZWRpdC5jaGFuZ2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHN0YXRpYyBjcmVhdGVSZW5hbWVQYXJhbXMoZWRpdG9yOiBUZXh0RWRpdG9yLCBwb2ludDogUG9pbnQsIG5ld05hbWU6IHN0cmluZyk6IFJlbmFtZVBhcmFtcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHREb2N1bWVudDogQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudElkZW50aWZpZXIoZWRpdG9yKSxcbiAgICAgIHBvc2l0aW9uOiBDb252ZXJ0LnBvaW50VG9Qb3NpdGlvbihwb2ludCksXG4gICAgICBuZXdOYW1lLFxuICAgIH07XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGNvbnZlcnRDaGFuZ2VzKFxuICAgIGNoYW5nZXM6IHsgW3VyaTogc3RyaW5nXTogVGV4dEVkaXRbXSB9LFxuICApOiBNYXA8YXRvbUlkZS5JZGVVcmksIGF0b21JZGUuVGV4dEVkaXRbXT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXAoKTtcbiAgICBPYmplY3Qua2V5cyhjaGFuZ2VzKS5mb3JFYWNoKCh1cmkpID0+IHtcbiAgICAgIHJlc3VsdC5zZXQoXG4gICAgICAgIENvbnZlcnQudXJpVG9QYXRoKHVyaSksXG4gICAgICAgIENvbnZlcnQuY29udmVydExzVGV4dEVkaXRzKGNoYW5nZXNbdXJpXSksXG4gICAgICApO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGNvbnZlcnREb2N1bWVudENoYW5nZXMoXG4gICAgZG9jdW1lbnRDaGFuZ2VzOiBUZXh0RG9jdW1lbnRFZGl0W10sXG4gICk6IE1hcDxhdG9tSWRlLklkZVVyaSwgYXRvbUlkZS5UZXh0RWRpdFtdPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcCgpO1xuICAgIGRvY3VtZW50Q2hhbmdlcy5mb3JFYWNoKChkb2N1bWVudEVkaXQpID0+IHtcbiAgICAgIHJlc3VsdC5zZXQoXG4gICAgICAgIENvbnZlcnQudXJpVG9QYXRoKGRvY3VtZW50RWRpdC50ZXh0RG9jdW1lbnQudXJpKSxcbiAgICAgICAgQ29udmVydC5jb252ZXJ0THNUZXh0RWRpdHMoZG9jdW1lbnRFZGl0LmVkaXRzKSxcbiAgICAgICk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuIl19