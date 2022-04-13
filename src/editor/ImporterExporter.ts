import * as fs from 'fs';
import c3d from '../../build/Release/c3d.node';
import ContourManager from './curves/ContourManager';
import { GeometryDatabase } from "./GeometryDatabase";

export class ImporterExporter {
    constructor(private readonly db: GeometryDatabase, private readonly contours: ContourManager) { }

    async open(filePaths: string[]) {
        const { db, contours } = this;
        for (const filePath of filePaths) {
            if (/\.c3d$/.test(filePath)) {
                const data = await fs.promises.readFile(filePath);
                await db.deserialize(data);
                await contours.rebuild();
            } else {
                const { result, model } = await c3d.Conversion.ImportFromFile_async(filePath);
                if (result !== c3d.ConvResType.Success) {
                    console.error(filePath, c3d.ConvResType[result]);
                    continue;
                }
                await db.load(model, false);
            }
        }
    }

    async export(model: c3d.Model, filePath: string) {
        if (/\.c3d$/.test(filePath!)) {
            const data = await c3d.Writer.WriteItems_async(model);
            await fs.promises.writeFile(filePath, data.memory);
        } else {
            await c3d.Conversion.ExportIntoFile_async(model, filePath!);
        }
    }
}