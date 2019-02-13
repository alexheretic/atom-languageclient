import { Point, TextEditor, Range } from 'atom';
import { CancellationToken, CancellationTokenSource } from 'vscode-jsonrpc';
export declare type ReportBusyWhile = <T>(title: string, f: () => Promise<T>) => Promise<T>;
/**
 * Obtain the range of the word at the given editor position.
 * Uses the non-word characters from the position's grammar scope.
 */
export declare function getWordAtPosition(editor: TextEditor, position: Point): Range;
export declare function escapeRegExp(string: string): string;
/**
 * For the given connection and cancellationTokens map, cancel the existing
 * CancellationToken for that connection then create and store a new
 * CancellationToken to be used for the current request.
 */
export declare function cancelAndRefreshCancellationToken<T extends object>(key: T, cancellationTokens: WeakMap<T, CancellationTokenSource>): CancellationToken;
export declare function doWithCancellationToken<T1 extends object, T2>(key: T1, cancellationTokens: WeakMap<T1, CancellationTokenSource>, work: (token: CancellationToken) => Promise<T2>): Promise<T2>;
export declare function assertUnreachable(_: never): never;
export declare function promiseWithTimeout<T>(ms: number, promise: Promise<T>): Promise<T>;
