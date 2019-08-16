"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const convert_1 = require("../convert");
const languageclient_1 = require("../languageclient");
/**
 * Public: Listen to diagnostics messages from the language server and publish them
 * to the user by way of the Linter Push (Indie) v2 API supported by Atom IDE UI.
 */
class LinterPushV2Adapter {
    /**
     * Public: Create a new {LinterPushV2Adapter} that will listen for diagnostics
     * via the supplied {LanguageClientConnection}.
     *
     * @param connection A {LanguageClientConnection} to the language server that will provide diagnostics.
     */
    constructor(connection) {
        this._diagnosticMap = new Map();
        this._diagnosticCodes = new Map();
        this._indies = new Set();
        connection.onPublishDiagnostics(this.captureDiagnostics.bind(this));
    }
    /** Dispose this adapter ensuring any resources are freed and events unhooked. */
    dispose() {
        this.detachAll();
    }
    /**
     * Public: Attach this {LinterPushV2Adapter} to a given {V2IndieDelegate} registry.
     *
     * @param indie A {V2IndieDelegate} that wants to receive messages.
     */
    attach(indie) {
        this._indies.add(indie);
        this._diagnosticMap.forEach((value, key) => indie.setMessages(key, value));
        indie.onDidDestroy(() => {
            this._indies.delete(indie);
        });
    }
    /** Public: Remove all {V2IndieDelegate} registries attached to this adapter and clear them. */
    detachAll() {
        this._indies.forEach((i) => i.clearMessages());
        this._indies.clear();
    }
    /**
     * Public: Capture the diagnostics sent from a langguage server, convert them to the
     * Linter V2 format and forward them on to any attached {V2IndieDelegate}s.
     *
     * @param params The {PublishDiagnosticsParams} received from the language server that should
     *   be captured and forwarded on to any attached {V2IndieDelegate}s.
     */
    captureDiagnostics(params) {
        const path = convert_1.default.uriToPath(params.uri);
        const codeMap = new Map();
        const messages = params.diagnostics.map((d) => {
            const linterMessage = this.diagnosticToV2Message(path, d);
            codeMap.set(getCodeKey(linterMessage.location.position, d.message), d.code);
            return linterMessage;
        });
        this._diagnosticMap.set(path, messages);
        this._diagnosticCodes.set(path, codeMap);
        this._indies.forEach((i) => i.setMessages(path, messages));
    }
    /**
     * Public: Convert a single {Diagnostic} received from a language server into a single
     * {V2Message} expected by the Linter V2 API.
     *
     * @param path A string representing the path of the file the diagnostic belongs to.
     * @param diagnostics A {Diagnostic} object received from the language server.
     * @returns A {V2Message} equivalent to the {Diagnostic} object supplied by the language server.
     */
    diagnosticToV2Message(path, diagnostic) {
        return {
            location: {
                file: path,
                position: convert_1.default.lsRangeToAtomRange(diagnostic.range),
            },
            excerpt: diagnostic.message,
            linterName: diagnostic.source,
            severity: LinterPushV2Adapter.diagnosticSeverityToSeverity(diagnostic.severity || -1),
        };
    }
    /**
     * Public: Convert a diagnostic severity number obtained from the language server into
     * the textual equivalent for a Linter {V2Message}.
     *
     * @param severity A number representing the severity of the diagnostic.
     * @returns A string of 'error', 'warning' or 'info' depending on the severity.
     */
    static diagnosticSeverityToSeverity(severity) {
        switch (severity) {
            case languageclient_1.DiagnosticSeverity.Error:
                return 'error';
            case languageclient_1.DiagnosticSeverity.Warning:
                return 'warning';
            case languageclient_1.DiagnosticSeverity.Information:
            case languageclient_1.DiagnosticSeverity.Hint:
            default:
                return 'info';
        }
    }
    /**
     * Private: Get the recorded diagnostic code for a range/message.
     * Diagnostic codes are tricky because there's no suitable place in the Linter API for them.
     * For now, we'll record the original code for each range/message combination and retrieve it
     * when needed (e.g. for passing back into code actions)
     */
    getDiagnosticCode(editor, range, text) {
        const path = editor.getPath();
        if (path != null) {
            const diagnosticCodes = this._diagnosticCodes.get(path);
            if (diagnosticCodes != null) {
                return diagnosticCodes.get(getCodeKey(range, text)) || null;
            }
        }
        return null;
    }
}
exports.default = LinterPushV2Adapter;
function getCodeKey(range, text) {
    return [].concat(...range.serialize(), text).join(',');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGludGVyLXB1c2gtdjItYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9hZGFwdGVycy9saW50ZXItcHVzaC12Mi1hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsd0NBQWlDO0FBQ2pDLHNEQU0yQjtBQUUzQjs7O0dBR0c7QUFDSCxNQUFxQixtQkFBbUI7SUFLdEM7Ozs7O09BS0c7SUFDSCxZQUFZLFVBQW9DO1FBVnhDLG1CQUFjLEdBQWtDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDMUQscUJBQWdCLEdBQW9ELElBQUksR0FBRyxFQUFFLENBQUM7UUFDOUUsWUFBTyxHQUE4QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBU3JELFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVELGlGQUFpRjtJQUMxRSxPQUFPO1FBQ1osSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksTUFBTSxDQUFDLEtBQTJCO1FBQ3ZDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMzRSxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCwrRkFBK0Y7SUFDeEYsU0FBUztRQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxF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USxFQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgbGludGVyIGZyb20gJ2F0b20vbGludGVyJztcbmltcG9ydCAqIGFzIGF0b20gZnJvbSAnYXRvbSc7XG5pbXBvcnQgQ29udmVydCBmcm9tICcuLi9jb252ZXJ0JztcbmltcG9ydCB7XG4gIERpYWdub3N0aWMsXG4gIERpYWdub3N0aWNDb2RlLFxuICBEaWFnbm9zdGljU2V2ZXJpdHksXG4gIExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbixcbiAgUHVibGlzaERpYWdub3N0aWNzUGFyYW1zLFxufSBmcm9tICcuLi9sYW5ndWFnZWNsaWVudCc7XG5cbi8qKlxuICogUHVibGljOiBMaXN0ZW4gdG8gZGlhZ25vc3RpY3MgbWVzc2FnZXMgZnJvbSB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGFuZCBwdWJsaXNoIHRoZW1cbiAqIHRvIHRoZSB1c2VyIGJ5IHdheSBvZiB0aGUgTGludGVyIFB1c2ggKEluZGllKSB2MiBBUEkgc3VwcG9ydGVkIGJ5IEF0b20gSURFIFVJLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaW50ZXJQdXNoVjJBZGFwdGVyIHtcbiAgcHJpdmF0ZSBfZGlhZ25vc3RpY01hcDogTWFwPHN0cmluZywgbGludGVyLk1lc3NhZ2VbXT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgX2RpYWdub3N0aWNDb2RlczogTWFwPHN0cmluZywgTWFwPHN0cmluZywgRGlhZ25vc3RpY0NvZGUgfCBudWxsPj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgX2luZGllczogU2V0PGxpbnRlci5JbmRpZURlbGVnYXRlPiA9IG5ldyBTZXQoKTtcblxuICAvKipcbiAgICogUHVibGljOiBDcmVhdGUgYSBuZXcge0xpbnRlclB1c2hWMkFkYXB0ZXJ9IHRoYXQgd2lsbCBsaXN0ZW4gZm9yIGRpYWdub3N0aWNzXG4gICAqIHZpYSB0aGUgc3VwcGxpZWQge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0uXG4gICAqXG4gICAqIEBwYXJhbSBjb25uZWN0aW9uIEEge0xhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbn0gdG8gdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0IHdpbGwgcHJvdmlkZSBkaWFnbm9zdGljcy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IExhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbikge1xuICAgIGNvbm5lY3Rpb24ub25QdWJsaXNoRGlhZ25vc3RpY3ModGhpcy5jYXB0dXJlRGlhZ25vc3RpY3MuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKiogRGlzcG9zZSB0aGlzIGFkYXB0ZXIgZW5zdXJpbmcgYW55IHJlc291cmNlcyBhcmUgZnJlZWQgYW5kIGV2ZW50cyB1bmhvb2tlZC4gKi9cbiAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5kZXRhY2hBbGwoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IEF0dGFjaCB0aGlzIHtMaW50ZXJQdXNoVjJBZGFwdGVyfSB0byBhIGdpdmVuIHtWMkluZGllRGVsZWdhdGV9IHJlZ2lzdHJ5LlxuICAgKlxuICAgKiBAcGFyYW0gaW5kaWUgQSB7VjJJbmRpZURlbGVnYXRlfSB0aGF0IHdhbnRzIHRvIHJlY2VpdmUgbWVzc2FnZXMuXG4gICAqL1xuICBwdWJsaWMgYXR0YWNoKGluZGllOiBsaW50ZXIuSW5kaWVEZWxlZ2F0ZSk6IHZvaWQge1xuICAgIHRoaXMuX2luZGllcy5hZGQoaW5kaWUpO1xuICAgIHRoaXMuX2RpYWdub3N0aWNNYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4gaW5kaWUuc2V0TWVzc2FnZXMoa2V5LCB2YWx1ZSkpO1xuICAgIGluZGllLm9uRGlkRGVzdHJveSgoKSA9PiB7XG4gICAgICB0aGlzLl9pbmRpZXMuZGVsZXRlKGluZGllKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBQdWJsaWM6IFJlbW92ZSBhbGwge1YySW5kaWVEZWxlZ2F0ZX0gcmVnaXN0cmllcyBhdHRhY2hlZCB0byB0aGlzIGFkYXB0ZXIgYW5kIGNsZWFyIHRoZW0uICovXG4gIHB1YmxpYyBkZXRhY2hBbGwoKTogdm9pZCB7XG4gICAgdGhpcy5faW5kaWVzLmZvckVhY2goKGkpID0+IGkuY2xlYXJNZXNzYWdlcygpKTtcbiAgICB0aGlzLl9pbmRpZXMuY2xlYXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWM6IENhcHR1cmUgdGhlIGRpYWdub3N0aWNzIHNlbnQgZnJvbSBhIGxhbmdndWFnZSBzZXJ2ZXIsIGNvbnZlcnQgdGhlbSB0byB0aGVcbiAgICogTGludGVyIFYyIGZvcm1hdCBhbmQgZm9yd2FyZCB0aGVtIG9uIHRvIGFueSBhdHRhY2hlZCB7VjJJbmRpZURlbGVnYXRlfXMuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbXMgVGhlIHtQdWJsaXNoRGlhZ25vc3RpY3NQYXJhbXN9IHJlY2VpdmVkIGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlciB0aGF0IHNob3VsZFxuICAgKiAgIGJlIGNhcHR1cmVkIGFuZCBmb3J3YXJkZWQgb24gdG8gYW55IGF0dGFjaGVkIHtWMkluZGllRGVsZWdhdGV9cy5cbiAgICovXG4gIHB1YmxpYyBjYXB0dXJlRGlhZ25vc3RpY3MocGFyYW1zOiBQdWJsaXNoRGlhZ25vc3RpY3NQYXJhbXMpOiB2b2lkIHtcbiAgICBjb25zdCBwYXRoID0gQ29udmVydC51cmlUb1BhdGgocGFyYW1zLnVyaSk7XG4gICAgY29uc3QgY29kZU1hcCA9IG5ldyBNYXAoKTtcbiAgICBjb25zdCBtZXNzYWdlcyA9IHBhcmFtcy5kaWFnbm9zdGljcy5tYXAoKGQpID0+IHtcbiAgICAgIGNvbnN0IGxpbnRlck1lc3NhZ2UgPSB0aGlzLmRpYWdub3N0aWNUb1YyTWVzc2FnZShwYXRoLCBkKTtcbiAgICAgIGNvZGVNYXAuc2V0KGdldENvZGVLZXkobGludGVyTWVzc2FnZS5sb2NhdGlvbi5wb3NpdGlvbiwgZC5tZXNzYWdlKSwgZC5jb2RlKTtcbiAgICAgIHJldHVybiBsaW50ZXJNZXNzYWdlO1xuICAgIH0pO1xuICAgIHRoaXMuX2RpYWdub3N0aWNNYXAuc2V0KHBhdGgsIG1lc3NhZ2VzKTtcbiAgICB0aGlzLl9kaWFnbm9zdGljQ29kZXMuc2V0KHBhdGgsIGNvZGVNYXApO1xuICAgIHRoaXMuX2luZGllcy5mb3JFYWNoKChpKSA9PiBpLnNldE1lc3NhZ2VzKHBhdGgsIG1lc3NhZ2VzKSk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBDb252ZXJ0IGEgc2luZ2xlIHtEaWFnbm9zdGljfSByZWNlaXZlZCBmcm9tIGEgbGFuZ3VhZ2Ugc2VydmVyIGludG8gYSBzaW5nbGVcbiAgICoge1YyTWVzc2FnZX0gZXhwZWN0ZWQgYnkgdGhlIExpbnRlciBWMiBBUEkuXG4gICAqXG4gICAqIEBwYXJhbSBwYXRoIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgcGF0aCBvZiB0aGUgZmlsZSB0aGUgZGlhZ25vc3RpYyBiZWxvbmdzIHRvLlxuICAgKiBAcGFyYW0gZGlhZ25vc3RpY3MgQSB7RGlhZ25vc3RpY30gb2JqZWN0IHJlY2VpdmVkIGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlci5cbiAgICogQHJldHVybnMgQSB7VjJNZXNzYWdlfSBlcXVpdmFsZW50IHRvIHRoZSB7RGlhZ25vc3RpY30gb2JqZWN0IHN1cHBsaWVkIGJ5IHRoZSBsYW5ndWFnZSBzZXJ2ZXIuXG4gICAqL1xuICBwdWJsaWMgZGlhZ25vc3RpY1RvVjJNZXNzYWdlKHBhdGg6IHN0cmluZywgZGlhZ25vc3RpYzogRGlhZ25vc3RpYyk6IGxpbnRlci5NZXNzYWdlIHtcbiAgICByZXR1cm4ge1xuICAgICAgbG9jYXRpb246IHtcbiAgICAgICAgZmlsZTogcGF0aCxcbiAgICAgICAgcG9zaXRpb246IENvbnZlcnQubHNSYW5nZVRvQXRvbVJhbmdlKGRpYWdub3N0aWMucmFuZ2UpLFxuICAgICAgfSxcbiAgICAgIGV4Y2VycHQ6IGRpYWdub3N0aWMubWVzc2FnZSxcbiAgICAgIGxpbnRlck5hbWU6IGRpYWdub3N0aWMuc291cmNlLFxuICAgICAgc2V2ZXJpdHk6IExpbnRlclB1c2hWMkFkYXB0ZXIuZGlhZ25vc3RpY1NldmVyaXR5VG9TZXZlcml0eShkaWFnbm9zdGljLnNldmVyaXR5IHx8IC0xKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYzogQ29udmVydCBhIGRpYWdub3N0aWMgc2V2ZXJpdHkgbnVtYmVyIG9idGFpbmVkIGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlciBpbnRvXG4gICAqIHRoZSB0ZXh0dWFsIGVxdWl2YWxlbnQgZm9yIGEgTGludGVyIHtWMk1lc3NhZ2V9LlxuICAgKlxuICAgKiBAcGFyYW0gc2V2ZXJpdHkgQSBudW1iZXIgcmVwcmVzZW50aW5nIHRoZSBzZXZlcml0eSBvZiB0aGUgZGlhZ25vc3RpYy5cbiAgICogQHJldHVybnMgQSBzdHJpbmcgb2YgJ2Vycm9yJywgJ3dhcm5pbmcnIG9yICdpbmZvJyBkZXBlbmRpbmcgb24gdGhlIHNldmVyaXR5LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBkaWFnbm9zdGljU2V2ZXJpdHlUb1NldmVyaXR5KHNldmVyaXR5OiBudW1iZXIpOiAnZXJyb3InIHwgJ3dhcm5pbmcnIHwgJ2luZm8nIHtcbiAgICBzd2l0Y2ggKHNldmVyaXR5KSB7XG4gICAgICBjYXNlIERpYWdub3N0aWNTZXZlcml0eS5FcnJvcjpcbiAgICAgICAgcmV0dXJuICdlcnJvcic7XG4gICAgICBjYXNlIERpYWdub3N0aWNTZXZlcml0eS5XYXJuaW5nOlxuICAgICAgICByZXR1cm4gJ3dhcm5pbmcnO1xuICAgICAgY2FzZSBEaWFnbm9zdGljU2V2ZXJpdHkuSW5mb3JtYXRpb246XG4gICAgICBjYXNlIERpYWdub3N0aWNTZXZlcml0eS5IaW50OlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICdpbmZvJztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHJpdmF0ZTogR2V0IHRoZSByZWNvcmRlZCBkaWFnbm9zdGljIGNvZGUgZm9yIGEgcmFuZ2UvbWVzc2FnZS5cbiAgICogRGlhZ25vc3RpYyBjb2RlcyBhcmUgdHJpY2t5IGJlY2F1c2UgdGhlcmUncyBubyBzdWl0YWJsZSBwbGFjZSBpbiB0aGUgTGludGVyIEFQSSBmb3IgdGhlbS5cbiAgICogRm9yIG5vdywgd2UnbGwgcmVjb3JkIHRoZSBvcmlnaW5hbCBjb2RlIGZvciBlYWNoIHJhbmdlL21lc3NhZ2UgY29tYmluYXRpb24gYW5kIHJldHJpZXZlIGl0XG4gICAqIHdoZW4gbmVlZGVkIChlLmcuIGZvciBwYXNzaW5nIGJhY2sgaW50byBjb2RlIGFjdGlvbnMpXG4gICAqL1xuICBwdWJsaWMgZ2V0RGlhZ25vc3RpY0NvZGUoZWRpdG9yOiBhdG9tLlRleHRFZGl0b3IsIHJhbmdlOiBhdG9tLlJhbmdlLCB0ZXh0OiBzdHJpbmcpOiBEaWFnbm9zdGljQ29kZSB8IG51bGwge1xuICAgIGNvbnN0IHBhdGggPSBlZGl0b3IuZ2V0UGF0aCgpO1xuICAgIGlmIChwYXRoICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IGRpYWdub3N0aWNDb2RlcyA9IHRoaXMuX2RpYWdub3N0aWNDb2Rlcy5nZXQocGF0aCk7XG4gICAgICBpZiAoZGlhZ25vc3RpY0NvZGVzICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGRpYWdub3N0aWNDb2Rlcy5nZXQoZ2V0Q29kZUtleShyYW5nZSwgdGV4dCkpIHx8IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldENvZGVLZXkocmFuZ2U6IGF0b20uUmFuZ2UsIHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiAoW10gYXMgYW55W10pLmNvbmNhdCguLi5yYW5nZS5zZXJpYWxpemUoKSwgdGV4dCkuam9pbignLCcpO1xufVxuIl19