import * as path from 'path';
import { EditorSignals } from "../EditorSignals";
import { EditorOriginator } from "../History";
import { PlasticityDocument } from './PlasticityDocument';
import { TempDir } from '../TempDir';

export class Backup {
    constructor(
        private readonly originator: EditorOriginator,
        private readonly signals: EditorSignals
    ) {
        signals.commandFinishedSuccessfully.add(() => this.save());
        signals.historyChanged.add(() => this.save());
    }

    async save() {
        await TempDir.create();
        const document = new PlasticityDocument(this.originator);
        const tempFilePath = this.tempFilePath;
        await document.save(tempFilePath);
    }

    async load() {
        const tempFilePath = this.tempFilePath;
        await PlasticityDocument.open(tempFilePath, this.originator);
        this.originator.debug();
        this.originator.validate();
        this.signals.backupLoaded.dispatch();
    }

    async clear() {
        try {
            await TempDir.clear();
            await TempDir.create();
        } catch (e) {
            console.warn(e);
        }
    }

    get tempFilePath() {
        return path.join(TempDir.dir, `backup.${process.env.NODE_ENV ?? 'env'}.plasticity`);
    }
}