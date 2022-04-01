"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const axios_1 = require("axios");
const glob_1 = require("glob");
const Config_1 = require("./Config");
const createDataJson = (data) => {
    return JSON.stringify(data);
};
const getPayload = (documents, uploadName = 'Hello World') => {
    return createDataJson({
        name: uploadName,
        files: documents.map(doc => ({ name: doc.fileName.split('/').pop(), source: doc.getText() }))
    });
};
const sendPayload = (data, token) => {
    const config = {
        method: 'post',
        url: 'https://svelte.dev/repl/create.json',
        headers: {
            'cookie': `sid=${token}`,
            'Content-Type': 'application/json'
        },
        data: data
    };
    //@ts-ignore
    return (0, axios_1.default)(config);
};
const getDirectories = (src, callback) => {
    (0, glob_1.glob)(src + '/**/*.svelte', { ignore: '**/node_modules/**' }, callback);
};
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let disposable = vscode.commands.registerCommand('repl-svelte.svelteREPL', async () => {
        const projects = vscode.workspace.workspaceFolders;
        if (!projects) {
            vscode.window.showErrorMessage('You need to have at least one project where to create types');
        }
        else {
            const options = projects?.map(project => project.name).map(label => ({ label }));
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = options;
            quickPick.title = 'Select workspace project';
            quickPick.placeholder = 'Select a project';
            const workspace = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select project',
            });
            const wf = vscode.workspace.workspaceFolders?.find(ws => ws.name === workspace?.label);
            getDirectories(wf?.uri?.path, async (err, files) => {
                if (err) {
                    console.log('Error', err);
                }
                else {
                    const token = Config_1.Config.getToken;
                    if (!token) {
                        vscode.window.showErrorMessage('No token provided. Aborting');
                        return;
                    }
                    const quickPickFiles = files.map(file => ({ label: file.split('/').pop(), prompt: "Choose files to upload", detail: file }));
                    const filesToUpload = await vscode.window.showQuickPick(quickPickFiles, {
                        placeHolder: 'Files to upload',
                        canPickMany: true,
                    });
                    const uploadName = await vscode.window.showInputBox({
                        placeHolder: "REPL name",
                        prompt: "Name of the REPL playground. Default: Hello World",
                    });
                    const documents = await Promise.all(filesToUpload?.map(file => {
                        return vscode.workspace.openTextDocument(file.detail);
                    }));
                    const payload = getPayload(documents, uploadName);
                    try {
                        const response = await sendPayload(payload, String(token));
                        const replData = response.data;
                        //id
                        const url = `https://svelte.dev/repl/${replData.id}`;
                        vscode.window.showInformationMessage('REPL url: ' + url);
                    }
                    catch (error) {
                        console.log(error);
                        vscode.window.showErrorMessage(error?.response?.data + '(Token is possibly expired or incorrect)');
                    }
                }
            });
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map