import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from '../../editor/GeometryDatabase';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../GeometryFactory';
import * as THREE from 'three';
import { Delay } from '../../util/SequentialExecutor';
import { deunit } from '../../util/Conversion';

export interface ExportParams {
    sag: number;
    angle: number;
    length: number;
    maxCount: number;
    stepType: c3d.StepType;
}

export class ExportFactory extends GeometryFactory {
    private model!: c3d.Solid;
    private _solid!: visual.Solid;
    get solid(): visual.Solid {
        return this._solid;
    }
    set solid(solid: visual.Solid) {
        this._solid = solid;
        this.model = this.db.lookup(solid);
    }

    sag = 0;
    angle = 0;
    length = 0;
    maxCount = 0;
    stepType = c3d.StepType.SpaceStep;

    private readonly formNote = new c3d.FormNote(false, true, false, false, false);

    async doUpdate(): Promise<TemporaryObject[]> {
        const { db, model, formNote, stepType, sag, angle, length, maxCount, solid } = this;

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
        const mesh = await model.CalculateMesh_async(stepData, formNote);
        const buffers = mesh.GetBuffers();
        const object = new THREE.Group();
        object.scale.setScalar(deunit(1));
        for (const buffer of buffers) {
            const geometry = new THREE.BufferGeometry();
            geometry.setIndex(new THREE.BufferAttribute(buffer.index, 1));
            geometry.setAttribute('position', new THREE.BufferAttribute(buffer.position, 3));
            const wireframe = new THREE.WireframeGeometry(geometry);
            const line = new THREE.LineSegments(wireframe);
            object.add(line);
            console.log(line);
        };
        return [object];
    }

    doCommit() {
        return new Delay<visual.Item[]>().promise;
    }

    get originalItem() {
        return this.solid;
    }
}

// const merged = BufferGeometryUtils.mergeBufferGeometries(geometries);
// const exporter = new OBJExporter();
// const string = exporter.parse(new THREE.Mesh(merged));
// await fs.promises.writeFile(this.filePath, string);
