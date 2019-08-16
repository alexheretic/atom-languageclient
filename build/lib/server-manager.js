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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvc2VydmVyLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHVDQUFnQztBQUNoQyw2QkFBNkI7QUFLN0IsK0JBSWM7QUFzQ2Q7OztHQUdHO0FBQ0gsTUFBYSxhQUFhO0lBVXhCLFlBQ1UsWUFBNEQsRUFDNUQsT0FBZSxFQUNmLGVBQWdELEVBQ2hELHdCQUF1RCxFQUN2RCxnQkFBaUMsRUFDakMsbUJBQTJCLEVBQzNCLHNCQUErQjtRQU4vQixpQkFBWSxHQUFaLFlBQVksQ0FBZ0Q7UUFDNUQsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLG9CQUFlLEdBQWYsZUFBZSxDQUFpQztRQUNoRCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQStCO1FBQ3ZELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBaUI7UUFDakMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFRO1FBQzNCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBUztRQWhCakMsbUJBQWMsR0FBbUIsRUFBRSxDQUFDO1FBQ3BDLDRCQUF1QixHQUF1QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3hFLDhCQUF5QixHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ25FLHFCQUFnQixHQUFtQixFQUFFLENBQUM7UUFDdEMsZ0JBQVcsR0FBd0IsSUFBSSwwQkFBbUIsRUFBRSxDQUFDO1FBQzdELG9CQUFlLEdBQWtDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDM0QsNEJBQXVCLEdBQWEsRUFBRSxDQUFDO1FBQ3ZDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFXekIsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUVNLGNBQWM7UUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLDBCQUFtQixFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6RixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDMUY7U0FDRjtJQUNILENBQUM7SUFFTSxhQUFhO1FBQ2xCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNuQixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1NBQ3pCO0lBQ0gsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE1BQWtCO1FBQzNDLDJDQUEyQztRQUMzQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN4RixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEUsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRWEsaUJBQWlCLENBQUMsTUFBa0I7O1lBQ2hELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDckMsdUZBQXVGO2dCQUN2RixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ25FLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtvQkFDbEIsbUVBQW1FO29CQUNuRSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUNsQixNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTt3QkFDdkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUMzQixDQUFDLENBQUMsQ0FDSCxDQUFDO2lCQUNIO2FBQ0Y7UUFDSCxDQUFDO0tBQUE7SUFFTyxvQkFBb0IsQ0FBQyxNQUFrQjtRQUM3QyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEMsOEZBQThGO1lBQzlGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNoQzthQUFNO1lBQ0wsb0NBQW9DO1lBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hELCtHQUErRztZQUMvRyxJQUFJLE1BQU0sRUFBRTtnQkFDViwrQkFBK0I7Z0JBQy9CLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQyxnREFBZ0Q7Z0JBQ2hELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2FBQzFCO1NBQ0Y7SUFDSCxDQUFDO0lBRU0sZ0JBQWdCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRVksU0FBUyxDQUNwQixVQUFzQixFQUN0QixFQUFFLFdBQVcsS0FBZ0MsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFOztZQUVuRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMvRCxJQUFJLGdCQUFnQixJQUFJLElBQUksRUFBRTtnQkFDNUIsbUNBQW1DO2dCQUNuQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlGLElBQUksaUJBQWlCLEVBQUU7Z0JBQ3JCLE9BQU8saUJBQWlCLENBQUM7YUFDMUI7WUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDM0UsSUFBSSxlQUFlLEVBQUU7Z0JBQ25CLE9BQU8sZUFBZSxDQUFDO2FBQ3hCO1lBRUQsT0FBTyxXQUFXLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUMzRyxDQUFDO0tBQUE7SUFFWSxXQUFXLENBQUMsV0FBbUI7O1lBQzFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDL0QsSUFBSTtnQkFDRixNQUFNLG1CQUFtQixHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNsRCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUM5QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsV0FBVyxVQUFVLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUMvRixPQUFPLG1CQUFtQixDQUFDO2FBQzVCO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDakQsTUFBTSxDQUFDLENBQUM7YUFDVDtRQUNILENBQUM7S0FBQTtJQUVZLGlCQUFpQjs7WUFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3RSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLGFBQWEsQ0FBQyxNQUFNLGlCQUFpQixDQUFDLENBQUM7Z0JBQ3RFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNqRTtRQUNILENBQUM7S0FBQTtJQUVZLGNBQWM7O1lBQ3pCLEtBQUssTUFBTSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUU7Z0JBQzFFLFlBQVksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDcEQ7WUFFRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7S0FBQTtJQUVZLGlCQUFpQjs7WUFDNUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDeEIsQ0FBQztLQUFBO0lBRU0sNEJBQTRCLENBQUMsTUFBb0I7UUFDdEQsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFNUUsSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNuQixjQUFjLEdBQUc7Z0JBQ2YsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsT0FBTyxFQUFFLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ3ZCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUM1RCxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO2FBQ2xDLENBQUM7WUFFRixJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDeEU7UUFFRCxPQUFPLEVBQUUsY0FBYyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVZLFVBQVUsQ0FBQyxNQUFvQjs7WUFDMUMsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQ3pCLFlBQVksSUFBSSxDQUFDLG1CQUFtQixRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQy9FLEdBQVMsRUFBRTtnQkFDVCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsTUFBTSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7Z0JBQzlELDBEQUEwRDtnQkFDMUQsbUVBQW1FO2dCQUNuRSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxJQUFJLENBQUMsc0JBQXNCLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUU7b0JBQ2hFLE1BQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztpQkFDcEM7Z0JBRUQsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7b0JBQ3pELElBQUksWUFBWSxLQUFLLE1BQU0sRUFBRTt3QkFDM0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQ3JDO2lCQUNGO2dCQUVELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RSxDQUFDLENBQUEsQ0FDRixDQUFDO1FBQ0osQ0FBQztLQUFBO0lBRU0sVUFBVSxDQUFDLE1BQW9CO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQy9CLElBQUk7WUFDRixJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFO2dCQUNqQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN6QixNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzdCO1NBQ0Y7Z0JBQVM7WUFDUixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3ZCO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLE1BQU0sQ0FBQyxXQUFXLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRU0sU0FBUztRQUNkLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN2QyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsTUFBTSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxVQUFzQjtRQUNoRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEMsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckYsSUFBSSxXQUFXLEVBQUU7WUFDZixPQUFPLFdBQVcsQ0FBQztTQUNwQjtRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxjQUFjO2FBQ3hDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUQsT0FBTyxlQUFlLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDO0lBQ3BGLENBQUM7SUFFTSw0QkFBNEI7UUFDakMsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0csQ0FBQztJQUVNLGFBQWEsQ0FBQyxXQUFtQjtRQUN0QyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0lBQzFGLENBQUM7SUFFWSxtQkFBbUIsQ0FBQyxZQUFzQjs7WUFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ3RGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRSxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztRQUN0QyxDQUFDO0tBQUE7SUFFTSxtQkFBbUIsQ0FBQyxVQUFpQztRQUMxRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNwQyxPQUFPO1NBQ1I7UUFFRCxLQUFLLE1BQU0sWUFBWSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDOUMsTUFBTSxPQUFPLEdBQW1CLEVBQUUsQ0FBQztZQUNuQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtnQkFDbEMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDeEcsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBTyxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2pFO2dCQUNELElBQ0UsU0FBUyxDQUFDLE1BQU0sS0FBSyxTQUFTO29CQUM5QixTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDO29CQUN0RCxJQUFJLENBQUMsd0JBQXdCLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUNoRDtvQkFDQSxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFPLENBQUMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDakU7YUFDRjtZQUNELElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3RCLFlBQVksQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO2FBQzVEO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUE1UUQsc0NBNFFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IENvbnZlcnQgZnJvbSAnLi9jb252ZXJ0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBzdHJlYW0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCAqIGFzIGxzIGZyb20gJy4vbGFuZ3VhZ2VjbGllbnQnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7XG4gIENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIEZpbGVzeXN0ZW1DaGFuZ2VFdmVudCxcbiAgVGV4dEVkaXRvcixcbn0gZnJvbSAnYXRvbSc7XG5pbXBvcnQgeyBSZXBvcnRCdXN5V2hpbGUgfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBQdWJsaWM6IERlZmluZXMgdGhlIG1pbmltdW0gc3VyZmFjZSBhcmVhIGZvciBhbiBvYmplY3QgdGhhdCByZXNlbWJsZXMgYVxuICogQ2hpbGRQcm9jZXNzLiAgVGhpcyBpcyB1c2VkIHNvIHRoYXQgbGFuZ3VhZ2UgcGFja2FnZXMgd2l0aCBhbHRlcm5hdGl2ZVxuICogbGFuZ3VhZ2Ugc2VydmVyIHByb2Nlc3MgaG9zdGluZyBzdHJhdGVnaWVzIGNhbiByZXR1cm4gc29tZXRoaW5nIGNvbXBhdGlibGVcbiAqIHdpdGggQXV0b0xhbmd1YWdlQ2xpZW50LnN0YXJ0U2VydmVyUHJvY2Vzcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMYW5ndWFnZVNlcnZlclByb2Nlc3MgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBzdGRpbjogc3RyZWFtLldyaXRhYmxlO1xuICBzdGRvdXQ6IHN0cmVhbS5SZWFkYWJsZTtcbiAgc3RkZXJyOiBzdHJlYW0uUmVhZGFibGU7XG4gIHBpZDogbnVtYmVyO1xuXG4gIGtpbGwoc2lnbmFsPzogc3RyaW5nKTogdm9pZDtcbiAgb24oZXZlbnQ6ICdlcnJvcicsIGxpc3RlbmVyOiAoZXJyOiBFcnJvcikgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZXhpdCcsIGxpc3RlbmVyOiAoY29kZTogbnVtYmVyLCBzaWduYWw6IHN0cmluZykgPT4gdm9pZCk6IHRoaXM7XG59XG5cbi8qKiBUaGUgbmVjZXNzYXJ5IGVsZW1lbnRzIGZvciBhIHNlcnZlciB0aGF0IGhhcyBzdGFydGVkIG9yIGlzIHN0YXJ0aW5nLiAqL1xuZXhwb3J0IGludGVyZmFjZSBBY3RpdmVTZXJ2ZXIge1xuICBkaXNwb3NhYmxlOiBDb21wb3NpdGVEaXNwb3NhYmxlO1xuICBwcm9qZWN0UGF0aDogc3RyaW5nO1xuICBwcm9jZXNzOiBMYW5ndWFnZVNlcnZlclByb2Nlc3M7XG4gIGNvbm5lY3Rpb246IGxzLkxhbmd1YWdlQ2xpZW50Q29ubmVjdGlvbjtcbiAgY2FwYWJpbGl0aWVzOiBscy5TZXJ2ZXJDYXBhYmlsaXRpZXM7XG4gIC8vIE91dCBvZiBwcm9qZWN0IGRpcmVjdG9yaWVzIHRoYXQgdGhpcyBzZXJ2ZXIgY2FuIGFsc28gc3VwcG9ydC5cbiAgYWRkaXRpb25hbFBhdGhzOiBTZXQ8c3RyaW5nPjtcbiAgLy8gQ29uc2lkZXJzIGEgcGF0aCBmcm9tIGB0ZXh0RG9jdW1lbnQvZGVmaW5pdGlvbmAgZm9yIGluY2x1c2lvbiBpbiBgYWRkaXRpb25hbFBhdGhzYC5cbiAgY29uc2lkZXJEZWZpbml0aW9uUGF0aChwYXRoOiBzdHJpbmcpOiB2b2lkO1xufVxuXG5pbnRlcmZhY2UgUmVzdGFydENvdW50ZXIge1xuICByZXN0YXJ0czogbnVtYmVyO1xuICB0aW1lcklkOiBOb2RlSlMuVGltZXI7XG59XG5cbi8qKlxuICogTWFuYWdlcyB0aGUgbGFuZ3VhZ2Ugc2VydmVyIGxpZmVjeWNsZXMgYW5kIHRoZWlyIGFzc29jaWF0ZWQgb2JqZWN0cyBuZWNlc3NhcnlcbiAqIGZvciBhZGFwdGluZyB0aGVtIHRvIEF0b20gSURFLlxuICovXG5leHBvcnQgY2xhc3MgU2VydmVyTWFuYWdlciB7XG4gIHByaXZhdGUgX2FjdGl2ZVNlcnZlcnM6IEFjdGl2ZVNlcnZlcltdID0gW107XG4gIHByaXZhdGUgX3N0YXJ0aW5nU2VydmVyUHJvbWlzZXM6IE1hcDxzdHJpbmcsIFByb21pc2U8QWN0aXZlU2VydmVyPj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgX3Jlc3RhcnRDb3VudGVyUGVyUHJvamVjdDogTWFwPHN0cmluZywgUmVzdGFydENvdW50ZXI+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIF9zdG9wcGluZ1NlcnZlcnM6IEFjdGl2ZVNlcnZlcltdID0gW107XG4gIHByaXZhdGUgX2Rpc3Bvc2FibGU6IENvbXBvc2l0ZURpc3Bvc2FibGUgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBwcml2YXRlIF9lZGl0b3JUb1NlcnZlcjogTWFwPFRleHRFZGl0b3IsIEFjdGl2ZVNlcnZlcj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgX25vcm1hbGl6ZWRQcm9qZWN0UGF0aHM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgX2lzU3RhcnRlZCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgX3N0YXJ0U2VydmVyOiAocHJvamVjdFBhdGg6IHN0cmluZykgPT4gUHJvbWlzZTxBY3RpdmVTZXJ2ZXI+LFxuICAgIHByaXZhdGUgX2xvZ2dlcjogTG9nZ2VyLFxuICAgIHByaXZhdGUgX3N0YXJ0Rm9yRWRpdG9yOiAoZWRpdG9yOiBUZXh0RWRpdG9yKSA9PiBib29sZWFuLFxuICAgIHByaXZhdGUgX2NoYW5nZVdhdGNoZWRGaWxlRmlsdGVyOiAoZmlsZVBhdGg6IHN0cmluZykgPT4gYm9vbGVhbixcbiAgICBwcml2YXRlIF9yZXBvcnRCdXN5V2hpbGU6IFJlcG9ydEJ1c3lXaGlsZSxcbiAgICBwcml2YXRlIF9sYW5ndWFnZVNlcnZlck5hbWU6IHN0cmluZyxcbiAgICBwcml2YXRlIF9zdG9wU2VydmVyc0dyYWNlZnVsbHk6IGJvb2xlYW4sXG4gICkge1xuICAgIHRoaXMudXBkYXRlTm9ybWFsaXplZFByb2plY3RQYXRocygpO1xuICB9XG5cbiAgcHVibGljIHN0YXJ0TGlzdGVuaW5nKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5faXNTdGFydGVkKSB7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGF0b20udGV4dEVkaXRvcnMub2JzZXJ2ZSh0aGlzLm9ic2VydmVUZXh0RWRpdG9ycy5iaW5kKHRoaXMpKSk7XG4gICAgICB0aGlzLl9kaXNwb3NhYmxlLmFkZChhdG9tLnByb2plY3Qub25EaWRDaGFuZ2VQYXRocyh0aGlzLnByb2plY3RQYXRoc0NoYW5nZWQuYmluZCh0aGlzKSkpO1xuICAgICAgaWYgKGF0b20ucHJvamVjdC5vbkRpZENoYW5nZUZpbGVzKSB7XG4gICAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGF0b20ucHJvamVjdC5vbkRpZENoYW5nZUZpbGVzKHRoaXMucHJvamVjdEZpbGVzQ2hhbmdlZC5iaW5kKHRoaXMpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHN0b3BMaXN0ZW5pbmcoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2lzU3RhcnRlZCkge1xuICAgICAgdGhpcy5fZGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgICB0aGlzLl9pc1N0YXJ0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG9ic2VydmVUZXh0RWRpdG9ycyhlZGl0b3I6IFRleHRFZGl0b3IpOiB2b2lkIHtcbiAgICAvLyBUcmFjayBncmFtbWFyIGNoYW5nZXMgZm9yIG9wZW5lZCBlZGl0b3JzXG4gICAgY29uc3QgbGlzdGVuZXIgPSBlZGl0b3Iub2JzZXJ2ZUdyYW1tYXIoKF9ncmFtbWFyKSA9PiB0aGlzLl9oYW5kbGVHcmFtbWFyQ2hhbmdlKGVkaXRvcikpO1xuICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4gbGlzdGVuZXIuZGlzcG9zZSgpKSk7XG4gICAgLy8gVHJ5IHRvIHNlZSBpZiBlZGl0b3IgY2FuIGhhdmUgTFMgY29ubmVjdGVkIHRvIGl0XG4gICAgdGhpcy5faGFuZGxlVGV4dEVkaXRvcihlZGl0b3IpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfaGFuZGxlVGV4dEVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX2VkaXRvclRvU2VydmVyLmhhcyhlZGl0b3IpKSB7XG4gICAgICAvLyBlZGl0b3IgaGFzbid0IGJlZW4gcHJvY2Vzc2VkIHlldCwgc28gcHJvY2VzcyBpdCBieSBhbGxvY2F0aW5nIExTIGZvciBpdCBpZiBuZWNlc3NhcnlcbiAgICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuZ2V0U2VydmVyKGVkaXRvciwgeyBzaG91bGRTdGFydDogdHJ1ZSB9KTtcbiAgICAgIGlmIChzZXJ2ZXIgIT0gbnVsbCkge1xuICAgICAgICAvLyBUaGVyZSBMUyBmb3IgdGhlIGVkaXRvciAoZWl0aGVyIHN0YXJ0ZWQgbm93IGFuZCBhbHJlYWR5IHJ1bm5pbmcpXG4gICAgICAgIHRoaXMuX2VkaXRvclRvU2VydmVyLnNldChlZGl0b3IsIHNlcnZlcik7XG4gICAgICAgIHRoaXMuX2Rpc3Bvc2FibGUuYWRkKFxuICAgICAgICAgIGVkaXRvci5vbkRpZERlc3Ryb3koKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fZWRpdG9yVG9TZXJ2ZXIuZGVsZXRlKGVkaXRvcik7XG4gICAgICAgICAgICB0aGlzLnN0b3BVbnVzZWRTZXJ2ZXJzKCk7XG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfaGFuZGxlR3JhbW1hckNoYW5nZShlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgICBpZiAodGhpcy5fc3RhcnRGb3JFZGl0b3IoZWRpdG9yKSkge1xuICAgICAgLy8gSWYgZWRpdG9yIGlzIGludGVyZXN0aW5nIGZvciBMUyBwcm9jZXNzIHRoZSBlZGl0b3IgZnVydGhlciB0byBhdHRlbXB0IHRvIHN0YXJ0IExTIGlmIG5lZWRlZFxuICAgICAgdGhpcy5faGFuZGxlVGV4dEVkaXRvcihlZGl0b3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFZGl0b3IgaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgTFNcbiAgICAgIGNvbnN0IHNlcnZlciA9IHRoaXMuX2VkaXRvclRvU2VydmVyLmdldChlZGl0b3IpO1xuICAgICAgLy8gSWYgTFMgaXMgcnVubmluZyBmb3IgdGhlIHVuc3VwcG9ydGVkIGVkaXRvciB0aGVuIGRpc2Nvbm5lY3QgdGhlIGVkaXRvciBmcm9tIExTIGFuZCBzaHV0IGRvd24gTFMgaWYgbmVjZXNzYXJ5XG4gICAgICBpZiAoc2VydmVyKSB7XG4gICAgICAgIC8vIFJlbW92ZSBlZGl0b3IgZnJvbSB0aGUgY2FjaGVcbiAgICAgICAgdGhpcy5fZWRpdG9yVG9TZXJ2ZXIuZGVsZXRlKGVkaXRvcik7XG4gICAgICAgIC8vIFNodXQgZG93biBMUyBpZiBpdCdzIHVzZWQgYnkgYW55IG90aGVyIGVkaXRvclxuICAgICAgICB0aGlzLnN0b3BVbnVzZWRTZXJ2ZXJzKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGdldEFjdGl2ZVNlcnZlcnMoKTogQWN0aXZlU2VydmVyW10ge1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmVTZXJ2ZXJzLnNsaWNlKCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZ2V0U2VydmVyKFxuICAgIHRleHRFZGl0b3I6IFRleHRFZGl0b3IsXG4gICAgeyBzaG91bGRTdGFydCB9OiB7IHNob3VsZFN0YXJ0PzogYm9vbGVhbiB9ID0geyBzaG91bGRTdGFydDogZmFsc2UgfSxcbiAgKTogUHJvbWlzZTxBY3RpdmVTZXJ2ZXIgfCBudWxsPiB7XG4gICAgY29uc3QgZmluYWxQcm9qZWN0UGF0aCA9IHRoaXMuZGV0ZXJtaW5lUHJvamVjdFBhdGgodGV4dEVkaXRvcik7XG4gICAgaWYgKGZpbmFsUHJvamVjdFBhdGggPT0gbnVsbCkge1xuICAgICAgLy8gRmlsZXMgbm90IHlldCBzYXZlZCBoYXZlIG5vIHBhdGhcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGZvdW5kQWN0aXZlU2VydmVyID0gdGhpcy5fYWN0aXZlU2VydmVycy5maW5kKChzKSA9PiBmaW5hbFByb2plY3RQYXRoID09PSBzLnByb2plY3RQYXRoKTtcbiAgICBpZiAoZm91bmRBY3RpdmVTZXJ2ZXIpIHtcbiAgICAgIHJldHVybiBmb3VuZEFjdGl2ZVNlcnZlcjtcbiAgICB9XG5cbiAgICBjb25zdCBzdGFydGluZ1Byb21pc2UgPSB0aGlzLl9zdGFydGluZ1NlcnZlclByb21pc2VzLmdldChmaW5hbFByb2plY3RQYXRoKTtcbiAgICBpZiAoc3RhcnRpbmdQcm9taXNlKSB7XG4gICAgICByZXR1cm4gc3RhcnRpbmdQcm9taXNlO1xuICAgIH1cblxuICAgIHJldHVybiBzaG91bGRTdGFydCAmJiB0aGlzLl9zdGFydEZvckVkaXRvcih0ZXh0RWRpdG9yKSA/IGF3YWl0IHRoaXMuc3RhcnRTZXJ2ZXIoZmluYWxQcm9qZWN0UGF0aCkgOiBudWxsO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHN0YXJ0U2VydmVyKHByb2plY3RQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFjdGl2ZVNlcnZlcj4ge1xuICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZyhgU2VydmVyIHN0YXJ0aW5nIFwiJHtwcm9qZWN0UGF0aH1cImApO1xuICAgIGNvbnN0IHN0YXJ0aW5nUHJvbWlzZSA9IHRoaXMuX3N0YXJ0U2VydmVyKHByb2plY3RQYXRoKTtcbiAgICB0aGlzLl9zdGFydGluZ1NlcnZlclByb21pc2VzLnNldChwcm9qZWN0UGF0aCwgc3RhcnRpbmdQcm9taXNlKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhcnRlZEFjdGl2ZVNlcnZlciA9IGF3YWl0IHN0YXJ0aW5nUHJvbWlzZTtcbiAgICAgIHRoaXMuX2FjdGl2ZVNlcnZlcnMucHVzaChzdGFydGVkQWN0aXZlU2VydmVyKTtcbiAgICAgIHRoaXMuX3N0YXJ0aW5nU2VydmVyUHJvbWlzZXMuZGVsZXRlKHByb2plY3RQYXRoKTtcbiAgICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZyhgU2VydmVyIHN0YXJ0ZWQgXCIke3Byb2plY3RQYXRofVwiIChwaWQgJHtzdGFydGVkQWN0aXZlU2VydmVyLnByb2Nlc3MucGlkfSlgKTtcbiAgICAgIHJldHVybiBzdGFydGVkQWN0aXZlU2VydmVyO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMuX3N0YXJ0aW5nU2VydmVyUHJvbWlzZXMuZGVsZXRlKHByb2plY3RQYXRoKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHN0b3BVbnVzZWRTZXJ2ZXJzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVzZWRTZXJ2ZXJzID0gbmV3IFNldCh0aGlzLl9lZGl0b3JUb1NlcnZlci52YWx1ZXMoKSk7XG4gICAgY29uc3QgdW51c2VkU2VydmVycyA9IHRoaXMuX2FjdGl2ZVNlcnZlcnMuZmlsdGVyKChzKSA9PiAhdXNlZFNlcnZlcnMuaGFzKHMpKTtcbiAgICBpZiAodW51c2VkU2VydmVycy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9sb2dnZXIuZGVidWcoYFN0b3BwaW5nICR7dW51c2VkU2VydmVycy5sZW5ndGh9IHVudXNlZCBzZXJ2ZXJzYCk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCh1bnVzZWRTZXJ2ZXJzLm1hcCgocykgPT4gdGhpcy5zdG9wU2VydmVyKHMpKSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHN0b3BBbGxTZXJ2ZXJzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGZvciAoY29uc3QgW3Byb2plY3RQYXRoLCByZXN0YXJ0Q291bnRlcl0gb2YgdGhpcy5fcmVzdGFydENvdW50ZXJQZXJQcm9qZWN0KSB7XG4gICAgICBjbGVhclRpbWVvdXQocmVzdGFydENvdW50ZXIudGltZXJJZCk7XG4gICAgICB0aGlzLl9yZXN0YXJ0Q291bnRlclBlclByb2plY3QuZGVsZXRlKHByb2plY3RQYXRoKTtcbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9hY3RpdmVTZXJ2ZXJzLm1hcCgocykgPT4gdGhpcy5zdG9wU2VydmVyKHMpKSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVzdGFydEFsbFNlcnZlcnMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgYXdhaXQgdGhpcy5zdG9wQWxsU2VydmVycygpO1xuICAgIHRoaXMuX2VkaXRvclRvU2VydmVyID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuc3RhcnRMaXN0ZW5pbmcoKTtcbiAgfVxuXG4gIHB1YmxpYyBoYXNTZXJ2ZXJSZWFjaGVkUmVzdGFydExpbWl0KHNlcnZlcjogQWN0aXZlU2VydmVyKSB7XG4gICAgbGV0IHJlc3RhcnRDb3VudGVyID0gdGhpcy5fcmVzdGFydENvdW50ZXJQZXJQcm9qZWN0LmdldChzZXJ2ZXIucHJvamVjdFBhdGgpO1xuXG4gICAgaWYgKCFyZXN0YXJ0Q291bnRlcikge1xuICAgICAgcmVzdGFydENvdW50ZXIgPSB7XG4gICAgICAgIHJlc3RhcnRzOiAwLFxuICAgICAgICB0aW1lcklkOiBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLl9yZXN0YXJ0Q291bnRlclBlclByb2plY3QuZGVsZXRlKHNlcnZlci5wcm9qZWN0UGF0aCk7XG4gICAgICAgIH0sIDMgKiA2MCAqIDEwMDAgLyogMyBtaW51dGVzICovKSxcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX3Jlc3RhcnRDb3VudGVyUGVyUHJvamVjdC5zZXQoc2VydmVyLnByb2plY3RQYXRoLCByZXN0YXJ0Q291bnRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuICsrcmVzdGFydENvdW50ZXIucmVzdGFydHMgPiA1O1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHN0b3BTZXJ2ZXIoc2VydmVyOiBBY3RpdmVTZXJ2ZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLl9yZXBvcnRCdXN5V2hpbGUoXG4gICAgICBgU3RvcHBpbmcgJHt0aGlzLl9sYW5ndWFnZVNlcnZlck5hbWV9IGZvciAke3BhdGguYmFzZW5hbWUoc2VydmVyLnByb2plY3RQYXRoKX1gLFxuICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICB0aGlzLl9sb2dnZXIuZGVidWcoYFNlcnZlciBzdG9wcGluZyBcIiR7c2VydmVyLnByb2plY3RQYXRofVwiYCk7XG4gICAgICAgIC8vIEltbWVkaWF0ZWx5IHJlbW92ZSB0aGUgc2VydmVyIHRvIHByZXZlbnQgZnVydGhlciB1c2FnZS5cbiAgICAgICAgLy8gSWYgd2UgcmUtb3BlbiB0aGUgZmlsZSBhZnRlciB0aGlzIHBvaW50LCB3ZSdsbCBnZXQgYSBuZXcgc2VydmVyLlxuICAgICAgICB0aGlzLl9hY3RpdmVTZXJ2ZXJzLnNwbGljZSh0aGlzLl9hY3RpdmVTZXJ2ZXJzLmluZGV4T2Yoc2VydmVyKSwgMSk7XG4gICAgICAgIHRoaXMuX3N0b3BwaW5nU2VydmVycy5wdXNoKHNlcnZlcik7XG4gICAgICAgIHNlcnZlci5kaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICAgICAgaWYgKHRoaXMuX3N0b3BTZXJ2ZXJzR3JhY2VmdWxseSAmJiBzZXJ2ZXIuY29ubmVjdGlvbi5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgIGF3YWl0IHNlcnZlci5jb25uZWN0aW9uLnNodXRkb3duKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IFtlZGl0b3IsIG1hcHBlZFNlcnZlcl0gb2YgdGhpcy5fZWRpdG9yVG9TZXJ2ZXIpIHtcbiAgICAgICAgICBpZiAobWFwcGVkU2VydmVyID09PSBzZXJ2ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2VkaXRvclRvU2VydmVyLmRlbGV0ZShlZGl0b3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZXhpdFNlcnZlcihzZXJ2ZXIpO1xuICAgICAgICB0aGlzLl9zdG9wcGluZ1NlcnZlcnMuc3BsaWNlKHRoaXMuX3N0b3BwaW5nU2VydmVycy5pbmRleE9mKHNlcnZlciksIDEpO1xuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgcHVibGljIGV4aXRTZXJ2ZXIoc2VydmVyOiBBY3RpdmVTZXJ2ZXIpOiB2b2lkIHtcbiAgICBjb25zdCBwaWQgPSBzZXJ2ZXIucHJvY2Vzcy5waWQ7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChzZXJ2ZXIuY29ubmVjdGlvbi5pc0Nvbm5lY3RlZCkge1xuICAgICAgICBzZXJ2ZXIuY29ubmVjdGlvbi5leGl0KCk7XG4gICAgICAgIHNlcnZlci5jb25uZWN0aW9uLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2VydmVyLnByb2Nlc3Mua2lsbCgpO1xuICAgIH1cbiAgICB0aGlzLl9sb2dnZXIuZGVidWcoYFNlcnZlciBzdG9wcGVkIFwiJHtzZXJ2ZXIucHJvamVjdFBhdGh9XCIgKHBpZCAke3BpZH0pYCk7XG4gIH1cblxuICBwdWJsaWMgdGVybWluYXRlKCk6IHZvaWQge1xuICAgIHRoaXMuX3N0b3BwaW5nU2VydmVycy5mb3JFYWNoKChzZXJ2ZXIpID0+IHtcbiAgICAgIHRoaXMuX2xvZ2dlci5kZWJ1ZyhgU2VydmVyIHRlcm1pbmF0aW5nIFwiJHtzZXJ2ZXIucHJvamVjdFBhdGh9XCJgKTtcbiAgICAgIHRoaXMuZXhpdFNlcnZlcihzZXJ2ZXIpO1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGRldGVybWluZVByb2plY3RQYXRoKHRleHRFZGl0b3I6IFRleHRFZGl0b3IpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBmaWxlUGF0aCA9IHRleHRFZGl0b3IuZ2V0UGF0aCgpO1xuICAgIGlmIChmaWxlUGF0aCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0UGF0aCA9IHRoaXMuX25vcm1hbGl6ZWRQcm9qZWN0UGF0aHMuZmluZCgoZCkgPT4gZmlsZVBhdGguc3RhcnRzV2l0aChkKSk7XG4gICAgaWYgKHByb2plY3RQYXRoKSB7XG4gICAgICByZXR1cm4gcHJvamVjdFBhdGg7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyV2l0aENsYWltID0gdGhpcy5fYWN0aXZlU2VydmVyc1xuICAgICAgLmZpbmQoKHMpID0+IHMuYWRkaXRpb25hbFBhdGhzLmhhcyhwYXRoLmRpcm5hbWUoZmlsZVBhdGgpKSk7XG4gICAgcmV0dXJuIHNlcnZlcldpdGhDbGFpbSAmJiB0aGlzLm5vcm1hbGl6ZVBhdGgoc2VydmVyV2l0aENsYWltLnByb2plY3RQYXRoKSB8fCBudWxsO1xuICB9XG5cbiAgcHVibGljIHVwZGF0ZU5vcm1hbGl6ZWRQcm9qZWN0UGF0aHMoKTogdm9pZCB7XG4gICAgdGhpcy5fbm9ybWFsaXplZFByb2plY3RQYXRocyA9IGF0b20ucHJvamVjdC5nZXREaXJlY3RvcmllcygpLm1hcCgoZCkgPT4gdGhpcy5ub3JtYWxpemVQYXRoKGQuZ2V0UGF0aCgpKSk7XG4gIH1cblxuICBwdWJsaWMgbm9ybWFsaXplUGF0aChwcm9qZWN0UGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gIXByb2plY3RQYXRoLmVuZHNXaXRoKHBhdGguc2VwKSA/IHBhdGguam9pbihwcm9qZWN0UGF0aCwgcGF0aC5zZXApIDogcHJvamVjdFBhdGg7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcHJvamVjdFBhdGhzQ2hhbmdlZChwcm9qZWN0UGF0aHM6IHN0cmluZ1tdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGF0aHNTZXQgPSBuZXcgU2V0KHByb2plY3RQYXRocy5tYXAodGhpcy5ub3JtYWxpemVQYXRoKSk7XG4gICAgY29uc3Qgc2VydmVyc1RvU3RvcCA9IHRoaXMuX2FjdGl2ZVNlcnZlcnMuZmlsdGVyKChzKSA9PiAhcGF0aHNTZXQuaGFzKHMucHJvamVjdFBhdGgpKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChzZXJ2ZXJzVG9TdG9wLm1hcCgocykgPT4gdGhpcy5zdG9wU2VydmVyKHMpKSk7XG4gICAgdGhpcy51cGRhdGVOb3JtYWxpemVkUHJvamVjdFBhdGhzKCk7XG4gIH1cblxuICBwdWJsaWMgcHJvamVjdEZpbGVzQ2hhbmdlZChmaWxlRXZlbnRzOiBGaWxlc3lzdGVtQ2hhbmdlRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fYWN0aXZlU2VydmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGFjdGl2ZVNlcnZlciBvZiB0aGlzLl9hY3RpdmVTZXJ2ZXJzKSB7XG4gICAgICBjb25zdCBjaGFuZ2VzOiBscy5GaWxlRXZlbnRbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBmaWxlRXZlbnQgb2YgZmlsZUV2ZW50cykge1xuICAgICAgICBpZiAoZmlsZUV2ZW50LnBhdGguc3RhcnRzV2l0aChhY3RpdmVTZXJ2ZXIucHJvamVjdFBhdGgpICYmIHRoaXMuX2NoYW5nZVdhdGNoZWRGaWxlRmlsdGVyKGZpbGVFdmVudC5wYXRoKSkge1xuICAgICAgICAgIGNoYW5nZXMucHVzaChDb252ZXJ0LmF0b21GaWxlRXZlbnRUb0xTRmlsZUV2ZW50cyhmaWxlRXZlbnQpWzBdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXG4gICAgICAgICAgZmlsZUV2ZW50LmFjdGlvbiA9PT0gJ3JlbmFtZWQnICYmXG4gICAgICAgICAgZmlsZUV2ZW50Lm9sZFBhdGguc3RhcnRzV2l0aChhY3RpdmVTZXJ2ZXIucHJvamVjdFBhdGgpICYmXG4gICAgICAgICAgdGhpcy5fY2hhbmdlV2F0Y2hlZEZpbGVGaWx0ZXIoZmlsZUV2ZW50Lm9sZFBhdGgpXG4gICAgICAgICkge1xuICAgICAgICAgIGNoYW5nZXMucHVzaChDb252ZXJ0LmF0b21GaWxlRXZlbnRUb0xTRmlsZUV2ZW50cyhmaWxlRXZlbnQpWzFdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNoYW5nZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBhY3RpdmVTZXJ2ZXIuY29ubmVjdGlvbi5kaWRDaGFuZ2VXYXRjaGVkRmlsZXMoeyBjaGFuZ2VzIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19