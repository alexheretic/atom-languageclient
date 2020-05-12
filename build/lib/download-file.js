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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG93bmxvYWQtZmlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9kb3dubG9hZC1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEseUJBQXlCO0FBRXpCOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsa0JBQWUsQ0FBQyxTQUFlLFlBQVksQ0FDekMsU0FBaUIsRUFDakIsVUFBa0IsRUFDbEIsZ0JBQXVDLEVBQ3ZDLE1BQWU7O1FBRWYsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQ3JDLE9BQU8sRUFBRSxJQUFJLE9BQU8sQ0FBQyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsRUFBRSxDQUFDO1NBQ3JFLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFO1lBQ2hCLE1BQU0sS0FBSyxDQUFDLHVDQUF1QyxRQUFRLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1NBQzlGO1FBRUQsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztRQUMzQixJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDaEIsTUFBTSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUNqQztRQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVoRCxNQUFNLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDeEUsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztDQUFBLENBQUMsQ0FBQztBQUVIOzs7Ozs7Ozs7R0FTRztBQUNILFNBQWUsa0JBQWtCLENBQy9CLE1BQWMsRUFDZCxNQUE0QixFQUM1QixNQUFzQixFQUN0QixnQkFBdUM7O1FBRXZDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUVsQixPQUFPLElBQUksRUFBRTtZQUNYLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25DLElBQUksTUFBTSxDQUFDLElBQUksRUFBRTtnQkFDZixJQUFJLGdCQUFnQixJQUFJLElBQUksRUFBRTtvQkFDNUIsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUMvQjtnQkFDRCxPQUFPO2FBQ1I7WUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQzNCLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtnQkFDakIsTUFBTSxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQzthQUNyRDtpQkFBTTtnQkFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDakMsSUFBSSxnQkFBZ0IsSUFBSSxJQUFJLEVBQUU7b0JBQzVCLFNBQVMsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDO29CQUM5QixNQUFNLE9BQU8sR0FBdUIsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQ3BHLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztpQkFDdEM7YUFDRjtTQUNGO0lBQ0gsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG4vKipcbiAqIFB1YmxpYzogRG93bmxvYWQgYSBmaWxlIGFuZCBzdG9yZSBpdCBvbiBhIGZpbGUgc3lzdGVtIHVzaW5nIHN0cmVhbWluZyB3aXRoIGFwcHJvcHJpYXRlIHByb2dyZXNzIGNhbGxiYWNrLlxuICpcbiAqIEBwYXJhbSBzb3VyY2VVcmwgVXJsIHRvIGRvd25sb2FkIGZyb20uXG4gKiBAcGFyYW0gdGFyZ2V0RmlsZSBGaWxlIHBhdGggdG8gc2F2ZSB0by5cbiAqIEBwYXJhbSBwcm9ncmVzc0NhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBnaXZlbiBhIHtCeXRlUHJvZ3Jlc3NDYWxsYmFja30gb2JqZWN0IGNvbnRhaW5pbmdcbiAqICAgYm90aCBieXRlc0RvbmUgYW5kIHBlcmNlbnQuXG4gKiBAcGFyYW0gbGVuZ3RoIEZpbGUgbGVuZ3RoIGluIGJ5dGVzIGlmIHlvdSB3YW50IHBlcmNlbnRhZ2UgcHJvZ3Jlc3MgaW5kaWNhdGlvbiBhbmQgdGhlIHNlcnZlciBpc1xuICogICB1bmFibGUgdG8gcHJvdmlkZSBhIENvbnRlbnQtTGVuZ3RoIGhlYWRlciBhbmQgd2hpdGVsaXN0IENPUlMgYWNjZXNzIHZpYSBhXG4gKiAgIGBBY2Nlc3MtQ29udHJvbC1FeHBvc2UtSGVhZGVycyBcImNvbnRlbnQtbGVuZ3RoXCJgIGhlYWRlci5cbiAqIEByZXR1cm5zIEEge1Byb21pc2V9IHRoYXQgd2lsbCBhY2NlcHQgd2hlbiBjb21wbGV0ZS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgKGFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkRmlsZShcbiAgc291cmNlVXJsOiBzdHJpbmcsXG4gIHRhcmdldEZpbGU6IHN0cmluZyxcbiAgcHJvZ3Jlc3NDYWxsYmFjaz86IEJ5dGVQcm9ncmVzc0NhbGxiYWNrLFxuICBsZW5ndGg/OiBudW1iZXIsXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHNvdXJjZVVybCwge1xuICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nIH0pLFxuICB9KTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHJlcXVlc3QpO1xuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgdGhyb3cgRXJyb3IoYFVuYWJsZSB0byBkb3dubG9hZCwgc2VydmVyIHJldHVybmVkICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gIH1cblxuICBjb25zdCBib2R5ID0gcmVzcG9uc2UuYm9keTtcbiAgaWYgKGJvZHkgPT0gbnVsbCkge1xuICAgIHRocm93IEVycm9yKCdObyByZXNwb25zZSBib2R5Jyk7XG4gIH1cblxuICBjb25zdCBmaW5hbExlbmd0aCA9IGxlbmd0aCB8fCBwYXJzZUludChyZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1MZW5ndGgnKSB8fCAnMCcsIDEwKTtcbiAgY29uc3QgcmVhZGVyID0gYm9keS5nZXRSZWFkZXIoKTtcbiAgY29uc3Qgd3JpdGVyID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0odGFyZ2V0RmlsZSk7XG5cbiAgYXdhaXQgc3RyZWFtV2l0aFByb2dyZXNzKGZpbmFsTGVuZ3RoLCByZWFkZXIsIHdyaXRlciwgcHJvZ3Jlc3NDYWxsYmFjayk7XG4gIHdyaXRlci5lbmQoKTtcbn0pO1xuXG4vKipcbiAqIFN0cmVhbSBmcm9tIGEge1JlYWRhYmxlU3RyZWFtUmVhZGVyfSB0byBhIHtXcml0ZVN0cmVhbX0gd2l0aCBwcm9ncmVzcyBjYWxsYmFjay5cbiAqXG4gKiBAcGFyYW0gbGVuZ3RoIEZpbGUgbGVuZ3RoIGluIGJ5dGVzLlxuICogQHBhcmFtIHJlYWRlciBBIHtSZWFkYWJsZVN0cmVhbVJlYWRlcn0gdG8gcmVhZCBmcm9tLlxuICogQHBhcmFtIHdyaXRlciBBIHtXcml0ZVN0cmVhbX0gdG8gd3JpdGUgdG8uXG4gKiBAcGFyYW0gcHJvZ3Jlc3NDYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZ2l2ZW4gYSB7Qnl0ZVByb2dyZXNzQ2FsbGJhY2t9IG9iamVjdCBjb250YWluaW5nXG4gKiAgIGJvdGggYnl0ZXNEb25lIGFuZCBwZXJjZW50LlxuICogQHJldHVybnMgQSB7UHJvbWlzZX0gdGhhdCB3aWxsIGFjY2VwdCB3aGVuIGNvbXBsZXRlLlxuICovXG5hc3luYyBmdW5jdGlvbiBzdHJlYW1XaXRoUHJvZ3Jlc3MoXG4gIGxlbmd0aDogbnVtYmVyLFxuICByZWFkZXI6IFJlYWRhYmxlU3RyZWFtUmVhZGVyLFxuICB3cml0ZXI6IGZzLldyaXRlU3RyZWFtLFxuICBwcm9ncmVzc0NhbGxiYWNrPzogQnl0ZVByb2dyZXNzQ2FsbGJhY2ssXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IGJ5dGVzRG9uZSA9IDA7XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZWFkZXIucmVhZCgpO1xuICAgIGlmIChyZXN1bHQuZG9uZSkge1xuICAgICAgaWYgKHByb2dyZXNzQ2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICBwcm9ncmVzc0NhbGxiYWNrKGxlbmd0aCwgMTAwKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjaHVuayA9IHJlc3VsdC52YWx1ZTtcbiAgICBpZiAoY2h1bmsgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0VtcHR5IGNodW5rIHJlY2VpdmVkIGR1cmluZyBkb3dubG9hZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3cml0ZXIud3JpdGUoQnVmZmVyLmZyb20oY2h1bmspKTtcbiAgICAgIGlmIChwcm9ncmVzc0NhbGxiYWNrICE9IG51bGwpIHtcbiAgICAgICAgYnl0ZXNEb25lICs9IGNodW5rLmJ5dGVMZW5ndGg7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQ6IG51bWJlciB8IHVuZGVmaW5lZCA9IGxlbmd0aCA9PT0gMCA/IHVuZGVmaW5lZCA6IE1hdGguZmxvb3IoYnl0ZXNEb25lIC8gbGVuZ3RoICogMTAwKTtcbiAgICAgICAgcHJvZ3Jlc3NDYWxsYmFjayhieXRlc0RvbmUsIHBlcmNlbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFB1YmxpYzogUHJvZ3Jlc3MgY2FsbGJhY2sgZnVuY3Rpb24gc2lnbmF0dXJlIGluZGljYXRpbmcgdGhlIGJ5dGVzRG9uZSBhbmRcbiAqIG9wdGlvbmFsIHBlcmNlbnRhZ2Ugd2hlbiBsZW5ndGggaXMga25vd24uXG4gKi9cbmV4cG9ydCB0eXBlIEJ5dGVQcm9ncmVzc0NhbGxiYWNrID0gKGJ5dGVzRG9uZTogbnVtYmVyLCBwZXJjZW50PzogbnVtYmVyKSA9PiB2b2lkO1xuIl19