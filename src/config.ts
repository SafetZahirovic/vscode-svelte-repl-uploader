import { workspace } from 'vscode';

export class Config {

    public static get configuration() {
        return workspace.getConfiguration('replSvelte.settings');
    }

    private static getSettings<T>(val: string): T {
        return Config.configuration.get(val) as T;
    }

    private static setSettings(key: string, val: number | string, isGlobal: boolean = false): Thenable<void> {
        return Config.configuration.update(key, val, isGlobal);
    }

    public static get getToken(): string {
        return Config.getSettings<string>('token');
    }

    public static setToken(token: string): Thenable<void> {
        return Config.setSettings('token', token);
    }
}