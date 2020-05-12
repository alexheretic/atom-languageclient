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
const vscode_jsonrpc_1 = require("vscode-jsonrpc");
/**
 * Obtain the range of the word at the given editor position.
 * Uses the non-word characters from the position's grammar scope.
 */
function getWordAtPosition(editor, position) {
    const nonWordCharacters = escapeRegExp(editor.getNonWordCharacters(position));
    const range = _getRegexpRangeAtPosition(editor.getBuffer(), position, new RegExp(`^[\t ]*$|[^\\s${nonWordCharacters}]+`, 'g'));
    if (range == null) {
        return new atom_1.Range(position, position);
    }
    return range;
}
exports.getWordAtPosition = getWordAtPosition;
function escapeRegExp(string) {
    // From atom/underscore-plus.
    return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
exports.escapeRegExp = escapeRegExp;
function _getRegexpRangeAtPosition(buffer, position, wordRegex) {
    const { row, column } = position;
    const rowRange = buffer.rangeForRow(row, false);
    let matchData;
    // Extract the expression from the row text.
    buffer.scanInRange(wordRegex, rowRange, (data) => {
        const { range } = data;
        if (position.isGreaterThanOrEqual(range.start) &&
            // Range endpoints are exclusive.
            position.isLessThan(range.end)) {
            matchData = data;
            data.stop();
            return;
        }
        // Stop the scan if the scanner has passed our position.
        if (range.end.column > column) {
            data.stop();
        }
    });
    return matchData == null ? null : matchData.range;
}
/**
 * For the given connection and cancellationTokens map, cancel the existing
 * CancellationToken for that connection then create and store a new
 * CancellationToken to be used for the current request.
 */
function cancelAndRefreshCancellationToken(key, cancellationTokens) {
    let cancellationToken = cancellationTokens.get(key);
    if (cancellationToken !== undefined && !cancellationToken.token.isCancellationRequested) {
        cancellationToken.cancel();
    }
    cancellationToken = new vscode_jsonrpc_1.CancellationTokenSource();
    cancellationTokens.set(key, cancellationToken);
    return cancellationToken.token;
}
exports.cancelAndRefreshCancellationToken = cancelAndRefreshCancellationToken;
function doWithCancellationToken(key, cancellationTokens, work) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = cancelAndRefreshCancellationToken(key, cancellationTokens);
        const result = yield work(token);
        cancellationTokens.delete(key);
        return result;
    });
}
exports.doWithCancellationToken = doWithCancellationToken;
function assertUnreachable(_) {
    return _;
}
exports.assertUnreachable = assertUnreachable;
function promiseWithTimeout(ms, promise) {
    return new Promise((resolve, reject) => {
        // create a timeout to reject promise if not resolved
        const timer = setTimeout(() => {
            reject(new Error(`Timeout after ${ms}ms`));
        }, ms);
        promise.then((res) => {
            clearTimeout(timer);
            resolve(res);
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
exports.promiseWithTimeout = promiseWithTimeout;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSwrQkFNYztBQUNkLG1EQUd3QjtBQU94Qjs7O0dBR0c7QUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxNQUFrQixFQUFFLFFBQWU7SUFDbkUsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDOUUsTUFBTSxLQUFLLEdBQUcseUJBQXlCLENBQ3JDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFDbEIsUUFBUSxFQUNSLElBQUksTUFBTSxDQUFDLGlCQUFpQixpQkFBaUIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUN4RCxDQUFDO0lBQ0YsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1FBQ2pCLE9BQU8sSUFBSSxZQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQ3RDO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBWEQsOENBV0M7QUFFRCxTQUFnQixZQUFZLENBQUMsTUFBYztJQUN6Qyw2QkFBNkI7SUFDN0IsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFIRCxvQ0FHQztBQUVELFNBQVMseUJBQXlCLENBQUMsTUFBa0IsRUFBRSxRQUFlLEVBQUUsU0FBaUI7SUFDdkYsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUM7SUFDakMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEQsSUFBSSxTQUE4QyxDQUFDO0lBQ25ELDRDQUE0QztJQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUMvQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQ0UsUUFBUSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDMUMsaUNBQWlDO1lBQ2pDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUM5QjtZQUNBLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDakIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osT0FBTztTQUNSO1FBQ0Qsd0RBQXdEO1FBQ3hELElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsTUFBTSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNiO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztBQUNwRCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLGlDQUFpQyxDQUMvQyxHQUFNLEVBQ04sa0JBQXVEO0lBRXZELElBQUksaUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BELElBQUksaUJBQWlCLEtBQUssU0FBUyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFO1FBQ3ZGLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQzVCO0lBRUQsaUJBQWlCLEdBQUcsSUFBSSx3Q0FBdUIsRUFBRSxDQUFDO0lBQ2xELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUMvQyxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQztBQUNqQyxDQUFDO0FBWkQsOEVBWUM7QUFFRCxTQUFzQix1QkFBdUIsQ0FDM0MsR0FBTyxFQUNQLGtCQUF3RCxFQUN4RCxJQUErQzs7UUFFL0MsTUFBTSxLQUFLLEdBQUcsaUNBQWlDLENBQUMsR0FBRyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDekUsTUFBTSxNQUFNLEdBQU8sTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQVRELDBEQVNDO0FBRUQsU0FBZ0IsaUJBQWlCLENBQUMsQ0FBUTtJQUN4QyxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUM7QUFGRCw4Q0FFQztBQUVELFNBQWdCLGtCQUFrQixDQUFJLEVBQVUsRUFBRSxPQUFtQjtJQUNuRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLHFEQUFxRDtRQUNyRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVQLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNuQixZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDZixZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFmRCxnREFlQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIFBvaW50LFxuICBUZXh0QnVmZmVyLFxuICBUZXh0RWRpdG9yLFxuICBSYW5nZSxcbiAgQnVmZmVyU2NhblJlc3VsdCxcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQge1xuICBDYW5jZWxsYXRpb25Ub2tlbixcbiAgQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UsXG59IGZyb20gJ3ZzY29kZS1qc29ucnBjJztcblxuZXhwb3J0IHR5cGUgUmVwb3J0QnVzeVdoaWxlID0gPFQ+KFxuICB0aXRsZTogc3RyaW5nLFxuICBmOiAoKSA9PiBQcm9taXNlPFQ+LFxuKSA9PiBQcm9taXNlPFQ+O1xuXG4vKipcbiAqIE9idGFpbiB0aGUgcmFuZ2Ugb2YgdGhlIHdvcmQgYXQgdGhlIGdpdmVuIGVkaXRvciBwb3NpdGlvbi5cbiAqIFVzZXMgdGhlIG5vbi13b3JkIGNoYXJhY3RlcnMgZnJvbSB0aGUgcG9zaXRpb24ncyBncmFtbWFyIHNjb3BlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29yZEF0UG9zaXRpb24oZWRpdG9yOiBUZXh0RWRpdG9yLCBwb3NpdGlvbjogUG9pbnQpOiBSYW5nZSB7XG4gIGNvbnN0IG5vbldvcmRDaGFyYWN0ZXJzID0gZXNjYXBlUmVnRXhwKGVkaXRvci5nZXROb25Xb3JkQ2hhcmFjdGVycyhwb3NpdGlvbikpO1xuICBjb25zdCByYW5nZSA9IF9nZXRSZWdleHBSYW5nZUF0UG9zaXRpb24oXG4gICAgZWRpdG9yLmdldEJ1ZmZlcigpLFxuICAgIHBvc2l0aW9uLFxuICAgIG5ldyBSZWdFeHAoYF5bXFx0IF0qJHxbXlxcXFxzJHtub25Xb3JkQ2hhcmFjdGVyc31dK2AsICdnJyksXG4gICk7XG4gIGlmIChyYW5nZSA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG5ldyBSYW5nZShwb3NpdGlvbiwgcG9zaXRpb24pO1xuICB9XG4gIHJldHVybiByYW5nZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZVJlZ0V4cChzdHJpbmc6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIEZyb20gYXRvbS91bmRlcnNjb3JlLXBsdXMuXG4gIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy0vXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xufVxuXG5mdW5jdGlvbiBfZ2V0UmVnZXhwUmFuZ2VBdFBvc2l0aW9uKGJ1ZmZlcjogVGV4dEJ1ZmZlciwgcG9zaXRpb246IFBvaW50LCB3b3JkUmVnZXg6IFJlZ0V4cCk6IFJhbmdlIHwgbnVsbCB7XG4gIGNvbnN0IHsgcm93LCBjb2x1bW4gfSA9IHBvc2l0aW9uO1xuICBjb25zdCByb3dSYW5nZSA9IGJ1ZmZlci5yYW5nZUZvclJvdyhyb3csIGZhbHNlKTtcbiAgbGV0IG1hdGNoRGF0YTogQnVmZmVyU2NhblJlc3VsdCB8IHVuZGVmaW5lZCB8IG51bGw7XG4gIC8vIEV4dHJhY3QgdGhlIGV4cHJlc3Npb24gZnJvbSB0aGUgcm93IHRleHQuXG4gIGJ1ZmZlci5zY2FuSW5SYW5nZSh3b3JkUmVnZXgsIHJvd1JhbmdlLCAoZGF0YSkgPT4ge1xuICAgIGNvbnN0IHsgcmFuZ2UgfSA9IGRhdGE7XG4gICAgaWYgKFxuICAgICAgcG9zaXRpb24uaXNHcmVhdGVyVGhhbk9yRXF1YWwocmFuZ2Uuc3RhcnQpICYmXG4gICAgICAvLyBSYW5nZSBlbmRwb2ludHMgYXJlIGV4Y2x1c2l2ZS5cbiAgICAgIHBvc2l0aW9uLmlzTGVzc1RoYW4ocmFuZ2UuZW5kKVxuICAgICkge1xuICAgICAgbWF0Y2hEYXRhID0gZGF0YTtcbiAgICAgIGRhdGEuc3RvcCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBTdG9wIHRoZSBzY2FuIGlmIHRoZSBzY2FubmVyIGhhcyBwYXNzZWQgb3VyIHBvc2l0aW9uLlxuICAgIGlmIChyYW5nZS5lbmQuY29sdW1uID4gY29sdW1uKSB7XG4gICAgICBkYXRhLnN0b3AoKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbWF0Y2hEYXRhID09IG51bGwgPyBudWxsIDogbWF0Y2hEYXRhLnJhbmdlO1xufVxuXG4vKipcbiAqIEZvciB0aGUgZ2l2ZW4gY29ubmVjdGlvbiBhbmQgY2FuY2VsbGF0aW9uVG9rZW5zIG1hcCwgY2FuY2VsIHRoZSBleGlzdGluZ1xuICogQ2FuY2VsbGF0aW9uVG9rZW4gZm9yIHRoYXQgY29ubmVjdGlvbiB0aGVuIGNyZWF0ZSBhbmQgc3RvcmUgYSBuZXdcbiAqIENhbmNlbGxhdGlvblRva2VuIHRvIGJlIHVzZWQgZm9yIHRoZSBjdXJyZW50IHJlcXVlc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW5jZWxBbmRSZWZyZXNoQ2FuY2VsbGF0aW9uVG9rZW48VCBleHRlbmRzIG9iamVjdD4oXG4gIGtleTogVCxcbiAgY2FuY2VsbGF0aW9uVG9rZW5zOiBXZWFrTWFwPFQsIENhbmNlbGxhdGlvblRva2VuU291cmNlPik6IENhbmNlbGxhdGlvblRva2VuIHtcblxuICBsZXQgY2FuY2VsbGF0aW9uVG9rZW4gPSBjYW5jZWxsYXRpb25Ub2tlbnMuZ2V0KGtleSk7XG4gIGlmIChjYW5jZWxsYXRpb25Ub2tlbiAhPT0gdW5kZWZpbmVkICYmICFjYW5jZWxsYXRpb25Ub2tlbi50b2tlbi5pc0NhbmNlbGxhdGlvblJlcXVlc3RlZCkge1xuICAgIGNhbmNlbGxhdGlvblRva2VuLmNhbmNlbCgpO1xuICB9XG5cbiAgY2FuY2VsbGF0aW9uVG9rZW4gPSBuZXcgQ2FuY2VsbGF0aW9uVG9rZW5Tb3VyY2UoKTtcbiAgY2FuY2VsbGF0aW9uVG9rZW5zLnNldChrZXksIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgcmV0dXJuIGNhbmNlbGxhdGlvblRva2VuLnRva2VuO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG9XaXRoQ2FuY2VsbGF0aW9uVG9rZW48VDEgZXh0ZW5kcyBvYmplY3QsIFQyPihcbiAga2V5OiBUMSxcbiAgY2FuY2VsbGF0aW9uVG9rZW5zOiBXZWFrTWFwPFQxLCBDYW5jZWxsYXRpb25Ub2tlblNvdXJjZT4sXG4gIHdvcms6ICh0b2tlbjogQ2FuY2VsbGF0aW9uVG9rZW4pID0+IFByb21pc2U8VDI+LFxuKTogUHJvbWlzZTxUMj4ge1xuICBjb25zdCB0b2tlbiA9IGNhbmNlbEFuZFJlZnJlc2hDYW5jZWxsYXRpb25Ub2tlbihrZXksIGNhbmNlbGxhdGlvblRva2Vucyk7XG4gIGNvbnN0IHJlc3VsdDogVDIgPSBhd2FpdCB3b3JrKHRva2VuKTtcbiAgY2FuY2VsbGF0aW9uVG9rZW5zLmRlbGV0ZShrZXkpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0VW5yZWFjaGFibGUoXzogbmV2ZXIpOiBuZXZlciB7XG4gIHJldHVybiBfO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzZVdpdGhUaW1lb3V0PFQ+KG1zOiBudW1iZXIsIHByb21pc2U6IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAvLyBjcmVhdGUgYSB0aW1lb3V0IHRvIHJlamVjdCBwcm9taXNlIGlmIG5vdCByZXNvbHZlZFxuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICByZWplY3QobmV3IEVycm9yKGBUaW1lb3V0IGFmdGVyICR7bXN9bXNgKSk7XG4gICAgfSwgbXMpO1xuXG4gICAgcHJvbWlzZS50aGVuKChyZXMpID0+IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICByZXNvbHZlKHJlcyk7XG4gICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==