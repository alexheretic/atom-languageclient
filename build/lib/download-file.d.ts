declare const _default: (sourceUrl: string, targetFile: string, progressCallback?: ByteProgressCallback | undefined, length?: number | undefined) => Promise<void>;
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
export default _default;
/**
 * Public: Progress callback function signature indicating the bytesDone and
 * optional percentage when length is known.
 */
export declare type ByteProgressCallback = (bytesDone: number, percent?: number) => void;
