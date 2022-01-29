import { Item } from 'electron/main';
import c3d from '../build/Release/c3d.node';
import * as cmd from "../command/Command";

interface ClipboardItem {
    name: string;
    items: c3d.Item[];
}

export class Clipboard {
    private _all: ClipboardItem[] = [];
    get all(): readonly ClipboardItem[] { return this._all }

    constructor(private readonly editor: cmd.EditorLike) { }

    copy() {
        const { editor: { signals, selection } } = this;
        const solids = selection.selected.solids.models;
        const curves = selection.selected.curves.models;
        const items = [...solids, ...curves];

        let solidString = "";
        if (solids.length === 1) solidString = `1 solid`;
        else if (solids.length > 1) solidString = `${solids.length} solids`;

        let curveString = undefined;
        if (curves.length === 1) curveString = `1 curve`;
        else if (solids.length > 1) curveString = `${solids.length} solids`;

        const name = [solidString, curveString].filter(x => !!x).join(',');

        this._all.push({ name, items });
        signals.clipboardChanged.dispatch();
    }

    paste(index = this.all.length - 1) {
        const { all } = this;
        if (index < 0) throw new Error("invalid index");
        if (index > this._all.length) throw new Error("invalid index");
        const copied = all[index];
        const command = new PasteCommand(this.editor, copied);
        this.editor.enqueue(command, true);
    }

    clear() {
        this._all = [];
        this.editor.signals.clipboardChanged.dispatch();
    }
}

export class PasteCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: ClipboardItem
    ) { super(editor) }

    async execute(): Promise<void> {
        const promises = [];
        for (const item of this.item.items) {
            const dup = item.Duplicate().Cast<c3d.Item>(item.IsA());
            promises.push(this.editor.db.addItem(dup));
        }
        await Promise.all(promises);
    }
}
