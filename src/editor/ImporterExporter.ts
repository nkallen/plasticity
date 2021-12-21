import * as fs from 'fs';
import c3d from '../../build/Release/c3d.node';
import Command, * as cmd from '../command/Command';
import { ExportCommand } from "../commands/CommandLike";
import { GeometryDatabase } from "./GeometryDatabase";

interface EditorLike extends cmd.EditorLike {
    _db: GeometryDatabase,
    enqueue(command: Command, interrupt?: boolean): Promise<void>;
}

export class ImporterExporter {
    constructor(private readonly editor: EditorLike) { }

    async open(filePaths: string[]) {
        const { editor: { _db } } = this;
        for (const filePath of filePaths) {
            if (/\.c3d$/.test(filePath)) {
                const data = await fs.promises.readFile(filePath);
                await _db.deserialize(data);
            } else {
                const { result, model } = await c3d.Conversion.ImportFromFile_async(filePath);
                if (result !== c3d.ConvResType.Success) {
                    console.error(filePath, c3d.ConvResType[result]);
                    continue;
                }
                await _db.load(model);
            }
        }
    }

    async export(model: c3d.Model, filePath: string) {
        if (/\.obj$/.test(filePath!)) {
            const command = new ExportCommand(this.editor);
            command.filePath = filePath!;
            this.editor.enqueue(command);
        } else {
            await c3d.Conversion.ExportIntoFile_async(model, filePath!);
        }
    }
}