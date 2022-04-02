// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios, { AxiosResponse } from 'axios';
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

export type REPLApp = {
	gists: Gist[]
	next: boolean
}
  
export type Gist = {
	id: string
	name: string
	created_at: string
	updated_at?: string
}

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

const fetchREPLApps = (token: string): Promise<AxiosResponse<REPLApp>> => {
	const config = {
		method: 'get',
		url: 'https://svelte.dev/apps.json',
		headers: { 
		  'cookie': `sid=${token}`, 
		},
	};
	//@ts-ignore
	return axios(config);
}

const deleteREPLApps = (token: string, data: string): Promise<AxiosResponse<REPLApp>> => {
	const config = {
		method: 'post',
		url: 'https://svelte.dev/apps/destroy',
		headers: { 
		  'cookie': `sid=${token}`, 
		  'Content-Type': 'application/json'
		},
		data: data
	};
	//@ts-ignore
	return axios(config);
}

const getDirectories = (src: string, callback: (err: Error | null, matches: string[]) => void) =>  {
	glob(src + '/**/*.svelte', {ignore: '**/node_modules/**'}, callback);
};

export function activate(context: vscode.ExtensionContext) {
	

	let REPLUpload = vscode.commands.registerCommand('replSvelte.svelteREPLUpload', async () => {
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

					if(!filesToUpload || filesToUpload.length <= 0) {
						vscode.window.showErrorMessage('You need to pick at least one file. Aborting');
						return
					}
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

	let REPLNavigate = vscode.commands.registerCommand('replSvelte.svelteREPLNavigate', async () => {
		const token = Config.getToken;
		const {data: { gists }} = await fetchREPLApps(token)
		const options = gists?.map(({id, name}) => ({label: name, detail: `https://svelte.dev/repl/${id}`}))
		const quickPick = vscode.window.createQuickPick();
		quickPick.items = options;
		quickPick.title = 'Select REPL gist to navigate to';
		quickPick.placeholder = 'REPL gist';
		const replGist = await vscode.window.showQuickPick(options, {
			placeHolder: 'Select REPL gist',
		});
		if(!replGist?.detail) {
			vscode.window.showErrorMessage('No gist selected. Aborting');
			return
		}
		vscode.env.openExternal(vscode.Uri.parse(replGist?.detail!));
	})

	let REPLDelete = vscode.commands.registerCommand('replSvelte.svelteREPLDelete', async () => {
		const token = Config.getToken;
		const {data: { gists }} = await fetchREPLApps(token)
		const quickPickGists = gists?.map(({id, name}) => ({label: name, detail: `https://svelte.dev/repl/${id}`, prompt: "Choose gists to delete"}))

		const gistsToDelete = await vscode.window.showQuickPick(quickPickGists, {
			placeHolder: 'Gists to Delete',
			canPickMany: true,
		});

		if(!gistsToDelete?.length) {
			vscode.window.showErrorMessage('No gist(s) selected. Aborting');
			return
		}

		const ids = gistsToDelete.map(gtd => gtd.detail.split('/').pop())
		try {
			const deletedGists = await deleteREPLApps(token, JSON.stringify({ids}))
			vscode.window.showInformationMessage('gists deleted: ' + JSON.stringify(ids));
		} catch (error: any) {
			vscode.window.showErrorMessage('Error trying to delete REPL gists. Message: ' + error?.response?.data);
		}
	})

	context.subscriptions.push(REPLUpload);
	context.subscriptions.push(REPLNavigate);
	context.subscriptions.push(REPLDelete);
}

// this method is called when your extension is deactivated
export function deactivate() {}
