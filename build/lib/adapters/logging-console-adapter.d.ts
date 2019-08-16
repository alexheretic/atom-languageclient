import { ConsoleApi } from 'atom-ide';
import { LanguageClientConnection } from '../languageclient';
/** Adapts Atom's user notifications to those of the language server protocol. */
export default class LoggingConsoleAdapter {
    private _consoles;
    /**
     * Create a new {LoggingConsoleAdapter} that will listen for log messages
     * via the supplied {LanguageClientConnection}.
     *
     * @param connection A {LanguageClientConnection} to the language server that will provide log messages.
     */
    constructor(connection: LanguageClientConnection);
    /** Dispose this adapter ensuring any resources are freed and events unhooked. */
    dispose(): void;
    /**
     * Public: Attach this {LoggingConsoleAdapter} to a given {ConsoleApi}.
     *
     * @param console A {ConsoleApi} that wants to receive messages.
     */
    attach(console: ConsoleApi): void;
    /** Public: Remove all {ConsoleApi}'s attached to this adapter. */
    detachAll(): void;
    /**
     * Log a message using the Atom IDE UI Console API.
     *
     * @param params The {LogMessageParams} received from the language server
     *   indicating the details of the message to be loggedd.
     */
    private logMessage;
}
