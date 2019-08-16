import * as linter from 'atom/linter';
import * as atom from 'atom';
import { Diagnostic, DiagnosticCode, LanguageClientConnection, PublishDiagnosticsParams } from '../languageclient';
/**
 * Public: Listen to diagnostics messages from the language server and publish them
 * to the user by way of the Linter Push (Indie) v2 API supported by Atom IDE UI.
 */
export default class LinterPushV2Adapter {
    private _diagnosticMap;
    private _diagnosticCodes;
    private _indies;
    /**
     * Public: Create a new {LinterPushV2Adapter} that will listen for diagnostics
     * via the supplied {LanguageClientConnection}.
     *
     * @param connection A {LanguageClientConnection} to the language server that will provide diagnostics.
     */
    constructor(connection: LanguageClientConnection);
    /** Dispose this adapter ensuring any resources are freed and events unhooked. */
    dispose(): void;
    /**
     * Public: Attach this {LinterPushV2Adapter} to a given {V2IndieDelegate} registry.
     *
     * @param indie A {V2IndieDelegate} that wants to receive messages.
     */
    attach(indie: linter.IndieDelegate): void;
    /** Public: Remove all {V2IndieDelegate} registries attached to this adapter and clear them. */
    detachAll(): void;
    /**
     * Public: Capture the diagnostics sent from a langguage server, convert them to the
     * Linter V2 format and forward them on to any attached {V2IndieDelegate}s.
     *
     * @param params The {PublishDiagnosticsParams} received from the language server that should
     *   be captured and forwarded on to any attached {V2IndieDelegate}s.
     */
    captureDiagnostics(params: PublishDiagnosticsParams): void;
    /**
     * Public: Convert a single {Diagnostic} received from a language server into a single
     * {V2Message} expected by the Linter V2 API.
     *
     * @param path A string representing the path of the file the diagnostic belongs to.
     * @param diagnostics A {Diagnostic} object received from the language server.
     * @returns A {V2Message} equivalent to the {Diagnostic} object supplied by the language server.
     */
    diagnosticToV2Message(path: string, diagnostic: Diagnostic): linter.Message;
    /**
     * Public: Convert a diagnostic severity number obtained from the language server into
     * the textual equivalent for a Linter {V2Message}.
     *
     * @param severity A number representing the severity of the diagnostic.
     * @returns A string of 'error', 'warning' or 'info' depending on the severity.
     */
    static diagnosticSeverityToSeverity(severity: number): 'error' | 'warning' | 'info';
    /**
     * Private: Get the recorded diagnostic code for a range/message.
     * Diagnostic codes are tricky because there's no suitable place in the Linter API for them.
     * For now, we'll record the original code for each range/message combination and retrieve it
     * when needed (e.g. for passing back into code actions)
     */
    getDiagnosticCode(editor: atom.TextEditor, range: atom.Range, text: string): DiagnosticCode | null;
}
