import * as vscode from 'vscode';
import cp = require('child_process');
import * as path from 'path';
const os = require('os');
import { dirPathWalkUp, findRootWorkspaceFolder } from './findPath';

let currentInstances: cp.ChildProcess[] = [];

/**
 * We want to create an extension that works well and on a number of different platforms and configurations.
 * To do this we need to make sure that things are configurable and the method used to divine what to launch has
 * to be one that will work well in a majority of situations.
 * 
 * The approach taken here is to look for the `main.lua` or configured file somewhere in the workspace. 
 * There are multiple ways to do this but we want to avoid searching for it if possible.
 * @param context 
 */
export function activate(context: vscode.ExtensionContext) {

	let maxInstances: number = Number(vscode.workspace.getConfiguration('lövelauncher').get('maxInstances'));
	let overwrite: boolean = Boolean(vscode.workspace.getConfiguration('lövelauncher').get('overwrite'));
	
	let disposable = vscode.commands.registerCommand('lövelauncher.launch', async () => {

		/* 
		Since "vscode.workspace.rootPath" has been deprecated, "vscode.workspace.workspaceFolders" should be used.
		However, due to the multi-root workspaces of VSCode, it would be more prudent to identify the current active
		file (being open in the VSCode editor), and look for it's root folder amongst the others. Start by getting 
		the currently-being-edited document from the VSCode editor.

		It would be most prudent to support linux as well and not only run the root folder but search parent directories
		of the currently opened file until you find a `main.lua` or a configured required file as you may want subdirectories
		for your love project when it gets large and to have to open a root folder file is kind of silly
		*/
		let gameDir = vscode.window.activeTextEditor?.document.uri.fsPath;
		let workspaceFolder = findRootWorkspaceFolder(vscode.workspace.workspaceFolders || [], gameDir || '.');
		let loveMainScript: string = vscode.workspace.getConfiguration('lövelauncher').get('main') || 'main.lua';
				
		/* 
		Since the above uri path includes the reference to the actual file being edited (as: 
		...\<workspace root>\<filename.extension>), we have to find the last "\" in the uri string
		and cut off all characters thereafter, to only have the folder uri (as: ...\<workspace root>).

		You can just use path which should provide a system agnostic view to find the parent directories
		so call a method that finds the first main.lua or configured file to execute
		*/

		gameDir = (await dirPathWalkUp(gameDir || '.', loveMainScript, workspaceFolder?.uri.fsPath || '.')).shift() || '.';
		console.log(gameDir);
		
		/* Check if a workspace folder has been opened and is active; 'undefined' leads to error msg - see furhter down. */
		if (gameDir !== undefined) {

			if (currentInstances.length < maxInstances || overwrite) {
				let loveExecDir: string = vscode.workspace.getConfiguration('lövelauncher').get('path') || '.';
				let loveExecName: string = vscode.workspace.getConfiguration('lövelauncher').get('execName') || 'love';
				let useConsoleSubsystem: boolean = Boolean(vscode.workspace.getConfiguration('lövelauncher').get('useConsoleSubsystem'));
				let saveAllOnLaunch: boolean = Boolean(vscode.workspace.getConfiguration('lövelauncher').get('saveAllOnLaunch'));

				if (saveAllOnLaunch) {
					vscode.workspace.saveAll();
				}

				if (overwrite) {
					currentInstances.forEach(function (instance) {
						if (instance.killed === false) {
							instance.kill();
						}
					});
				}

				let process = null;

				let loveExecutable = path.join(loveExecDir, loveExecName);
				if (os.platform() === 'win32') {
					if (!useConsoleSubsystem) {
						process = cp.spawn(loveExecutable, [gameDir]);
						currentInstances[Number(process.pid)] = process;
					} else {
						process = cp.spawn(loveExecutable, [gameDir, "--console"]);
						currentInstances[Number(process.pid)] = process;
					}
				}else if (os.platform() === 'macosx') {
					process = cp.exec(`open -n -a ${loveExecName} ${gameDir}`);
					currentInstances[Number(process.pid)] = process;
				}else {
					process = cp.exec(`${loveExecutable} ${gameDir}`);
					currentInstances[Number(process.pid)] = process;
				}
			} else {
				vscode.window.showErrorMessage("You have reached your max concurrent Löve instances. You can change this setting in your config.");
			}
		} else {
			/* Undefined workspace folder leads to error msg. */
			vscode.window.showErrorMessage("vscode.workspace.workspaceFolders is undefined. Please check that you have opened you project as a workspace.");
		}

	});

	context.subscriptions.push(disposable);
}