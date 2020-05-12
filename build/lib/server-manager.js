"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const convert_1 = require("./convert");
const path = require("path");
const atom_1 = require("atom");
/**
 * Manages the language server lifecycles and their associated objects necessary
 * for adapting them to Atom IDE.
 */
class ServerManager {
    constructor(_startServer, _logger, _startForEditor, _changeWatchedFileFilter, _reportBusyWhile, _languageServerName, _stopServersGracefully) {
        this._startServer = _startServer;
        this._logger = _logger;
        this._startForEditor = _startForEditor;
        this._changeWatchedFileFilter = _changeWatchedFileFilter;
        this._reportBusyWhile = _reportBusyWhile;
        this._languageServerName = _languageServerName;
        this._stopServersGracefully = _stopServersGracefully;
        this._activeServers = [];
        this._startingServerPromises = new Map();
        this._restartCounterPerProject = new Map();
        this._stoppingServers = [];
        this._disposable = new atom_1.CompositeDisposable();
        this._editorToServer = new Map();
        this._normalizedProjectPaths = [];
        this._isStarted = false;
        this.updateNormalizedProjectPaths();
    }
    startListening() {
        if (!this._isStarted) {
            this._disposable = new atom_1.CompositeDisposable();
            this._disposable.add(atom.textEditors.observe(this.observeTextEditors.bind(this)));
            this._disposable.add(atom.project.onDidChangePaths(this.projectPathsChanged.bind(this)));
            if (atom.project.onDidChangeFiles) {
                this._disposable.add(atom.project.onDidChangeFiles(this.projectFilesChanged.bind(this)));
            }
        }
    }
    stopListening() {
        if (this._isStarted) {
            this._disposable.dispose();
            this._isStarted = false;
        }
    }
    observeTextEditors(editor) {
        // Track grammar changes for opened editors
        const listener = editor.observeGrammar((_grammar) => this._handleGrammarChange(editor));
        this._disposable.add(editor.onDidDestroy(() => listener.dispose()));
        // Try to see if editor can have LS connected to it
        this._handleTextEditor(editor);
    }
    _handleTextEditor(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._editorToServer.has(editor)) {
                // editor hasn't been processed yet, so process it by allocating LS for it if necessary
                const server = yield this.getServer(editor, { shouldStart: true });
                if (server != null) {
                    // There LS for the editor (either started now and already running)
                    this._editorToServer.set(editor, server);
                    this._disposable.add(editor.onDidDestroy(() => {
                        this._editorToServer.delete(editor);
                        this.stopUnusedServers();
                    }));
                }
            }
        });
    }
    _handleGrammarChange(editor) {
        if (this._startForEditor(editor)) {
            // If editor is interesting for LS process the editor further to attempt to start LS if needed
            this._handleTextEditor(editor);
        }
        else {
            // Editor is not supported by the LS
            const server = this._editorToServer.get(editor);
            // If LS is running for the unsupported editor then disconnect the editor from LS and shut down LS if necessary
            if (server) {
                // Remove editor from the cache
                this._editorToServer.delete(editor);
                // Shut down LS if it's used by any other editor
                this.stopUnusedServers();
            }
        }
    }
    getActiveServers() {
        return this._activeServers.slice();
    }
    getServer(textEditor, { shouldStart } = { shouldStart: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const finalProjectPath = this.determineProjectPath(textEditor);
            if (finalProjectPath == null) {
                // Files not yet saved have no path
                return null;
            }
            const foundActiveServer = this._activeServers.find((s) => finalProjectPath === s.projectPath);
            if (foundActiveServer) {
                return foundActiveServer;
            }
            const startingPromise = this._startingServerPromises.get(finalProjectPath);
            if (startingPromise) {
                return startingPromise;
            }
            return shouldStart && this._startForEditor(textEditor) ? yield this.startServer(finalProjectPath) : null;
        });
    }
    startServer(projectPath) {
        return __awaiter(this, void 0, void 0, function* () {
            this._logger.debug(`Server starting "${projectPath}"`);
            const startingPromise = this._startServer(projectPath);
            this._startingServerPromises.set(projectPath, startingPromise);
            try {
                const startedActiveServer = yield startingPromise;
                this._activeServers.push(startedActiveServer);
                this._startingServerPromises.delete(projectPath);
                this._logger.debug(`Server started "${projectPath}" (pid ${startedActiveServer.process.pid})`);
                return startedActiveServer;
            }
            catch (e) {
                this._startingServerPromises.delete(projectPath);
                throw e;
            }
        });
    }
    stopUnusedServers() {
        return __awaiter(this, void 0, void 0, function* () {
            const usedServers = new Set(this._editorToServer.values());
            const unusedServers = this._activeServers.filter((s) => !usedServers.has(s));
            if (unusedServers.length > 0) {
                this._logger.debug(`Stopping ${unusedServers.length} unused servers`);
                yield Promise.all(unusedServers.map((s) => this.stopServer(s)));
            }
        });
    }
    stopAllServers() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [projectPath, restartCounter] of this._restartCounterPerProject) {
                clearTimeout(restartCounter.timerId);
                this._restartCounterPerProject.delete(projectPath);
            }
            yield Promise.all(this._activeServers.map((s) => this.stopServer(s)));
        });
    }
    restartAllServers() {
        return __awaiter(this, void 0, void 0, function* () {
            this.stopListening();
            yield this.stopAllServers();
            this._editorToServer = new Map();
            this.startListening();
        });
    }
    hasServerReachedRestartLimit(server) {
        let restartCounter = this._restartCounterPerProject.get(server.projectPath);
        if (!restartCounter) {
            restartCounter = {
                restarts: 0,
                timerId: setTimeout(() => {
                    this._restartCounterPerProject.delete(server.projectPath);
                }, 3 * 60 * 1000 /* 3 minutes */),
            };
            this._restartCounterPerProject.set(server.projectPath, restartCounter);
        }
        return ++restartCounter.restarts > 5;
    }
    stopServer(server) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._reportBusyWhile(`Stopping ${this._languageServerName} for ${path.basename(server.projectPath)}`, () => __awaiter(this, void 0, void 0, function* () {
                this._logger.debug(`Server stopping "${server.projectPath}"`);
                // Immediately remove the server to prevent further usage.
                // If we re-open the file after this point, we'll get a new server.
                this._activeServers.splice(this._activeServers.indexOf(server), 1);
                this._stoppingServers.push(server);
                server.disposable.dispose();
                if (this._stopServersGracefully && server.connection.isConnected) {
                    yield server.connection.shutdown();
                }
                for (const [editor, mappedServer] of this._editorToServer) {
                    if (mappedServer === server) {
                        this._editorToServer.delete(editor);
                    }
                }
                this.exitServer(server);
                this._stoppingServers.splice(this._stoppingServers.indexOf(server), 1);
            }));
        });
    }
    exitServer(server) {
        const pid = server.process.pid;
        try {
            if (server.connection.isConnected) {
                server.connection.exit();
                server.connection.dispose();
            }
        }
        finally {
            server.process.kill();
        }
        this._logger.debug(`Server stopped "${server.projectPath}" (pid ${pid})`);
    }
    terminate() {
        this._stoppingServers.forEach((server) => {
            this._logger.debug(`Server terminating "${server.projectPath}"`);
            this.exitServer(server);
        });
    }
    determineProjectPath(textEditor) {
        const filePath = textEditor.getPath();
        if (filePath == null) {
            return null;
        }
        const projectPath = this._normalizedProjectPaths.find((d) => filePath.startsWith(d));
        if (projectPath) {
            return projectPath;
        }
        const serverWithClaim = this._activeServers
            .find((s) => s.additionalPaths.has(path.dirname(filePath)));
        return serverWithClaim && this.normalizePath(serverWithClaim.projectPath) || null;
    }
    updateNormalizedProjectPaths() {
        this._normalizedProjectPaths = atom.project.getDirectories().map((d) => this.normalizePath(d.getPath()));
    }
    normalizePath(projectPath) {
        return !projectPath.endsWith(path.sep) ? path.join(projectPath, path.sep) : projectPath;
    }
    projectPathsChanged(projectPaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const pathsSet = new Set(projectPaths.map(this.normalizePath));
            const serversToStop = this._activeServers.filter((s) => !pathsSet.has(s.projectPath));
            yield Promise.all(serversToStop.map((s) => this.stopServer(s)));
            this.updateNormalizedProjectPaths();
        });
    }
    projectFilesChanged(fileEvents) {
        if (this._activeServers.length === 0) {
            return;
        }
        for (const activeServer of this._activeServers) {
            const changes = [];
            for (const fileEvent of fileEvents) {
                if (fileEvent.path.startsWith(activeServer.projectPath) && this._changeWatchedFileFilter(fileEvent.path)) {
                    changes.push(convert_1.default.atomFileEventToLSFileEvents(fileEvent)[0]);
                }
                if (fileEvent.action === 'renamed' &&
                    fileEvent.oldPath.startsWith(activeServer.projectPath) &&
                    this._changeWatchedFileFilter(fileEvent.oldPath)) {
                    changes.push(convert_1.default.atomFileEventToLSFileEvents(fileEvent)[1]);
                }
            }
            if (changes.length > 0) {
                activeServer.connection.didChangeWatchedFiles({ changes });
            }
        }
    }
}
exports.ServerManager = ServerManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvc2VydmVyLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBZ0M7QUFDaEMsNkJBQTZCO0FBSzdCLCtCQUljO0FBc0NkOzs7R0FHRztBQUNILE1BQWEsYUFBYTtJQVV4QixZQUNVLFlBQTRELEVBQzVELE9BQWUsRUFDZixlQUFnRCxFQUNoRCx3QkFBdUQsRUFDdkQsZ0JBQWlDLEVBQ2pDLG1CQUEyQixFQUMzQixzQkFBK0I7UUFOL0IsaUJBQVksR0FBWixZQUFZLENBQWdEO1FBQzVELFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixvQkFBZSxHQUFmLGVBQWUsQ0FBaUM7UUFDaEQsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUErQjtRQUN2RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWlCO1FBQ2pDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtRQUMzQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQVM7UUFoQmpDLG1CQUFjLEdBQW1CLEVBQUUsQ0FBQztRQUNwQyw0QkFBdUIsR0FBdUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN4RSw4QkFBeUIsR0FBZ0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNuRSxxQkFBZ0IsR0FBbUIsRUFBRSxDQUFDO1FBQ3RDLGdCQUFXLEdBQXdCLElBQUksMEJBQW1CLEVBQUUsQ0FBQztRQUM3RCxvQkFBZSxHQUFrQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzNELDRCQUF1QixHQUFhLEVBQUUsQ0FBQztRQUN2QyxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBV3pCLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFFTSxjQUFjO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSwwQkFBbUIsRUFBRSxDQUFD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ImltcG9ydCBDb252ZXJ0IGZyb20gJy4vY29udmVydCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgKiBhcyBscyBmcm9tICcuL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQge1xuICBDb21wb3NpdGVEaXNwb3NhYmxlLFxuICBGaWxlc3lzdGVtQ2hhbmdlRXZlbnQsXG4gIFRleHRFZGl0b3IsXG59IGZyb20gJ2F0b20nO1xuaW1wb3J0IHsgUmVwb3J0QnVzeVdoaWxlIH0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogUHVibGljOiBEZWZpbmVzIHRoZSBtaW5pbXVtIHN1cmZhY2UgYXJlYSBmb3IgYW4gb2JqZWN0IHRoYXQgcmVzZW1ibGVzIGFcbiAqIENoaWxkUHJvY2Vzcy4gIFRoaXMgaXMgdXNlZCBzbyB0aGF0IGxhbmd1YWdlIHBhY2thZ2VzIHdpdGggYWx0ZXJuYXRpdmVcbiAqIGxhbmd1YWdlIHNlcnZlciBwcm9jZXNzIGhvc3Rpbmcgc3RyYXRlZ2llcyBjYW4gcmV0dXJuIHNvbWV0aGluZyBjb21wYXRpYmxlXG4gKiB3aXRoIEF1dG9MYW5ndWFnZUNsaWVudC5zdGFydFNlcnZlclByb2Nlc3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgc3RkaW46IHN0cmVhbS5Xcml0YWJsZTtcbiAgc3Rkb3V0OiBzdHJlYW0uUmVhZGFibGU7XG4gIHN0ZGVycjogc3RyZWFtLlJlYWRhYmxlO1xuICBwaWQ6IG51bWJlcjtcblxuICBraWxsKHNpZ25hbD86IHN0cmluZyk6IHZvaWQ7XG4gIG9uKGV2ZW50OiAnZXJyb3InLCBsaXN0ZW5lcjogKGVycjogRXJyb3IpID0+IHZvaWQpOiB0aGlzO1xuICBvbihldmVudDogJ2V4aXQnLCBsaXN0ZW5lcjogKGNvZGU6IG51bWJlciwgc2lnbmFsOiBzdHJpbmcpID0+IHZvaWQpOiB0aGlzO1xufVxuXG4vKiogVGhlIG5lY2Vzc2FyeSBlbGVtZW50cyBmb3IgYSBzZXJ2ZXIgdGhhdCBoYXMgc3RhcnRlZCBvciBpcyBzdGFydGluZy4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlU2VydmVyIHtcbiAgZGlzcG9zYWJsZTogQ29tcG9zaXRlRGlzcG9zYWJsZTtcbiAgcHJvamVjdFBhdGg6IHN0cmluZztcbiAgcHJvY2VzczogTGFuZ3VhZ2VTZXJ2ZXJQcm9jZXNzO1xuICBjb25uZWN0aW9uOiBscy5MYW5ndWFnZUNsaWVudENvbm5lY3Rpb247XG4gIGNhcGFiaWxpdGllczogbHMuU2VydmVyQ2FwYWJpbGl0aWVzO1xuICAvLyBPdXQgb2YgcHJvamVjdCBkaXJlY3RvcmllcyB0aGF0IHRoaXMgc2VydmVyIGNhbiBhbHNvIHN1cHBvcnQuXG4gIGFkZGl0aW9uYWxQYXRoczogU2V0PHN0cmluZz47XG4gIC8vIENvbnNpZGVycyBhIHBhdGggZnJvbSBgdGV4dERvY3VtZW50L2RlZmluaXRpb25gIGZvciBpbmNsdXNpb24gaW4gYGFkZGl0aW9uYWxQYXRoc2AuXG4gIGNvbnNpZGVyRGVmaW5pdGlvblBhdGgocGF0aDogc3RyaW5nKTogdm9pZDtcbn1cblxuaW50ZXJmYWNlIFJlc3RhcnRDb3VudGVyIHtcbiAgcmVzdGFydHM6IG51bWJlcjtcbiAgdGltZXJJZDogTm9kZUpTLlRpbWVyO1xufVxuXG4vKipcbiAqIE1hbmFnZXMgdGhlIGxhbmd1YWdlIHNlcnZlciBsaWZlY3ljbGVzIGFuZCB0aGVpciBhc3NvY2lhdGVkIG9iamVjdHMgbmVjZXNzYXJ5XG4gKiBmb3IgYWRhcHRpbmcgdGhlbSB0byBBdG9tIElERS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNlcnZlck1hbmFnZXIge1xuICBwcml2YXRlIF9hY3RpdmVTZXJ2ZXJzOiBBY3RpdmVTZXJ2ZXJbXSA9IFtdO1xuICBwcml2YXRlIF9zdGFydGluZ1NlcnZlclByb21pc2VzOiBNYXA8c3RyaW5nLCBQcm9taXNlPEFjdGl2ZVNlcnZlcj4+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIF9yZXN0YXJ0Q291bnRlclBlclByb2plY3Q6IE1hcDxzdHJpbmcsIFJlc3RhcnRDb3VudGVyPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBfc3RvcHBpbmdTZXJ2ZXJzOiBBY3RpdmVTZXJ2ZXJbXSA9IFtdO1xuICBwcml2YXRlIF9kaXNwb3NhYmxlOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHJpdmF0ZSBfZWRpdG9yVG9TZXJ2ZXI6IE1hcDxUZXh0RWRpdG9yLCBBY3RpdmVTZXJ2ZXI+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIF9ub3JtYWxpemVkUHJvamVjdFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIF9pc1N0YXJ0ZWQgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIF9zdGFydFNlcnZlcjogKHByb2plY3RQYXRoOiBzdHJpbmcpID0+IFByb21pc2U8QWN0aXZlU2VydmVyPixcbiAgICBwcml2YXRlIF9sb2dnZXI6IExvZ2dlcixcbiAgICBwcml2YXRlIF9zdGFydEZvckVkaXRvcjogKGVkaXRvcjogVGV4dEVkaXRvcikgPT4gYm9vbGVhbixcbiAgICBwcml2YXRlIF9jaGFuZ2VXYXRjaGVkRmlsZUZpbHRlcjogKGZpbGVQYXRoOiBzdHJpbmcpID0+IGJvb2xlYW4sXG4gICAgcHJpdmF0ZSBfcmVwb3J0QnVzeVdoaWxlOiBSZXBvcnRCdXN5V2hpbGUsXG4gICAgcHJpdmF0ZSBfbGFuZ3VhZ2VTZXJ2ZXJOYW1lOiBzdHJpbmcsXG4gICAgcHJpdmF0ZSBfc3RvcFNlcnZlcnNHcmFjZWZ1bGx5OiBib29sZWFuLFxuICApIHtcbiAgICB0aGlzLnVwZGF0ZU5vcm1hbGl6ZWRQcm9qZWN0UGF0aHMoKTtcbiAgfVxuXG4gIHB1YmxpYyBzdGFydExpc3RlbmluZygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuX2lzU3RhcnRlZCkge1xuICAgICAgdGhpcy5fZGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChhdG9tLnRleHRFZGl0b3JzLm9ic2VydmUodGhpcy5vYnNlcnZlVGV4dEVkaXRvcnMuYmluZCh0aGlzKSkpO1xuICAgICAgdGhpcy5fZGlzcG9zYWJsZS5hZGQoYXRvbS5wcm9qZWN0Lm9uRGlkQ2hhbmdlUGF0aHModGhpcy5wcm9qZWN0UGF0aHNDaGFuZ2VkLmJpbmQodGhpcykpKTtcbiAgICAgIGlmIChhdG9tLnByb2plY3Qub25EaWRDaGFuZ2VGaWxlcykge1xuICAgICAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChhdG9tLnByb2plY3Qub25EaWRDaGFuZ2VGaWxlcyh0aGlzLnByb2plY3RGaWxlc0NoYW5nZWQuYmluZCh0aGlzKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBzdG9wTGlzdGVuaW5nKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9pc1N0YXJ0ZWQpIHtcbiAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuZGlzcG9zZSgpO1xuICAgICAgdGhpcy5faXNTdGFydGVkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBvYnNlcnZlVGV4dEVkaXRvcnMoZWRpdG9yOiBUZXh0RWRpdG9yKTogdm9pZCB7XG4gICAgLy8gVHJhY2sgZ3JhbW1hciBjaGFuZ2VzIGZvciBvcGVuZWQgZWRpdG9yc1xuICAgIGNvbnN0IGxpc3RlbmVyID0gZWRpdG9yLm9ic2VydmVHcmFtbWFyKChfZ3JhbW1hcikgPT4gdGhpcy5faGFuZGxlR3JhbW1hckNoYW5nZShlZGl0b3IpKTtcbiAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IGxpc3RlbmVyLmRpc3Bvc2UoKSkpO1xuICAgIC8vIFRyeSB0byBzZWUgaWYgZWRpdG9yIGNhbiBoYXZlIExTIGNvbm5lY3RlZCB0byBpdFxuICAgIHRoaXMuX2hhbmRsZVRleHRFZGl0b3IoZWRpdG9yKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2hhbmRsZVRleHRFZGl0b3IoZWRpdG9yOiBUZXh0RWRpdG9yKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLl9lZGl0b3JUb1NlcnZlci5oYXMoZWRpdG9yKSkge1xuICAgICAgLy8gZWRpdG9yIGhhc24ndCBiZWVuIHByb2Nlc3NlZCB5ZXQsIHNvIHByb2Nlc3MgaXQgYnkgYWxsb2NhdGluZyBMUyBmb3IgaXQgaWYgbmVjZXNzYXJ5XG4gICAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLmdldFNlcnZlcihlZGl0b3IsIHsgc2hvdWxkU3RhcnQ6IHRydWUgfSk7XG4gICAgICBpZiAoc2VydmVyICE9IG51bGwpIHtcbiAgICAgICAgLy8gVGhlcmUgTFMgZm9yIHRoZSBlZGl0b3IgKGVpdGhlciBzdGFydGVkIG5vdyBhbmQgYWxyZWFkeSBydW5uaW5nKVxuICAgICAgICB0aGlzLl9lZGl0b3JUb1NlcnZlci5zZXQoZWRpdG9yLCBzZXJ2ZXIpO1xuICAgICAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChcbiAgICAgICAgICBlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2VkaXRvclRvU2VydmVyLmRlbGV0ZShlZGl0b3IpO1xuICAgICAgICAgICAgdGhpcy5zdG9wVW51c2VkU2VydmVycygpO1xuICAgICAgICAgIH0pLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2hhbmRsZUdyYW1tYXJDaGFuZ2UoZWRpdG9yOiBUZXh0RWRpdG9yKSB7XG4gICAgaWYgKHRoaXMuX3N0YXJ0Rm9yRWRpdG9yKGVkaXRvcikpIHtcbiAgICAgIC8vIElmIGVkaXRvciBpcyBpbnRlcmVzdGluZyBmb3IgTFMgcHJvY2VzcyB0aGUgZWRpdG9yIGZ1cnRoZXIgdG8gYXR0ZW1wdCB0byBzdGFydCBMUyBpZiBuZWVkZWRcbiAgICAgIHRoaXMuX2hhbmRsZVRleHRFZGl0b3IoZWRpdG9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRWRpdG9yIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIExTXG4gICAgICBjb25zdCBzZXJ2ZXIgPSB0aGlzLl9lZGl0b3JUb1NlcnZlci5nZXQoZWRpdG9yKTtcbiAgICAgIC8vIElmIExTIGlzIHJ1bm5pbmcgZm9yIHRoZSB1bnN1cHBvcnRlZCBlZGl0b3IgdGhlbiBkaXNjb25uZWN0IHRoZSBlZGl0b3IgZnJvbSBMUyBhbmQgc2h1dCBkb3duIExTIGlmIG5lY2Vzc2FyeVxuICAgICAgaWYgKHNlcnZlcikge1xuICAgICAgICAvLyBSZW1vdmUgZWRpdG9yIGZyb20gdGhlIGNhY2hlXG4gICAgICAgIHRoaXMuX2VkaXRvclRvU2VydmVyLmRlbGV0ZShlZGl0b3IpO1xuICAgICAgICAvLyBTaHV0IGRvd24gTFMgaWYgaXQncyB1c2VkIGJ5IGFueSBvdGhlciBlZGl0b3JcbiAgICAgICAgdGhpcy5zdG9wVW51c2VkU2VydmVycygpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBnZXRBY3RpdmVTZXJ2ZXJzKCk6IEFjdGl2ZVNlcnZlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fYWN0aXZlU2VydmVycy5zbGljZSgpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGdldFNlcnZlcihcbiAgICB0ZXh0RWRpdG9yOiBUZXh0RWRpdG9yLFxuICAgIHsgc2hvdWxkU3RhcnQgfTogeyBzaG91bGRTdGFydD86IGJvb2xlYW4gfSA9IHsgc2hvdWxkU3RhcnQ6IGZhbHNlIH0sXG4gICk6IFByb21pc2U8QWN0aXZlU2VydmVyIHwgbnVsbD4ge1xuICAgIGNvbnN0IGZpbmFsUHJvamVjdFBhdGggPSB0aGlzLmRldGVybWluZVByb2plY3RQYXRoKHRleHRFZGl0b3IpO1xuICAgIGlmIChmaW5hbFByb2plY3RQYXRoID09IG51bGwpIHtcbiAgICAgIC8vIEZpbGVzIG5vdCB5ZXQgc2F2ZWQgaGF2ZSBubyBwYXRoXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBmb3VuZEFjdGl2ZVNlcnZlciA9IHRoaXMuX2FjdGl2ZVNlcnZlcnMuZmluZCgocykgPT4gZmluYWxQcm9qZWN0UGF0aCA9PT0gcy5wcm9qZWN0UGF0aCk7XG4gICAgaWYgKGZvdW5kQWN0aXZlU2VydmVyKSB7XG4gICAgICByZXR1cm4gZm91bmRBY3RpdmVTZXJ2ZXI7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnRpbmdQcm9taXNlID0gdGhpcy5fc3RhcnRpbmdTZXJ2ZXJQcm9taXNlcy5nZXQoZmluYWxQcm9qZWN0UGF0aCk7XG4gICAgaWYgKHN0YXJ0aW5nUHJvbWlzZSkge1xuICAgICAgcmV0dXJuIHN0YXJ0aW5nUHJvbWlzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2hvdWxkU3RhcnQgJiYgdGhpcy5fc3RhcnRGb3JFZGl0b3IodGV4dEVkaXRvcikgPyBhd2FpdCB0aGlzLnN0YXJ0U2VydmVyKGZpbmFsUHJvamVjdFBhdGgpIDogbnVsbDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzdGFydFNlcnZlcihwcm9qZWN0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxBY3RpdmVTZXJ2ZXI+IHtcbiAgICB0aGlzLl9sb2dnZXIuZGVidWcoYFNlcnZlciBzdGFydGluZyBcIiR7cHJvamVjdFBhdGh9XCJgKTtcbiAgICBjb25zdCBzdGFydGluZ1Byb21pc2UgPSB0aGlzLl9zdGFydFNlcnZlcihwcm9qZWN0UGF0aCk7XG4gICAgdGhpcy5fc3RhcnRpbmdTZXJ2ZXJQcm9taXNlcy5zZXQocHJvamVjdFBhdGgsIHN0YXJ0aW5nUHJvbWlzZSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXJ0ZWRBY3RpdmVTZXJ2ZXIgPSBhd2FpdCBzdGFydGluZ1Byb21pc2U7XG4gICAgICB0aGlzLl9hY3RpdmVTZXJ2ZXJzLnB1c2goc3RhcnRlZEFjdGl2ZVNlcnZlcik7XG4gICAgICB0aGlzLl9zdGFydGluZ1NlcnZlclByb21pc2VzLmRlbGV0ZShwcm9qZWN0UGF0aCk7XG4gICAgICB0aGlzLl9sb2dnZXIuZGVidWcoYFNlcnZlciBzdGFydGVkIFwiJHtwcm9qZWN0UGF0aH1cIiAocGlkICR7c3RhcnRlZEFjdGl2ZVNlcnZlci5wcm9jZXNzLnBpZH0pYCk7XG4gICAgICByZXR1cm4gc3RhcnRlZEFjdGl2ZVNlcnZlcjtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLl9zdGFydGluZ1NlcnZlclByb21pc2VzLmRlbGV0ZShwcm9qZWN0UGF0aCk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzdG9wVW51c2VkU2VydmVycygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1c2VkU2VydmVycyA9IG5ldyBTZXQodGhpcy5fZWRpdG9yVG9TZXJ2ZXIudmFsdWVzKCkpO1xuICAgIGNvbnN0IHVudXNlZFNlcnZlcnMgPSB0aGlzLl9hY3RpdmVTZXJ2ZXJzLmZpbHRlcigocykgPT4gIXVzZWRTZXJ2ZXJzLmhhcyhzKSk7XG4gICAgaWYgKHVudXNlZFNlcnZlcnMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5fbG9nZ2VyLmRlYnVnKGBTdG9wcGluZyAke3VudXNlZFNlcnZlcnMubGVuZ3RofSB1bnVzZWQgc2VydmVyc2ApO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodW51c2VkU2VydmVycy5tYXAoKHMpID0+IHRoaXMuc3RvcFNlcnZlcihzKSkpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzdG9wQWxsU2VydmVycygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBmb3IgKGNvbnN0IFtwcm9qZWN0UGF0aCwgcmVzdGFydENvdW50ZXJdIG9mIHRoaXMuX3Jlc3RhcnRDb3VudGVyUGVyUHJvamVjdCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHJlc3RhcnRDb3VudGVyLnRpbWVySWQpO1xuICAgICAgdGhpcy5fcmVzdGFydENvdW50ZXJQZXJQcm9qZWN0LmRlbGV0ZShwcm9qZWN0UGF0aCk7XG4gICAgfVxuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwodGhpcy5fYWN0aXZlU2VydmVycy5tYXAoKHMpID0+IHRoaXMuc3RvcFNlcnZlcihzKSkpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlc3RhcnRBbGxTZXJ2ZXJzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIGF3YWl0IHRoaXMuc3RvcEFsbFNlcnZlcnMoKTtcbiAgICB0aGlzLl9lZGl0b3JUb1NlcnZlciA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLnN0YXJ0TGlzdGVuaW5nKCk7XG4gIH1cblxuICBwdWJsaWMgaGFzU2VydmVyUmVhY2hlZFJlc3RhcnRMaW1pdChzZXJ2ZXI6IEFjdGl2ZVNlcnZlcikge1xuICAgIGxldCByZXN0YXJ0Q291bnRlciA9IHRoaXMuX3Jlc3RhcnRDb3VudGVyUGVyUHJvamVjdC5nZXQoc2VydmVyLnByb2plY3RQYXRoKTtcblxuICAgIGlmICghcmVzdGFydENvdW50ZXIpIHtcbiAgICAgIHJlc3RhcnRDb3VudGVyID0ge1xuICAgICAgICByZXN0YXJ0czogMCxcbiAgICAgICAgdGltZXJJZDogc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fcmVzdGFydENvdW50ZXJQZXJQcm9qZWN0LmRlbGV0ZShzZXJ2ZXIucHJvamVjdFBhdGgpO1xuICAgICAgICB9LCAzICogNjAgKiAxMDAwIC8qIDMgbWludXRlcyAqLyksXG4gICAgICB9O1xuXG4gICAgICB0aGlzLl9yZXN0YXJ0Q291bnRlclBlclByb2plY3Quc2V0KHNlcnZlci5wcm9qZWN0UGF0aCwgcmVzdGFydENvdW50ZXIpO1xuICAgIH1cblxuICAgIHJldHVybiArK3Jlc3RhcnRDb3VudGVyLnJlc3RhcnRzID4gNTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzdG9wU2VydmVyKHNlcnZlcjogQWN0aXZlU2VydmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5fcmVwb3J0QnVzeVdoaWxlKFxuICAgICAgYFN0b3BwaW5nICR7dGhpcy5fbGFuZ3VhZ2VTZXJ2ZXJOYW1lfSBmb3IgJHtwYXRoLmJhc2VuYW1lKHNlcnZlci5wcm9qZWN0UGF0aCl9YCxcbiAgICAgIGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5fbG9nZ2VyLmRlYnVnKGBTZXJ2ZXIgc3RvcHBpbmcgXCIke3NlcnZlci5wcm9qZWN0UGF0aH1cImApO1xuICAgICAgICAvLyBJbW1lZGlhdGVseSByZW1vdmUgdGhlIHNlcnZlciB0byBwcmV2ZW50IGZ1cnRoZXIgdXNhZ2UuXG4gICAgICAgIC8vIElmIHdlIHJlLW9wZW4gdGhlIGZpbGUgYWZ0ZXIgdGhpcyBwb2ludCwgd2UnbGwgZ2V0IGEgbmV3IHNlcnZlci5cbiAgICAgICAgdGhpcy5fYWN0aXZlU2VydmVycy5zcGxpY2UodGhpcy5fYWN0aXZlU2VydmVycy5pbmRleE9mKHNlcnZlciksIDEpO1xuICAgICAgICB0aGlzLl9zdG9wcGluZ1NlcnZlcnMucHVzaChzZXJ2ZXIpO1xuICAgICAgICBzZXJ2ZXIuZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICAgIGlmICh0aGlzLl9zdG9wU2VydmVyc0dyYWNlZnVsbHkgJiYgc2VydmVyLmNvbm5lY3Rpb24uaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICBhd2FpdCBzZXJ2ZXIuY29ubmVjdGlvbi5zaHV0ZG93bigpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBbZWRpdG9yLCBtYXBwZWRTZXJ2ZXJdIG9mIHRoaXMuX2VkaXRvclRvU2VydmVyKSB7XG4gICAgICAgICAgaWYgKG1hcHBlZFNlcnZlciA9PT0gc2VydmVyKSB7XG4gICAgICAgICAgICB0aGlzLl9lZGl0b3JUb1NlcnZlci5kZWxldGUoZWRpdG9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmV4aXRTZXJ2ZXIoc2VydmVyKTtcbiAgICAgICAgdGhpcy5fc3RvcHBpbmdTZXJ2ZXJzLnNwbGljZSh0aGlzLl9zdG9wcGluZ1NlcnZlcnMuaW5kZXhPZihzZXJ2ZXIpLCAxKTtcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBleGl0U2VydmVyKHNlcnZlcjogQWN0aXZlU2VydmVyKTogdm9pZCB7XG4gICAgY29uc3QgcGlkID0gc2VydmVyLnByb2Nlc3MucGlkO1xuICAgIHRyeSB7XG4gICAgICBpZiAoc2VydmVyLmNvbm5lY3Rpb24uaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgc2VydmVyLmNvbm5lY3Rpb24uZXhpdCgpO1xuICAgICAgICBzZXJ2ZXIuY29ubmVjdGlvbi5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNlcnZlci5wcm9jZXNzLmtpbGwoKTtcbiAgICB9XG4gICAgdGhpcy5fbG9nZ2VyLmRlYnVnKGBTZXJ2ZXIgc3RvcHBlZCBcIiR7c2VydmVyLnByb2plY3RQYXRofVwiIChwaWQgJHtwaWR9KWApO1xuICB9XG5cbiAgcHVibGljIHRlcm1pbmF0ZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9zdG9wcGluZ1NlcnZlcnMuZm9yRWFjaCgoc2VydmVyKSA9PiB7XG4gICAgICB0aGlzLl9sb2dnZXIuZGVidWcoYFNlcnZlciB0ZXJtaW5hdGluZyBcIiR7c2VydmVyLnByb2plY3RQYXRofVwiYCk7XG4gICAgICB0aGlzLmV4aXRTZXJ2ZXIoc2VydmVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBkZXRlcm1pbmVQcm9qZWN0UGF0aCh0ZXh0RWRpdG9yOiBUZXh0RWRpdG9yKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgY29uc3QgZmlsZVBhdGggPSB0ZXh0RWRpdG9yLmdldFBhdGgoKTtcbiAgICBpZiAoZmlsZVBhdGggPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdFBhdGggPSB0aGlzLl9ub3JtYWxpemVkUHJvamVjdFBhdGhzLmZpbmQoKGQpID0+IGZpbGVQYXRoLnN0YXJ0c1dpdGgoZCkpO1xuICAgIGlmIChwcm9qZWN0UGF0aCkge1xuICAgICAgcmV0dXJuIHByb2plY3RQYXRoO1xuICAgIH1cblxuICAgIGNvbnN0IHNlcnZlcldpdGhDbGFpbSA9IHRoaXMuX2FjdGl2ZVNlcnZlcnNcbiAgICAgIC5maW5kKChzKSA9PiBzLmFkZGl0aW9uYWxQYXRocy5oYXMocGF0aC5kaXJuYW1lKGZpbGVQYXRoKSkpO1xuICAgIHJldHVybiBzZXJ2ZXJXaXRoQ2xhaW0gJiYgdGhpcy5ub3JtYWxpemVQYXRoKHNlcnZlcldpdGhDbGFpbS5wcm9qZWN0UGF0aCkgfHwgbnVsbDtcbiAgfVxuXG4gIHB1YmxpYyB1cGRhdGVOb3JtYWxpemVkUHJvamVjdFBhdGhzKCk6IHZvaWQge1xuICAgIHRoaXMuX25vcm1hbGl6ZWRQcm9qZWN0UGF0aHMgPSBhdG9tLnByb2plY3QuZ2V0RGlyZWN0b3JpZXMoKS5tYXAoKGQpID0+IHRoaXMubm9ybWFsaXplUGF0aChkLmdldFBhdGgoKSkpO1xuICB9XG5cbiAgcHVibGljIG5vcm1hbGl6ZVBhdGgocHJvamVjdFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuICFwcm9qZWN0UGF0aC5lbmRzV2l0aChwYXRoLnNlcCkgPyBwYXRoLmpvaW4ocHJvamVjdFBhdGgsIHBhdGguc2VwKSA6IHByb2plY3RQYXRoO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHByb2plY3RQYXRoc0NoYW5nZWQocHJvamVjdFBhdGhzOiBzdHJpbmdbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHBhdGhzU2V0ID0gbmV3IFNldChwcm9qZWN0UGF0aHMubWFwKHRoaXMubm9ybWFsaXplUGF0aCkpO1xuICAgIGNvbnN0IHNlcnZlcnNUb1N0b3AgPSB0aGlzLl9hY3RpdmVTZXJ2ZXJzLmZpbHRlcigocykgPT4gIXBhdGhzU2V0LmhhcyhzLnByb2plY3RQYXRoKSk7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoc2VydmVyc1RvU3RvcC5tYXAoKHMpID0+IHRoaXMuc3RvcFNlcnZlcihzKSkpO1xuICAgIHRoaXMudXBkYXRlTm9ybWFsaXplZFByb2plY3RQYXRocygpO1xuICB9XG5cbiAgcHVibGljIHByb2plY3RGaWxlc0NoYW5nZWQoZmlsZUV2ZW50czogRmlsZXN5c3RlbUNoYW5nZUV2ZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2FjdGl2ZVNlcnZlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBhY3RpdmVTZXJ2ZXIgb2YgdGhpcy5fYWN0aXZlU2VydmVycykge1xuICAgICAgY29uc3QgY2hhbmdlczogbHMuRmlsZUV2ZW50W10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgZmlsZUV2ZW50IG9mIGZpbGVFdmVudHMpIHtcbiAgICAgICAgaWYgKGZpbGVFdmVudC5wYXRoLnN0YXJ0c1dpdGgoYWN0aXZlU2VydmVyLnByb2plY3RQYXRoKSAmJiB0aGlzLl9jaGFuZ2VXYXRjaGVkRmlsZUZpbHRlcihmaWxlRXZlbnQucGF0aCkpIHtcbiAgICAgICAgICBjaGFuZ2VzLnB1c2goQ29udmVydC5hdG9tRmlsZUV2ZW50VG9MU0ZpbGVFdmVudHMoZmlsZUV2ZW50KVswXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGZpbGVFdmVudC5hY3Rpb24gPT09ICdyZW5hbWVkJyAmJlxuICAgICAgICAgIGZpbGVFdmVudC5vbGRQYXRoLnN0YXJ0c1dpdGgoYWN0aXZlU2VydmVyLnByb2plY3RQYXRoKSAmJlxuICAgICAgICAgIHRoaXMuX2NoYW5nZVdhdGNoZWRGaWxlRmlsdGVyKGZpbGVFdmVudC5vbGRQYXRoKVxuICAgICAgICApIHtcbiAgICAgICAgICBjaGFuZ2VzLnB1c2goQ29udmVydC5hdG9tRmlsZUV2ZW50VG9MU0ZpbGVFdmVudHMoZmlsZUV2ZW50KVsxXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChjaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYWN0aXZlU2VydmVyLmNvbm5lY3Rpb24uZGlkQ2hhbmdlV2F0Y2hlZEZpbGVzKHsgY2hhbmdlcyB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==