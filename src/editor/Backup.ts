import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class Backup {
    constructor(
        private readonly db: GeometryDatabase,
        private readonly signals: EditorSignals
    ) {
        signals.commandFinishedSuccessfully.add(() => this.save());
    }

    private dir = path.join(os.tmpdir(), 'plasticity');

    async save() {
        const data = await this.db.serialize();
        const tempFilePath = await this.tempFilePath();
        await fs.promises.writeFile(tempFilePath, Buffer.from(data));
    }

    async load() {
        // console.time("load backup");
        // const tempFilePath = await this.tempFilePath();
        // const data = await fs.promises.readFile(tempFilePath);
        // await this.db.deserialize(data);
        // console.timeEnd("load backup");
    }

    async makeTempDir() {
        const dir = this.dir;
        try {
            await fs.promises.access(dir);
        } catch (e) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        return dir;
    }

    async tempFilePath() {
        await this.makeTempDir();
        return path.join(this.dir, 'backup.c3d');
    }
}