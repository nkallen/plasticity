import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { Cancellable, Finish } from "../Cancellable";
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
import ModifyFaceFactory from "./modifyface/Factory";
import { ModifyFaceGizmo } from "./modifyface/Gizmo";
import MoveFactory from './move/Move';
import { MoveGizmo } from './move/MoveGizmo';
import RectFactory from './rect/Rect';
import RotateFactory from './rotate/Rotate';
import { RotateGizmo } from './rotate/RotateGizmo';
import ScaleFactory from "./scale/Scale";
import SphereFactory from './sphere/Sphere';

export default abstract class Command {
    editor: Editor;

    static get title() {
        return this.name.replace(/Command/, '').toLowerCase();
    }

    constructor(editor: Editor) {
        this.editor = editor;
    }

    abstract execute(): Promise<void>;

    cancel() {
        for (const resource of this.resources) {
            resource.cancel();
        }
    }

    finish() {
        for (const resource of this.resources) {
            resource.finish();
        }
    }

    resources: Cancellable[] = [];
    register<T extends Cancellable>(x: T): T {
        this.resources.push(x);
        return x
    }
}

export class SphereCommand extends Command {
    async execute() {
        const sphere = new SphereFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        const pointPicker = new PointPicker(this.editor);

        const p1 = await pointPicker.execute().register(this);
        sphere.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            sphere.radius = radius;
            sphere.update();
        }).register(this);
        sphere.commit();
    }
}

export class CircleCommand extends Command {
    async execute() {
        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);

        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute().register(this);
        circle.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            circle.radius = radius;
            circle.update();
        }).register(this);
        circle.commit();
    }
}

export class CylinderCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);

        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        const p1 = await pointPicker.execute().register(this);
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            circle.radius = p1.distanceTo(p2);
            circle.update();
        }).register(this);
        circle.cancel();

        const cylinder = new CylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        cylinder.base = p1;
        cylinder.radius = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            cylinder.height = p3;
            cylinder.update();
        }).register(this);
        cylinder.commit();
    }
}

export class LineCommand extends Command {
    async execute() {
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);

        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute().register(this);
        line.p1 = p1;
        await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).register(this);
        line.commit();
    }
}

export class CurveCommand extends Command {
    async execute() {
        const curve = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);

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
                }).register(this);
                curve.points.push(point);
                curve.update();
                i++;
            } catch (e) {
                if (e !== Finish) throw e;
                line.cancel();
                curve.commit();
                break;
            }
        }
    }
}

export class RectCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        const p1 = await pointPicker.execute();
        line.p1 = p1;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).register(this);
        line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        rect.p1 = p1;
        rect.p2 = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        }).register(this);
        rect.commit();
    }
}

export class BoxCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        const p1 = await pointPicker.execute().register(this);
        line.p1 = p1;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).register(this);
        line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        rect.p1 = p1;
        rect.p2 = p2;
        const p3 = await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        }).register(this);
        rect.cancel();

        const box = new BoxFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        box.p1 = p1;
        box.p2 = p2;
        box.p3 = p3;
        await pointPicker.execute((p4: THREE.Vector3) => {
            box.p4 = p4;
            box.update();
        }).register(this);
        box.commit();
    }
}

export class MoveCommand extends Command {
    async execute() {
        let object = [...this.editor.selection.selectedSolids][0]!;

        const bbox = new THREE.Box3().setFromObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        line.p1 = centroid;

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        move.p1 = centroid;
        move.item = object;

        const moveGizmo = new MoveGizmo(this.editor, centroid);
        await moveGizmo.execute(delta => {
            line.p2 = line.p1.clone().add(delta);
            move.p2 = move.p1.clone().add(delta);
            line.update();
            move.update();
        }).register(this);
        line.cancel();
        move.commit();
    }
}

