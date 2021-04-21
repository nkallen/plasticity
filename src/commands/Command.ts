import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CancellableRegistor, Finish } from "../Cancellable";
import { Editor } from '../Editor';
import { PointPicker } from '../PointPicker';
import * as visual from "../VisualModel";
import { CutFactory, DifferenceFactory, IntersectionFactory, UnionFactory } from './boolean/Boolean';
import BoxFactory from './box/Box';
import CircleFactory from './circle/Circle';
import CurveFactory from "./curve/Curve";
import CylinderFactory from './cylinder/Cylinder';
import FilletFactory from './fillet/Fillet';
import { FilletGizmo } from './fillet/FilletGizmo';
import LineFactory from './line/Line';
import { ActionFaceFactory, CreateFaceFactory, FilletFaceFactory, OffsetFaceFactory, PurifyFaceFactory, RemoveFaceFactory } from "./modifyface/ModifyFace";
import { OffsetFaceGizmo } from "./modifyface/OffsetFaceGizmo";
import MoveFactory from './move/Move';
import { MoveGizmo } from './move/MoveGizmo';
import RectFactory from './rect/Rect';
import RotateFactory from './rotate/Rotate';
import { RotateGizmo } from './rotate/RotateGizmo';
import ScaleFactory from "./scale/Scale";
import SphereFactory from './sphere/Sphere';

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

        const p1 = await pointPicker.execute().resource(this);
        sphere.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            sphere.radius = radius;
            sphere.update();
        }).resource(this);
        sphere.commit();
    }
}

export class CircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);

        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute().resource(this);
        circle.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            circle.radius = radius;
            circle.update();
        }).resource(this);
        circle.commit();
    }
}

export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const p1 = await pointPicker.execute().resource(this);
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            circle.radius = p1.distanceTo(p2);
            circle.update();
        }).resource(this);
        circle.cancel();

        const cylinder = new CylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        cylinder.base = p1;
        cylinder.radius = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            cylinder.height = p3;
            cylinder.update();
        }).resource(this);
        cylinder.commit();
    }
}

export class LineCommand extends Command {
    async execute(): Promise<void> {
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);

        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute().resource(this);
        line.p1 = p1;
        await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.commit();
    }
}

export class CurveCommand extends Command {
    async execute(): Promise<void> {
        const curve = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        let i = 0;
        while (true) {
            try {
                const point = await pointPicker.execute((p: THREE.Vector3) => {
                    if (i == 0) {
                        line.p1 = p;
                    } else if (i == 1) {
                        line.p2 = p;
                        line.update();
                    } else if (i == 2) {
                        line.cancel();
                    };
                }).resource(this);
                curve.points.push(point);
                curve.update();
                i++;
            } catch (e) {
                if (e !== Finish) throw e;
                break;
            }
        }
    }
}

export class RectCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const p1 = await pointPicker.execute();
        line.p1 = p1;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        rect.p1 = p1;
        rect.p2 = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        rect.commit();
    }
}

export class BoxCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const p1 = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        const p3 = await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        rect.cancel();

        const box = new BoxFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        box.p1 = p1;
        box.p2 = p2;
        box.p3 = p3;
        await pointPicker.execute((p4: THREE.Vector3) => {
            box.p4 = p4;
            box.update();
        }).resource(this);
        box.commit();
    }
}

export class MoveCommand extends Command {
    async execute(): Promise<void> {
        const object = [...this.editor.selection.selectedSolids][0]!;

        const bbox = new THREE.Box3().setFromObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = centroid;

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        move.p1 = centroid;
        move.item = object;

        const moveGizmo = new MoveGizmo(this.editor, centroid);
        await moveGizmo.execute(delta => {
            line.p2 = line.p1.clone().add(delta);
            move.p2 = move.p1.clone().add(delta);
            line.update();
            move.update();
        }).resource(this);
        line.cancel();
        move.commit();
    }
}

export class ScaleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);
        const object = [...this.editor.selection.selectedSolids][0]!;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const origin = await pointPicker.execute().resource(this);
        line.p1 = origin;

        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const line2 = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = origin;

        const scale = new ScaleFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        scale.item = object;
        scale.origin = line2.p1 = origin;
        scale.p2 = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            line2.p2 = p3;
            scale.p3 = p3
            line2.update();
            scale.update();
        }).resource(this);
        line2.cancel();

        scale.commit();
    }
}

export class RotateCommand extends Command {
    async execute(): Promise<void> {
        const object = [...this.editor.selection.selectedSolids][0]!;

        const bbox = new THREE.Box3().setFromObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const rotate = new RotateFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        rotate.item = object;
        rotate.point = centroid;

        const rotateGizmo = new RotateGizmo(this.editor, centroid);
        await rotateGizmo.execute((axis, angle) => {
            rotate.axis = axis;
            rotate.angle = angle;
            rotate.update();
        }).resource(this);

        rotate.commit();
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
        union.commit();
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
        intersection.commit();
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
        difference.commit();
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
        cut.commit();
    }
}

export class FilletCommand extends Command {
    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selectedEdges];
        const item = edges[0].parentItem as visual.Solid; // FIXME make method without cast in visual.

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

        await filletGizmo.execute((delta) => {
            fillet.distance = delta;
            fillet.transaction(['distance'], () => {
                fillet.update();
            });
        }).resource(this);

        fillet.commit();
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
            offsetFace.transaction(['direction'], () => {
                offsetFace.direction = new THREE.Vector3(delta, 0, 0);
                offsetFace.update();
            });
        }).resource(this);

        offsetFace.commit();
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

        removeFace.commit();
    }
}

export class CreateFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new CreateFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).finally(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        removeFace.commit();
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
            actionFace.transaction(['direction'], () => {
                actionFace.direction = delta;
                actionFace.update();
            });
        }).resource(this);

        actionFace.commit();
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
            refilletFace.transaction(['direction'], () => {
                refilletFace.direction = new THREE.Vector3(delta, 0, 0);
                refilletFace.update();
            });
        }).resource(this);

        refilletFace.commit();

    }
}

export class SuppleFaceCommand extends Command { async execute(): Promise<void> { } }

export class MergerFaceCommand extends Command { async execute(): Promise<void> { } }