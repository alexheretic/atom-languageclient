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
const convert_1 = require("../convert");
class RenameAdapter {
    static canAdapt(serverCapabilities) {
        return !!serverCapabilities.renameProvider;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lLWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvcmVuYW1lLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFDQSx3Q0FBaUM7QUFhakMsTUFBcUIsYUFBYTtJQUN6QixNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFzQztRQUMzRCxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUM7SUFDN0MsQ0FBQztJQUVNLE1BQU0sQ0FBTyxTQUFTLENBQzNCLFVBQW9DLEVBQ3BDLE1BQWtCLEVBQ2xCLEtBQVksRUFDWixPQUFlOztZQUVmLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FDbEMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQ3pELENBQUM7WUFDRixJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBQ2pCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7Z0JBQ3hCLE9BQU8sYUFBYSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxlQUFxQyxDQUFDLENBQUM7YUFDekY7aUJBQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUN2QixPQUFPLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ25EO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDO2FBQ2I7UUFDSCxDQUFDO0tBQUE7SUFFTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsTUFBa0IsRUFBRSxLQUFZLEVBQUUsT0FBZTtRQUNoRixPQUFPO1lBQ0wsWUFBWSxFQUFFLGlCQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxDQUFDO1lBQzVELFFBQVEsRUFBRSxpQkFBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7WUFDeEMsT0FBTztTQUNSLENBQUM7SUFDSixDQUFDO0lBRU0sTUFBTSxDQUFDLGNBQWMsQ0FDMUIsT0FBc0M7UUFFdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ25DLE1BQU0sQ0FBQyxHQUFHLENBQ1IsaUJBQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQ3RCLGlCQUFPLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ3pDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsc0JBQXNCLENBQ2xDLGVBQW1DO1FBRW5DLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFDekIsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFHLENBQ1IsaUJBQU8sQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFDaEQsaUJBQU8sQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQy9DLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQTVERCxnQ0E0REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhdG9tSWRlIGZyb20gJ2F0b20taWRlJztcbmltcG9ydCBDb252ZXJ0IGZyb20gJy4uL2NvbnZlcnQnO1xuaW1wb3J0IHtcbiAgUG9pbnQsXG4gIFRleHRFZGl0b3IsXG59IGZyb20gJ2F0b20nO1xuaW1wb3J0IHtcbiAgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICBSZW5hbWVQYXJhbXMsXG4gIFNlcnZlckNhcGFiaWxpdGllcyxcbiAgVGV4dERvY3VtZW50RWRpdCxcbiAgVGV4dEVkaXQsXG59IGZyb20gJy4uL2xhbmd1YWdlY2xpZW50JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVuYW1lQWRhcHRlciB7XG4gIHB1YmxpYyBzdGF0aWMgY2FuQWRhcHQoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISFzZXJ2ZXJDYXBhYmlsaXRpZXMucmVuYW1lUHJvdmlkZXI7XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGFzeW5jIGdldFJlbmFtZShcbiAgICBjb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHBvaW50OiBQb2ludCxcbiAgICBuZXdOYW1lOiBzdHJpbmcsXG4gICk6IFByb21pc2U8TWFwPGF0b21JZGUuSWRlVXJpLCBhdG9tSWRlLlRleHRFZGl0W10+IHwgbnVsbD4ge1xuICAgIGNvbnN0IGVkaXQgPSBhd2FpdCBjb25uZWN0aW9uLnJlbmFtZShcbiAgICAgIFJlbmFtZUFkYXB0ZXIuY3JlYXRlUmVuYW1lUGFyYW1zKGVkaXRvciwgcG9pbnQsIG5ld05hbWUpLFxuICAgICk7XG4gICAgaWYgKGVkaXQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChlZGl0LmRvY3VtZW50Q2hhbmdlcykge1xuICAgICAgcmV0dXJuIFJlbmFtZUFkYXB0ZXIuY29udmVydERvY3VtZW50Q2hhbmdlcyhlZGl0LmRvY3VtZW50Q2hhbmdlcyBhcyBUZXh0RG9jdW1lbnRFZGl0W10pO1xuICAgIH0gZWxzZSBpZiAoZWRpdC5jaGFuZ2VzKSB7XG4gICAgICByZXR1cm4gUmVuYW1lQWRhcHRlci5jb252ZXJ0Q2hhbmdlcyhlZGl0LmNoYW5nZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGNyZWF0ZVJlbmFtZVBhcmFtcyhlZGl0b3I6IFRleHRFZGl0b3IsIHBvaW50OiBQb2ludCwgbmV3TmFtZTogc3RyaW5nKTogUmVuYW1lUGFyYW1zIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGV4dERvY3VtZW50OiBDb252ZXJ0LmVkaXRvclRvVGV4dERvY3VtZW50SWRlbnRpZmllcihlZGl0b3IpLFxuICAgICAgcG9zaXRpb246IENvbnZlcnQucG9pbnRUb1Bvc2l0aW9uKHBvaW50KSxcbiAgICAgIG5ld05hbWUsXG4gICAgfTtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgY29udmVydENoYW5nZXMoXG4gICAgY2hhbmdlczogeyBbdXJpOiBzdHJpbmddOiBUZXh0RWRpdFtdIH0sXG4gICk6IE1hcDxhdG9tSWRlLklkZVVyaSwgYXRvbUlkZS5UZXh0RWRpdFtdPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcCgpO1xuICAgIE9iamVjdC5rZXlzKGNoYW5nZXMpLmZvckVhY2goKHVyaSkgPT4ge1xuICAgICAgcmVzdWx0LnNldChcbiAgICAgICAgQ29udmVydC51cmlUb1BhdGgodXJpKSxcbiAgICAgICAgQ29udmVydC5jb252ZXJ0THNUZXh0RWRpdHMoY2hhbmdlc1t1cmldKSxcbiAgICAgICk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgY29udmVydERvY3VtZW50Q2hhbmdlcyhcbiAgICBkb2N1bWVudENoYW5nZXM6IFRleHREb2N1bWVudEVkaXRbXSxcbiAgKTogTWFwPGF0b21JZGUuSWRlVXJpLCBhdG9tSWRlLlRleHRFZGl0W10+IHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwKCk7XG4gICAgZG9jdW1lbnRDaGFuZ2VzLmZvckVhY2goKGRvY3VtZW50RWRpdCkgPT4ge1xuICAgICAgcmVzdWx0LnNldChcbiAgICAgICAgQ29udmVydC51cmlUb1BhdGgoZG9jdW1lbnRFZGl0LnRleHREb2N1bWVudC51cmkpLFxuICAgICAgICBDb252ZXJ0LmNvbnZlcnRMc1RleHRFZGl0cyhkb2N1bWVudEVkaXQuZWRpdHMpLFxuICAgICAgKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iXX0=