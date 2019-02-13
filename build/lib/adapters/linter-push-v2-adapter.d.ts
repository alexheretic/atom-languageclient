import * as linter from 'atom/linter';
import * as atom from 'atom';
import { Diagnostic, DiagnosticCode, LanguageClientConnection, PublishDiagnosticsParams } from '../languageclient';
export default class LinterPushV2Adapter {
    private _diagnosticMap;
    private _diagnosticCodes;
    private _indies;
    constructor(connection: LanguageClientConnection);
    dispose(): void;
    attach(indie: linter.IndieDelegate): void;
    detachAll(): void;
    captureDiagnostics(params: PublishDiagnosticsParams): void;
    diagnosticToV2Message(path: string, diagnostic: Diagnostic): linter.Message;
    static diagnosticSeverityToSeverity(severity: number): 'error' | 'warning' | 'info';
    getDiagnosticCode(editor: atom.TextEditor, range: atom.Range, text: string): DiagnosticCode | null;
}
