import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { Editor } from '../Editor';
import { PointPicker } from '../PointPicker';
import { Cancel, CancellableRegistor } from "../util/Cancellable";
import * as visual from "../VisualModel";
import { CutFactory, DifferenceFactory, IntersectionFactory, UnionFactory } from './boolean/BooleanFactory';
import BoxFactory from './box/BoxFactory';
import CircleFactory from './circle/CircleFactory';
import ContourFactory from "./curve/ContourFactory";
import CurveAndContourFactory from "./curve/CurveAndContourFactory";
import { CurveGizmo, CurveGizmoEvent } from "./curve/CurveGizmo";
import JoinCurvesFactory from "./curve/JoinCurvesFactory";
import CylinderFactory from './cylinder/CylinderFactory';
import ExtrudeFactory from "./extrude/ExtrudeFactory";
import FilletFactory, { Max } from './fillet/FilletFactory';
import { FilletGizmo } from './fillet/FilletGizmo';
import LineFactory from './line/LineFactory';
import LoftFactory from "./loft/LoftFactory";
import MirrorFactory from "./mirror/MirrorFactory";
import { DraftSolidFactory } from "./modifyface/DraftSolidFactory";
import { ActionFaceFactory, CreateFaceFactory, FilletFaceFactory, OffsetFaceFactory, PurifyFaceFactory, RemoveFaceFactory } from "./modifyface/ModifyFaceFactory";
import { OffsetFaceGizmo } from "./modifyface/OffsetFaceGizmo";
import MoveFactory from './move/MoveFactory';
import { MoveGizmo } from './move/MoveGizmo';
import RectFactory from './rect/RectFactory';
import RotateFactory from './rotate/RotateFactory';
import { RotateGizmo } from './rotate/RotateGizmo';
import ScaleFactory from "./scale/ScaleFactory";
import SphereFactory from './sphere/SphereFactory';

export default abstract class Command extends CancellableRegistor {
    editor: Editor;

    static get title() {
        return this.name.replace(/Command/, '').toLowerCase();
    }

    constructor(editor: Editor) {
        super();
        this.editor = editor;
    }

    abstract execute(): Promise<void>;
}

export class SphereCommand extends Command {
    async execute(): Promise<void> {
        const sphere = new SphereFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        const pointPicker = new PointPicker(this.editor);

        const [p1,] = await pointPicker.execute().resource(this);
        sphere.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            sphere.radius = radius;
            sphere.update();
        }).resource(this);
        await sphere.commit();
    }
}

export class CircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);

        const pointPicker = new PointPicker(this.editor);
        const [p1,] = await pointPicker.execute().resource(this);
        circle.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            circle.radius = radius;
            circle.update();
        }).resource(this);
        await circle.commit();
    }
}

export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const [p1,] = await pointPicker.execute().resource(this);
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        const [p2,] = await pointPicker.execute((p2: THREE.Vector3) => {
            circle.radius = p1.distanceTo(p2);
            circle.update();
        }).resource(this);
        await circle.cancel();

        const cylinder = new CylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        cylinder.base = p1;
        cylinder.radius = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            cylinder.height = p3;
            cylinder.update();
        }).resource(this);
        await cylinder.commit();
    }
}

export class LineCommand extends Command {
    async execute(): Promise<void> {
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);

        const pointPicker = new PointPicker(this.editor);
        const [p1,] = await pointPicker.execute().resource(this);
        line.p1 = p1;
        await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.commit();
    }
}

export class CurveCommand extends Command {
    async execute(): Promise<void> {
        const curve = new CurveAndContourFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);

        const pointPicker = new PointPicker(this.editor);
        const keyboard = new CurveGizmo(this.editor);
        keyboard.execute((e: CurveGizmoEvent) => {
            switch (e.tag) {
                case 'type':
                    curve.type = e.type;
                    curve.update();
                    break;
                case 'add-curve':
                    curve.push();
                    break;
                case 'undo':
                    pointPicker.undo(); // FIXME in theory the overlay needs to be updated;
                    curve.undo();
                    curve.update();
                    break;
            }
        }).resource(this);

