import * as fs from 'fs';
import { Scene } from 'three';
import c3d from '../../build/Release/c3d.node';
import Command, * as cmd from '../command/Command';
import { ExportCommand } from "../commands/CommandLike";
import ContourManager from './curves/ContourManager';
import { GeometryDatabase } from "./GeometryDatabase";

interface EditorLike extends cmd.EditorLike {
    _db: GeometryDatabase;
    contours: ContourManager;
    enqueue(command: Command, interrupt?: boolean): Promise<void>;
}

export class ImporterExporter {
    constructor(private readonly editor: EditorLike) { }

    async open(filePaths: string[]) {
        const { editor: { _db, contours, scene } } = this;
        for (const filePath of filePaths) {
            if (/\.c3d$/.test(filePath)) {
                const data = await fs.promises.readFile(filePath);
                await _db.deserialize(data);
                await contours.rebuild();
                scene.rebuild();
            } else {
                const { result, model } = await c3d.Conversion.ImportFromFile_async(filePath);
                if (result !== c3d.ConvResType.Success) {
                    console.error(filePath, c3d.ConvResType[result]);
                    continue;
                }
                await _db.load(model, false);
            }
        }
    }

    async export(model: c3d.Model, filePath: string) {
        if (/\.obj$/.test(filePath!)) {
            const command = new ExportCommand(this.editor);
            command.filePath = filePath!;
            this.editor.enqueue(command);
        } else if (/\.c3d$/.test(filePath!)) {
            const data = await c3d.Writer.WriteItems_async(model);
            await fs.promises.writeFile(filePath, data.memory);
        } else {
            await c3d.Conversion.ExportIntoFile_async(model, filePath!);
        }
    }
}