import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { Editor } from '../Editor';
import { PointPicker } from '../PointPicker';
import BoxFactory from './Box';
import CircleFactory from './Circle';
import CylinderFactory from './Cylinder';
import FilletFactory from './Fillet';
import { FilletGizmo } from './gizmos/FilletGizmo';
import { RotateGizmo } from './gizmos/RotateGizmo';
import LineFactory from './Line';
import MoveFactory from './Move';
import RectFactory from './Rect';
import RotateFactory from './Rotate';
import ScaleFactory from "./Scale";
import SphereFactory from './Sphere';
import { UnionFactory, DifferenceFactory, IntersectionFactory } from './Boolean';
import CurveFactory from "./Curve";
import { Disposable } from "event-kit";

export default abstract class Command {
    editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    abstract execute(): Promise<void>;
}

export class SphereCommand extends Command {
    async execute() {
        const sphere = new SphereFactory(this.editor.db, this.editor.materials, this.editor.signals);

        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute();
        sphere.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            sphere.radius = radius;
            sphere.update();
        });
        sphere.commit();
    }
}

export class CircleCommand extends Command {
    async execute() {
        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals);
        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute();
        circle.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            circle.radius = radius;
            circle.update();
        });
        circle.commit();
    }
}

export class CylinderCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);

        const circle = new CircleFactory(this.editor.db, this.editor.materials, this.editor.signals);
        const p1 = await pointPicker.execute();
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            circle.radius = p1.distanceTo(p2);
            circle.update();
        });
        circle.cancel();

        const cylinder = new CylinderFactory(this.editor.db, this.editor.materials, this.editor.signals);
        cylinder.base = p1;
        cylinder.radius = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            cylinder.height = p3;
            cylinder.update();
        });
        cylinder.commit();
    }
}

export class LineCommand extends Command {
    async execute() {
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals);

        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute();
        line.p1 = p1;
        await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        });
        line.commit();
    }
}

export class CurveCommand extends Command {
    async execute() {
        const curve = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals);

        const registry = this.editor.registry;
        const finish = new Promise<'finished' | 'aborted'>((resolve, reject) => {
            const finished: Disposable = registry.add('body', 'command:finished', () => {
                resolve('finished');
                finished.dispose();
            });
            const aborted: Disposable = registry.add('body', 'command:aborted', () => { // FIXME name - reject abort cancel?
                resolve('aborted');
                aborted.dispose();
            });
        })

        const pointPicker = new PointPicker(this.editor);
        while (true) {
            const getPoint = pointPicker.execute();
            const point = await Promise.race([finish, getPoint]);
            switch (point) {
                case 'finished':
                    curve.commit();
                case 'aborted':
                    getPoint.cancel();
                    return;
                default:
                    curve.points.push(point);
                    curve.update();
                    break;
            }
        }
    }
}

export class RectCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals);
        const p1 = await pointPicker.execute();
        line.p1 = p1;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        });
        line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals);
        rect.p1 = p1;
        rect.p2 = p2;
        await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        });
        rect.commit();
    }
}

export class BoxCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals);
        const p1 = await pointPicker.execute();
        line.p1 = p1;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        });
        line.cancel();

        const rect = new RectFactory(this.editor.db, this.editor.materials, this.editor.signals);
        rect.p1 = p1;
        rect.p2 = p2;
        const p3 = await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        });
        rect.cancel();

        const box = new BoxFactory(this.editor.db, this.editor.materials, this.editor.signals);
        box.p1 = p1;
        box.p2 = p2;
        box.p3 = p3;
        await pointPicker.execute((p4: THREE.Vector3) => {
            box.p4 = p4;
            box.update();
        });
        box.commit();
    }
}

export class MoveCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);
        let object = [...this.editor.selectionManager.selectedSolids][0]!;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals);
        const p1 = await pointPicker.execute();
        line.p1 = p1;

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals);
        move.p1 = p1;
        move.item = object;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            move.p2 = p2;
            line.update();
            move.update();
        });
        line.cancel();
        move.commit();
    }
}

export class ScaleCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);
        let object = [...this.editor.selectionManager.selectedSolids][0]!;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals);
        const origin = await pointPicker.execute();
        line.p1 = origin;

        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        });
        line.cancel();

        const line2 = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals);
        line.p1 = origin;

        const scale = new ScaleFactory(this.editor.db, this.editor.materials, this.editor.signals);
        scale.item = object;
        scale.origin = line2.p1 = origin;
        scale.p2 = p2;
        const p3 = await pointPicker.execute((p3: THREE.Vector3) => {
            line2.p2 = p3;
            scale.p3 = p3
            line2.update();
            scale.update();
        });
        line2.cancel();

        scale.commit();
    }
}

export class RotateCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);
        let object = [...this.editor.selectionManager.selectedSolids][0]!;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals);
        const p1 = await pointPicker.execute();
        line.p1 = p1;

        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        });
        line.cancel();

        const axis = p2.clone().sub(p1).normalize();
        const rotate = new RotateFactory(this.editor.db, this.editor.materials, this.editor.signals);
        rotate.item = object;
        rotate.point = p1;
        rotate.axis = axis;

        const midpoint = p1.clone().add(p2).divideScalar(2);
        const rotateGizmo = new RotateGizmo(this.editor, object, midpoint, axis);
        await rotateGizmo.execute(angle => {
            rotate.angle = angle;
            rotate.update();
        })

        rotate.commit();
    }
}

export class UnionCommand extends Command {
    async execute() {
        const items = [...this.editor.selectionManager.selectedSolids];
        let object1 = items[0]!;
        let object2 = items[1]!;

        const union = new UnionFactory(this.editor.db, this.editor.materials, this.editor.signals);
        union.item1 = object1;
        union.item2 = object2;
        union.commit();
    }
}

export class IntersectionCommand extends Command {
    async execute() {
        const items = [...this.editor.selectionManager.selectedSolids];
        let object1 = items[0]!;
        let object2 = items[1]!;

        const union = new IntersectionFactory(this.editor.db, this.editor.materials, this.editor.signals);
        union.item1 = object1;
        union.item2 = object2;
        union.commit();
    }
}

export class DifferenceCommand extends Command {
    async execute() {
        const items = [...this.editor.selectionManager.selectedSolids];
        let object1 = items[0]!;
        let object2 = items[1]!;

        const union = new DifferenceFactory(this.editor.db, this.editor.materials, this.editor.signals);
        union.item1 = object1;
        union.item2 = object2;
        union.commit();
    }
}

export class FilletCommand extends Command {
    async execute() {
        let edges = [...this.editor.selectionManager.selectedEdges];
        const item = edges[0].parentItem

        const edge = edges[0];

        edge.geometry.computeBoundingBox();
        const centroid = new THREE.Vector3();
        edge.geometry.boundingBox.getCenter(centroid);

        const fillet = new FilletFactory(this.editor.db, this.editor.materials, this.editor.signals);
        fillet.item = item;
        fillet.edges = edges;

        const curveEdge = this.editor.db.lookupTopologyItem(edge) as c3d.CurveEdge;
        const normal = curveEdge.EdgeNormal(0.5);
        const filletGizmo = new FilletGizmo(this.editor, edge, centroid, new THREE.Vector3(normal.x, normal.y, normal.z));

        await filletGizmo.execute((delta) => {
            fillet.distance = delta;
            fillet.update();
        })

        fillet.commit();
    }
}