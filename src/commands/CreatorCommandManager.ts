import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import Command, * as cmd from './Command';
import { RebuildCommand } from './CommandLike';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../VisualModel';

export interface EditorLike extends cmd.EditorLike {
    db: GeometryDatabase;
    signals: EditorSignals;
    enqueue(command: Command, silent?: boolean): void;
}

export class CreatorCommandManager {
    constructor(private readonly editor: EditorLike) {
        this.creatorChanged = this.creatorChanged.bind(this);
        editor.signals.creatorChanged.add(this.creatorChanged);
    }

    creatorChanged({creator, item}: { creator: c3d.Creator, item: visual.Item }) {
        this.editor.enqueue(new RebuildCommand(this.editor));
    }
}
