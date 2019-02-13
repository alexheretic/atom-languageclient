"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const convert_1 = require("./convert");
const path = require("path");
const atom_1 = require("atom");
// Manages the language server lifecycles and their associated objects necessary
// for adapting them to Atom IDE.
class ServerManager {
    constructor(_startServer, _logger, _startForEditor, _changeWatchedFileFilter, _reportBusyWhile, _languageServerName) {
        this._startServer = _startServer;
        this._logger = _logger;
        this._startForEditor = _startForEditor;
        this._changeWatchedFileFilter = _changeWatchedFileFilter;
        this._reportBusyWhile = _reportBusyWhile;
        this._languageServerName = _languageServerName;
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
                if (server.connection.isConnected) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvc2VydmVyLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHVDQUFnQztBQUNoQyw2QkFBNkI7QUFLN0IsK0JBSWM7QUFvQ2QsZ0ZBQWdGO0FBQ2hGLGlDQUFpQztBQUNqQyxNQUFhLGFBQWE7SUFVeEIsWUFDVSxZQUE0RCxFQUM1RCxPQUFlLEVBQ2YsZUFBZ0QsRUFDaEQsd0JBQXVELEVBQ3ZELGdCQUFpQyxFQUNqQyxtQkFBMkI7UUFMM0IsaUJBQVksR0FBWixZQUFZLENBQWdEO1FBQzVELFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixvQkFBZSxHQUFmLGVBQWUsQ0FBaUM7UUFDaEQsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUErQjtRQUN2RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWlCO1FBQ2pDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtRQWY3QixtQkFBYyxHQUFtQixFQUFFLENBQUM7UUFDcEMsNEJBQXVCLEdBQXVDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDeEUsOEJBQXlCLEdBQWdDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDbkUscUJBQWdCLEdBQW1CLEVBQUUsQ0FBQztRQUN0QyxnQkFBVyxHQUF3QixJQUFJLDBCQUFtQixFQUFFLENBQUM7UUFDN0Qsb0JBQWUsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUMzRCw0QkFBdUIsR0FBYSxFQUFFLENBQUM7UUFDdkMsZUFBVSxHQUFHLEtBQUssQ0FBQztRQVV6QixJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRU0sY0FBYztRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNwQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksMEJBQW1CLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcs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QUE0QixFQUFFLENBQUM7UUFDdEMsQ0FBQztLQUFBO0lBRU0sbUJBQW1CLENBQUMsVUFBaUM7UUFDMUQsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDcEMsT0FBTztTQUNSO1FBRUQsS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQzlDLE1BQU0sT0FBTyxHQUFtQixFQUFFLENBQUM7WUFDbkMsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUU7Z0JBQ2xDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3hHLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQU8sQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNqRTtnQkFDRCxJQUNFLFNBQVMsQ0FBQyxNQUFNLEtBQUssU0FBUztvQkFDOUIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztvQkFDdEQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFDaEQ7b0JBQ0EsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBTyxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2pFO2FBQ0Y7WUFDRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN0QixZQUFZLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQzthQUM1RDtTQUNGO0lBQ0gsQ0FBQztDQUNGO0FBM1FELHNDQTJRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBDb252ZXJ0IGZyb20gJy4vY29udmVydCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgKiBhcyBscyBmcm9tICcuL2xhbmd1YWdlY2xpZW50JztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQge1xuICBDb21wb3NpdGVEaXNwb3NhYmxlLFxuICBGaWxlc3lzdGVtQ2hhbmdlRXZlbnQsXG4gIFRleHRFZGl0b3IsXG59IGZyb20gJ2F0b20nO1xuaW1wb3J0IHsgUmVwb3J0QnVzeVdoaWxlIH0gZnJvbSAnLi91dGlscyc7XG5cbi8vIFB1YmxpYzogRGVmaW5lcyB0aGUgbWluaW11bSBzdXJmYWNlIGFyZWEgZm9yIGFuIG9iamVjdCB0aGF0IHJlc2VtYmxlcyBhXG4vLyBDaGlsZFByb2Nlc3MuICBUaGlzIGlzIHVzZWQgc28gdGhhdCBsYW5ndWFnZSBwYWNrYWdlcyB3aXRoIGFsdGVybmF0aXZlXG4vLyBsYW5ndWFnZSBzZXJ2ZXIgcHJvY2VzcyBob3N0aW5nIHN0cmF0ZWdpZXMgY2FuIHJldHVybiBzb21ldGhpbmcgY29tcGF0aWJsZVxuLy8gd2l0aCBBdXRvTGFuZ3VhZ2VDbGllbnQuc3RhcnRTZXJ2ZXJQcm9jZXNzLlxuZXhwb3J0IGludGVyZmFjZSBMYW5ndWFnZVNlcnZlclByb2Nlc3MgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBzdGRpbjogc3RyZWFtLldyaXRhYmxlO1xuICBzdGRvdXQ6IHN0cmVhbS5SZWFkYWJsZTtcbiAgc3RkZXJyOiBzdHJlYW0uUmVhZGFibGU7XG4gIHBpZDogbnVtYmVyO1xuXG4gIGtpbGwoc2lnbmFsPzogc3RyaW5nKTogdm9pZDtcbiAgb24oZXZlbnQ6ICdlcnJvcicsIGxpc3RlbmVyOiAoZXJyOiBFcnJvcikgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZXhpdCcsIGxpc3RlbmVyOiAoY29kZTogbnVtYmVyLCBzaWduYWw6IHN0cmluZykgPT4gdm9pZCk6IHRoaXM7XG59XG5cbi8vIFRoZSBuZWNlc3NhcnkgZWxlbWVudHMgZm9yIGEgc2VydmVyIHRoYXQgaGFzIHN0YXJ0ZWQgb3IgaXMgc3RhcnRpbmcuXG5leHBvcnQgaW50ZXJmYWNlIEFjdGl2ZVNlcnZlciB7XG4gIGRpc3Bvc2FibGU6IENvbXBvc2l0ZURpc3Bvc2FibGU7XG4gIHByb2plY3RQYXRoOiBzdHJpbmc7XG4gIHByb2Nlc3M6IExhbmd1YWdlU2VydmVyUHJvY2VzcztcbiAgY29ubmVjdGlvbjogbHMuTGFuZ3VhZ2VDbGllbnRDb25uZWN0aW9uO1xuICBjYXBhYmlsaXRpZXM6IGxzLlNlcnZlckNhcGFiaWxpdGllcztcbiAgLy8gT3V0IG9mIHByb2plY3QgZGlyZWN0b3JpZXMgdGhhdCB0aGlzIHNlcnZlciBjYW4gYWxzbyBzdXBwb3J0LlxuICBhZGRpdGlvbmFsUGF0aHM6IFNldDxzdHJpbmc+O1xuICAvLyBDb25zaWRlcnMgYSBwYXRoIGZyb20gYHRleHREb2N1bWVudC9kZWZpbml0aW9uYCBmb3IgaW5jbHVzaW9uIGluIGBhZGRpdGlvbmFsUGF0aHNgLlxuICBjb25zaWRlckRlZmluaXRpb25QYXRoKHBhdGg6IHN0cmluZyk6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBSZXN0YXJ0Q291bnRlciB7XG4gIHJlc3RhcnRzOiBudW1iZXI7XG4gIHRpbWVySWQ6IE5vZGVKUy5UaW1lcjtcbn1cblxuLy8gTWFuYWdlcyB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGxpZmVjeWNsZXMgYW5kIHRoZWlyIGFzc29jaWF0ZWQgb2JqZWN0cyBuZWNlc3Nhcnlcbi8vIGZvciBhZGFwdGluZyB0aGVtIHRvIEF0b20gSURFLlxuZXhwb3J0IGNsYXNzIFNlcnZlck1hbmFnZXIge1xuICBwcml2YXRlIF9hY3RpdmVTZXJ2ZXJzOiBBY3RpdmVTZXJ2ZXJbXSA9IFtdO1xuICBwcml2YXRlIF9zdGFydGluZ1NlcnZlclByb21pc2VzOiBNYXA8c3RyaW5nLCBQcm9taXNlPEFjdGl2ZVNlcnZlcj4+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIF9yZXN0YXJ0Q291bnRlclBlclByb2plY3Q6IE1hcDxzdHJpbmcsIFJlc3RhcnRDb3VudGVyPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBfc3RvcHBpbmdTZXJ2ZXJzOiBBY3RpdmVTZXJ2ZXJbXSA9IFtdO1xuICBwcml2YXRlIF9kaXNwb3NhYmxlOiBDb21wb3NpdGVEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgcHJpdmF0ZSBfZWRpdG9yVG9TZXJ2ZXI6IE1hcDxUZXh0RWRpdG9yLCBBY3RpdmVTZXJ2ZXI+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIF9ub3JtYWxpemVkUHJvamVjdFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIF9pc1N0YXJ0ZWQgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIF9zdGFydFNlcnZlcjogKHByb2plY3RQYXRoOiBzdHJpbmcpID0+IFByb21pc2U8QWN0aXZlU2VydmVyPixcbiAgICBwcml2YXRlIF9sb2dnZXI6IExvZ2dlcixcbiAgICBwcml2YXRlIF9zdGFydEZvckVkaXRvcjogKGVkaXRvcjogVGV4dEVkaXRvcikgPT4gYm9vbGVhbixcbiAgICBwcml2YXRlIF9jaGFuZ2VXYXRjaGVkRmlsZUZpbHRlcjogKGZpbGVQYXRoOiBzdHJpbmcpID0+IGJvb2xlYW4sXG4gICAgcHJpdmF0ZSBfcmVwb3J0QnVzeVdoaWxlOiBSZXBvcnRCdXN5V2hpbGUsXG4gICAgcHJpdmF0ZSBfbGFuZ3VhZ2VTZXJ2ZXJOYW1lOiBzdHJpbmcsXG4gICkge1xuICAgIHRoaXMudXBkYXRlTm9ybWFsaXplZFByb2plY3RQYXRocygpO1xuICB9XG5cbiAgcHVibGljIHN0YXJ0TGlzdGVuaW5nKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5faXNTdGFydGVkKSB7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGF0b20udGV4dEVkaXRvcnMub2JzZXJ2ZSh0aGlzLm9ic2VydmVUZXh0RWRpdG9ycy5iaW5kKHRoaXMpKSk7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChhdG9tLnByb2plY3Qub25EaWRDaGFuZ2VQYXRocyh0aGlzLnByb2plY3RQYXRoc0NoYW5nZWQuYmluZCh0aGlzKSkpO1xuICAgICAgaWYgKGF0b20ucHJvamVjdC5vbkRpZENoYW5nZUZpbGVzKSB7XG4gICAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGF0b20ucHJvamVjdC5vbkRpZENoYW5nZUZpbGVzKHRoaXMucHJvamVjdEZpbGVzQ2hhbmdlZC5iaW5kKHRoaXMpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHN0b3BMaXN0ZW5pbmcoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2lzU3RhcnRlZCkge1xuICAgICAgdGhpcy5fZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICB0aGlzLl9pc1N0YXJ0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG9ic2VydmVUZXh0RWRpdG9ycyhlZGl0b3I6IFRleHRFZGl0b3IpOiB2b2lkIHtcbiAgICAvLyBUcmFjayBncmFtbWFyIGNoYW5nZXMgZm9yIG9wZW5lZCBlZGl0b3JzXG4gICAgY29uc3QgbGlzdGVuZXIgPSBlZGl0b3Iub2JzZXJ2ZUdyYW1tYXIoKF9ncmFtbWFyKSA9PiB0aGlzLl9oYW5kbGVHcmFtbWFyQ2hhbmdlKGVkaXRvcikpO1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4gbGlzdGVuZXIuZGlzcG9zZSgpKSk7XG4gICAgLy8gVHJ5IHRvIHNlZSBpZiBlZGl0b3IgY2FuIGhhdmUgTFMgY29ubmVjdGVkIHRvIGl0XG4gICAgdGhpcy5faGFuZGxlVGV4dEVkaXRvcihlZGl0b3IpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfaGFuZGxlVGV4dEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX2VkaXRvclRvU2VydmVyLmhhcyhlZGl0b3IpKSB7XG4gICAgICAvLyBlZGl0b3IgaGFzbid0IGJlZW4gcHJvY2Vzc2VkIHlldCwgc28gcHJvY2VzcyBpdCBieSBhbGxvY2F0aW5nIExTIGZvciBpdCBpZiBuZWNlc3NhcnlcbiAgICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuZ2V0U2VydmVyKGVkaXRvciwgeyBzaG91bGRTdGFydDogdHJ1ZSB9KTtcbiAgICAgIGlmIChzZXJ2ZXIgIT0gbnVsbCkge1xuICAgICAgICAvLyBUaGVyZSBMUyBmb3IgdGhlIGVkaXRvciAoZWl0aGVyIHN0YXJ0ZWQgbm93IGFuZCBhbHJlYWR5IHJ1bm5pbmcpXG4gICAgICAgIHRoaXMuX2VkaXRvclRvU2VydmVyLnNldChlZGl0b3IsIHNlcnZlcik7XG4gICAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKFxuICAgICAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fZWRpdG9yVG9TZXJ2ZXIuZGVsZXRlKGVkaXRvcik7XG4gICAgICAgICAgICB0aGlzLnN0b3BVbnVzZWRTZXJ2ZXJzKCk7XG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfaGFuZGxlR3JhbW1hckNoYW5nZShlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBpZiAodGhpcy5fc3RhcnRGb3JFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgLy8gSWYgZWRpdG9yIGlzIGludGVyZXN0aW5nIGZvciBMUyBwcm9jZXNzIHRoZSBlZGl0b3IgZnVydGhlciB0byBhdHRlbXB0IHRvIHN0YXJ0IExTIGlmIG5lZWRlZFxuICAgICAgdGhpcy5faGFuZGxlVGV4dEVkaXRvcihlZGl0b3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFZGl0b3IgaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgTFNcbiAgICAgIGNvbnN0IHNlcnZlciA9IHRoaXMuX2VkaXRvclRvU2VydmVyLmdldChlZGl0b3IpO1xuICAgICAgLy8gSWYgTFMgaXMgcnVubmluZyBmb3IgdGhlIHVuc3VwcG9ydGVkIGVkaXRvciB0aGVuIGRpc2Nvbm5lY3QgdGhlIGVkaXRvciBmcm9tIExTIGFuZCBzaHV0IGRvd24gTFMgaWYgbmVjZXNzYXJ5XG4gICAgICBpZiAoc2VydmVyKSB7XG4gICAgICAgIC8vIFJlbW92ZSBlZGl0b3IgZnJvbSB0aGUgY2FjaGVcbiAgICAgICAgdGhpcy5fZWRpdG9yVG9TZXJ2ZXIuZGVsZXRlKGVkaXRvcik7XG4gICAgICAgIC8vIFNodXQgZG93biBMUyBpZiBpdCdzIHVzZWQgYnkgYW55IG90aGVyIGVkaXRvclxuICAgICAgICB0aGlzLnN0b3BVbnVzZWRTZXJ2ZXJzKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGdldEFjdGl2ZVNlcnZlcnMoKTogQWN0aXZlU2VydmVyW10ge1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmVTZXJ2ZXJzLnNsaWNlKCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZ2V0U2VydmVyKFxuICAgIHRleHRFZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgeyBzaG91bGRTdGFydCB9OiB7IHNob3VsZFN0YXJ0PzogYm9vbGVhbiB9ID0geyBzaG91bGRTdGFydDogZmFsc2UgfSxcbiAgKTogUHJvbWlzZTxBY3RpdmVTZXJ2ZXIgfCBudWxsPiB7XG4gICAgY29uc3QgZmluYWxQcm9qZWN0UGF0aCA9IHRoaXMuZGV0ZXJtaW5lUHJvamVjdFBhdGgodGV4dEVkaXRvcik7XG4gICAgaWYgKGZpbmFsUHJvamVjdFBhdGggPT0gbnVsbCkge1xuICAgICAgLy8gRmlsZXMgbm90IHlldCBzYXZlZCBoYXZlIG5vIHBhdGhcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGZvdW5kQWN0aXZlU2VydmVyID0gdGhpcy5fYWN0aXZlU2VydmVycy5maW5kKChzKSA9PiBmaW5hbFByb2plY3RQYXRoID09PSBzLnByb2plY3RQYXRoKTtcbiAgICBpZiAoZm91bmRBY3RpdmVTZXJ2ZXIpIHtcbiAgICAgIHJldHVybiBmb3VuZEFjdGl2ZVNlcnZlcjtcbiAgICB9XG5cbiAgICBjb25zdCBzdGFydGluZ1Byb21pc2UgPSB0aGlzLl9zdGFydGluZ1NlcnZlclByb21pc2VzLmdldChmaW5hbFByb2plY3RQYXRoKTtcbiAgICBpZiAoc3RhcnRpbmdQcm9taXNlKSB7XG4gICAgICByZXR1cm4gc3RhcnRpbmdQcm9taXNlO1xuICAgIH1cblxuICAgIHJldHVybiBzaG91bGRTdGFydCAmJiB0aGlzLl9zdGFydEZvckVkaXRvcih0ZXh0RWRpdG9yKSA/IGF3YWl0IHRoaXMuc3RhcnRTZXJ2ZXIoZmluYWxQcm9qZWN0UGF0aCkgOiBudWxsO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHN0YXJ0U2VydmVyKHByb2plY3RQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFjdGl2ZVNlcnZlcj4ge1xuICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZyhgU2VydmVyIHN0YXJ0aW5nIFwiJHtwcm9qZWN0UGF0aH1cImApO1xuICAgIGNvbnN0IHN0YXJ0aW5nUHJvbWlzZSA9IHRoaXMuX3N0YXJ0U2VydmVyKHByb2plY3RQYXRoKTtcbiAgICB0aGlzLl9zdGFydGluZ1NlcnZlclByb21pc2VzLnNldChwcm9qZWN0UGF0aCwgc3RhcnRpbmdQcm9taXNlKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhcnRlZEFjdGl2ZVNlcnZlciA9IGF3YWl0IHN0YXJ0aW5nUHJvbWlzZTtcbiAgICAgIHRoaXMuX2FjdGl2ZVNlcnZlcnMucHVzaChzdGFydGVkQWN0aXZlU2VydmVyKTtcbiAgICAgIHRoaXMuX3N0YXJ0aW5nU2VydmVyUHJvbWlzZXMuZGVsZXRlKHByb2plY3RQYXRoKTtcbiAgICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZyhgU2VydmVyIHN0YXJ0ZWQgXCIke3Byb2plY3RQYXRofVwiIChwaWQgJHtzdGFydGVkQWN0aXZlU2VydmVyLnByb2Nlc3MucGlkfSlgKTtcbiAgICAgIHJldHVybiBzdGFydGVkQWN0aXZlU2VydmVyO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMuX3N0YXJ0aW5nU2VydmVyUHJvbWlzZXMuZGVsZXRlKHByb2plY3RQYXRoKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHN0b3BVbnVzZWRTZXJ2ZXJzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVzZWRTZXJ2ZXJzID0gbmV3IFNldCh0aGlzLl9lZGl0b3JUb1NlcnZlci52YWx1ZXMoKSk7XG4gICAgY29uc3QgdW51c2VkU2VydmVycyA9IHRoaXMuX2FjdGl2ZVNlcnZlcnMuZmlsdGVyKChzKSA9PiAhdXNlZFNlcnZlcnMuaGFzKHMpKTtcbiAgICBpZiAodW51c2VkU2VydmVycy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9sb2dnZXIuZGVidWcoYFN0b3BwaW5nICR7dW51c2VkU2VydmVycy5sZW5ndGh9IHVudXNlZCBzZXJ2ZXJzYCk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCh1bnVzZWRTZXJ2ZXJzLm1hcCgocykgPT4gdGhpcy5zdG9wU2VydmVyKHMpKSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHN0b3BBbGxTZXJ2ZXJzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGZvciAoY29uc3QgW3Byb2plY3RQYXRoLCByZXN0YXJ0Q291bnRlcl0gb2YgdGhpcy5fcmVzdGFydENvdW50ZXJQZXJQcm9qZWN0KSB7XG4gICAgICBjbGVhclRpbWVvdXQocmVzdGFydENvdW50ZXIudGltZXJJZCk7XG4gICAgICB0aGlzLl9yZXN0YXJ0Q291bnRlclBlclByb2plY3QuZGVsZXRlKHByb2plY3RQYXRoKTtcbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9hY3RpdmVTZXJ2ZXJzLm1hcCgocykgPT4gdGhpcy5zdG9wU2VydmVyKHMpKSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVzdGFydEFsbFNlcnZlcnMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgYXdhaXQgdGhpcy5zdG9wQWxsU2VydmVycygpO1xuICAgIHRoaXMuX2VkaXRvclRvU2VydmVyID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuc3RhcnRMaXN0ZW5pbmcoKTtcbiAgfVxuXG4gIHB1YmxpYyBoYXNTZXJ2ZXJSZWFjaGVkUmVzdGFydExpbWl0KHNlcnZlcjogQWN0aXZlU2VydmVyKSB7XG4gICAgbGV0IHJlc3RhcnRDb3VudGVyID0gdGhpcy5fcmVzdGFydENvdW50ZXJQZXJQcm9qZWN0LmdldChzZXJ2ZXIucHJvamVjdFBhdGgpO1xuXG4gICAgaWYgKCFyZXN0YXJ0Q291bnRlcikge1xuICAgICAgcmVzdGFydENvdW50ZXIgPSB7XG4gICAgICAgIHJlc3RhcnRzOiAwLFxuICAgICAgICB0aW1lcklkOiBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLl9yZXN0YXJ0Q291bnRlclBlclByb2plY3QuZGVsZXRlKHNlcnZlci5wcm9qZWN0UGF0aCk7XG4gICAgICAgIH0sIDMgKiA2MCAqIDEwMDAgLyogMyBtaW51dGVzICovKSxcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX3Jlc3RhcnRDb3VudGVyUGVyUHJvamVjdC5zZXQoc2VydmVyLnByb2plY3RQYXRoLCByZXN0YXJ0Q291bnRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuICsrcmVzdGFydENvdW50ZXIucmVzdGFydHMgPiA1O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHN0b3BTZXJ2ZXIoc2VydmVyOiBBY3RpdmVTZXJ2ZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLl9yZXBvcnRCdXN5V2hpbGUoXG4gICAgICBgU3RvcHBpbmcgJHt0aGlzLl9sYW5ndWFnZVNlcnZlck5hbWV9IGZvciAke3BhdGguYmFzZW5hbWUoc2VydmVyLnByb2plY3RQYXRoKX1gLFxuICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICB0aGlzLl9sb2dnZXIuZGVidWcoYFNlcnZlciBzdG9wcGluZyBcIiR7c2VydmVyLnByb2plY3RQYXRofVwiYCk7XG4gICAgICAgIC8vIEltbWVkaWF0ZWx5IHJlbW92ZSB0aGUgc2VydmVyIHRvIHByZXZlbnQgZnVydGhlciB1c2FnZS5cbiAgICAgICAgLy8gSWYgd2UgcmUtb3BlbiB0aGUgZmlsZSBhZnRlciB0aGlzIHBvaW50LCB3ZSdsbCBnZXQgYSBuZXcgc2VydmVyLlxuICAgICAgICB0aGlzLl9hY3RpdmVTZXJ2ZXJzLnNwbGljZSh0aGlzLl9hY3RpdmVTZXJ2ZXJzLmluZGV4T2Yoc2VydmVyKSwgMSk7XG4gICAgICAgIHRoaXMuX3N0b3BwaW5nU2VydmVycy5wdXNoKHNlcnZlcik7XG4gICAgICAgIHNlcnZlci5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICAgICAgaWYgKHNlcnZlci5jb25uZWN0aW9uLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgYXdhaXQgc2VydmVyLmNvbm5lY3Rpb24uc2h1dGRvd24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgW2VkaXRvciwgbWFwcGVkU2VydmVyXSBvZiB0aGlzLl9lZGl0b3JUb1NlcnZlcikge1xuICAgICAgICAgIGlmIChtYXBwZWRTZXJ2ZXIgPT09IHNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5fZWRpdG9yVG9TZXJ2ZXIuZGVsZXRlKGVkaXRvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5leGl0U2VydmVyKHNlcnZlcik7XG4gICAgICAgIHRoaXMuX3N0b3BwaW5nU2VydmVycy5zcGxpY2UodGhpcy5fc3RvcHBpbmdTZXJ2ZXJzLmluZGV4T2Yoc2VydmVyKSwgMSk7XG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgZXhpdFNlcnZlcihzZXJ2ZXI6IEFjdGl2ZVNlcnZlcik6IHZvaWQge1xuICAgIGNvbnN0IHBpZCA9IHNlcnZlci5wcm9jZXNzLnBpZDtcbiAgICB0cnkge1xuICAgICAgaWYgKHNlcnZlci5jb25uZWN0aW9uLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHNlcnZlci5jb25uZWN0aW9uLmV4aXQoKTtcbiAgICAgICAgc2VydmVyLmNvbm5lY3Rpb24uZGlzcG9zZSgpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXJ2ZXIucHJvY2Vzcy5raWxsKCk7XG4gICAgfVxuICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZyhgU2VydmVyIHN0b3BwZWQgXCIke3NlcnZlci5wcm9qZWN0UGF0aH1cIiAocGlkICR7cGlkfSlgKTtcbiAgfVxuXG4gIHB1YmxpYyB0ZXJtaW5hdGUoKTogdm9pZCB7XG4gICAgdGhpcy5fc3RvcHBpbmdTZXJ2ZXJzLmZvckVhY2goKHNlcnZlcikgPT4ge1xuICAgICAgdGhpcy5fbG9nZ2VyLmRlYnVnKGBTZXJ2ZXIgdGVybWluYXRpbmcgXCIke3NlcnZlci5wcm9qZWN0UGF0aH1cImApO1xuICAgICAgdGhpcy5leGl0U2VydmVyKHNlcnZlcik7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgZGV0ZXJtaW5lUHJvamVjdFBhdGgodGV4dEVkaXRvcjogVGV4dEVkaXRvcik6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gdGV4dEVkaXRvci5nZXRQYXRoKCk7XG4gICAgaWYgKGZpbGVQYXRoID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2plY3RQYXRoID0gdGhpcy5fbm9ybWFsaXplZFByb2plY3RQYXRocy5maW5kKChkKSA9PiBmaWxlUGF0aC5zdGFydHNXaXRoKGQpKTtcbiAgICBpZiAocHJvamVjdFBhdGgpIHtcbiAgICAgIHJldHVybiBwcm9qZWN0UGF0aDtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXJXaXRoQ2xhaW0gPSB0aGlzLl9hY3RpdmVTZXJ2ZXJzXG4gICAgICAuZmluZCgocykgPT4gcy5hZGRpdGlvbmFsUGF0aHMuaGFzKHBhdGguZGlybmFtZShmaWxlUGF0aCkpKTtcbiAgICByZXR1cm4gc2VydmVyV2l0aENsYWltICYmIHRoaXMubm9ybWFsaXplUGF0aChzZXJ2ZXJXaXRoQ2xhaW0ucHJvamVjdFBhdGgpIHx8IG51bGw7XG4gIH1cblxuICBwdWJsaWMgdXBkYXRlTm9ybWFsaXplZFByb2plY3RQYXRocygpOiB2b2lkIHtcbiAgICB0aGlzLl9ub3JtYWxpemVkUHJvamVjdFBhdGhzID0gYXRvbS5wcm9qZWN0LmdldERpcmVjdG9yaWVzKCkubWFwKChkKSA9PiB0aGlzLm5vcm1hbGl6ZVBhdGgoZC5nZXRQYXRoKCkpKTtcbiAgfVxuXG4gIHB1YmxpYyBub3JtYWxpemVQYXRoKHByb2plY3RQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiAhcHJvamVjdFBhdGguZW5kc1dpdGgocGF0aC5zZXApID8gcGF0aC5qb2luKHByb2plY3RQYXRoLCBwYXRoLnNlcCkgOiBwcm9qZWN0UGF0aDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBwcm9qZWN0UGF0aHNDaGFuZ2VkKHByb2plY3RQYXRoczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwYXRoc1NldCA9IG5ldyBTZXQocHJvamVjdFBhdGhzLm1hcCh0aGlzLm5vcm1hbGl6ZVBhdGgpKTtcbiAgICBjb25zdCBzZXJ2ZXJzVG9TdG9wID0gdGhpcy5fYWN0aXZlU2VydmVycy5maWx0ZXIoKHMpID0+ICFwYXRoc1NldC5oYXMocy5wcm9qZWN0UGF0aCkpO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKHNlcnZlcnNUb1N0b3AubWFwKChzKSA9PiB0aGlzLnN0b3BTZXJ2ZXIocykpKTtcbiAgICB0aGlzLnVwZGF0ZU5vcm1hbGl6ZWRQcm9qZWN0UGF0aHMoKTtcbiAgfVxuXG4gIHB1YmxpYyBwcm9qZWN0RmlsZXNDaGFuZ2VkKGZpbGVFdmVudHM6IEZpbGVzeXN0ZW1DaGFuZ2VFdmVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9hY3RpdmVTZXJ2ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgYWN0aXZlU2VydmVyIG9mIHRoaXMuX2FjdGl2ZVNlcnZlcnMpIHtcbiAgICAgIGNvbnN0IGNoYW5nZXM6IGxzLkZpbGVFdmVudFtdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGZpbGVFdmVudCBvZiBmaWxlRXZlbnRzKSB7XG4gICAgICAgIGlmIChmaWxlRXZlbnQucGF0aC5zdGFydHNXaXRoKGFjdGl2ZVNlcnZlci5wcm9qZWN0UGF0aCkgJiYgdGhpcy5fY2hhbmdlV2F0Y2hlZEZpbGVGaWx0ZXIoZmlsZUV2ZW50LnBhdGgpKSB7XG4gICAgICAgICAgY2hhbmdlcy5wdXNoKENvbnZlcnQuYXRvbUZpbGVFdmVudFRvTFNGaWxlRXZlbnRzKGZpbGVFdmVudClbMF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcbiAgICAgICAgICBmaWxlRXZlbnQuYWN0aW9uID09PSAncmVuYW1lZCcgJiZcbiAgICAgICAgICBmaWxlRXZlbnQub2xkUGF0aC5zdGFydHNXaXRoKGFjdGl2ZVNlcnZlci5wcm9qZWN0UGF0aCkgJiZcbiAgICAgICAgICB0aGlzLl9jaGFuZ2VXYXRjaGVkRmlsZUZpbHRlcihmaWxlRXZlbnQub2xkUGF0aClcbiAgICAgICAgKSB7XG4gICAgICAgICAgY2hhbmdlcy5wdXNoKENvbnZlcnQuYXRvbUZpbGVFdmVudFRvTFNGaWxlRXZlbnRzKGZpbGVFdmVudClbMV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFjdGl2ZVNlcnZlci5jb25uZWN0aW9uLmRpZENoYW5nZVdhdGNoZWRGaWxlcyh7IGNoYW5nZXMgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=