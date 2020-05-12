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
        return !!serverCapabilities.codeActionProvider;
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
    static getCodeActions(connection, serverCapabilities, linterAdapter, editor, range, diagnostics, filterActions, onApply) {
        return __awaiter(this, void 0, void 0, function* () {
            if (linterAdapter == null) {
                return [];
            }
            assert(serverCapabilities.codeActionProvider, 'Must have the textDocument/codeAction capability');
            const params = CodeActionAdapter.createCodeActionParams(linterAdapter, editor, range, diagnostics);
            const actions = filterActions(yield connection.codeAction(params));
            return actions.map((action) => CodeActionAdapter.createCodeAction(action, connection, onApply));
        });
    }
    static createCodeAction(action, connection, onApply) {
        return {
            apply() {
                return __awaiter(this, void 0, void 0, function* () {
                    if ((yield onApply(action)) === false)
                        return;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1hY3Rpb24tYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9hZGFwdGVycy9jb2RlLWFjdGlvbi1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEsaUNBQWtDO0FBQ2xDLHdDQUFpQztBQUNqQyw2REFBb0Q7QUFDcEQsc0RBTzJCO0FBTTNCLE1BQXFCLGlCQUFpQjtJQUNwQzs7O09BR0c7SUFDSSxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFzQztRQUMzRCxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSSxNQUFNLENBQU8sY0FBYyxDQUNoQyxVQUFvQyxFQUNwQyxrQkFBc0MsRUFDdEMsYUFBOEMsRUFDOUMsTUFBa0IsRUFDbEIsS0FBWSxFQUNaLFdBQWlDLEVBQ2pDLGFBQThFLEVBQzlFLE9BQTZEOztZQUU3RCxJQUFJLGFBQWEsSUFBSSxJQUFJLEVBQUU7Z0JBQ3pCLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFDRCxNQUFNLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLEVBQUUsa0RBQWtELENBQUMsQ0FBQztZQUVsRyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNuRyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDbkUsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbEcsQ0FBQztLQUFBO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUM3QixNQUE0QixFQUM1QixVQUFvQyxFQUNwQyxPQUE2RDtRQUU3RCxPQUFPO1lBQ0MsS0FBSzs7b0JBQ1QsSUFBSSxDQUFBLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFLLEtBQUs7d0JBQUUsT0FBTztvQkFFNUMsSUFBSSwyQkFBVSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDekIsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsRCxNQUFNLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO3FCQUNwRTt5QkFBTTt3QkFDTCxNQUFNLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7cUJBQzVEO2dCQUNILENBQUM7YUFBQTtZQUNELFFBQVE7Z0JBQ04sT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QyxDQUFDO1lBQ0Qsb0NBQW9DO1lBQ3BDLE9BQU8sS0FBVyxDQUFDO1NBQ3BCLENBQUM7SUFDSixDQUFDO0lBRU8sTUFBTSxDQUFDLGtCQUFrQixDQUMvQixJQUErQjtRQUUvQixJQUFJLDhCQUFhLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzFCLDRCQUFnQixDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7U0FDeEM7SUFDSCxDQUFDO0lBRU8sTUFBTSxDQUFPLGNBQWMsQ0FDakMsT0FBWSxFQUNaLFVBQW9DOztZQUVwQyxJQUFJLHdCQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUN2QixNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQUM7b0JBQzlCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztvQkFDeEIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO2lCQUM3QixDQUFDLENBQUM7YUFDSjtRQUNILENBQUM7S0FBQTtJQUVPLE1BQU0sQ0FBQyxzQkFBc0IsQ0FDbkMsYUFBa0MsRUFDbEMsTUFBa0IsRUFDbEIsS0FBWSxFQUNaLFdBQWlDO1FBRWpDLE9BQU87WUFDTCxZQUFZLEVBQUUsaUJBQU8sQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUM7WUFDNUQsS0FBSyxFQUFFLGlCQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1lBQ3hDLE9BQU8sRUFBRTtnQkFDUCxXQUFXLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO29CQUMxQyxvREFBb0Q7b0JBQ3BELDJEQUEyRDtvQkFDM0Qsc0VBQXNFO29CQUN0RSxNQUFNLFNBQVMsR0FBRyxpQkFBTyxDQUFDLCtCQUErQixDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN0RSxJQUFJLFVBQVUsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLFVBQVUsQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFO3dCQUN2RCxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUN4RixJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7NEJBQ2hCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO3lCQUN2QjtxQkFDRjtvQkFDRCxPQUFPLFNBQVMsQ0FBQztnQkFDbkIsQ0FBQyxDQUFDO2FBQ0g7U0FDRixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBL0dELG9DQStHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGF0b21JZGUgZnJvbSAnYXRvbS1pZGUnO1xuaW1wb3J0IExpbnRlclB1c2hWMkFkYXB0ZXIgZnJvbSAnLi9saW50ZXItcHVzaC12Mi1hZGFwdGVyJztcbmltcG9ydCBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKTtcbmltcG9ydCBDb252ZXJ0IGZyb20gJy4uL2NvbnZlcnQnO1xuaW1wb3J0IEFwcGx5RWRpdEFkYXB0ZXIgZnJvbSAnLi9hcHBseS1lZGl0LWFkYXB0ZXInO1xuaW1wb3J0IHtcbiAgQ29kZUFjdGlvbixcbiAgQ29kZUFjdGlvblBhcmFtcyxcbiAgQ29tbWFuZCxcbiAgTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICBTZXJ2ZXJDYXBhYmlsaXRpZXMsXG4gIFdvcmtzcGFjZUVkaXQsXG59IGZyb20gJy4uL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCB7XG4gIFJhbmdlLFxuICBUZXh0RWRpdG9yLFxufSBmcm9tICdhdG9tJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29kZUFjdGlvbkFkYXB0ZXIge1xuICAvKipcbiAgICogQHJldHVybnMgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB0aGlzIGFkYXB0ZXIgY2FuIGFkYXB0IHRoZSBzZXJ2ZXIgYmFzZWQgb24gdGhlXG4gICAqICAgZ2l2ZW4gc2VydmVyQ2FwYWJpbGl0aWVzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjYW5BZGFwdChzZXJ2ZXJDYXBhYmlsaXRpZXM6IFNlcnZlckNhcGFiaWxpdGllcyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXNlcnZlckNhcGFiaWxpdGllcy5jb2RlQWN0aW9uUHJvdmlkZXI7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBSZXRyaWV2ZXMgY29kZSBhY3Rpb25zIGZvciBhIGdpdmVuIGVkaXRvciwgcmFuZ2UsIGFuZCBjb250ZXh0IChkaWFnbm9zdGljcykuXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiBjb2RlQWN0aW9uUHJvdmlkZXIgaXMgbm90IGEgcmVnaXN0ZXJlZCBjYXBhYmlsaXR5LlxuICAgKlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCBwcm92aWRlcyBoaWdobGlnaHRzLlxuICAgKiBAcGFyYW0gc2VydmVyQ2FwYWJpbGl0aWVzIFRoZSB7U2VydmVyQ2FwYWJpbGl0aWVzfSBvZiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHRoYXQgd2lsbCBiZSB1c2VkLlxuICAgKiBAcGFyYW0gZWRpdG9yIFRoZSBBdG9tIHtUZXh0RWRpdG9yfSBjb250YWluaW5nIHRoZSBkaWFnbm9zdGljcy5cbiAgICogQHBhcmFtIHJhbmdlIFRoZSBBdG9tIHtSYW5nZX0gdG8gZmV0Y2ggY29kZSBhY3Rpb25zIGZvci5cbiAgICogQHBhcmFtIGRpYWdub3N0aWNzIEFuIHtBcnJheTxhdG9tSWRlJERpYWdub3N0aWM+fSB0byBmZXRjaCBjb2RlIGFjdGlvbnMgZm9yLlxuICAgKiAgIFRoaXMgaXMgdHlwaWNhbGx5IGEgbGlzdCBvZiBkaWFnbm9zdGljcyBpbnRlcnNlY3RpbmcgYHJhbmdlYC5cbiAgICogQHJldHVybnMgQSB7UHJvbWlzZX0gb2YgYW4ge0FycmF5fSBvZiB7YXRvbUlkZSRDb2RlQWN0aW9ufXMgdG8gZGlzcGxheS5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgZ2V0Q29kZUFjdGlvbnMoXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIHNlcnZlckNhcGFiaWxpdGllczogU2VydmVyQ2FwYWJpbGl0aWVzLFxuICAgIGxpbnRlckFkYXB0ZXI6IExpbnRlclB1c2hWMkFkYXB0ZXIgfCB1bmRlZmluZWQsXG4gICAgZWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHJhbmdlOiBSYW5nZSxcbiAgICBkaWFnbm9zdGljczogYXRvbUlkZS5EaWFnbm9zdGljW10sXG4gICAgZmlsdGVyQWN0aW9uczogKGFjdGlvbnM6IChDb21tYW5kIHwgQ29kZUFjdGlvbilbXSkgPT4gKENvbW1hbmQgfCBDb2RlQWN0aW9uKVtdLFxuICAgIG9uQXBwbHk6IChhY3Rpb246IChDb21tYW5kIHwgQ29kZUFjdGlvbikpID0+IFByb21pc2U8Ym9vbGVhbj4sXG4gICk6IFByb21pc2U8YXRvbUlkZS5Db2RlQWN0aW9uW10+IHtcbiAgICBpZiAobGludGVyQWRhcHRlciA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGFzc2VydChzZXJ2ZXJDYXBhYmlsaXRpZXMuY29kZUFjdGlvblByb3ZpZGVyLCAnTXVzdCBoYXZlIHRoZSB0ZXh0RG9jdW1lbnQvY29kZUFjdGlvbiBjYXBhYmlsaXR5Jyk7XG5cbiAgICBjb25zdCBwYXJhbXMgPSBDb2RlQWN0aW9uQWRhcHRlci5jcmVhdGVDb2RlQWN0aW9uUGFyYW1zKGxpbnRlckFkYXB0ZXIsIGVkaXRvciwgcmFuZ2UsIGRpYWdub3N0aWNzKTtcbiAgICBjb25zdCBhY3Rpb25zID0gZmlsdGVyQWN0aW9ucyhhd2FpdCBjb25uZWN0aW9uLmNvZGVBY3Rpb24ocGFyYW1zKSk7XG4gICAgcmV0dXJuIGFjdGlvbnMubWFwKChhY3Rpb24pID0+IENvZGVBY3Rpb25BZGFwdGVyLmNyZWF0ZUNvZGVBY3Rpb24oYWN0aW9uLCBjb25uZWN0aW9uLCBvbkFwcGx5KSk7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBjcmVhdGVDb2RlQWN0aW9uKFxuICAgIGFjdGlvbjogQ29tbWFuZCB8IENvZGVBY3Rpb24sXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICAgIG9uQXBwbHk6IChhY3Rpb246IChDb21tYW5kIHwgQ29kZUFjdGlvbikpID0+IFByb21pc2U8Ym9vbGVhbj4sXG4gICk6IGF0b21JZGUuQ29kZUFjdGlvbiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFzeW5jIGFwcGx5KCkge1xuICAgICAgICBpZiAoYXdhaXQgb25BcHBseShhY3Rpb24pID09PSBmYWxzZSkgcmV0dXJuO1xuXG4gICAgICAgIGlmIChDb2RlQWN0aW9uLmlzKGFjdGlvbikpIHtcbiAgICAgICAgICBDb2RlQWN0aW9uQWRhcHRlci5hcHBseVdvcmtzcGFjZUVkaXQoYWN0aW9uLmVkaXQpO1xuICAgICAgICAgIGF3YWl0IENvZGVBY3Rpb25BZGFwdGVyLmV4ZWN1dGVDb21tYW5kKGFjdGlvbi5jb21tYW5kLCBjb25uZWN0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCBDb2RlQWN0aW9uQWRhcHRlci5leGVjdXRlQ29tbWFuZChhY3Rpb24sIGNvbm5lY3Rpb24pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZ2V0VGl0bGUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShhY3Rpb24udGl0bGUpO1xuICAgICAgfSxcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1lbXB0eVxuICAgICAgZGlzcG9zZSgpOiB2b2lkIHsgfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgYXBwbHlXb3Jrc3BhY2VFZGl0KFxuICAgIGVkaXQ6IFdvcmtzcGFjZUVkaXQgfCB1bmRlZmluZWQsXG4gICk6IHZvaWQge1xuICAgIGlmIChXb3Jrc3BhY2VFZGl0LmlzKGVkaXQpKSB7XG4gICAgICBBcHBseUVkaXRBZGFwdGVyLm9uQXBwbHlFZGl0KHsgZWRpdCB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBhc3luYyBleGVjdXRlQ29tbWFuZChcbiAgICBjb21tYW5kOiBhbnksXG4gICAgY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoQ29tbWFuZC5pcyhjb21tYW5kKSkge1xuICAgICAgYXdhaXQgY29ubmVjdGlvbi5leGVjdXRlQ29tbWFuZCh7XG4gICAgICAgIGNvbW1hbmQ6IGNvbW1hbmQuY29tbWFuZCxcbiAgICAgICAgYXJndW1lbnRzOiBjb21tYW5kLmFyZ3VtZW50cyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGNyZWF0ZUNvZGVBY3Rpb25QYXJhbXMoXG4gICAgbGludGVyQWRhcHRlcjogTGludGVyUHVzaFYyQWRhcHRlcixcbiAgICBlZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgcmFuZ2U6IFJhbmdlLFxuICAgIGRpYWdub3N0aWNzOiBhdG9tSWRlLkRpYWdub3N0aWNbXSxcbiAgKTogQ29kZUFjdGlvblBhcmFtcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHREb2N1bWVudDogQ29udmVydC5lZGl0b3JUb1RleHREb2N1bWVudElkZW50aWZpZXIoZWRpdG9yKSxcbiAgICAgIHJhbmdlOiBDb252ZXJ0LmF0b21SYW5nZVRvTFNSYW5nZShyYW5nZSksXG4gICAgICBjb250ZXh0OiB7XG4gICAgICAgIGRpYWdub3N0aWNzOiBkaWFnbm9zdGljcy5tYXAoKGRpYWdub3N0aWMpID0+IHtcbiAgICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgc3RvcmVkIGRpYWdub3N0aWMgY29kZSBpZiBpdCBleGlzdHMuXG4gICAgICAgICAgLy8gVW50aWwgdGhlIExpbnRlciBBUEkgcHJvdmlkZXMgYSBwbGFjZSB0byBzdG9yZSB0aGUgY29kZSxcbiAgICAgICAgICAvLyB0aGVyZSdzIG5vIHJlYWwgd2F5IGZvciB0aGUgY29kZSBhY3Rpb25zIEFQSSB0byBnaXZlIGl0IGJhY2sgdG8gdXMuXG4gICAgICAgICAgY29uc3QgY29udmVydGVkID0gQ29udmVydC5hdG9tSWRlRGlhZ25vc3RpY1RvTFNEaWFnbm9zdGljKGRpYWdub3N0aWMpO1xuICAgICAgICAgIGlmIChkaWFnbm9zdGljLnJhbmdlICE9IG51bGwgJiYgZGlhZ25vc3RpYy50ZXh0ICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZGUgPSBsaW50ZXJBZGFwdGVyLmdldERpYWdub3N0aWNDb2RlKGVkaXRvciwgZGlhZ25vc3RpYy5yYW5nZSwgZGlhZ25vc3RpYy50ZXh0KTtcbiAgICAgICAgICAgIGlmIChjb2RlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgY29udmVydGVkLmNvZGUgPSBjb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY29udmVydGVkO1xuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuIl19