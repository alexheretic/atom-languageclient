import { ConsoleApi } from 'atom-ide';
import { LanguageClientConnection } from '../languageclient';
export default class LoggingConsoleAdapter {
    private _consoles;
    constructor(connection: LanguageClientConnection);
    dispose(): void;
    attach(console: ConsoleApi): void;
    detachAll(): void;
    private logMessage;
}
