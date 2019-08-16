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
const fs = require("fs");
/**
 * Public: Download a file and store it on a file system using streaming with appropriate progress callback.
 *
 * @param sourceUrl Url to download from.
 * @param targetFile File path to save to.
 * @param progressCallback Callback function that will be given a {ByteProgressCallback} object containing
 *   both bytesDone and percent.
 * @param length File length in bytes if you want percentage progress indication and the server is
 *   unable to provide a Content-Length header and whitelist CORS access via a
 *   `Access-Control-Expose-Headers "content-length"` header.
 * @returns A {Promise} that will accept when complete.
 */
exports.default = (function downloadFile(sourceUrl, targetFile, progressCallback, length) {
    return __awaiter(this, void 0, void 0, function* () {
        const request = new Request(sourceUrl, {
            headers: new Headers({ 'Content-Type': 'application/octet-stream' }),
        });
        const response = yield fetch(request);
        if (!response.ok) {
            throw Error(`Unable to download, server returned ${response.status} ${response.statusText}`);
        }
        const body = response.body;
        if (body == null) {
            throw Error('No response body');
        }
        const finalLength = length || parseInt(response.headers.get('Content-Length') || '0', 10);
        const reader = body.getReader();
        const writer = fs.createWriteStream(targetFile);
        yield streamWithProgress(finalLength, reader, writer, progressCallback);
        writer.end();
    });
});
/**
 * Stream from a {ReadableStreamReader} to a {WriteStream} with progress callback.
 *
 * @param length File length in bytes.
 * @param reader A {ReadableStreamReader} to read from.
 * @param writer A {WriteStream} to write to.
 * @param progressCallback Callback function that will be given a {ByteProgressCallback} object containing
 *   both bytesDone and percent.
 * @returns A {Promise} that will accept when complete.
 */
