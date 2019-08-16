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
                    if (change && change.textDocument) {
                        changes[change.textDocument.uri] = change.edits;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHktZWRpdC1hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2FkYXB0ZXJzL2FwcGx5LWVkaXQtYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQ0Esd0NBQWlDO0FBV2pDLDhEQUE4RDtBQUM5RCxNQUFxQixnQkFBZ0I7SUFDbkMsNkVBQTZFO0lBQ3RFLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBb0M7UUFDdkQsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxVQUFVLENBQ3RCLE1BQWtCLEVBQ2xCLEtBQXlCO1FBRXpCLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzdDLElBQUk7WUFDRix5REFBeUQ7WUFDekQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQWlDLEVBQUUsT0FBTyxFQUFFLEVBQUU7Z0JBQzFELGdCQUFnQixDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN6RCxPQUFPLE9BQU8sQ0FBQztZQUNqQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDVCxNQUFNLENBQUMsMkJBQTJCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDL0MsT0FBTyxVQUFV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QUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdEUsTUFBTSxLQUFLLENBQUMsb0NBQW9DLElBQUksRUFBRSxDQUFDLENBQUM7U0FDekQ7UUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7UUFDekMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQzVDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyRCxJQUFJLFVBQVUsSUFBSSxJQUFJLElBQUksUUFBUSxHQUFHLFVBQVUsRUFBRTtZQUMvQyxNQUFNLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxJQUFJLFFBQVEsR0FBRyxDQUFDLElBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDN0U7SUFDSCxDQUFDO0NBQ0Y7QUFwR0QsbUNBb0dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXRvbUlkZSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCB7XG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgQXBwbHlXb3Jrc3BhY2VFZGl0UGFyYW1zLFxuICBBcHBseVdvcmtzcGFjZUVkaXRSZXNwb25zZSxcbn0gZnJvbSAnLi4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IHtcbiAgVGV4dEJ1ZmZlcixcbiAgVGV4dEVkaXRvcixcbn0gZnJvbSAnYXRvbSc7XG5cbi8qKiBQdWJsaWM6IEFkYXB0cyB3b3Jrc3BhY2UvYXBwbHlFZGl0IGNvbW1hbmRzIHRvIGVkaXRvcnMuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcHBseUVkaXRBZGFwdGVyIHtcbiAgLyoqIFB1YmxpYzogQXR0YWNoIHRvIGEge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gdG8gcmVjZWl2ZSBlZGl0IGV2ZW50cy4gKi9cbiAgcHVibGljIHN0YXRpYyBhdHRhY2goY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uKSB7XG4gICAgY29ubmVjdGlvbi5vbkFwcGx5RWRpdCgobSkgPT4gQXBwbHlFZGl0QWRhcHRlci5vbkFwcGx5RWRpdChtKSk7XG4gIH1cblxuICAvKipcbiAgICogVHJpZXMgdG8gYXBwbHkgZWRpdHMgYW5kIHJldmVydHMgaWYgYW55dGhpbmcgZ29lcyB3cm9uZy5cbiAgICogUmV0dXJucyB0aGUgY2hlY2twb2ludCwgc28gdGhlIGNhbGxlciBjYW4gcmV2ZXJ0IGNoYW5nZXMgaWYgbmVlZGVkLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhcHBseUVkaXRzKFxuICAgIGJ1ZmZlcjogVGV4dEJ1ZmZlcixcbiAgICBlZGl0czogYXRvbUlkZS5UZXh0RWRpdFtdLFxuICApOiBudW1iZXIge1xuICAgIGNvbnN0IGNoZWNrcG9pbnQgPSBidWZmZXIuY3JlYXRlQ2hlY2twb2ludCgpO1xuICAgIHRyeSB7XG4gICAgICAvLyBTb3J0IGVkaXRzIGluIHJldmVyc2Ugb3JkZXIgdG8gcHJldmVudCBlZGl0IGNvbmZsaWN0cy5cbiAgICAgIGVkaXRzLnNvcnQoKGVkaXQxLCBlZGl0MikgPT4gLWVkaXQxLm9sZFJhbmdlLmNvbXBhcmUoZWRpdDIub2xkUmFuZ2UpKTtcbiAgICAgIGVkaXRzLnJlZHVjZSgocHJldmlvdXM6IGF0b21JZGUuVGV4dEVkaXQgfCBudWxsLCBjdXJyZW50KSA9PiB7XG4gICAgICAgIEFwcGx5RWRpdEFkYXB0ZXIudmFsaWRhdGVFZGl0KGJ1ZmZlciwgY3VycmVudCwgcHJldmlvdXMpO1xuICAgICAgICBidWZmZXIuc2V0VGV4dEluUmFuZ2UoY3VycmVudC5vbGRSYW5nZSwgY3VycmVudC5uZXdUZXh0KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnQ7XG4gICAgICB9LCBudWxsKTtcbiAgICAgIGJ1ZmZlci5ncm91cENoYW5nZXNTaW5jZUNoZWNrcG9pbnQoY2hlY2twb2ludCk7XG4gICAgICByZXR1cm4gY2hlY2twb2ludDtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGJ1ZmZlci5yZXZlcnRUb0NoZWNrcG9pbnQoY2hlY2twb2ludCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHN0YXRpYyBhc3luYyBvbkFwcGx5RWRpdChwYXJhbXM6IEFwcGx5V29ya3NwYWNlRWRpdFBhcmFtcyk6IFByb21pc2U8QXBwbHlXb3Jrc3BhY2VFZGl0UmVzcG9uc2U+IHtcblxuICAgIGxldCBjaGFuZ2VzID0gcGFyYW1zLmVkaXQuY2hhbmdlcyB8fCB7fTtcblxuICAgIGlmIChwYXJhbXMuZWRpdC5kb2N1bWVudENoYW5nZXMpIHtcbiAgICAgIGNoYW5nZXMgPSB7fTtcbiAgICAgIHBhcmFtcy5lZGl0LmRvY3VtZW50Q2hhbmdlcy5mb3JFYWNoKChjaGFuZ2UpID0+IHtcbiAgICAgICAgaWYgKGNoYW5nZSAmJiBjaGFuZ2UudGV4dERvY3VtZW50KSB7XG4gICAgICAgICAgY2hhbmdlc1tjaGFuZ2UudGV4dERvY3VtZW50LnVyaV0gPSBjaGFuZ2UuZWRpdHM7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHVyaXMgPSBPYmplY3Qua2V5cyhjaGFuZ2VzKTtcblxuICAgIC8vIEtlZXAgY2hlY2twb2ludHMgZnJvbSBhbGwgc3VjY2Vzc2Z1bCBidWZmZXIgZWRpdHNcbiAgICBjb25zdCBjaGVja3BvaW50czogQXJyYXk8eyBidWZmZXI6IFRleHRCdWZmZXIsIGNoZWNrcG9pbnQ6IG51bWJlciB9PiA9IFtdO1xuXG4gICAgY29uc3QgcHJvbWlzZXMgPSB1cmlzLm1hcChhc3luYyAodXJpKSA9PiB7XG4gICAgICBjb25zdCBwYXRoID0gQ29udmVydC51cmlUb1BhdGgodXJpKTtcbiAgICAgIGNvbnN0IGVkaXRvciA9IGF3YWl0IGF0b20ud29ya3NwYWNlLm9wZW4oXG4gICAgICAgIHBhdGgsIHtcbiAgICAgICAgICBzZWFyY2hBbGxQYW5lczogdHJ1ZSxcbiAgICAgICAgICAvLyBPcGVuIG5ldyBlZGl0b3JzIGluIHRoZSBiYWNrZ3JvdW5kLlxuICAgICAgICAgIGFjdGl2YXRlUGFuZTogZmFsc2UsXG4gICAgICAgICAgYWN0aXZhdGVJdGVtOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICkgYXMgVGV4dEVkaXRvcjtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGVkaXRvci5nZXRCdWZmZXIoKTtcbiAgICAgIC8vIEdldCBhbiBleGlzdGluZyBlZGl0b3IgZm9yIHRoZSBmaWxlLCBvciBvcGVuIGEgbmV3IG9uZSBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgY29uc3QgZWRpdHMgPSBDb252ZXJ0LmNvbnZlcnRMc1RleHRFZGl0cyhjaGFuZ2VzW3VyaV0pO1xuICAgICAgY29uc3QgY2hlY2twb2ludCA9IEFwcGx5RWRpdEFkYXB0ZXIuYXBwbHlFZGl0cyhidWZmZXIsIGVkaXRzKTtcbiAgICAgIGNoZWNrcG9pbnRzLnB1c2goeyBidWZmZXIsIGNoZWNrcG9pbnQgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBBcHBseSBhbGwgZWRpdHMgb3IgZmFpbCBhbmQgcmV2ZXJ0IGV2ZXJ5dGhpbmdcbiAgICBjb25zdCBhcHBsaWVkID0gYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpXG4gICAgICAudGhlbigoKSA9PiB0cnVlKVxuICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKCd3b3Jrc3BhY2UvYXBwbHlFZGl0cyBmYWlsZWQnLCB7XG4gICAgICAgICAgZGVzY3JpcHRpb246ICdGYWlsZWQgdG8gYXBwbHkgZWRpdHMuJyxcbiAgICAgICAgICBkZXRhaWw6IGVyci5tZXNzYWdlLFxuICAgICAgICB9KTtcbiAgICAgICAgY2hlY2twb2ludHMuZm9yRWFjaCgoeyBidWZmZXIsIGNoZWNrcG9pbnQgfSkgPT4ge1xuICAgICAgICAgIGJ1ZmZlci5yZXZlcnRUb0NoZWNrcG9pbnQoY2hlY2twb2ludCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcblxuICAgIHJldHVybiB7IGFwcGxpZWQgfTtcbiAgfVxuXG4gIC8qKiBQcml2YXRlOiBEbyBzb21lIGJhc2ljIHNhbml0eSBjaGVja2luZyBvbiB0aGUgZWRpdCByYW5nZXMuICovXG4gIHByaXZhdGUgc3RhdGljIHZhbGlkYXRlRWRpdChcbiAgICBidWZmZXI6IFRleHRCdWZmZXIsXG4gICAgZWRpdDogYXRvbUlkZS5UZXh0RWRpdCxcbiAgICBwcmV2RWRpdDogYXRvbUlkZS5UZXh0RWRpdCB8IG51bGwsXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHBhdGggPSBidWZmZXIuZ2V0UGF0aCgpIHx8ICcnO1xuICAgIGlmIChwcmV2RWRpdCAmJiBlZGl0Lm9sZFJhbmdlLmVuZC5jb21wYXJlKHByZXZFZGl0Lm9sZFJhbmdlLnN0YXJ0KSA+IDApIHtcbiAgICAgIHRocm93IEVycm9yKGBGb3VuZCBvdmVybGFwcGluZyBlZGl0IHJhbmdlcyBpbiAke3BhdGh9YCk7XG4gICAgfVxuICAgIGNvbnN0IHN0YXJ0Um93ID0gZWRpdC5vbGRSYW5nZS5zdGFydC5yb3c7XG4gICAgY29uc3Qgc3RhcnRDb2wgPSBlZGl0Lm9sZFJhbmdlLnN0YXJ0LmNvbHVtbjtcbiAgICBjb25zdCBsaW5lTGVuZ3RoID0gYnVmZmVyLmxpbmVMZW5ndGhGb3JSb3coc3RhcnRSb3cpO1xuICAgIGlmIChsaW5lTGVuZ3RoID09IG51bGwgfHwgc3RhcnRDb2wgPiBsaW5lTGVuZ3RoKSB7XG4gICAgICB0aHJvdyBFcnJvcihgT3V0IG9mIHJhbmdlIGVkaXQgb24gJHtwYXRofToke3N0YXJ0Um93ICsgMX06JHtzdGFydENvbCArIDF9YCk7XG4gICAgfVxuICB9XG59XG4iXX0=