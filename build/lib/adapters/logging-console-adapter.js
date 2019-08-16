"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const languageclient_1 = require("../languageclient");
/** Adapts Atom's user notifications to those of the language server protocol. */
class LoggingConsoleAdapter {
    /**
     * Create a new {LoggingConsoleAdapter} that will listen for log messages
     * via the supplied {LanguageClientConnection}.
     *
     * @param connection A {LanguageClientConnection} to the language server that will provide log messages.
     */
    constructor(connection) {
        this._consoles = new Set();
        connection.onLogMessage(this.logMessage.bind(this));
    }
    /** Dispose this adapter ensuring any resources are freed and events unhooked. */
    dispose() {
        this.detachAll();
    }
    /**
     * Public: Attach this {LoggingConsoleAdapter} to a given {ConsoleApi}.
     *
     * @param console A {ConsoleApi} that wants to receive messages.
     */
    attach(console) {
        this._consoles.add(console);
    }
    /** Public: Remove all {ConsoleApi}'s attached to this adapter. */
    detachAll() {
        this._consoles.clear();
    }
    /**
     * Log a message using the Atom IDE UI Console API.
     *
     * @param params The {LogMessageParams} received from the language server
     *   indicating the details of the message to be loggedd.
     */
    logMessage(params) {
        switch (params.type) {
            case languageclient_1.MessageType.Error: {
                this._consoles.forEach((c) => c.error(params.message));
                return;
            }
            case languageclient_1.MessageType.Warning: {
                this._consoles.forEach((c) => c.warn(params.message));
                return;
            }
            case languageclient_1.MessageType.Info: {
                this._consoles.forEach((c) => c.info(params.message));
                return;
            }
            case languageclient_1.MessageType.Log: {
                this._consoles.forEach((c) => c.log(params.message));
                return;
            }
        }
    }
}
exports.default = LoggingConsoleAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2luZy1jb25zb2xlLWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvYWRhcHRlcnMvbG9nZ2luZy1jb25zb2xlLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxzREFJMkI7QUFFM0IsaUZBQWlGO0FBQ2pGLE1BQXFCLHFCQUFxQjtJQUd4Qzs7Ozs7T0FLRztJQUNILFlBQVksVUFBb0M7UUFSeEMsY0FBUyxHQUFvQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBUzdDLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsaUZBQWlGO0lBQzFFLE9BQU87UUFDWixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxNQUFNLENBQUMsT0FBbUI7UUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELGtFQUFrRTtJQUMzRCxTQUFTO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSyxVQUFVLENBQUMsTUFBd0I7UUFDekMsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFO1lBQ25CLEtBQUssNEJBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZELE9BQU87YUFDUjtZQUNELEtBQUssNEJBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELE9BQU87YUFDUjtZQUNELEtBQUssNEJBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELE9BQU87YUFDUjtZQUNELEtBQUssNEJBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3JELE9BQU87YUFDUjtTQUNGO0lBQ0gsQ0FBQztDQUNGO0FBMURELHdDQTBEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnNvbGVBcGkgfSBmcm9tICdhdG9tLWlkZSc7XG5pbXBvcnQge1xuICBMYW5ndWFnZUNsaWVudENvbm5lY3Rpb24sXG4gIExvZ01lc3NhZ2VQYXJhbXMsXG4gIE1lc3NhZ2VUeXBlLFxufSBmcm9tICcuLi9sYW5ndWFnZWNsaWVudCc7XG5cbi8qKiBBZGFwdHMgQXRvbSdzIHVzZXIgbm90aWZpY2F0aW9ucyB0byB0aG9zZSBvZiB0aGUgbGFuZ3VhZ2Ugc2VydmVyIHByb3RvY29sLiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTG9nZ2luZ0NvbnNvbGVBZGFwdGVyIHtcbiAgcHJpdmF0ZSBfY29uc29sZXM6IFNldDxDb25zb2xlQXBpPiA9IG5ldyBTZXQoKTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHtMb2dnaW5nQ29uc29sZUFkYXB0ZXJ9IHRoYXQgd2lsbCBsaXN0ZW4gZm9yIGxvZyBtZXNzYWdlc1xuICAgKiB2aWEgdGhlIHN1cHBsaWVkIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259LlxuICAgKlxuICAgKiBAcGFyYW0gY29ubmVjdGlvbiBBIHtMYW5ndWFnZUNsaWVudENvbm5lY3Rpb259IHRvIHRoZSBsYW5ndWFnZSBzZXJ2ZXIgdGhhdCB3aWxsIHByb3ZpZGUgbG9nIG1lc3NhZ2VzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoY29ubmVjdGlvbjogTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uKSB7XG4gICAgY29ubmVjdGlvbi5vbkxvZ01lc3NhZ2UodGhpcy5sb2dNZXNzYWdlLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqIERpc3Bvc2UgdGhpcyBhZGFwdGVyIGVuc3VyaW5nIGFueSByZXNvdXJjZXMgYXJlIGZyZWVkIGFuZCBldmVudHMgdW5ob29rZWQuICovXG4gIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuZGV0YWNoQWxsKCk7XG4gIH1cblxuICAvKipcbiAgICogUHVibGljOiBBdHRhY2ggdGhpcyB7TG9nZ2luZ0NvbnNvbGVBZGFwdGVyfSB0byBhIGdpdmVuIHtDb25zb2xlQXBpfS5cbiAgICpcbiAgICogQHBhcmFtIGNvbnNvbGUgQSB7Q29uc29sZUFwaX0gdGhhdCB3YW50cyB0byByZWNlaXZlIG1lc3NhZ2VzLlxuICAgKi9cbiAgcHVibGljIGF0dGFjaChjb25zb2xlOiBDb25zb2xlQXBpKTogdm9pZCB7XG4gICAgdGhpcy5fY29uc29sZXMuYWRkKGNvbnNvbGUpO1xuICB9XG5cbiAgLyoqIFB1YmxpYzogUmVtb3ZlIGFsbCB7Q29uc29sZUFwaX0ncyBhdHRhY2hlZCB0byB0aGlzIGFkYXB0ZXIuICovXG4gIHB1YmxpYyBkZXRhY2hBbGwoKTogdm9pZCB7XG4gICAgdGhpcy5fY29uc29sZXMuY2xlYXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2cgYSBtZXNzYWdlIHVzaW5nIHRoZSBBdG9tIElERSBVSSBDb25zb2xlIEFQSS5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyBUaGUge0xvZ01lc3NhZ2VQYXJhbXN9IHJlY2VpdmVkIGZyb20gdGhlIGxhbmd1YWdlIHNlcnZlclxuICAgKiAgIGluZGljYXRpbmcgdGhlIGRldGFpbHMgb2YgdGhlIG1lc3NhZ2UgdG8gYmUgbG9nZ2VkZC5cbiAgICovXG4gIHByaXZhdGUgbG9nTWVzc2FnZShwYXJhbXM6IExvZ01lc3NhZ2VQYXJhbXMpOiB2b2lkIHtcbiAgICBzd2l0Y2ggKHBhcmFtcy50eXBlKSB7XG4gICAgICBjYXNlIE1lc3NhZ2VUeXBlLkVycm9yOiB7XG4gICAgICAgIHRoaXMuX2NvbnNvbGVzLmZvckVhY2goKGMpID0+IGMuZXJyb3IocGFyYW1zLm1lc3NhZ2UpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSBNZXNzYWdlVHlwZS5XYXJuaW5nOiB7XG4gICAgICAgIHRoaXMuX2NvbnNvbGVzLmZvckVhY2goKGMpID0+IGMud2FybihwYXJhbXMubWVzc2FnZSkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYXNlIE1lc3NhZ2VUeXBlLkluZm86IHtcbiAgICAgICAgdGhpcy5fY29uc29sZXMuZm9yRWFjaCgoYykgPT4gYy5pbmZvKHBhcmFtcy5tZXNzYWdlKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhc2UgTWVzc2FnZVR5cGUuTG9nOiB7XG4gICAgICAgIHRoaXMuX2NvbnNvbGVzLmZvckVhY2goKGMpID0+IGMubG9nKHBhcmFtcy5tZXNzYWdlKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==