export class ScaleCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);
        let object = [...this.editor.selection.selectedSolids][0]!;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        const origin = await pointPicker.execute().register(this);
        line.p1 = origin;

        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        }).register(this);
        line.cancel();

        const line2 = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        line.p1 = origin;

        const scale = new ScaleFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        scale.item = object;
        scale.origin = line2.p1 = origin;
        scale.p2 = p2;
        const p3 = await pointPicker.execute((p3: THREE.Vector3) => {
            line2.p2 = p3;
            scale.p3 = p3
            line2.update();
            scale.update();
        }).register(this);
        line2.cancel();

        scale.commit();
    }
}

export class RotateCommand extends Command {
    async execute() {
        let object = [...this.editor.selection.selectedSolids][0]!;

        const bbox = new THREE.Box3().setFromObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const rotate = new RotateFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        rotate.item = object;
        rotate.point = centroid;

        const rotateGizmo = new RotateGizmo(this.editor, centroid);
        await rotateGizmo.execute((axis, angle) => {
            rotate.axis = axis;
            rotate.angle = angle;
            rotate.update();
        }).register(this);

        rotate.commit();
    }
}

export class UnionCommand extends Command {
    async execute() {
        const items = [...this.editor.selection.selectedSolids];
        let object1 = items[0]!;
        let object2 = items[1]!;

        const union = new UnionFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        union.item1 = object1;
        union.item2 = object2;
        union.commit();
    }
}

export class IntersectionCommand extends Command {
    async execute() {
        const items = [...this.editor.selection.selectedSolids];
        let object1 = items[0]!;
        let object2 = items[1]!;

        const intersection = new IntersectionFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        intersection.item1 = object1;
        intersection.item2 = object2;
        intersection.commit();
    }
}

export class DifferenceCommand extends Command {
    async execute() {
        const items = [...this.editor.selection.selectedSolids];
        let object1 = items[0]!;
        let object2 = items[1]!;

        const difference = new DifferenceFactory(this.editor.db, this.editor.materials, this.editor.signals);
        difference.item1 = object1;
        difference.item2 = object2;
        difference.commit();
    }
}

export class CutCommand extends Command {
    async execute() {
        const solids = [...this.editor.selection.selectedSolids];
        const curves = [...this.editor.selection.selectedCurves];
        let object1 = solids[0]!;
        let object2 = curves[0]!;

        const cut = new CutFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        cut.solid = object1;
        cut.contour = object2;
        cut.commit();
    }
}

export class FilletCommand extends Command {
    async execute() {
        let edges = [...this.editor.selection.selectedEdges];
        const item = edges[0].parentItem as visual.Solid

        const edge = edges[0];

        edge.geometry.computeBoundingBox();
        const centroid = new THREE.Vector3();
        edge.geometry.boundingBox.getCenter(centroid);

        const fillet = new FilletFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        fillet.item = item;
        fillet.edges = edges;

        const curveEdge = this.editor.db.lookupTopologyItem(edge) as c3d.CurveEdge;
        const normal = curveEdge.EdgeNormal(0.5);
        const filletGizmo = new FilletGizmo(this.editor, edge, centroid, new THREE.Vector3(normal.x, normal.y, normal.z));

        await filletGizmo.execute((delta) => {
            fillet.distance = delta;
            fillet.transaction(['distance'], () => {
                fillet.update();
            });
        }).register(this);

        fillet.commit();
    }
}

export class ModifyFaceCommand extends Command {
    async execute() {
        let faces = [...this.editor.selection.selectedFaces];
        const parent = faces[0].parentItem as visual.Solid

        const face = faces[0];

        const modifyFace = new ModifyFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).register(this);
        modifyFace.solid = parent;
        modifyFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const normal_ = faceModel.Normal(0.5, 0.5);
        const normal = new THREE.Vector3(normal_.x, normal_.y, normal_.z);
        const point_ = faceModel.Point(0.5, 0.5);
        const point = new THREE.Vector3(point_.x, point_.y, point_.z);
        const gizmo = new ModifyFaceGizmo(this.editor, face, point, normal);

        await gizmo.execute((offset) => {
            modifyFace.transaction(['direction'], () => {
                modifyFace.direction = offset;
                modifyFace.update();
            });
        }).register(this);

        modifyFace.commit();
    }
}