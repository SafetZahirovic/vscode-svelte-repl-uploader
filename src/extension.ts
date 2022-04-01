// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';
import {PathLike, readdir, readdirSync} from 'fs';
import { resolve } from 'path';
import { glob } from 'glob';
import { Config } from './Config';

export type SourceModel = {
	name: string
	source: string
};
export type DataModel = {
	name: string
	files: Array<SourceModel>
};

const createDataJson = (data: DataModel) => {
	return JSON.stringify(data);
};

const getPayload = (documents: Array<vscode.TextDocument>, uploadName = 'Hello World') => {
	return createDataJson({
		name: uploadName,
		files: documents.map(doc => ({name: doc.fileName.split('/').pop()!, source: doc.getText()}))
	});
}; 

const sendPayload = (data: string, token: string) => {
	const config = {
		method: 'post',
		url: 'https://svelte.dev/repl/create.json',
		headers: { 
		  'cookie': `sid=${token}`, 
		  'Content-Type': 'application/json'
		},
		data : data
	};
	//@ts-ignore
	return axios(config);
};

const getDirectories = (src: string, callback: (err: Error | null, matches: string[]) => void) =>  {
	glob(src + '/**/*.svelte', {ignore: '**/node_modules/**'}, callback);
};
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	

	let disposable = vscode.commands.registerCommand('repl-svelte.svelteREPL', async () => {
		const projects = vscode.workspace.workspaceFolders;
		if(!projects) {
			vscode.window.showErrorMessage('You need to have at least one project where to create types');
		} else {
			const options = projects?.map(project => project.name).map(label => ({label}));
			const quickPick = vscode.window.createQuickPick();
			quickPick.items = options;
			quickPick.title = 'Select workspace project';
			quickPick.placeholder = 'Select a project';
			const workspace = await vscode.window.showQuickPick(options, {
				placeHolder: 'Select project',
			});
			const wf = vscode.workspace.workspaceFolders?.find(ws => ws.name === workspace?.label);
			getDirectories(wf?.uri?.path!, async (err, files)=> {
				if (err) {
					console.log('Error', err);
				} else {
					const token = Config.getToken;
					if(!token) {
						vscode.window.showErrorMessage('No token provided. Aborting');
						return;
					}

					const quickPickFiles = files.map(file => ({label: file.split('/').pop()!, prompt: "Choose files to upload", detail: file}));

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
					})!);
			
					const payload = getPayload(documents, uploadName);
					try {
						const response = await sendPayload(payload, String(token));
						const replData = response.data;
						//id
						const url = `https://svelte.dev/repl/${replData.id}`;
						vscode.window.showInformationMessage('REPL url: ' + url);
			
					} catch (error: any) {
						console.log(error);
						vscode.window.showErrorMessage(error?.response?.data + '(Token is possibly expired or incorrect)');
					}
				}
			});
			
		}

		
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
