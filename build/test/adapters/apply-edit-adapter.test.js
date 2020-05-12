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
const chai_1 = require("chai");
const path = require("path");
const sinon = require("sinon");
const apply_edit_adapter_1 = require("../../lib/adapters/apply-edit-adapter");
const convert_1 = require("../../lib/convert");
const TEST_PATH1 = normalizeDriveLetterName(path.join(__dirname, 'test.txt'));
const TEST_PATH2 = normalizeDriveLetterName(path.join(__dirname, 'test2.txt'));
const TEST_PATH3 = normalizeDriveLetterName(path.join(__dirname, 'test3.txt'));
const TEST_PATH4 = normalizeDriveLetterName(path.join(__dirname, 'test4.txt'));
function normalizeDriveLetterName(filePath) {
    if (process.platform === 'win32') {
        return filePath.replace(/^([a-z]):/, ([driveLetter]) => driveLetter.toUpperCase() + ':');
    }
    else {
        return filePath;
    }
}
describe('ApplyEditAdapter', () => {
    describe('onApplyEdit', () => {
        beforeEach(() => {
            sinon.spy(atom.notifications, 'addError');
        });
        afterEach(() => {
            atom.notifications.addError.restore();
        });
        it('works for open files', () => __awaiter(void 0, void 0, void 0, function* () {
            const editor = yield atom.workspace.open(TEST_PATH1);
            editor.setText('abc\ndef\n');
            const result = yield apply_edit_adapter_1.default.onApplyEdit({
                edit: {
                    changes: {
                        [convert_1.default.pathToUri(TEST_PATH1)]: [
                            {
                                range: {
                                    start: { line: 0, character: 0 },
                                    end: { line: 0, character: 3 },
                                },
                                newText: 'def',
                            },
                            {
                                range: {
                                    start: { line: 1, character: 0 },
                                    end: { line: 1, character: 3 },
                                },
                                newText: 'ghi',
                            },
                        ],
                    },
                },
            });
            chai_1.expect(result.applied).to.equal(true);
            chai_1.expect(editor.getText()).to.equal('def\nghi\n');
            // Undo should be atomic.
            editor.getBuffer().undo();
            chai_1.expect(editor.getText()).to.equal('abc\ndef\n');
        }));
        it('works with TextDocumentEdits', () => __awaiter(void 0, void 0, void 0, function* () {
            const editor = yield atom.workspace.open(TEST_PATH1);
            editor.setText('abc\ndef\n');
            const result = yield apply_edit_adapter_1.default.onApplyEdit({
                edit: {
                    documentChanges: [{
                            textDocument: {
                                version: 1,
                                uri: convert_1.default.pathToUri(TEST_PATH1),
                            },
                            edits: [
                                {
                                    range: {
                                        start: { line: 0, character: 0 },
                                        end: { line: 0, character: 3 },
                                    },
                                    newText: 'def',
                                },
                                {
                                    range: {
                                        start: { line: 1, character: 0 },
                                        end: { line: 1, character: 3 },
                                    },
                                    newText: 'ghi',
                                },
                            ],
                        }],
                },
            });
            chai_1.expect(result.applied).to.equal(true);
            chai_1.expect(editor.getText()).to.equal('def\nghi\n');
            // Undo should be atomic.
            editor.getBuffer().undo();
            chai_1.expect(editor.getText()).to.equal('abc\ndef\n');
        }));
        it('opens files that are not already open', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield apply_edit_adapter_1.default.onApplyEdit({
                edit: {
                    changes: {
                        [TEST_PATH2]: [
                            {
                                range: {
                                    start: { line: 0, character: 0 },
                                    end: { line: 0, character: 0 },
                                },
                                newText: 'abc',
                            },
                        ],
                    },
                },
            });
            chai_1.expect(result.applied).to.equal(true);
            const editor = yield atom.workspace.open(TEST_PATH2);
            chai_1.expect(editor.getText()).to.equal('abc');
        }));
        it('fails with overlapping edits', () => __awaiter(void 0, void 0, void 0, function* () {
            const editor = yield atom.workspace.open(TEST_PATH3);
            editor.setText('abcdef\n');
            const result = yield apply_edit_adapter_1.default.onApplyEdit({
                edit: {
                    changes: {
                        [TEST_PATH3]: [
                            {
                                range: {
                                    start: { line: 0, character: 0 },
                                    end: { line: 0, character: 3 },
                                },
                                newText: 'def',
                            },
                            {
                                range: {
                                    start: { line: 0, character: 2 },
                                    end: { line: 0, character: 4 },
                                },
                                newText: 'ghi',
                            },
                        ],
                    },
                },
            });
            chai_1.expect(result.applied).to.equal(false);
            chai_1.expect(atom.notifications.addError.calledWith('workspace/applyEdits failed', {
                description: 'Failed to apply edits.',
                detail: `Found overlapping edit ranges in ${TEST_PATH3}`,
            })).to.equal(true);
            // No changes.
            chai_1.expect(editor.getText()).to.equal('abcdef\n');
        }));
        it('fails with out-of-range edits', () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield apply_edit_adapter_1.default.onApplyEdit({
                edit: {
                    changes: {
                        [TEST_PATH4]: [
                            {
                                range: {
                                    start: { line: 0, character: 1 },
                                    end: { line: 0, character: 2 },
                                },
                                newText: 'def',
                            },
                        ],
                    },
                },
            });
            chai_1.expect(result.applied).to.equal(false);
            const errorCalls = atom.notifications.addError.getCalls();
            chai_1.expect(errorCalls.length).to.equal(1);
            chai_1.expect(errorCalls[0].args[1].detail).to.equal(`Out of range edit on ${TEST_PATH4}:1:2`);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHktZWRpdC1hZGFwdGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0L2FkYXB0ZXJzL2FwcGx5LWVkaXQtYWRhcHRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsK0JBQThCO0FBQzlCLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFDL0IsOEVBQXFFO0FBQ3JFLCtDQUF3QztBQUd4QyxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzlFLE1BQU0sVUFBVSxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDL0UsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztBQUMvRSxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0FBRS9FLFNBQVMsd0JBQXdCLENBQUMsUUFBZ0I7SUFDaEQsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRTtRQUNoQyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0tBQzFGO1NBQU07UUFDTCxPQUFPLFFBQVEsQ0FBQztLQUNqQjtBQUNILENBQUM7QUFFRCxRQUFRLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQzNCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZCxLQUFL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QUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsVUFBVSxNQUFNLENBQUMsQ0FBQztRQUMxRixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGV4cGVjdCB9IGZyb20gJ2NoYWknO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHNpbm9uIGZyb20gJ3Npbm9uJztcbmltcG9ydCBBcHBseUVkaXRBZGFwdGVyIGZyb20gJy4uLy4uL2xpYi9hZGFwdGVycy9hcHBseS1lZGl0LWFkYXB0ZXInO1xuaW1wb3J0IENvbnZlcnQgZnJvbSAnLi4vLi4vbGliL2NvbnZlcnQnO1xuaW1wb3J0IHsgVGV4dEVkaXRvciB9IGZyb20gJ2F0b20nO1xuXG5jb25zdCBURVNUX1BBVEgxID0gbm9ybWFsaXplRHJpdmVMZXR0ZXJOYW1lKHBhdGguam9pbihfX2Rpcm5hbWUsICd0ZXN0LnR4dCcpKTtcbmNvbnN0IFRFU1RfUEFUSDIgPSBub3JtYWxpemVEcml2ZUxldHRlck5hbWUocGF0aC5qb2luKF9fZGlybmFtZSwgJ3Rlc3QyLnR4dCcpKTtcbmNvbnN0IFRFU1RfUEFUSDMgPSBub3JtYWxpemVEcml2ZUxldHRlck5hbWUocGF0aC5qb2luKF9fZGlybmFtZSwgJ3Rlc3QzLnR4dCcpKTtcbmNvbnN0IFRFU1RfUEFUSDQgPSBub3JtYWxpemVEcml2ZUxldHRlck5hbWUocGF0aC5qb2luKF9fZGlybmFtZSwgJ3Rlc3Q0LnR4dCcpKTtcblxuZnVuY3Rpb24gbm9ybWFsaXplRHJpdmVMZXR0ZXJOYW1lKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC9eKFthLXpdKTovLCAoW2RyaXZlTGV0dGVyXSkgPT4gZHJpdmVMZXR0ZXIudG9VcHBlckNhc2UoKSArICc6Jyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZpbGVQYXRoO1xuICB9XG59XG5cbmRlc2NyaWJlKCdBcHBseUVkaXRBZGFwdGVyJywgKCkgPT4ge1xuICBkZXNjcmliZSgnb25BcHBseUVkaXQnLCAoKSA9PiB7XG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICBzaW5vbi5zcHkoYXRvbS5ub3RpZmljYXRpb25zLCAnYWRkRXJyb3InKTtcbiAgICB9KTtcblxuICAgIGFmdGVyRWFjaCgoKSA9PiB7XG4gICAgICAoYXRvbSBhcyBhbnkpLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IucmVzdG9yZSgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3dvcmtzIGZvciBvcGVuIGZpbGVzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZWRpdG9yID0gYXdhaXQgYXRvbS53b3Jrc3BhY2Uub3BlbihURVNUX1BBVEgxKSBhcyBUZXh0RWRpdG9yO1xuICAgICAgZWRpdG9yLnNldFRleHQoJ2FiY1xcbmRlZlxcbicpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBBcHBseUVkaXRBZGFwdGVyLm9uQXBwbHlFZGl0KHtcbiAgICAgICAgZWRpdDoge1xuICAgICAgICAgIGNoYW5nZXM6IHtcbiAgICAgICAgICAgIFtDb252ZXJ0LnBhdGhUb1VyaShURVNUX1BBVEgxKV06IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICAgICAgICBzdGFydDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDAgfSxcbiAgICAgICAgICAgICAgICAgIGVuZDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDMgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5ld1RleHQ6ICdkZWYnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmFuZ2U6IHtcbiAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7IGxpbmU6IDEsIGNoYXJhY3RlcjogMCB9LFxuICAgICAgICAgICAgICAgICAgZW5kOiB7IGxpbmU6IDEsIGNoYXJhY3RlcjogMyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbmV3VGV4dDogJ2doaScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5hcHBsaWVkKS50by5lcXVhbCh0cnVlKTtcbiAgICAgIGV4cGVjdChlZGl0b3IuZ2V0VGV4dCgpKS50by5lcXVhbCgnZGVmXFxuZ2hpXFxuJyk7XG5cbiAgICAgIC8vIFVuZG8gc2hvdWxkIGJlIGF0b21pYy5cbiAgICAgIGVkaXRvci5nZXRCdWZmZXIoKS51bmRvKCk7XG4gICAgICBleHBlY3QoZWRpdG9yLmdldFRleHQoKSkudG8uZXF1YWwoJ2FiY1xcbmRlZlxcbicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3dvcmtzIHdpdGggVGV4dERvY3VtZW50RWRpdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBlZGl0b3IgPSBhd2FpdCBhdG9tLndvcmtzcGFjZS5vcGVuKFRFU1RfUEFUSDEpIGFzIFRleHRFZGl0b3I7XG4gICAgICBlZGl0b3Iuc2V0VGV4dCgnYWJjXFxuZGVmXFxuJyk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEFwcGx5RWRpdEFkYXB0ZXIub25BcHBseUVkaXQoe1xuICAgICAgICBlZGl0OiB7XG4gICAgICAgICAgZG9jdW1lbnRDaGFuZ2VzOiBbe1xuICAgICAgICAgICAgdGV4dERvY3VtZW50OiB7XG4gICAgICAgICAgICAgIHZlcnNpb246IDEsXG4gICAgICAgICAgICAgIHVyaTogQ29udmVydC5wYXRoVG9VcmkoVEVTVF9QQVRIMSksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZWRpdHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICAgICAgICBzdGFydDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDAgfSxcbiAgICAgICAgICAgICAgICAgIGVuZDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDMgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5ld1RleHQ6ICdkZWYnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmFuZ2U6IHtcbiAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7IGxpbmU6IDEsIGNoYXJhY3RlcjogMCB9LFxuICAgICAgICAgICAgICAgICAgZW5kOiB7IGxpbmU6IDEsIGNoYXJhY3RlcjogMyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbmV3VGV4dDogJ2doaScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuYXBwbGllZCkudG8uZXF1YWwodHJ1ZSk7XG4gICAgICBleHBlY3QoZWRpdG9yLmdldFRleHQoKSkudG8uZXF1YWwoJ2RlZlxcbmdoaVxcbicpO1xuXG4gICAgICAvLyBVbmRvIHNob3VsZCBiZSBhdG9taWMuXG4gICAgICBlZGl0b3IuZ2V0QnVmZmVyKCkudW5kbygpO1xuICAgICAgZXhwZWN0KGVkaXRvci5nZXRUZXh0KCkpLnRvLmVxdWFsKCdhYmNcXG5kZWZcXG4nKTtcbiAgICB9KTtcblxuICAgIGl0KCdvcGVucyBmaWxlcyB0aGF0IGFyZSBub3QgYWxyZWFkeSBvcGVuJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgQXBwbHlFZGl0QWRhcHRlci5vbkFwcGx5RWRpdCh7XG4gICAgICAgIGVkaXQ6IHtcbiAgICAgICAgICBjaGFuZ2VzOiB7XG4gICAgICAgICAgICBbVEVTVF9QQVRIMl06IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICAgICAgICBzdGFydDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDAgfSxcbiAgICAgICAgICAgICAgICAgIGVuZDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5ld1RleHQ6ICdhYmMnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuYXBwbGllZCkudG8uZXF1YWwodHJ1ZSk7XG4gICAgICBjb25zdCBlZGl0b3IgPSBhd2FpdCBhdG9tLndvcmtzcGFjZS5vcGVuKFRFU1RfUEFUSDIpIGFzIFRleHRFZGl0b3I7XG4gICAgICBleHBlY3QoZWRpdG9yLmdldFRleHQoKSkudG8uZXF1YWwoJ2FiYycpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2ZhaWxzIHdpdGggb3ZlcmxhcHBpbmcgZWRpdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBlZGl0b3IgPSBhd2FpdCBhdG9tLndvcmtzcGFjZS5vcGVuKFRFU1RfUEFUSDMpIGFzIFRleHRFZGl0b3I7XG4gICAgICBlZGl0b3Iuc2V0VGV4dCgnYWJjZGVmXFxuJyk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEFwcGx5RWRpdEFkYXB0ZXIub25BcHBseUVkaXQoe1xuICAgICAgICBlZGl0OiB7XG4gICAgICAgICAgY2hhbmdlczoge1xuICAgICAgICAgICAgW1RFU1RfUEFUSDNdOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByYW5nZToge1xuICAgICAgICAgICAgICAgICAgc3RhcnQ6IHsgbGluZTogMCwgY2hhcmFjdGVyOiAwIH0sXG4gICAgICAgICAgICAgICAgICBlbmQ6IHsgbGluZTogMCwgY2hhcmFjdGVyOiAzIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBuZXdUZXh0OiAnZGVmJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICAgICAgICBzdGFydDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDIgfSxcbiAgICAgICAgICAgICAgICAgIGVuZDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDQgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5ld1RleHQ6ICdnaGknLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuYXBwbGllZCkudG8uZXF1YWwoZmFsc2UpO1xuICAgICAgZXhwZWN0KFxuICAgICAgICAoYXRvbSBhcyBhbnkpLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IuY2FsbGVkV2l0aCgnd29ya3NwYWNlL2FwcGx5RWRpdHMgZmFpbGVkJywge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmFpbGVkIHRvIGFwcGx5IGVkaXRzLicsXG4gICAgICAgICAgZGV0YWlsOiBgRm91bmQgb3ZlcmxhcHBpbmcgZWRpdCByYW5nZXMgaW4gJHtURVNUX1BBVEgzfWAsXG4gICAgICAgIH0pLFxuICAgICAgKS50by5lcXVhbCh0cnVlKTtcbiAgICAgIC8vIE5vIGNoYW5nZXMuXG4gICAgICBleHBlY3QoZWRpdG9yLmdldFRleHQoKSkudG8uZXF1YWwoJ2FiY2RlZlxcbicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2ZhaWxzIHdpdGggb3V0LW9mLXJhbmdlIGVkaXRzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgQXBwbHlFZGl0QWRhcHRlci5vbkFwcGx5RWRpdCh7XG4gICAgICAgIGVkaXQ6IHtcbiAgICAgICAgICBjaGFuZ2VzOiB7XG4gICAgICAgICAgICBbVEVTVF9QQVRINF06IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICAgICAgICBzdGFydDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDEgfSxcbiAgICAgICAgICAgICAgICAgIGVuZDogeyBsaW5lOiAwLCBjaGFyYWN0ZXI6IDIgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5ld1RleHQ6ICdkZWYnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuYXBwbGllZCkudG8uZXF1YWwoZmFsc2UpO1xuICAgICAgY29uc3QgZXJyb3JDYWxscyA9IChhdG9tIGFzIGFueSkubm90aWZpY2F0aW9ucy5hZGRFcnJvci5nZXRDYWxscygpO1xuICAgICAgZXhwZWN0KGVycm9yQ2FsbHMubGVuZ3RoKS50by5lcXVhbCgxKTtcbiAgICAgIGV4cGVjdChlcnJvckNhbGxzWzBdLmFyZ3NbMV0uZGV0YWlsKS50by5lcXVhbChgT3V0IG9mIHJhbmdlIGVkaXQgb24gJHtURVNUX1BBVEg0fToxOjJgKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==