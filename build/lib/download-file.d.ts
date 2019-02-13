declare const _default: (sourceUrl: string, targetFile: string, progressCallback?: ByteProgressCallback | undefined, length?: number | undefined) => Promise<void>;
export default _default;
export declare type ByteProgressCallback = (bytesDone: number, percent?: number) => void;
