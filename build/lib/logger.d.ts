export interface Logger {
    warn(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
    log(...args: any[]): void;
    debug(...args: any[]): void;
}
export declare class ConsoleLogger {
    prefix: string;
    constructor(prefix: string);
    warn(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
    log(...args: any[]): void;
    format(args_: any): any;
}
export declare class NullLogger {
    warn(..._args: any[]): void;
    error(..._args: any[]): void;
    info(..._args: any[]): void;
    log(..._args: any[]): void;
    debug(..._args: any[]): void;
}
export declare class FilteredLogger {
    private _logger;
    private _predicate;
    static UserLevelFilter: (level: string, _args: any[]) => boolean;
    static DeveloperLevelFilter: (_level: string, _args: any[]) => boolean;
    constructor(logger: Logger, predicate?: (level: string, args: any[]) => boolean);
    warn(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
    log(...args: any[]): void;
}
