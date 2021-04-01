import { Editor } from '../Editor_'
import { PointPicker } from '../PointPicker'
import * as THREE from "three";
import SphereFactory from './Sphere';
import CircleFactory from './Circle';
import CylinderFactory from './Cylinder';
import LineFactory from './Line';
import RectFactory from './Rect';
import BoxFactory from './Box';
import MoveFactory from './Move';
import UnionFactory from './Union';
import FilletFactory from './Fillet';
import { FilletGizmo } from './FilletGizmo';
import c3d from '../../build/Release/c3d.node';

export default abstract class Command {
    editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    abstract execute(): Promise<void>;
}

export class SphereCommand extends Command {
    async execute() {
        const sphere = new SphereFactory(this.editor);

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
        const circle = new CircleFactory(this.editor);
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

        const circle = new CircleFactory(this.editor);
        const p1 = await pointPicker.execute();
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            circle.radius = p1.distanceTo(p2);
            circle.update();
        });
        circle.cancel();

        const cylinder = new CylinderFactory(this.editor);
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
        const line = new LineFactory(this.editor);

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

export class RectCommand extends Command {
    async execute() {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor);
        const p1 = await pointPicker.execute();
        line.p1 = p1;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        });
        line.cancel();

        const rect = new RectFactory(this.editor);
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

        const line = new LineFactory(this.editor);
        const p1 = await pointPicker.execute();
        line.p1 = p1;
        const p2 = await pointPicker.execute((p2: THREE.Vector3) => {
            line.p2 = p2;
            line.update();
        });
        line.cancel();

        const rect = new RectFactory(this.editor);
        rect.p1 = p1;
        rect.p2 = p2;
        const p3 = await pointPicker.execute((p3: THREE.Vector3) => {
            rect.p3 = p3;
            rect.update();
        });
        rect.cancel();

        const box = new BoxFactory(this.editor);
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
        let object = [...this.editor.selectionManager.selectedItems][0]!;

        const line = new LineFactory(this.editor);
        const p1 = await pointPicker.execute();
        line.p1 = p1;

        const move = new MoveFactory(this.editor);
        move.p1 = p1;
        move.object = object;
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

export class UnionCommand extends Command {
    async execute() {
        const items = [...this.editor.selectionManager.selectedItems];
        let object1 = items[0]!;
        let object2 = items[1]!;

        const union = new UnionFactory(this.editor);
        union.object1 = object1;
        union.object2 = object2;
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

        const fillet = new FilletFactory(this.editor);
        fillet.item = item;
        fillet.edges = edges;
 
        const filletGizmo = new FilletGizmo(this.editor);
        const curveEdge = this.editor.lookupTopologyItem(edge) as c3d.CurveEdge;
        const normal = curveEdge.EdgeNormal(0.5);

        filletGizmo.attach2(edge, centroid, new THREE.Vector3(normal.x, normal.y, normal.z));

        await filletGizmo.execute((delta) => {
            fillet.distance = delta;
            fillet.update();
        })

        fillet.commit();
    }
}