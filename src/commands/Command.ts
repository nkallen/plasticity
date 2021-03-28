import { Editor } from '../Editor'
import { PointPicker } from '../PointPicker'
import * as THREE from "three";
import SphereFactory from './Sphere';
import CircleFactory from './Circle';
import CylinderFactory from './Cylinder';
import LineFactory from './Line';
import RectFactory from './Rect';
import BoxFactory from './Box';


export default abstract class Command {
    editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    abstract execute(): Promise<void>;
}

export class SphereCommand extends Command {
    constructor(editor: Editor) {
        super(editor);
    }

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
    constructor(editor: Editor) {
        super(editor);
    }
    
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
    constructor(editor: Editor) {
        super(editor);
    }

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
    constructor(editor: Editor) {
        super(editor)
    }

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
    constructor(editor: Editor) {
        super(editor)
    }

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
    factory: BoxFactory;

    constructor(editor: Editor) {
        super(editor)
        this.factory = new BoxFactory(editor);
    }

    async execute() {
        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute();
        this.factory.p1 = p1;
        await pointPicker.execute((p2: THREE.Vector3) => {
            this.factory.p2 = p2;
            this.factory.update();
        });
        await pointPicker.execute((p3: THREE.Vector3) => {
            this.factory.p3 = p3;
            this.factory.update();
        });
        await pointPicker.execute((p4: THREE.Vector3) => {
            this.factory.p4 = p4;
            this.factory.update();
        });
        this.factory.commit();
    }
}