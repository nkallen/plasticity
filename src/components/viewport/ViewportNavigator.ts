import * as THREE from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass";
import { PlaneDatabase } from "../../editor/PlaneDatabase";
import { ConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { OrbitControls } from "./OrbitControls";
import { Viewport } from "./Viewport";

export enum Orientation { posX, posY, posZ, negX, negY, negZ };

const halfSize = 0.5;
const turnRate = 3 * Math.PI; // turn rate in angles per second
const frustrum = 1.6;

export class ViewportNavigatorGizmo extends THREE.Object3D {
    readonly camera = new THREE.OrthographicCamera(- frustrum, frustrum, frustrum, - frustrum, 0, 4);
    private readonly interactiveObjects: THREE.Object3D[];

    constructor(private readonly viewport: Viewport, readonly dim: number) {
        super();

        this.camera.position.set(0, 0, 2);

        const panel = document.createElement('div');
        panel.setAttribute('style', `position: absolute; right: 0px; top: 0px; height: ${dim}px; width: ${dim}px`);
        panel.addEventListener('pointerup', e => this.onMouseUp(e));
        panel.addEventListener('pointerdown', e => e.stopPropagation());
        viewport.domElement.appendChild(panel);

        const color1 = new THREE.Color('#ff3653').convertSRGBToLinear();
        const color2 = new THREE.Color('#8adb00').convertSRGBToLinear();
        const color3 = new THREE.Color('#2c8fff').convertSRGBToLinear();

        const interactiveObjects: THREE.Object3D[] = [];

        Axes: {
            const axisGeometry = new THREE.BoxGeometry(2 * halfSize, 0.05, 0.05).translate(halfSize, 0, 0);
            const xAxis = new THREE.Mesh(axisGeometry, ViewportNavigatorExecutor.getAxisMaterial(color1));
            const yAxis = new THREE.Mesh(axisGeometry, ViewportNavigatorExecutor.getAxisMaterial(color2));
            const zAxis = new THREE.Mesh(axisGeometry, ViewportNavigatorExecutor.getAxisMaterial(color3));
            xAxis.position.set(-halfSize, -halfSize, -halfSize);
            yAxis.position.set(-halfSize, -halfSize, -halfSize);
            zAxis.position.set(-halfSize, -halfSize, -halfSize);

            yAxis.rotation.z = Math.PI / 2;
            zAxis.rotation.y = - Math.PI / 2;

            this.add(xAxis);
            this.add(zAxis);
            this.add(yAxis);
        }

        Box: {
            const boxGeometry = new THREE.BoxGeometry(2 * halfSize, 2 * halfSize, 2 * halfSize);
            const box = new THREE.Mesh(boxGeometry, ViewportNavigatorExecutor.getBoxMaterial(new THREE.Color('#AAAAAA')));

            const planeGeometry = new THREE.PlaneBufferGeometry(1.5 * halfSize, 1.5 * halfSize);

            const front = new THREE.Mesh(planeGeometry, ViewportNavigatorExecutor.getPlaneMaterial(new THREE.Color('#777777')));
            front.rotation.x = Math.PI / 2;
            front.position.set(0, -halfSize, 0);
            front.userData.type = Orientation.negY;

            const back = new THREE.Mesh(planeGeometry, ViewportNavigatorExecutor.getPlaneMaterial(new THREE.Color('#777777')));
            back.rotation.x = -Math.PI / 2;
            back.position.set(0, halfSize, 0);
            back.userData.type = Orientation.posY;

            const left = new THREE.Mesh(planeGeometry, ViewportNavigatorExecutor.getPlaneMaterial(new THREE.Color('#777777')));
            left.rotation.y = -Math.PI / 2;
            left.position.set(-halfSize, 0, 0);
            left.userData.type = Orientation.negX;

            const right = new THREE.Mesh(planeGeometry, ViewportNavigatorExecutor.getPlaneMaterial(new THREE.Color('#777777')));
            right.rotation.y = Math.PI / 2;
            right.position.set(halfSize, 0, 0);
            right.userData.type = Orientation.posX;

            const top = new THREE.Mesh(planeGeometry, ViewportNavigatorExecutor.getPlaneMaterial(new THREE.Color('#777777')));
            top.rotation.z = Math.PI;
            top.position.set(0, 0, halfSize);
            top.userData.type = Orientation.posZ;

            const bottom = new THREE.Mesh(planeGeometry, ViewportNavigatorExecutor.getPlaneMaterial(new THREE.Color('#777777')));
            bottom.rotation.y = Math.PI;
            bottom.position.set(0, 0, -halfSize);
            bottom.userData.type = Orientation.negZ;

            this.add(box);
            this.add(front, back, left, right, top, bottom);
            interactiveObjects.push(front, back, left, right, top, bottom);
        }

        AxisText: {
            const posXAxisHelper = new THREE.Sprite(ViewportNavigatorExecutor.getSpriteMaterial(color1, 'X'));
            posXAxisHelper.userData.type = Orientation.posX;
            const posYAxisHelper = new THREE.Sprite(ViewportNavigatorExecutor.getSpriteMaterial(color2, 'Y'));
            posYAxisHelper.userData.type = Orientation.posY;
            const posZAxisHelper = new THREE.Sprite(ViewportNavigatorExecutor.getSpriteMaterial(color3, 'Z'));
            posZAxisHelper.userData.type = Orientation.posZ;

            posXAxisHelper.position.set(1, -halfSize, -halfSize);
            posYAxisHelper.position.set(-halfSize, 1, -halfSize);
            posZAxisHelper.position.set(-halfSize, -halfSize, 1);

            this.add(posXAxisHelper);
            this.add(posYAxisHelper);
            this.add(posZAxisHelper);

            interactiveObjects.push(posXAxisHelper);
            interactiveObjects.push(posYAxisHelper);
            interactiveObjects.push(posZAxisHelper);
        }
        this.interactiveObjects = interactiveObjects;
    }

    private readonly mouse = new THREE.Vector2();
    private readonly raycaster = new THREE.Raycaster();

    private onMouseUp(event: PointerEvent) {
        event.stopPropagation();

        const { mouse, dim, raycaster, camera, interactiveObjects, viewport } = this;
        const rect = viewport.domElement.getBoundingClientRect();
        const offsetX = rect.left + (viewport.domElement.offsetWidth - dim);
        const offsetY = rect.top;

        mouse.x = ((event.clientX - offsetX) / dim) * 2 - 1;
        mouse.y = - ((event.clientY - offsetY) / dim) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects);
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const object = intersection.object;

            viewport.navigate(object.userData.type);
            return true;
        } else {
            return false;
        }
    };
}

