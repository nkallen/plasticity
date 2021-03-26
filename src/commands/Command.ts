import { Editor } from '../Editor'
import { PointPicker } from '../PointPicker'
import * as THREE from "three";
import { SphereFactory, CircleFactory } from './Factory'

export abstract class Command {
    editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    abstract execute(): Promise<void>;
}

export class SphereCommand extends Command {
    factory: SphereFactory;

    constructor(editor: Editor) {
        super(editor);
        this.factory = new SphereFactory(editor);
    }

    async execute() {
        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute();
        this.factory.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            this.factory.radius = radius;
            this.factory.update();
        });
        this.factory.commit();
    }
}

export class CircleCommand extends Command {
    factory: CircleFactory;

    constructor(editor: Editor) {
        super(editor);
        this.factory = new CircleFactory(editor);
    }

    async execute() {
        const pointPicker = new PointPicker(this.editor);
        const p1 = await pointPicker.execute();
        this.factory.center = p1;

        await pointPicker.execute((p2: THREE.Vector3) => {
            const radius = p1.distanceTo(p2);
            this.factory.radius = radius;
            this.factory.update();
        });
        this.factory.commit();
    }
}