import fs = require('fs');
import path = require('path');
import { IDatabase } from './types/storage';

const databasesDir = path.resolve(__dirname, '.', '..', 'databases');

export class Storage {
	databaseCache: Dict<IDatabase> = {};
	loadedDatabases: boolean = false;
	globalDatabase: IDatabase = {};

	get databases(): Dict<IDatabase> {
		if (!this.loadedDatabases) this.importDatabases();
		return this.databaseCache;
	}

	getDatabase(roomid: string): IDatabase {
		if (!(roomid in this.databases)) this.databases[roomid] = {};
		return this.databases[roomid];
	}

	importDatabase(roomid: string) {
		let file = '{}';
		try {
			file = fs.readFileSync(path.join(databasesDir, roomid + '.json')).toString();
		} catch (e) {
			if (e.code !== 'ENOENT') throw e;
		}
		this.databaseCache[roomid] = JSON.parse(file);
	}

	exportDatabase(roomid: string) {
		if (!(roomid in this.databaseCache)) return;
		fs.writeFileSync(path.join(databasesDir, roomid + '.json'), JSON.stringify(this.databaseCache[roomid]));
	}

	importDatabases() {
		if (this.loadedDatabases) return;

		const databases = fs.readdirSync(databasesDir);
		for (let i = 0; i < databases.length; i++) {
			const file = databases[i];
			if (!file.endsWith('.json')) continue;
			this.importDatabase(file.substr(0, file.indexOf('.json')));
		}

		this.loadedDatabases = true;
	}

	exportDatabases() {
		for (const i in this.databaseCache) {
			this.exportDatabase(i);
		}
	}
}