export class ViewportNavigatorExecutor {
    private animating = false;

    constructor(protected readonly controls: OrbitControls) { }

    private readonly targetPosition = new THREE.Vector3();
    private readonly targetQuaternion = new THREE.Quaternion();
    private readonly q1 = new THREE.Quaternion();
    private readonly q2 = new THREE.Quaternion();
    private readonly dummy = new THREE.Object3D();
    private radius = 0;
    animateToOrientation(orientation: Orientation): ConstructionPlaneSnap {
        const { targetPosition, targetQuaternion } = this;

        let constructionPlane: ConstructionPlaneSnap;
        switch (orientation) {
            case Orientation.posX:
                targetPosition.set(1, 0, 0);
                targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0));
                constructionPlane = PlaneDatabase.YZ;
                break;
            case Orientation.posY:
                targetPosition.set(0, 1, 0);
                targetQuaternion.setFromEuler(new THREE.Euler(- Math.PI * 0.5, 0, 0));
                constructionPlane = PlaneDatabase.XZ;
                break;
            case Orientation.posZ:
                targetPosition.set(0, 0, 1);
                targetQuaternion.setFromEuler(new THREE.Euler());
                constructionPlane = PlaneDatabase.XY;
                break;
            case Orientation.negX:
                targetPosition.set(- 1, 0, 0);
                targetQuaternion.setFromEuler(new THREE.Euler(0, - Math.PI * 0.5, 0));
                constructionPlane = PlaneDatabase.YZ;
                break;
            case Orientation.negY:
                targetPosition.set(0, - 1, 0);
                targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0));
                constructionPlane = PlaneDatabase.XZ;
                break;
            case Orientation.negZ:
                targetPosition.set(0, 0, - 1);
                targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));
                constructionPlane = PlaneDatabase.XY;
                break;
        }

        this.animateToPositionAndQuaternion(targetPosition, targetQuaternion);
        return constructionPlane;
    }

    animateToPositionAndQuaternion(targetNormal: THREE.Vector3, targetQuaternion: THREE.Quaternion) {
        const { controls, q1, q2, dummy } = this;
        const { object: viewportCamera, target } = controls;

        this.radius = viewportCamera.position.distanceTo(target);
        targetNormal = targetNormal.clone().multiplyScalar(this.radius).add(target);

        dummy.position.copy(target);
        dummy.lookAt(viewportCamera.position);
        q1.copy(dummy.quaternion);

        dummy.lookAt(targetNormal);
        q2.copy(dummy.quaternion);

        this.animating = true;
    }

    update(delta: number): boolean {
        if (!this.animating) return false;

        const { controls, q1, q2, radius } = this;
        const { object: viewportCamera, target } = controls;
        const step = delta * turnRate;

        // animate position by doing a slerp and then scaling the position on the unit sphere
        q1.rotateTowards(q2, step);
        viewportCamera.position.set(0, 0, 1).applyQuaternion(q1).multiplyScalar(radius).add(target);

        if (q1.angleTo(q2) < 10e-7) {
            q1.copy(q2);
            viewportCamera.position.set(0, 0, 1).applyQuaternion(q1).multiplyScalar(radius).add(target);
            this.animating = false;
        }
        controls.update();
        return true;
    }

    static getAxisMaterial(color: THREE.Color) {
        return new THREE.MeshBasicMaterial({ color: color, toneMapped: false });
    }

    static getPlaneMaterial(color: THREE.Color) {
        const material = new THREE.MeshBasicMaterial({ color: color, toneMapped: false });
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
        material.polygonOffsetUnits = -1
        return material;
    }

    static getBoxMaterial(color: THREE.Color) {
        return new THREE.MeshBasicMaterial({ color: color, toneMapped: false });
    }

    static getSpriteMaterial(color: THREE.Color, text = "") {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;

        const context = canvas.getContext('2d')!;
        context.beginPath();
        context.arc(32, 32, 16, 0, 2 * Math.PI);
        context.closePath();
        context.fillStyle = color.getStyle();
        context.fill();

        if (text !== null) {
            context.font = '24px Arial';
            context.textAlign = 'center';
            context.fillStyle = '#000000';
            context.fillText(text, 32, 41);
        }

        const texture = new THREE.CanvasTexture(canvas);

        return new THREE.SpriteMaterial({ map: texture, toneMapped: false });
    }
}

