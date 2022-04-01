"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const vscode_1 = require("vscode");
class Config {
    static get configuration() {
        return vscode_1.workspace.getConfiguration('replSvelte.settings');
    }
    static getSettings(val) {
        return Config.configuration.get(val);
    }
    static setSettings(key, val, isGlobal = false) {
        return Config.configuration.update(key, val, isGlobal);
    }
    static get getToken() {
        return Config.getSettings('token');
    }
    static setToken(token) {
        return Config.setSettings('token', token);
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map