function streamWithProgress(length, reader, writer, progressCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        let bytesDone = 0;
        while (true) {
            const result = yield reader.read();
            if (result.done) {
                if (progressCallback != null) {
                    progressCallback(length, 100);
                }
                return;
            }
            const chunk = result.value;
            if (chunk == null) {
                throw Error('Empty chunk received during download');
            }
            else {
                writer.write(Buffer.from(chunk));
                if (progressCallback != null) {
                    bytesDone += chunk.byteLength;
                    const percent = length === 0 ? undefined : Math.floor(bytesDone / length * 100);
                    progressCallback(bytesDone, percent);
                }
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWQtZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9kb3dubG9hZC1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSx5QkFBeUI7QUFFekI7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxrQkFBZSxDQUFDLFNBQWUsWUFBWSxDQUN6QyxTQUFpQixFQUNqQixVQUFrQixFQUNsQixnQkFBdUMsRUFDdkMsTUFBZTs7UUFFZixNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUU7WUFDckMsT0FBTyxFQUFFLElBQUksT0FBTyxDQUFDLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixFQUFFLENBQUM7U0FDckUsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUU7WUFDaEIsTUFBTSxLQUFLLENBQUMsdUNBQXVDLFFBQVEsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7U0FDOUY7UUFFRCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQzNCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtZQUNoQixNQUFNLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ2pDO1FBRUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWhELE1BQU0sa0JBQWtCLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDZixDQUFDO0NBQUEsQ0FBQyxDQUFDO0FBRUg7Ozs7Ozs7OztHQVNHO0FBQ0gsU0FBZSxrQkFBa0IsQ0FDL0IsTUFBYyxFQUNkLE1BQTRCLEVBQzVCLE1BQXNCLEVBQ3RCLGdCQUF1Qzs7UUFFdkMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBRWxCLE9BQU8sSUFBSSxFQUFFO1lBQ1gsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkMsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFO2dCQUNmLElBQUksZ0JBQWdCLElBQUksSUFBSSxFQUFFO29CQUM1QixnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQy9CO2dCQUNELE9BQU87YUFDUjtZQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDM0IsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO2dCQUNqQixNQUFNLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO2FBQ3JEO2lCQUFNO2dCQUNMLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLGdCQUFnQixJQUFJLElBQUksRUFBRTtvQkFDNUIsU0FBUyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUM7b0JBQzlCLE1BQU0sT0FBTyxHQUF1QixNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztvQkFDcEcsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUN0QzthQUNGO1NBQ0Y7SUFDSCxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbi8qKlxuICogUHVibGljOiBEb3dubG9hZCBhIGZpbGUgYW5kIHN0b3JlIGl0IG9uIGEgZmlsZSBzeXN0ZW0gdXNpbmcgc3RyZWFtaW5nIHdpdGggYXBwcm9wcmlhdGUgcHJvZ3Jlc3MgY2FsbGJhY2suXG4gKlxuICogQHBhcmFtIHNvdXJjZVVybCBVcmwgdG8gZG93bmxvYWQgZnJvbS5cbiAqIEBwYXJhbSB0YXJnZXRGaWxlIEZpbGUgcGF0aCB0byBzYXZlIHRvLlxuICogQHBhcmFtIHByb2dyZXNzQ2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGdpdmVuIGEge0J5dGVQcm9ncmVzc0NhbGxiYWNrfSBvYmplY3QgY29udGFpbmluZ1xuICogICBib3RoIGJ5dGVzRG9uZSBhbmQgcGVyY2VudC5cbiAqIEBwYXJhbSBsZW5ndGggRmlsZSBsZW5ndGggaW4gYnl0ZXMgaWYgeW91IHdhbnQgcGVyY2VudGFnZSBwcm9ncmVzcyBpbmRpY2F0aW9uIGFuZCB0aGUgc2VydmVyIGlzXG4gKiAgIHVuYWJsZSB0byBwcm92aWRlIGEgQ29udGVudC1MZW5ndGggaGVhZGVyIGFuZCB3aGl0ZWxpc3QgQ09SUyBhY2Nlc3MgdmlhIGFcbiAqICAgYEFjY2Vzcy1Db250cm9sLUV4cG9zZS1IZWFkZXJzIFwiY29udGVudC1sZW5ndGhcImAgaGVhZGVyLlxuICogQHJldHVybnMgQSB7UHJvbWlzZX0gdGhhdCB3aWxsIGFjY2VwdCB3aGVuIGNvbXBsZXRlLlxuICovXG5leHBvcnQgZGVmYXVsdCAoYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRGaWxlKFxuICBzb3VyY2VVcmw6IHN0cmluZyxcbiAgdGFyZ2V0RmlsZTogc3RyaW5nLFxuICBwcm9ncmVzc0NhbGxiYWNrPzogQnl0ZVByb2dyZXNzQ2FsbGJhY2ssXG4gIGxlbmd0aD86IG51bWJlcixcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3Qoc291cmNlVXJsLCB7XG4gICAgaGVhZGVyczogbmV3IEhlYWRlcnMoeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScgfSksXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2gocmVxdWVzdCk7XG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICB0aHJvdyBFcnJvcihgVW5hYmxlIHRvIGRvd25sb2FkLCBzZXJ2ZXIgcmV0dXJuZWQgJHtyZXNwb25zZS5zdGF0dXN9ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgfVxuXG4gIGNvbnN0IGJvZHkgPSByZXNwb25zZS5ib2R5O1xuICBpZiAoYm9keSA9PSBudWxsKSB7XG4gICAgdGhyb3cgRXJyb3IoJ05vIHJlc3BvbnNlIGJvZHknKTtcbiAgfVxuXG4gIGNvbnN0IGZpbmFsTGVuZ3RoID0gbGVuZ3RoIHx8IHBhcnNlSW50KHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LUxlbmd0aCcpIHx8ICcwJywgMTApO1xuICBjb25zdCByZWFkZXIgPSBib2R5LmdldFJlYWRlcigpO1xuICBjb25zdCB3cml0ZXIgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh0YXJnZXRGaWxlKTtcblxuICBhd2FpdCBzdHJlYW1XaXRoUHJvZ3Jlc3MoZmluYWxMZW5ndGgsIHJlYWRlciwgd3JpdGVyLCBwcm9ncmVzc0NhbGxiYWNrKTtcbiAgd3JpdGVyLmVuZCgpO1xufSk7XG5cbi8qKlxuICogU3RyZWFtIGZyb20gYSB7UmVhZGFibGVTdHJlYW1SZWFkZXJ9IHRvIGEge1dyaXRlU3RyZWFtfSB3aXRoIHByb2dyZXNzIGNhbGxiYWNrLlxuICpcbiAqIEBwYXJhbSBsZW5ndGggRmlsZSBsZW5ndGggaW4gYnl0ZXMuXG4gKiBAcGFyYW0gcmVhZGVyIEEge1JlYWRhYmxlU3RyZWFtUmVhZGVyfSB0byByZWFkIGZyb20uXG4gKiBAcGFyYW0gd3JpdGVyIEEge1dyaXRlU3RyZWFtfSB0byB3cml0ZSB0by5cbiAqIEBwYXJhbSBwcm9ncmVzc0NhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBnaXZlbiBhIHtCeXRlUHJvZ3Jlc3NDYWxsYmFja30gb2JqZWN0IGNvbnRhaW5pbmdcbiAqICAgYm90aCBieXRlc0RvbmUgYW5kIHBlcmNlbnQuXG4gKiBAcmV0dXJucyBBIHtQcm9taXNlfSB0aGF0IHdpbGwgYWNjZXB0IHdoZW4gY29tcGxldGUuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHN0cmVhbVdpdGhQcm9ncmVzcyhcbiAgbGVuZ3RoOiBudW1iZXIsXG4gIHJlYWRlcjogUmVhZGFibGVTdHJlYW1SZWFkZXIsXG4gIHdyaXRlcjogZnMuV3JpdGVTdHJlYW0sXG4gIHByb2dyZXNzQ2FsbGJhY2s/OiBCeXRlUHJvZ3Jlc3NDYWxsYmFjayxcbik6IFByb21pc2U8dm9pZD4ge1xuICBsZXQgYnl0ZXNEb25lID0gMDtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlYWRlci5yZWFkKCk7XG4gICAgaWYgKHJlc3VsdC5kb25lKSB7XG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjayAhPSBudWxsKSB7XG4gICAgICAgIHByb2dyZXNzQ2FsbGJhY2sobGVuZ3RoLCAxMDApO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNodW5rID0gcmVzdWx0LnZhbHVlO1xuICAgIGlmIChjaHVuayA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBFcnJvcignRW1wdHkgY2h1bmsgcmVjZWl2ZWQgZHVyaW5nIGRvd25sb2FkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdyaXRlci53cml0ZShCdWZmZXIuZnJvbShjaHVuaykpO1xuICAgICAgaWYgKHByb2dyZXNzQ2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICBieXRlc0RvbmUgKz0gY2h1bmsuYnl0ZUxlbmd0aDtcbiAgICAgICAgY29uc3QgcGVyY2VudDogbnVtYmVyIHwgdW5kZWZpbmVkID0gbGVuZ3RoID09PSAwID8gdW5kZWZpbmVkIDogTWF0aC5mbG9vcihieXRlc0RvbmUgLyBsZW5ndGggKiAxMDApO1xuICAgICAgICBwcm9ncmVzc0NhbGxiYWNrKGJ5dGVzRG9uZSwgcGVyY2VudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUHVibGljOiBQcm9ncmVzcyBjYWxsYmFjayBmdW5jdGlvbiBzaWduYXR1cmUgaW5kaWNhdGluZyB0aGUgYnl0ZXNEb25lIGFuZFxuICogb3B0aW9uYWwgcGVyY2VudGFnZSB3aGVuIGxlbmd0aCBpcyBrbm93bi5cbiAqL1xuZXhwb3J0IHR5cGUgQnl0ZVByb2dyZXNzQ2FsbGJhY2sgPSAoYnl0ZXNEb25lOiBudW1iZXIsIHBlcmNlbnQ/OiBudW1iZXIpID0+IHZvaWQ7XG4iXX0=