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
/** Public: Adapts workspace/applyEdit commands to editors. */
class ApplyEditAdapter {
    /** Public: Attach to a {LanguageClientConnection} to receive edit events. */
    static attach(connection) {
        connection.onApplyEdit((m) => ApplyEditAdapter.onApplyEdit(m));
    }
    /**
     * Tries to apply edits and reverts if anything goes wrong.
     * Returns the checkpoint, so the caller can revert changes if needed.
     */
    static applyEdits(buffer, edits) {
        const checkpoint = buffer.createCheckpoint();
        try {
            // Sort edits in reverse order to prevent edit conflicts.
            edits.sort((edit1, edit2) => -edit1.oldRange.compare(edit2.oldRange));
            edits.reduce((previous, current) => {
                ApplyEditAdapter.validateEdit(buffer, current, previous);
                buffer.setTextInRange(current.oldRange, current.newText);
                return current;
            }, null);
            buffer.groupChangesSinceCheckpoint(checkpoint);
            return checkpoint;
        }
        catch (err) {
            buffer.revertToCheckpoint(checkpoint);
            throw err;
        }
    }
    static onApplyEdit(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let changes = params.edit.changes || {};
            if (params.edit.documentChanges) {
                changes = {};
                params.edit.documentChanges.forEach((change) => {
                    const edit = change;
                    if (edit) {
                        changes[edit.textDocument.uri] = edit.edits;
                    }
                });
            }
            const uris = Object.keys(changes);
            // Keep checkpoints from all successful buffer edits
            const checkpoints = [];
            const promises = uris.map((uri) => __awaiter(this, void 0, void 0, function* () {
                const path = convert_1.default.uriToPath(uri);
                const editor = yield atom.workspace.open(path, {
                    searchAllPanes: true,
                    // Open new editors in the background.
                    activatePane: false,
                    activateItem: false,
                });
                const buffer = editor.getBuffer();
                // Get an existing editor for the file, or open a new one if it doesn't exist.
                const edits = convert_1.default.convertLsTextEdits(changes[uri]);
                const checkpoint = ApplyEditAdapter.applyEdits(buffer, edits);
                checkpoints.push({ buffer, checkpoint });
            }));
            // Apply all edits or fail and revert everything
            const applied = yield Promise.all(promises)
                .then(() => true)
                .catch((err) => {
                atom.notifications.addError('workspace/applyEdits failed', {
                    description: 'Failed to apply edits.',
                    detail: err.message,
                });
                checkpoints.forEach(({ buffer, checkpoint }) => {
                    buffer.revertToCheckpoint(checkpoint);
                });
                return false;
            });
            return { applied };
        });
    }
    /** Private: Do some basic sanity checking on the edit ranges. */
    static validateEdit(buffer, edit, prevEdit) {
        const path = buffer.getPath() || '';
        if (prevEdit && edit.oldRange.end.compare(prevEdit.oldRange.start) > 0) {
            throw Error(`Found overlapping edit ranges in ${path}`);
        }
        const startRow = edit.oldRange.start.row;
        const startCol = edit.oldRange.start.column;
        const lineLength = buffer.lineLengthForRow(startRow);
        if (lineLength == null || startCol > lineLength) {
            throw Error(`Out of range edit on ${path}:${startRow + 1}:${startCol + 1}`);
        }
    }
}
exports.default = ApplyEditAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHktZWRpdC1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2FkYXB0ZXJzL2FwcGx5LWVkaXQtYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUNBLHdDQUFpQztBQVlqQyw4REFBOEQ7QUFDOUQsTUFBcUIsZ0JBQWdCO0lBQ25DLDZFQUE2RTtJQUN0RSxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQW9DO1FBQ3ZELFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsVUFBVSxDQUN0QixNQUFrQixFQUNsQixLQUF5QjtRQUV6QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM3QyxJQUFJO1lBQ0YseURBQXlEO1lBQ3pELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFpQyxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUMxRCxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDekQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDekQsT0FBTyxPQUFPLENBQUM7WUFDakIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ1QsTUFBTSxDQUFDLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQy9DLE9BQU8sVUFB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LElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RFLE1BQU0sS0FBSyxDQUFDLG9DQUFvQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ3pEO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUM1QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckQsSUFBSSxVQUFVLElBQUksSUFBSSxJQUFJLFFBQVEsR0FBRyxVQUFVLEVBQUU7WUFDL0MsTUFBTSxLQUFLLENBQUMsd0JBQXdCLElBQUksSUFBSSxRQUFRLEdBQUcsQ0FBQyxJQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzdFO0lBQ0gsQ0FBQztDQUNGO0FBckdELG1DQXFHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGF0b21JZGUgZnJvbSAnYXRvbS1pZGUnO1xuaW1wb3J0IENvbnZlcnQgZnJvbSAnLi4vY29udmVydCc7XG5pbXBvcnQge1xuICBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gIEFwcGx5V29ya3NwYWNlRWRpdFBhcmFtcyxcbiAgQXBwbHlXb3Jrc3BhY2VFZGl0UmVzcG9uc2UsXG4gIFRleHREb2N1bWVudEVkaXQsXG59IGZyb20gJy4uL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCB7XG4gIFRleHRCdWZmZXIsXG4gIFRleHRFZGl0b3IsXG59IGZyb20gJ2F0b20nO1xuXG4vKiogUHVibGljOiBBZGFwdHMgd29ya3NwYWNlL2FwcGx5RWRpdCBjb21tYW5kcyB0byBlZGl0b3JzLiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXBwbHlFZGl0QWRhcHRlciB7XG4gIC8qKiBQdWJsaWM6IEF0dGFjaCB0byBhIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHJlY2VpdmUgZWRpdCBldmVudHMuICovXG4gIHB1YmxpYyBzdGF0aWMgYXR0YWNoKGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbikge1xuICAgIGNvbm5lY3Rpb24ub25BcHBseUVkaXQoKG0pID0+IEFwcGx5RWRpdEFkYXB0ZXIub25BcHBseUVkaXQobSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyaWVzIHRvIGFwcGx5IGVkaXRzIGFuZCByZXZlcnRzIGlmIGFueXRoaW5nIGdvZXMgd3JvbmcuXG4gICAqIFJldHVybnMgdGhlIGNoZWNrcG9pbnQsIHNvIHRoZSBjYWxsZXIgY2FuIHJldmVydCBjaGFuZ2VzIGlmIG5lZWRlZC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXBwbHlFZGl0cyhcbiAgICBidWZmZXI6IFRleHRCdWZmZXIsXG4gICAgZWRpdHM6IGF0b21JZGUuVGV4dEVkaXRbXSxcbiAgKTogbnVtYmVyIHtcbiAgICBjb25zdCBjaGVja3BvaW50ID0gYnVmZmVyLmNyZWF0ZUNoZWNrcG9pbnQoKTtcbiAgICB0cnkge1xuICAgICAgLy8gU29ydCBlZGl0cyBpbiByZXZlcnNlIG9yZGVyIHRvIHByZXZlbnQgZWRpdCBjb25mbGljdHMuXG4gICAgICBlZGl0cy5zb3J0KChlZGl0MSwgZWRpdDIpID0+IC1lZGl0MS5vbGRSYW5nZS5jb21wYXJlKGVkaXQyLm9sZFJhbmdlKSk7XG4gICAgICBlZGl0cy5yZWR1Y2UoKHByZXZpb3VzOiBhdG9tSWRlLlRleHRFZGl0IHwgbnVsbCwgY3VycmVudCkgPT4ge1xuICAgICAgICBBcHBseUVkaXRBZGFwdGVyLnZhbGlkYXRlRWRpdChidWZmZXIsIGN1cnJlbnQsIHByZXZpb3VzKTtcbiAgICAgICAgYnVmZmVyLnNldFRleHRJblJhbmdlKGN1cnJlbnQub2xkUmFuZ2UsIGN1cnJlbnQubmV3VGV4dCk7XG4gICAgICAgIHJldHVybiBjdXJyZW50O1xuICAgICAgfSwgbnVsbCk7XG4gICAgICBidWZmZXIuZ3JvdXBDaGFuZ2VzU2luY2VDaGVja3BvaW50KGNoZWNrcG9pbnQpO1xuICAgICAgcmV0dXJuIGNoZWNrcG9pbnQ7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBidWZmZXIucmV2ZXJ0VG9DaGVja3BvaW50KGNoZWNrcG9pbnQpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgb25BcHBseUVkaXQocGFyYW1zOiBBcHBseVdvcmtzcGFjZUVkaXRQYXJhbXMpOiBQcm9taXNlPEFwcGx5V29ya3NwYWNlRWRpdFJlc3BvbnNlPiB7XG5cbiAgICBsZXQgY2hhbmdlcyA9IHBhcmFtcy5lZGl0LmNoYW5nZXMgfHwge307XG5cbiAgICBpZiAocGFyYW1zLmVkaXQuZG9jdW1lbnRDaGFuZ2VzKSB7XG4gICAgICBjaGFuZ2VzID0ge307XG4gICAgICBwYXJhbXMuZWRpdC5kb2N1bWVudENoYW5nZXMuZm9yRWFjaCgoY2hhbmdlKSA9PiB7XG4gICAgICAgIGNvbnN0IGVkaXQgPSBjaGFuZ2UgYXMgVGV4dERvY3VtZW50RWRpdDtcbiAgICAgICAgaWYgKGVkaXQpIHtcbiAgICAgICAgICBjaGFuZ2VzW2VkaXQudGV4dERvY3VtZW50LnVyaV0gPSBlZGl0LmVkaXRzO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmlzID0gT2JqZWN0LmtleXMoY2hhbmdlcyk7XG5cbiAgICAvLyBLZWVwIGNoZWNrcG9pbnRzIGZyb20gYWxsIHN1Y2Nlc3NmdWwgYnVmZmVyIGVkaXRzXG4gICAgY29uc3QgY2hlY2twb2ludHM6IHsgYnVmZmVyOiBUZXh0QnVmZmVyLCBjaGVja3BvaW50OiBudW1iZXIgfVtdID0gW107XG5cbiAgICBjb25zdCBwcm9taXNlcyA9IHVyaXMubWFwKGFzeW5jICh1cmkpID0+IHtcbiAgICAgIGNvbnN0IHBhdGggPSBDb252ZXJ0LnVyaVRvUGF0aCh1cmkpO1xuICAgICAgY29uc3QgZWRpdG9yID0gYXdhaXQgYXRvbS53b3Jrc3BhY2Uub3BlbihcbiAgICAgICAgcGF0aCwge1xuICAgICAgICAgIHNlYXJjaEFsbFBhbmVzOiB0cnVlLFxuICAgICAgICAgIC8vIE9wZW4gbmV3IGVkaXRvcnMgaW4gdGhlIGJhY2tncm91bmQuXG4gICAgICAgICAgYWN0aXZhdGVQYW5lOiBmYWxzZSxcbiAgICAgICAgICBhY3RpdmF0ZUl0ZW06IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgKSBhcyBUZXh0RWRpdG9yO1xuICAgICAgY29uc3QgYnVmZmVyID0gZWRpdG9yLmdldEJ1ZmZlcigpO1xuICAgICAgLy8gR2V0IGFuIGV4aXN0aW5nIGVkaXRvciBmb3IgdGhlIGZpbGUsIG9yIG9wZW4gYSBuZXcgb25lIGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAgICBjb25zdCBlZGl0cyA9IENvbnZlcnQuY29udmVydExzVGV4dEVkaXRzKGNoYW5nZXNbdXJpXSk7XG4gICAgICBjb25zdCBjaGVja3BvaW50ID0gQXBwbHlFZGl0QWRhcHRlci5hcHBseUVkaXRzKGJ1ZmZlciwgZWRpdHMpO1xuICAgICAgY2hlY2twb2ludHMucHVzaCh7IGJ1ZmZlciwgY2hlY2twb2ludCB9KTtcbiAgICB9KTtcblxuICAgIC8vIEFwcGx5IGFsbCBlZGl0cyBvciBmYWlsIGFuZCByZXZlcnQgZXZlcnl0aGluZ1xuICAgIGNvbnN0IGFwcGxpZWQgPSBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcylcbiAgICAgIC50aGVuKCgpID0+IHRydWUpXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoJ3dvcmtzcGFjZS9hcHBseUVkaXRzIGZhaWxlZCcsIHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZhaWxlZCB0byBhcHBseSBlZGl0cy4nLFxuICAgICAgICAgIGRldGFpbDogZXJyLm1lc3NhZ2UsXG4gICAgICAgIH0pO1xuICAgICAgICBjaGVja3BvaW50cy5mb3JFYWNoKCh7IGJ1ZmZlciwgY2hlY2twb2ludCB9KSA9PiB7XG4gICAgICAgICAgYnVmZmVyLnJldmVydFRvQ2hlY2twb2ludChjaGVja3BvaW50KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgYXBwbGllZCB9O1xuICB9XG5cbiAgLyoqIFByaXZhdGU6IERvIHNvbWUgYmFzaWMgc2FuaXR5IGNoZWNraW5nIG9uIHRoZSBlZGl0IHJhbmdlcy4gKi9cbiAgcHJpdmF0ZSBzdGF0aWMgdmFsaWRhdGVFZGl0KFxuICAgIGJ1ZmZlcjogVGV4dEJ1ZmZlcixcbiAgICBlZGl0OiBhdG9tSWRlLlRleHRFZGl0LFxuICAgIHByZXZFZGl0OiBhdG9tSWRlLlRleHRFZGl0IHwgbnVsbCxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF0aCA9IGJ1ZmZlci5nZXRQYXRoKCkgfHwgJyc7XG4gICAgaWYgKHByZXZFZGl0ICYmIGVkaXQub2xkUmFuZ2UuZW5kLmNvbXBhcmUocHJldkVkaXQub2xkUmFuZ2Uuc3RhcnQpID4gMCkge1xuICAgICAgdGhyb3cgRXJyb3IoYEZvdW5kIG92ZXJsYXBwaW5nIGVkaXQgcmFuZ2VzIGluICR7cGF0aH1gKTtcbiAgICB9XG4gICAgY29uc3Qgc3RhcnRSb3cgPSBlZGl0Lm9sZFJhbmdlLnN0YXJ0LnJvdztcbiAgICBjb25zdCBzdGFydENvbCA9IGVkaXQub2xkUmFuZ2Uuc3RhcnQuY29sdW1uO1xuICAgIGNvbnN0IGxpbmVMZW5ndGggPSBidWZmZXIubGluZUxlbmd0aEZvclJvdyhzdGFydFJvdyk7XG4gICAgaWYgKGxpbmVMZW5ndGggPT0gbnVsbCB8fCBzdGFydENvbCA+IGxpbmVMZW5ndGgpIHtcbiAgICAgIHRocm93IEVycm9yKGBPdXQgb2YgcmFuZ2UgZWRpdCBvbiAke3BhdGh9OiR7c3RhcnRSb3cgKyAxfToke3N0YXJ0Q29sICsgMX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==