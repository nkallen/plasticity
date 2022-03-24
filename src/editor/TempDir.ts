import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class TempDir {
    static readonly dir = path.join(os.tmpdir(), 'plasticity');

    static async clear() {
        return fs.promises.rm(this.dir, { recursive: true, force: true });
    }


    static async create() {
        const dir = TempDir.dir;
        try {
            await fs.promises.access(dir);
        } catch (e) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        return dir;
    }

}