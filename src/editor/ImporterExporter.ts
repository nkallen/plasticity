import * as fs from 'fs';
import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import ContourManager from './curves/ContourManager';
import { EditorSignals } from './EditorSignals';
import { Empties } from './Empties';
import { GeometryDatabase } from "./GeometryDatabase";
import { EditorOriginator } from './History';
import { Images } from "./Images";
import { PlaneDatabase } from './PlaneDatabase';
import { Scene } from './Scene';
import { Chunkifier } from './serialization/Chunkifier';
import { PlasticityDocument } from './serialization/PlasticityDocument';
import { ConstructionPlane } from './snaps/ConstructionPlaneSnap';

export const supportedExtensions = ['stp', 'step', 'c3d', 'igs', 'iges', 'sat', 'x_t', 'x_b', 'png', 'jpg', 'jpeg'];

export class ImporterExporter {
    constructor(
        private readonly originator: EditorOriginator,
        private readonly db: GeometryDatabase,
        private readonly empties: Empties,
        private readonly scene: Scene,
        private readonly images: Images,
        private readonly contours: ContourManager,
        private readonly signals: EditorSignals,
    ) { }

    async open(filePath: string) {
        const data = await fs.promises.readFile(filePath);
        const { json, c3d } = Chunkifier.load(data);
        this.originator.clear();
        await PlasticityDocument.load(json, c3d, this.originator);
        this.originator.debug();
        this.originator.validate();
        this.signals.backupLoaded.dispatch();
    }

    async import(filePaths: string[], cplane?: ConstructionPlane) {
        const { db, originator, empties, images, scene } = this;
        for (const filePath of filePaths) {
            if (/\.c3d$/.test(filePath)) {
                const data = await fs.promises.readFile(filePath);
                await db.deserialize(data);
                await originator.rebuild();
            } else if (/\.(png|jpg|jpeg)$/i.test(filePath)) {
                if (cplane === undefined) cplane = PlaneDatabase.XY;
                const data = await fs.promises.readFile(filePath);
                await images.add(filePath, data);
                const empty = empties.addImage(filePath);
                const transform = { position: cplane.p.clone(), quaternion: cplane.orientation.clone(), scale: new THREE.Vector3(1, 1, 1) };
                scene.setTransform(empty, transform);
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

    async export(filePath: string) {
        if (/\.plasticity$/.test(filePath!)) {
            const document = new PlasticityDocument(this.originator);
            const { json, c3d } = await document.serialize(filePath);
            const chunkifier = new Chunkifier('plasticity', 1, json, c3d);
            const buffer = chunkifier.serialize();
            return fs.promises.writeFile(filePath, buffer);
        } else if (/\.c3d$/.test(filePath!)) {
            const model = this.db.saveToMemento().model;
            const data = await c3d.Writer.WriteItems_async(model);
            await fs.promises.writeFile(filePath, data.memory);
        } else {
            const model = this.db.saveToMemento().model;
            await c3d.Conversion.ExportIntoFile_async(model, filePath!);
        }
    }
}