export class ViewportNavigatorPass extends Pass {
    private readonly scene = new THREE.Scene();

    private width = 0;
    private height = 0;

    constructor(
        private readonly viewportHelper: ViewportNavigatorGizmo,
        private readonly viewportCamera: THREE.Camera
    ) {
        super();

        this.scene.add(viewportHelper);

        this.needsSwap = false;
    }

    private readonly oldViewport = new THREE.Vector4();
    render(
        renderer: THREE.WebGLRenderer,
        writeBuffer: THREE.WebGLRenderTarget,
        readBuffer: THREE.WebGLRenderTarget,
        deltaTime: number,
        maskActive: boolean,
    ) {
        const { scene, viewportCamera, viewportHelper, oldViewport } = this;
        const { dim, camera } = viewportHelper;

        let { width, height } = this;
        width /= renderer.getPixelRatio();
        height /= renderer.getPixelRatio();

        viewportHelper.quaternion.copy(viewportCamera.quaternion).invert();

        const oldAutoClear = renderer.autoClear;
        renderer.getViewport(oldViewport);

        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        renderer.clearDepth();
        renderer.autoClear = false;
        renderer.setViewport(width - dim, height - dim, dim, dim);

        try {
            renderer.render(scene, camera);
        } finally {
            renderer.autoClear = oldAutoClear;
            renderer.setViewport(oldViewport);
        }
    }

    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
}
