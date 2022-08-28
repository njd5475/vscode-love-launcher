import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function dirPathWalkUp(basename: string, lookFor: string, stopAt: string) {
	let found: string[]=[];
	
	let parentDir = basename;
	stopAt = path.resolve(stopAt);
	while(parentDir !== stopAt) {
		parentDir = path.resolve(parentDir, '..'); // walk

		if(fs.existsSync(path.join(parentDir, lookFor))) {
			found.push(parentDir);
		}
	}

	return found;
}

export function findRootWorkspaceFolder(workspaceFolders: readonly vscode.WorkspaceFolder[], filename: string) {
	return workspaceFolders.find((w) => {
		let current = filename;
		while(current !== w.uri.fsPath) {
			let old = current;
			current = path.resolve(current, '..');

			if(old === current) {
				return false;
			}
		}
		return true;
	});
}