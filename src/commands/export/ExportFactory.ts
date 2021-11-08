import * as fs from 'fs';
import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from '../../editor/GeometryDatabase';
import * as visual from '../../editor/VisualModel';
import { deunit } from '../../util/Conversion';
import { GeometryFactory } from '../GeometryFactory';

export interface ExportParams {
    sag: number;
    angle: number;
    length: number;
    maxCount: number;
    stepType: c3d.StepType;
}

export class ExportFactory extends GeometryFactory {
    filePath!: string;

    private model!: c3d.Solid;
    private _solid!: visual.Solid;
    get solid(): visual.Solid {
        return this._solid;
    }
    set solid(solid: visual.Solid) {
        this._solid = solid;
        this.model = this.db.lookup(solid);
    }

    sag = 0.5;
    angle = 1;
    length = 200;
    maxCount = 50;
    stepType = c3d.StepType.SpaceStep;

    private readonly formNote = new c3d.FormNote(false, true, false, false, true);

    async doUpdate(): Promise<TemporaryObject[]> {
        const { db, solid } = this;

        const objects = await this.calc();

        const temps: TemporaryObject[] = objects.map(object => {
            return {
                underlying: object,
                show() {
                    db.temporaryObjects.add(object);
                    solid.visible = false;
                },
                cancel() {
                    for (const child of object.children) {
                        const line = child as THREE.LineSegments;
                        line.geometry.dispose();
                        line.userData.geometry.dispose();
                    }
                    db.temporaryObjects.remove(object);
                    solid.visible = true;
                }
            }
        });

        for (const temp of this.temps) temp.cancel();
        db.temporaryObjects.add(...temps.map(t => t.underlying));
        return this.showTemps(temps);
    }

    private async calc(): Promise<THREE.Object3D[]> {
        const { db, model, formNote, stepType, sag, angle, length, maxCount } = this;

        const stepData = new c3d.StepData();
        stepData.Init(stepType, sag, angle, length, maxCount);
        stepData.SetStepType(c3d.StepType.ParamStep, true);
        stepData.SetStepType(c3d.StepType.MetricStep, true);
        stepData.SetStepType(c3d.StepType.DeviationStep, true);

        const mesh = await model.CalculateMesh_async(stepData, formNote);
        const buffers = mesh.GetBuffers();
        const object = new THREE.Group();
        object.scale.setScalar(deunit(1));
        for (const buffer of buffers) {
            const geometry = new THREE.BufferGeometry();
            geometry.setIndex(new THREE.BufferAttribute(buffer.index, 1));
            geometry.setAttribute('position', new THREE.BufferAttribute(buffer.position, 3));
            geometry.setAttribute('normal', new THREE.BufferAttribute(buffer.normal, 3));
            const wireframe = new THREE.WireframeGeometry(geometry);
            const line = new THREE.LineSegments(wireframe);
            line.userData.geometry = geometry;
            object.add(line);
        };

        return [object];
    }

    async doCommit() {
        const { filePath } = this;
        const objects = await this.calc();

        const scene = new THREE.Scene();
        for (const object of objects) {
            const geometries = [];
            for (const child of object.children) {
                const line = child as THREE.LineSegments;
                const geometry = line.userData.geometry;
                geometries.push(geometry);
            }
            const merged = BufferGeometryUtils.mergeBufferGeometries(geometries);
            const mesh = new THREE.Mesh(merged);
            mesh.scale.setScalar(deunit(1));
            scene.add(mesh);
        }

        const exporter = new OBJExporter();
        const string = exporter.parse(scene);
        await fs.promises.writeFile(filePath, string);

        for (const temp of this.temps) temp.cancel();

        return [];
    }
}
