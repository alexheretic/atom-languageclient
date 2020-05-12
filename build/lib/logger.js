"use strict";
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
class ConsoleLogger {
    constructor(prefix) {
        this.prefix = prefix;
    }
    warn(...args) {
        console.warn(...this.format(args));
    }
    error(...args) {
        console.error(...this.format(args));
    }
    info(...args) {
        console.info(...this.format(args));
    }
    debug(...args) {
        console.debug(...this.format(args));
    }
    log(...args) {
        console.log(...this.format(args));
    }
    format(args_) {
        const args = args_.filter((a) => a != null);
        if (typeof args[0] === 'string') {
            if (args.length === 1) {
                return [`${this.prefix} ${args[0]}`];
            }
            else if (args.length === 2) {
                return [`${this.prefix} ${args[0]}`, args[1]];
            }
            else {
                return [`${this.prefix} ${args[0]}`, args.slice(1)];
            }
        }
        return [`${this.prefix}`, args];
    }
}
exports.ConsoleLogger = ConsoleLogger;
class NullLogger {
    warn(..._args) { }
    error(..._args) { }
    info(..._args) { }
    log(..._args) { }
    debug(..._args) { }
}
exports.NullLogger = NullLogger;
class FilteredLogger {
    constructor(logger, predicate) {
        this._logger = logger;
        this._predicate = predicate || ((_level, _args) => true);
    }
    warn(...args) {
        if (this._predicate('warn', args)) {
            this._logger.warn(...args);
        }
    }
    error(...args) {
        if (this._predicate('error', args)) {
            this._logger.error(...args);
        }
    }
    info(...args) {
        if (this._predicate('info', args)) {
            this._logger.info(...args);
        }
    }
    debug(...args) {
        if (this._predicate('debug', args)) {
            this._logger.debug(...args);
        }
    }
    log(...args) {
        if (this._predicate('log', args)) {
            this._logger.log(...args);
        }
    }
}
exports.FilteredLogger = FilteredLogger;
FilteredLogger.UserLevelFilter = (level, _args) => level === 'warn' || level === 'error';
FilteredLogger.DeveloperLevelFilter = (_level, _args) => true;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL2xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNEJBQTRCOztBQVU1QixNQUFhLGFBQWE7SUFHeEIsWUFBWSxNQUFjO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxJQUFJLENBQUMsR0FBRyxJQUFXO1FBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVNLEtBQUssQ0FBQyxHQUFHLElBQVc7UUFDekIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU0sSUFBSSxDQUFDLEdBQUcsSUFBVztRQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTSxLQUFLLENBQUMsR0FBRyxJQUFXO1FBQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVNLEdBQUcsQ0FBQyxHQUFHLElBQVc7UUFDdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQVU7UUFDdEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFO1lBQy9C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SUFBSSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuXG5leHBvcnQgaW50ZXJmYWNlIExvZ2dlciB7XG4gIHdhcm4oLi4uYXJnczogYW55W10pOiB2b2lkO1xuICBlcnJvciguLi5hcmdzOiBhbnlbXSk6IHZvaWQ7XG4gIGluZm8oLi4uYXJnczogYW55W10pOiB2b2lkO1xuICBsb2coLi4uYXJnczogYW55W10pOiB2b2lkO1xuICBkZWJ1ZyguLi5hcmdzOiBhbnlbXSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25zb2xlTG9nZ2VyIHtcbiAgcHVibGljIHByZWZpeDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByZWZpeDogc3RyaW5nKSB7XG4gICAgdGhpcy5wcmVmaXggPSBwcmVmaXg7XG4gIH1cblxuICBwdWJsaWMgd2FybiguLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgIGNvbnNvbGUud2FybiguLi50aGlzLmZvcm1hdChhcmdzKSk7XG4gIH1cblxuICBwdWJsaWMgZXJyb3IoLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBjb25zb2xlLmVycm9yKC4uLnRoaXMuZm9ybWF0KGFyZ3MpKTtcbiAgfVxuXG4gIHB1YmxpYyBpbmZvKC4uLmFyZ3M6IGFueVtdKTogdm9pZCB7XG4gICAgY29uc29sZS5pbmZvKC4uLnRoaXMuZm9ybWF0KGFyZ3MpKTtcbiAgfVxuXG4gIHB1YmxpYyBkZWJ1ZyguLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgIGNvbnNvbGUuZGVidWcoLi4udGhpcy5mb3JtYXQoYXJncykpO1xuICB9XG5cbiAgcHVibGljIGxvZyguLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKC4uLnRoaXMuZm9ybWF0KGFyZ3MpKTtcbiAgfVxuXG4gIHB1YmxpYyBmb3JtYXQoYXJnc186IGFueSk6IGFueSB7XG4gICAgY29uc3QgYXJncyA9IGFyZ3NfLmZpbHRlcigoYTogYW55KSA9PiBhICE9IG51bGwpO1xuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gW2Ake3RoaXMucHJlZml4fSAke2FyZ3NbMF19YF07XG4gICAgICB9IGVsc2UgaWYgKGFyZ3MubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIHJldHVybiBbYCR7dGhpcy5wcmVmaXh9ICR7YXJnc1swXX1gLCBhcmdzWzFdXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbYCR7dGhpcy5wcmVmaXh9ICR7YXJnc1swXX1gLCBhcmdzLnNsaWNlKDEpXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gW2Ake3RoaXMucHJlZml4fWAsIGFyZ3NdO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBOdWxsTG9nZ2VyIHtcbiAgcHVibGljIHdhcm4oLi4uX2FyZ3M6IGFueVtdKTogdm9pZCB7IH1cbiAgcHVibGljIGVycm9yKC4uLl9hcmdzOiBhbnlbXSk6IHZvaWQgeyB9XG4gIHB1YmxpYyBpbmZvKC4uLl9hcmdzOiBhbnlbXSk6IHZvaWQgeyB9XG4gIHB1YmxpYyBsb2coLi4uX2FyZ3M6IGFueVtdKTogdm9pZCB7IH1cbiAgcHVibGljIGRlYnVnKC4uLl9hcmdzOiBhbnlbXSk6IHZvaWQgeyB9XG59XG5cbmV4cG9ydCBjbGFzcyBGaWx0ZXJlZExvZ2dlciB7XG4gIHByaXZhdGUgX2xvZ2dlcjogTG9nZ2VyO1xuICBwcml2YXRlIF9wcmVkaWNhdGU6IChsZXZlbDogc3RyaW5nLCBhcmdzOiBhbnlbXSkgPT4gYm9vbGVhbjtcblxuICBwdWJsaWMgc3RhdGljIFVzZXJMZXZlbEZpbHRlciA9IChsZXZlbDogc3RyaW5nLCBfYXJnczogYW55W10pID0+IGxldmVsID09PSAnd2FybicgfHwgbGV2ZWwgPT09ICdlcnJvcic7XG4gIHB1YmxpYyBzdGF0aWMgRGV2ZWxvcGVyTGV2ZWxGaWx0ZXIgPSAoX2xldmVsOiBzdHJpbmcsIF9hcmdzOiBhbnlbXSkgPT4gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcihsb2dnZXI6IExvZ2dlciwgcHJlZGljYXRlPzogKGxldmVsOiBzdHJpbmcsIGFyZ3M6IGFueVtdKSA9PiBib29sZWFuKSB7XG4gICAgdGhpcy5fbG9nZ2VyID0gbG9nZ2VyO1xuICAgIHRoaXMuX3ByZWRpY2F0ZSA9IHByZWRpY2F0ZSB8fCAoKF9sZXZlbCwgX2FyZ3MpID0+IHRydWUpO1xuICB9XG5cbiAgcHVibGljIHdhcm4oLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fcHJlZGljYXRlKCd3YXJuJywgYXJncykpIHtcbiAgICAgIHRoaXMuX2xvZ2dlci53YXJuKC4uLmFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBlcnJvciguLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9wcmVkaWNhdGUoJ2Vycm9yJywgYXJncykpIHtcbiAgICAgIHRoaXMuX2xvZ2dlci5lcnJvciguLi5hcmdzKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgaW5mbyguLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9wcmVkaWNhdGUoJ2luZm8nLCBhcmdzKSkge1xuICAgICAgdGhpcy5fbG9nZ2VyLmluZm8oLi4uYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGRlYnVnKC4uLmFyZ3M6IGFueVtdKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX3ByZWRpY2F0ZSgnZGVidWcnLCBhcmdzKSkge1xuICAgICAgdGhpcy5fbG9nZ2VyLmRlYnVnKC4uLmFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBsb2coLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fcHJlZGljYXRlKCdsb2cnLCBhcmdzKSkge1xuICAgICAgdGhpcy5fbG9nZ2VyLmxvZyguLi5hcmdzKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==