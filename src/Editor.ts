import * as THREE from "three";
import signals from "signals";

import path from "path";
import * as url from "url";

export abstract class GeometryFactory {
    editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }
}

export class SphereFactory extends GeometryFactory {
    center: THREE.Vector3;
    radius: number;
    mesh: THREE.Mesh;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.SphereGeometry(0, 8, 6, 0, Math.PI * 2, 0, Math.PI);
        const material = new THREE.MeshMatcapMaterial();
        // material.color = new THREE.Color(0x454545);

        const image = url.resolve(window.location.origin, "/static/matcap-porcelain-white.jpg");

        const matcapTexture = new THREE.TextureLoader().load(image);
        console.log(matcapTexture);
        material.matcap = matcapTexture;
        this.mesh = new THREE.Mesh(geometry, material);
        this.editor.addObject(this.mesh);
    }

    update() {
        const geometry = new THREE.SphereGeometry(this.radius, 8, 6, 0, Math.PI * 2, 0, Math.PI);
        this.mesh.geometry.dispose();
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);
    }

    commit() {
        this.editor.select(this.mesh);
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}

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
        })
    }
}

class PointPicker {
    editor: Editor;
    mesh: THREE.Object3D;

    constructor(editor: Editor) {
        this.editor = editor;

        const geometry = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI);
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    }

    async execute(cb?: (pt: THREE.Vector3) => void) {
        const viewport = this.editor.viewports[0];
        const renderer = viewport.renderer;
        const camera = viewport.camera;
        const domElement = renderer.domElement;
        const raycaster = new THREE.Raycaster();
        const editor = this.editor;
        const scene = editor.scene;
        const mesh = this.mesh;
        
        scene.add(mesh);

        const planeGeo = new THREE.PlaneGeometry(10000, 10000, 2, 2);
        const planeMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: true, side: THREE.DoubleSide, transparent: true, opacity: 0.1, toneMapped: false });
        const constructionPlane = new THREE.Mesh(planeGeo, planeMat);
        constructionPlane.lookAt(0, 1, 0);
        scene.add(constructionPlane);

        return new Promise<THREE.Vector3>((resolve, reject) => {
            function onPointerMove(e: PointerEvent) {
                const pointer = getPointer(e);
                raycaster.setFromCamera(pointer, camera);
                const planeIntersect = intersectObjectWithRay(constructionPlane, raycaster, true);
                if (planeIntersect != null) {
                    if (cb != null) {
                        cb(planeIntersect.point);
                    }
                    mesh.position.copy(planeIntersect.point);
                }
            }
        
            function getPointer(e: PointerEvent) {
                const rect = domElement.getBoundingClientRect();
                const pointer = e;
        
                return {
                    x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
                    y: - (pointer.clientY - rect.top) / rect.height * 2 + 1,
                    button: e.button
                };
            }
        
            function intersectObjectWithRay(object: THREE.Object3D, raycaster: THREE.Raycaster, includeInvisible: boolean) {
                var allIntersections = raycaster.intersectObject(object, true);
                for (var i = 0; i < allIntersections.length; i++) {
                    if (allIntersections[i].object.visible || includeInvisible) {
                        return allIntersections[i];
                    }
                }
                return null;
            }

            function onPointerDown(e: PointerEvent) {
                domElement.removeEventListener('pointermove', onPointerMove);
                domElement.removeEventListener('pointerdown', onPointerDown);
                scene.remove(mesh);
                scene.remove(constructionPlane);
                resolve(mesh.position.clone());
            }

            domElement.addEventListener('pointermove', onPointerMove);
            domElement.addEventListener('pointerdown', onPointerDown);
        });
    }
}

interface EditorSignals {
    objectAdded: signals.Signal<THREE.Object3D>;
    sceneGraphChanged: signals.Signal;
    windowResized: signals.Signal;
    windowLoaded: signals.Signal;
    rendererAdded: signals.Signal<THREE.Renderer>;
}

interface V {
    renderer: THREE.Renderer;
    camera: THREE.Camera;
}
export class Editor {
    viewports: V[] = [];
    scene: THREE.Scene;
    selected?: THREE.Object3D;
    signals: EditorSignals = {
        objectAdded: new signals.Signal(),
        sceneGraphChanged: new signals.Signal(),
        windowResized: new signals.Signal(),
        windowLoaded: new signals.Signal(),
        rendererAdded: new signals.Signal()
    }

    constructor() {
        this.scene = new THREE.Scene();
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('load', this.onWindowLoad.bind(this), false);
    }

    execute(command: Command) {
        command.execute();
    }

    addObject(object: THREE.Object3D) {
        this.scene.add(object);
    }

    select(object: THREE.Object3D) {
        this.selected = object;
        this.signals.objectAdded.dispatch(object);
        this.signals.sceneGraphChanged.dispatch(object);
    }

    onWindowResize() {
        this.signals.windowResized.dispatch();
    }

    onWindowLoad() {
        this.signals.windowLoaded.dispatch();
    }

}