        while (true) {
            try {
                const [point,] = await pointPicker.execute(async (p: THREE.Vector3) => {
                    curve.nextPoint = p;
                    if (!curve.isValid) return;
                    curve.closed = curve.wouldBeClosed(p);
                    await curve.update();
                }).resource(this);
                if (curve.wouldBeClosed(point)) {
                    curve.closed = true;
                    this.finish();
                    break;
                }
                curve.nextPoint = undefined;
                curve.points.push(point);
                await curve.update();
            } catch (e) {
                if (e !== Cancel) throw e;
                break;
            }
        }
    }
}

export class JoinCurvesCommand extends Command {
    async execute(): Promise<void> {
        const contour = new JoinCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        for (const curve of this.editor.selection.selectedCurves) contour.curves.push(curve);
        await contour.commit();
    }
}

export class RectCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const [p1,] = await pointPicker.execute();
        line.p1 = p1;
        const [p2,] = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        rect.p1 = p1;
        rect.p2 = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        await rect.commit();
    }
}

export class BoxCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const [p1,] = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const [p2,] = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        const [p3,] = await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        await rect.cancel();

        const box = new BoxFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        box.p1 = p1;
        box.p2 = p2;
        box.p3 = p3;
        await pointPicker.execute((p4: THREE.Vector3) => {
            box.p4 = p4;
            box.update();
        }).resource(this);
        await box.commit();
    }
}

export class MoveCommand extends Command {
    async execute(): Promise<void> {
        const objects = [...this.editor.selection.selectedSolids, ...this.editor.selection.selectedCurves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);

        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = centroid;

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        move.p1 = centroid;
        move.items = objects;

        const moveGizmo = new MoveGizmo(this.editor, centroid);
        await moveGizmo.execute(delta => {
            line.p2 = line.p1.clone().add(delta);
            move.p2 = move.p1.clone().add(delta);
            line.update();
            move.update();
        }).resource(this);
        await line.cancel();
        await move.commit();
    }
}

export class ScaleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);
        const objects = [...this.editor.selection.selectedSolids];

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const [origin,] = await pointPicker.execute().resource(this);
        line.p1 = origin;

        const [p2,] = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        await line.cancel();

        const line2 = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = origin;

        const scale = new ScaleFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        scale.items = objects;
        scale.origin = line2.p1 = origin;
        scale.p2 = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            line2.p2 = p3;
            scale.p3 = p3
            line2.update();
            scale.update();
        }).resource(this);
        await line2.cancel();

        await scale.commit();
    }
}

export class RotateCommand extends Command {
    async execute(): Promise<void> {
        const objects = [...this.editor.selection.selectedSolids];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);

        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const rotate = new RotateFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        rotate.items = objects;
        rotate.point = centroid;

        const rotateGizmo = new RotateGizmo(this.editor, centroid);
        await rotateGizmo.execute((axis, angle) => {
            rotate.axis = axis;
            rotate.angle = angle;
            rotate.update();
        }).resource(this);

        await rotate.commit();
    }
}

export class UnionCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selectedSolids];
        const object1 = items[0]!;
        const object2 = items[1]!;

        const union = new UnionFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        union.item1 = object1;
        union.item2 = object2;
        await union.commit();
    }
}

export class IntersectionCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selectedSolids];
        const object1 = items[0]!;
        const object2 = items[1]!;

        const intersection = new IntersectionFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        intersection.item1 = object1;
        intersection.item2 = object2;
        await intersection.commit();
    }
}

export class DifferenceCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selectedSolids];
        const object1 = items[0]!;
        const object2 = items[1]!;

        const difference = new DifferenceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        difference.item1 = object1;
        difference.item2 = object2;
        await difference.commit();
    }
}

export class CutCommand extends Command {
    async execute(): Promise<void> {
        const solids = [...this.editor.selection.selectedSolids];
        const curves = [...this.editor.selection.selectedCurves];
        const object1 = solids[0]!;
        const object2 = curves[0]!;

        const cut = new CutFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        cut.solid = object1;
        cut.contour = object2;
        await cut.commit();
    }
}

