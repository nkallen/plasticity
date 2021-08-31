import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EditorOriginator } from "./History";

export class Backup {
    constructor(
        private readonly originator: EditorOriginator,
        private readonly signals: EditorSignals
    ) {
        signals.commandFinishedSuccessfully.add(() => this.save());
    }

    private dir = path.join(os.tmpdir(), 'plasticity');

    async save() {
        const data = await this.originator.serialize();
        const tempFilePath = await this.tempFilePath();
        await fs.promises.writeFile(tempFilePath, Buffer.from(data));
    }

    async load() {
        const tempFilePath = await this.tempFilePath();
        console.time("load backup: " + tempFilePath);
        const data = await fs.promises.readFile(tempFilePath);
        await this.originator.deserialize(data);
        console.timeEnd("load backup: " + tempFilePath);
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
        return path.join(this.dir, 'backup.plasticity');
    }
}