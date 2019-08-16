import { LanguageClientConnection, MessageActionItem, ShowMessageParams, ShowMessageRequestParams } from '../languageclient';
/** Public: Adapts Atom's user notifications to those of the language server protocol. */
export default class NotificationsAdapter {
    /**
     * Public: Attach to a {LanguageClientConnection} to recieve events indicating
     * when user notifications should be displayed.
     */
    static attach(connection: LanguageClientConnection, name: string, projectPath: string): void;
    /**
     * Public: Show a notification message with buttons using the Atom notifications API.
     *
     * @param params The {ShowMessageRequestParams} received from the language server
     *   indicating the details of the notification to be displayed.
     * @param name   The name of the language server so the user can identify the
     *   context of the message.
     * @param projectPath The path of the current project.
     */
    static onShowMessageRequest(params: ShowMessageRequestParams, name: string, projectPath: string): Promise<MessageActionItem | null>;
    /**
     * Public: Show a notification message using the Atom notifications API.
     *
     * @param params The {ShowMessageParams} received from the language server
     *   indicating the details of the notification to be displayed.
     * @param name   The name of the language server so the user can identify the
     *   context of the message.
     * @param projectPath The path of the current project.
     */
    static onShowMessage(params: ShowMessageParams, name: string, projectPath: string): void;
    /**
     * Public: Convert a {MessageActionItem} from the language server into an
     * equivalent {NotificationButton} within Atom.
     *
     * @param actionItem The {MessageActionItem} to be converted.
     * @returns A {NotificationButton} equivalent to the {MessageActionItem} given.
     */
    static actionItemToNotificationButton(actionItem: MessageActionItem): {
        text: string;
    };
}