export class FilletCommand extends Command {
    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selectedEdges];
        const item = edges[0].parentItem as visual.Solid;

        const edge = edges[0];

        edge.geometry.computeBoundingBox();
        const centroid = new THREE.Vector3();
        edge.geometry.boundingBox!.getCenter(centroid);

        const fillet = new FilletFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        fillet.item = item;
        fillet.edges = edges;

        const curveEdge = this.editor.db.lookupTopologyItem(edge) as c3d.CurveEdge;
        const normal = curveEdge.EdgeNormal(0.5);
        const filletGizmo = new FilletGizmo(this.editor, centroid, new THREE.Vector3(normal.x, normal.y, normal.z));

        const max = new Max(fillet);
        max.start();
        await filletGizmo.execute(async delta =>
            max.exec(delta)
        ).resource(this);

        await fillet.commit();
    }
}

export class OffsetFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const offsetFace = new OffsetFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        offsetFace.solid = parent;
        offsetFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const normal_ = faceModel.Normal(0.5, 0.5);
        const normal = new THREE.Vector3(normal_.x, normal_.y, normal_.z);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new OffsetFaceGizmo(this.editor, point, normal);

        await gizmo.execute((delta) => {
            offsetFace.schedule(async () => {
                offsetFace.transaction('direction', async () => {
                    offsetFace.direction = new THREE.Vector3(delta, 0, 0);
                    await offsetFace.update();
                });
            });
        }).resource(this);

        await offsetFace.commit();
    }
}


export class DraftSolidCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const face = faces[0];
        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new RotateGizmo(this.editor, point);

        const draftSolid = new DraftSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        draftSolid.solid = parent;
        draftSolid.faces = faces;
        draftSolid.origin = point;
        
        await gizmo.execute((axis, angle) => {
            draftSolid.axis = axis;
            draftSolid.angle = angle;
            draftSolid.update();
        }).resource(this);

        await draftSolid.commit();
    }
}


export class RemoveFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new RemoveFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        removeFace.commit();
    }
}

export class PurifyFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new PurifyFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class CreateFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new CreateFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class ActionFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const actionFace = new ActionFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        actionFace.solid = parent;
        actionFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new MoveGizmo(this.editor, point);

        await gizmo.execute(delta => {
            actionFace.schedule(async () => {
                actionFace.transaction('direction', async () => {
                    actionFace.direction = delta;
                    await actionFace.update();
                });
            });
        }).resource(this);

        await actionFace.commit();
    }
}

export class FilletFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const refilletFace = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        refilletFace.solid = parent;
        refilletFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const normal_ = faceModel.Normal(0.5, 0.5);
        const normal = new THREE.Vector3(normal_.x, normal_.y, normal_.z);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new OffsetFaceGizmo(this.editor, point, normal);

        await gizmo.execute((delta) => {
            refilletFace.schedule(async () => {
                refilletFace.transaction('direction', async () => {
                    refilletFace.direction = new THREE.Vector3(delta, 0, 0);
                    await refilletFace.update();
                });
            });
        }).resource(this);

        await refilletFace.commit();
    }
}

export class SuppleFaceCommand extends Command { async execute(): Promise<void> { } }

export class MergerFaceCommand extends Command { async execute(): Promise<void> { } }

export class LoftCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selectedCurves];
        const loft = new LoftFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        loft.contours = curves;
        await loft.commit();
    }
}

export class ExtrudeCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selectedCurves];
        const extrude = new ExtrudeFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        extrude.contour = curves[0];
        extrude.direction = new THREE.Vector3(1, 1, 1);

        const pointPicker = new PointPicker(this.editor);
        const [p1,] = await pointPicker.execute().resource(this);

        await pointPicker.execute((p2: THREE.Vector3) => {
            extrude.direction = p2.clone().sub(p1);
            extrude.distance1 = extrude.direction.length();
            extrude.update();
        }).resource(this);

        await extrude.commit();
    }
}

export class MirrorCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selectedCurves];
        const mirror = new MirrorFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        mirror.curve = curves[0];

        const pointPicker = new PointPicker(this.editor);
        const [p1, n] = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);

        mirror.origin = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            mirror.normal = p2.clone().sub(p1).cross(n);
            mirror.update();
        }).resource(this);

        await mirror.commit();
    }
}

export class DeleteCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selectedCurves, ...this.editor.selection.selectedSolids];
        const ps = items.map(i => this.editor.db.removeItem(i));
        await Promise.all(ps);
        return Promise.resolve();
    }
}