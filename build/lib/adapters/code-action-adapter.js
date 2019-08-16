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
const assert = require("assert");
const convert_1 = require("../convert");
const apply_edit_adapter_1 = require("./apply-edit-adapter");
const languageclient_1 = require("../languageclient");
class CodeActionAdapter {
    /**
     * @returns A {Boolean} indicating this adapter can adapt the server based on the
     *   given serverCapabilities.
     */
    static canAdapt(serverCapabilities) {
        return serverCapabilities.codeActionProvider === true;
    }
    /**
     * Public: Retrieves code actions for a given editor, range, and context (diagnostics).
     * Throws an error if codeActionProvider is not a registered capability.
     *
     * @param connection A {LanguageClientConnection} to the language server that provides highlights.
     * @param serverCapabilities The {ServerCapabilities} of the language server that will be used.
     * @param editor The Atom {TextEditor} containing the diagnostics.
     * @param range The Atom {Range} to fetch code actions for.
     * @param diagnostics An {Array<atomIde$Diagnostic>} to fetch code actions for.
     *   This is typically a list of diagnostics intersecting `range`.
     * @returns A {Promise} of an {Array} of {atomIde$CodeAction}s to display.
     */
    static getCodeActions(connection, serverCapabilities, linterAdapter, editor, range, diagnostics) {
        return __awaiter(this, void 0, void 0, function* () {
            if (linterAdapter == null) {
                return [];
            }
            assert(serverCapabilities.codeActionProvider, 'Must have the textDocument/codeAction capability');
            const params = CodeActionAdapter.createCodeActionParams(linterAdapter, editor, range, diagnostics);
            const actions = yield connection.codeAction(params);
            return actions.map((action) => CodeActionAdapter.createCodeAction(action, connection));
        });
    }
    static createCodeAction(action, connection) {
        return {
            apply() {
                return __awaiter(this, void 0, void 0, function* () {
                    if (languageclient_1.CodeAction.is(action)) {
                        CodeActionAdapter.applyWorkspaceEdit(action.edit);
                        yield CodeActionAdapter.executeCommand(action.command, connection);
                    }
                    else {
                        yield CodeActionAdapter.executeCommand(action, connection);
                    }
                });
            },
            getTitle() {
                return Promise.resolve(action.title);
            },
            // tslint:disable-next-line:no-empty
            dispose() { },
        };
    }
    static applyWorkspaceEdit(edit) {
        if (languageclient_1.WorkspaceEdit.is(edit)) {
            apply_edit_adapter_1.default.onApplyEdit({ edit });
        }
    }
    static executeCommand(command, connection) {
        return __awaiter(this, void 0, void 0, function* () {
            if (languageclient_1.Command.is(command)) {
                yield connection.executeCommand({
                    command: command.command,
                    arguments: command.arguments,
                });
            }
        });
    }
    static createCodeActionParams(linterAdapter, editor, range, diagnostics) {
        return {
            textDocument: convert_1.default.editorToTextDocumentIdentifier(editor),
            range: convert_1.default.atomRangeToLSRange(range),
            context: {
                diagnostics: diagnostics.map((diagnostic) => {
                    // Retrieve the stored diagnostic code if it exists.
                    // Until the Linter API provides a place to store the code,
                    // there's no real way for the code actions API to give it back to us.
                    const converted = convert_1.default.atomIdeDiagnosticToLSDiagnostic(diagnostic);
                    if (diagnostic.range != null && diagnostic.text != null) {
                        const code = linterAdapter.getDiagnosticCode(editor, diagnostic.range, diagnostic.text);
                        if (code != null) {
                            converted.code = code;
                        }
                    }
                    return converted;
                }),
            },
        };
    }
}
exports.default = CodeActionAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1hY3Rpb24tYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9hZGFwdGVycy9jb2RlLWFjdGlvbi1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFFQSxpQ0FBa0M7QUFDbEMsd0NBQWlDO0FBQ2pDLDZEQUFvRDtBQUNwRCxzREFPMkI7QUFNM0IsTUFBcUIsaUJBQWlCO0lBQ3BDOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQXNDO1FBQzNELE9BQU8sa0JBQWtCLENBQUMsa0JBQWtCLEtBQUssSUFBSSxDQUFDO0lBQ3hELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNJLE1BQU0sQ0FBTyxjQUFjLENBQ2hDLFVBQW9DLEVBQ3BDLGtCQUFzQyxFQUN0QyxhQUE4QyxFQUM5QyxNQUFrQixFQUNsQixLQUFZLEVBQ1osV0FBaUM7O1lBRWpDLElBQUksYUFBYSxJQUFJLElBQUksRUFBRTtnQkFDekIsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUNELE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsRUFBRSxrREFBa0QsQ0FBQyxDQUFDO1lBRWxHLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ25HLE1BQU0sT0FBTyxHQUFHLE1BQU0sVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7S0FBQTtJQUVPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDN0IsTUFBNEIsRUFDNUIsVUFBb0M7UUFFcEMsT0FBTztZQUNDLEtBQUs7O29CQUNULElBQUksMkJBQVUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUU7d0JBQ3pCLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbEQsTUFBTSxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztxQkFDcEU7eUJBQU07d0JBQ0wsTUFBTSxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO3FCQUM1RDtnQkFDSCxDQUFDO2FBQUE7WUFDRCxRQUFRO2dCQUNOLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkMsQ0FBQztZQUNELG9DQUFvQztZQUNwQyxPQUFPLEtBQVcsQ0FBQztTQUNwQixDQUFDO0lBQ0osQ0FBQztJQUVPLE1BQU0sQ0FBQyxrQkFBa0IsQ0FDL0IsSUFBK0I7UUFFL0IsSUFBSSw4QkFBYSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMxQiw0QkFBZ0IsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ3hDO0lBQ0gsQ0FBQztJQUVPLE1BQU0sQ0FBTyxjQUFjLENBQ2pDLE9BQVksRUFDWixVQUFvQzs7WUFFcEMsSUFBSSx3QkFBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDdkIsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUFDO29CQUM5QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87b0JBQ3hCLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztpQkFDN0IsQ0FBQyxDQUFDO2FBQ0o7UUFDSCxDQUFDO0tBQUE7SUFFTyxNQUFNLENBQUMsc0JBQXNCLENBQ25DLGFBQWtDLEVBQ2xDLE1BQWtCLEVBQ2xCLEtBQVksRUFDWixXQUFpQztRQUVqQyxPQUFPO1lBQ0wsWUFBWSxFQUFFLGlCQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxDQUFDO1lBQzVELEtBQUssRUFBRSxpQkFBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztZQUN4QyxPQUFPLEVBQUU7Z0JBQ1AsV0FBVyxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtvQkFDMUMsb0RBQW9EO29CQUNwRCwyREFBMkQ7b0JBQzNELHNFQUFzRTtvQkFDdEUsTUFBTSxTQUFTLEdBQUcsaUJBQU8sQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDdEUsSUFBSSxVQUFVLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRTt3QkFDdkQsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDeEYsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFOzRCQUNoQixTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzt5QkFDdkI7cUJBQ0Y7b0JBQ0QsT0FBTyxTQUFTLENBQUM7Z0JBQ25CLENBQUMsQ0FBQzthQUNIO1NBQ0YsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTFHRCxvQ0EwR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBhdG9tSWRlIGZyb20gJ2F0b20taWRlJztcbmltcG9ydCBMaW50ZXJQdXNoVjJBZGFwdGVyIGZyb20gJy4vbGludGVyLXB1c2gtdjItYWRhcHRlcic7XG5pbXBvcnQgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0Jyk7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCBBcHBseUVkaXRBZGFwdGVyIGZyb20gJy4vYXBwbHktZWRpdC1hZGFwdGVyJztcbmltcG9ydCB7XG4gIENvZGVBY3Rpb24sXG4gIENvZGVBY3Rpb25QYXJhbXMsXG4gIENvbW1hbmQsXG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgU2VydmVyQ2FwYWJpbGl0aWVzLFxuICBXb3Jrc3BhY2VFZGl0LFxufSBmcm9tICcuLi9sYW5ndWFnZWNsaWVudCc7XG5pbXBvcnQge1xuICBSYW5nZSxcbiAgVGV4dEVkaXRvcixcbn0gZnJvbSAnYXRvbSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvZGVBY3Rpb25BZGFwdGVyIHtcbiAgLyoqXG4gICAqIEByZXR1cm5zIEEge0Jvb2xlYW59IGluZGljYXRpbmcgdGhpcyBhZGFwdGVyIGNhbiBhZGFwdCB0aGUgc2VydmVyIGJhc2VkIG9uIHRoZVxuICAgKiAgIGdpdmVuIHNlcnZlckNhcGFiaWxpdGllcy5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgY2FuQWRhcHQoc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMpOiBib29sZWFuIHtcbiAgICByZXR1cm4gc2VydmVyQ2FwYWJpbGl0aWVzLmNvZGVBY3Rpb25Qcm92aWRlciA9PT0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IFJldHJpZXZlcyBjb2RlIGFjdGlvbnMgZm9yIGEgZ2l2ZW4gZWRpdG9yLCByYW5nZSwgYW5kIGNvbnRleHQgKGRpYWdub3N0aWNzKS5cbiAgICogVGhyb3dzIGFuIGVycm9yIGlmIGNvZGVBY3Rpb25Qcm92aWRlciBpcyBub3QgYSByZWdpc3RlcmVkIGNhcGFiaWxpdHkuXG4gICAqXG4gICAqIEBwYXJhbSBjb25uZWN0aW9uIEEge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0IHByb3ZpZGVzIGhpZ2hsaWdodHMuXG4gICAqIEBwYXJhbSBzZXJ2ZXJDYXBhYmlsaXRpZXMgVGhlIHtTZXJ2ZXJDYXBhYmlsaXRpZXN9IG9mIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIGJlIHVzZWQuXG4gICAqIEBwYXJhbSBlZGl0b3IgVGhlIEF0b20ge1RleHRFZGl0b3J9IGNvbnRhaW5pbmcgdGhlIGRpYWdub3N0aWNzLlxuICAgKiBAcGFyYW0gcmFuZ2UgVGhlIEF0b20ge1JhbmdlfSB0byBmZXRjaCBjb2RlIGFjdGlvbnMgZm9yLlxuICAgKiBAcGFyYW0gZGlhZ25vc3RpY3MgQW4ge0FycmF5PGF0b21JZGUkRGlhZ25vc3RpYz59IHRvIGZldGNoIGNvZGUgYWN0aW9ucyBmb3IuXG4gICAqICAgVGhpcyBpcyB0eXBpY2FsbHkgYSBsaXN0IG9mIGRpYWdub3N0aWNzIGludGVyc2VjdGluZyBgcmFuZ2VgLlxuICAgKiBAcmV0dXJucyBBIHtQcm9taXNlfSBvZiBhbiB7QXJyYXl9IG9mIHthdG9tSWRlJENvZGVBY3Rpb259cyB0byBkaXNwbGF5LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBnZXRDb2RlQWN0aW9ucyhcbiAgICBjb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gICAgc2VydmVyQ2FwYWJpbGl0aWVzOiBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG4gICAgbGludGVyQWRhcHRlcjogTGludGVyUHVzaFYyQWRhcHRlciB8IHVuZGVmaW5lZCxcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcmFuZ2U6IFJhbmdlLFxuICAgIGRpYWdub3N0aWNzOiBhdG9tSWRlLkRpYWdub3N0aWNbXSxcbiAgKTogUHJvbWlzZTxhdG9tSWRlLkNvZGVBY3Rpb25bXT4ge1xuICAgIGlmIChsaW50ZXJBZGFwdGVyID09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgYXNzZXJ0KHNlcnZlckNhcGFiaWxpdGllcy5jb2RlQWN0aW9uUHJvdmlkZXIsICdNdXN0IGhhdmUgdGhlIHRleHREb2N1bWVudC9jb2RlQWN0aW9uIGNhcGFiaWxpdHknKTtcblxuICAgIGNvbnN0IHBhcmFtcyA9IENvZGVBY3Rpb25BZGFwdGVyLmNyZWF0ZUNvZGVBY3Rpb25QYXJhbXMobGludGVyQWRhcHRlciwgZWRpdG9yLCByYW5nZSwgZGlhZ25vc3RpY3MpO1xuICAgIGNvbnN0IGFjdGlvbnMgPSBhd2FpdCBjb25uZWN0aW9uLmNvZGVBY3Rpb24ocGFyYW1zKTtcbiAgICByZXR1cm4gYWN0aW9ucy5tYXAoKGFjdGlvbikgPT4gQ29kZUFjdGlvbkFkYXB0ZXIuY3JlYXRlQ29kZUFjdGlvbihhY3Rpb24sIGNvbm5lY3Rpb24pKTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGNyZWF0ZUNvZGVBY3Rpb24oXG4gICAgYWN0aW9uOiBDb21tYW5kIHwgQ29kZUFjdGlvbixcbiAgICBjb25uZWN0aW9uOiBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gICk6IGF0b21JZGUuQ29kZUFjdGlvbiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFzeW5jIGFwcGx5KCkge1xuICAgICAgICBpZiAoQ29kZUFjdGlvbi5pcyhhY3Rpb24pKSB7XG4gICAgICAgICAgQ29kZUFjdGlvbkFkYXB0ZXIuYXBwbHlXb3Jrc3BhY2VFZGl0KGFjdGlvbi5lZGl0KTtcbiAgICAgICAgICBhd2FpdCBDb2RlQWN0aW9uQWRhcHRlci5leGVjdXRlQ29tbWFuZChhY3Rpb24uY29tbWFuZCwgY29ubmVjdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgQ29kZUFjdGlvbkFkYXB0ZXIuZXhlY3V0ZUNvbW1hbmQoYWN0aW9uLCBjb25uZWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGdldFRpdGxlKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoYWN0aW9uLnRpdGxlKTtcbiAgICAgIH0sXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcbiAgICAgIGRpc3Bvc2UoKTogdm9pZCB7IH0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGFwcGx5V29ya3NwYWNlRWRpdChcbiAgICBlZGl0OiBXb3Jrc3BhY2VFZGl0IHwgdW5kZWZpbmVkLFxuICApOiB2b2lkIHtcbiAgICBpZiAoV29ya3NwYWNlRWRpdC5pcyhlZGl0KSkge1xuICAgICAgQXBwbHlFZGl0QWRhcHRlci5vbkFwcGx5RWRpdCh7IGVkaXQgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgZXhlY3V0ZUNvbW1hbmQoXG4gICAgY29tbWFuZDogYW55LFxuICAgIGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKENvbW1hbmQuaXMoY29tbWFuZCkpIHtcbiAgICAgIGF3YWl0IGNvbm5lY3Rpb24uZXhlY3V0ZUNvbW1hbmQoe1xuICAgICAgICBjb21tYW5kOiBjb21tYW5kLmNvbW1hbmQsXG4gICAgICAgIGFyZ3VtZW50czogY29tbWFuZC5hcmd1bWVudHMsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBjcmVhdGVDb2RlQWN0aW9uUGFyYW1zKFxuICAgIGxpbnRlckFkYXB0ZXI6IExpbnRlclB1c2hWMkFkYXB0ZXIsXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHJhbmdlOiBSYW5nZSxcbiAgICBkaWFnbm9zdGljczogYXRvbUlkZS5EaWFnbm9zdGljW10sXG4gICk6IENvZGVBY3Rpb25QYXJhbXMge1xuICAgIHJldHVybiB7XG4gICAgICB0ZXh0RG9jdW1lbnQ6IENvbnZlcnQuZWRpdG9yVG9UZXh0RG9jdW1lbnRJZGVudGlmaWVyKGVkaXRvciksXG4gICAgICByYW5nZTogQ29udmVydC5hdG9tUmFuZ2VUb0xTUmFuZ2UocmFuZ2UpLFxuICAgICAgY29udGV4dDoge1xuICAgICAgICBkaWFnbm9zdGljczogZGlhZ25vc3RpY3MubWFwKChkaWFnbm9zdGljKSA9PiB7XG4gICAgICAgICAgLy8gUmV0cmlldmUgdGhlIHN0b3JlZCBkaWFnbm9zdGljIGNvZGUgaWYgaXQgZXhpc3RzLlxuICAgICAgICAgIC8vIFVudGlsIHRoZSBMaW50ZXIgQVBJIHByb3ZpZGVzIGEgcGxhY2UgdG8gc3RvcmUgdGhlIGNvZGUsXG4gICAgICAgICAgLy8gdGhlcmUncyBubyByZWFsIHdheSBmb3IgdGhlIGNvZGUgYWN0aW9ucyBBUEkgdG8gZ2l2ZSBpdCBiYWNrIHRvIHVzLlxuICAgICAgICAgIGNvbnN0IGNvbnZlcnRlZCA9IENvbnZlcnQuYXRvbUlkZURpYWdub3N0aWNUb0xTRGlhZ25vc3RpYyhkaWFnbm9zdGljKTtcbiAgICAgICAgICBpZiAoZGlhZ25vc3RpYy5yYW5nZSAhPSBudWxsICYmIGRpYWdub3N0aWMudGV4dCAhPSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBjb2RlID0gbGludGVyQWRhcHRlci5nZXREaWFnbm9zdGljQ29kZShlZGl0b3IsIGRpYWdub3N0aWMucmFuZ2UsIGRpYWdub3N0aWMudGV4dCk7XG4gICAgICAgICAgICBpZiAoY29kZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIGNvbnZlcnRlZC5jb2RlID0gY29kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICAgICAgfSksXG4gICAgICB9LFxuICAgIH07XG4gIH1cbn1cbiJdfQ==