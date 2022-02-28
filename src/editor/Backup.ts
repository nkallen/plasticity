import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PlasticityDocument } from './PlasticityDocument';
import { EditorSignals } from "./EditorSignals";
import { EditorOriginator } from "./History";

export class Backup {
    constructor(
        private readonly originator: EditorOriginator,
        private readonly signals: EditorSignals
    ) {
        signals.commandFinishedSuccessfully.add(() => this.save());
        signals.historyChanged.add(() => this.save());
    }

    private dir = path.join(os.tmpdir(), 'plasticity');

    async save() {
        await this.makeTempDir();
        const document = new PlasticityDocument(this.originator);
        const tempFilePath = this.tempFilePath;
        await document.save(tempFilePath);
    }

    async load() {
        const tempFilePath = this.tempFilePath;
        await PlasticityDocument.load(tempFilePath, this.originator);
    }

    async clear() {
        try {
            await fs.promises.rm(this.dir, { recursive: true, force: true });
            await this.makeTempDir();
        } catch (e) {
            console.warn(e);
        }
    }

    private async makeTempDir() {
        const dir = this.dir;
        try {
            await fs.promises.access(dir);
        } catch (e) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        return dir;
    }

    get tempFilePath() {
        return path.join(this.dir, `backup.${process.env.NODE_ENV ?? 'env'}.plasticity`);
    }
}