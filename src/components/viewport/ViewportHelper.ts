import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Pass } from "three/examples/jsm/postprocessing/Pass";

export class ViewportNavigator extends THREE.Object3D {
    readonly camera = new THREE.OrthographicCamera(- 2, 2, 2, - 2, 0, 4);
    private readonly interactiveObjects: THREE.Object3D[];

    constructor(private readonly controls: OrbitControls, private readonly container: HTMLElement, readonly dim: number) {
        super();

        this.camera.position.set(0, 0, 2);

        const panel = document.createElement('div');
        panel.setAttribute('style', `position: absolute; right: 0px; top: 0px; height: ${dim}px; width: ${dim}px`);
        panel.addEventListener('pointerup', e => this.onMouseUp(e));
        panel.addEventListener('pointerdown', e => e.stopPropagation());
        container.appendChild(panel);

        const color1 = new THREE.Color('#ff3653').convertGammaToLinear();
        const color2 = new THREE.Color('#8adb00').convertGammaToLinear();
        const color3 = new THREE.Color('#2c8fff').convertGammaToLinear();

        const geometry = new THREE.BoxGeometry(0.8, 0.05, 0.05).translate(0.4, 0, 0);

        const xAxis = new THREE.Mesh(geometry, ViewportNavigator.getAxisMaterial(color1));
        const yAxis = new THREE.Mesh(geometry, ViewportNavigator.getAxisMaterial(color2));
        const zAxis = new THREE.Mesh(geometry, ViewportNavigator.getAxisMaterial(color3));

        yAxis.rotation.z = Math.PI / 2;
        zAxis.rotation.y = - Math.PI / 2;

        this.add(xAxis);
        this.add(zAxis);
        this.add(yAxis);

        const posXAxisHelper = new THREE.Sprite(ViewportNavigator.getSpriteMaterial(color1, 'X'));
        posXAxisHelper.userData.type = 'posX';
        const posYAxisHelper = new THREE.Sprite(ViewportNavigator.getSpriteMaterial(color2, 'Y'));
        posYAxisHelper.userData.type = 'posY';
        const posZAxisHelper = new THREE.Sprite(ViewportNavigator.getSpriteMaterial(color3, 'Z'));
        posZAxisHelper.userData.type = 'posZ';
        const negXAxisHelper = new THREE.Sprite(ViewportNavigator.getSpriteMaterial(color1));
        negXAxisHelper.userData.type = 'negX';
        const negYAxisHelper = new THREE.Sprite(ViewportNavigator.getSpriteMaterial(color2));
        negYAxisHelper.userData.type = 'negY';
        const negZAxisHelper = new THREE.Sprite(ViewportNavigator.getSpriteMaterial(color3));
        negZAxisHelper.userData.type = 'negZ';

        posXAxisHelper.position.x = 1;
        posYAxisHelper.position.y = 1;
        posZAxisHelper.position.z = 1;
        negXAxisHelper.position.x = - 1;
        negXAxisHelper.scale.setScalar(0.8);
        negYAxisHelper.position.y = - 1;
        negYAxisHelper.scale.setScalar(0.8);
        negZAxisHelper.position.z = - 1;
        negZAxisHelper.scale.setScalar(0.8);

        this.add(posXAxisHelper);
        this.add(posYAxisHelper);
        this.add(posZAxisHelper);
        this.add(negXAxisHelper);
        this.add(negYAxisHelper);
        this.add(negZAxisHelper);

        const interactiveObjects = [];
        interactiveObjects.push(posXAxisHelper);
        interactiveObjects.push(posYAxisHelper);
        interactiveObjects.push(posZAxisHelper);
        interactiveObjects.push(negXAxisHelper);
        interactiveObjects.push(negYAxisHelper);
        interactiveObjects.push(negZAxisHelper);
        this.interactiveObjects = interactiveObjects;
    }

    private readonly mouse = new THREE.Vector2();
    private readonly raycaster = new THREE.Raycaster();

    private onMouseUp(event: PointerEvent) {
        event.stopPropagation();

        const { mouse, container, dim, raycaster, camera, interactiveObjects } = this;

        const rect = container.getBoundingClientRect();
        const offsetX = rect.left + (container.offsetWidth - dim);
        const offsetY = rect.top + (container.offsetHeight - dim);

        mouse.x = ((event.clientX - offsetX) / dim) * 2 - 1;
        mouse.y = - (event.clientY / dim) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects);
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const object = intersection.object;

            this.prepareAnimationData(object.userData.type);

            return true;
        } else {
            return false;
        }
    };

    private readonly targetPosition = new THREE.Vector3();
    private readonly targetQuaternion = new THREE.Quaternion();
    private readonly q1 = new THREE.Quaternion();
    private readonly q2 = new THREE.Quaternion();
    private readonly dummy = new THREE.Object3D();
    private radius = 0;
    prepareAnimationData(type: string): THREE.Vector3 {
        const { targetPosition, targetQuaternion, controls, q1, q2, dummy } = this;
        const { object: viewportCamera, target } = controls;

        switch (type) {
            case 'posX':
                targetPosition.set(1, 0, 0);
                targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0));
                break;
            case 'posY':
                targetPosition.set(0, 1, 0);
                targetQuaternion.setFromEuler(new THREE.Euler(- Math.PI * 0.5, 0, 0));
                break;
            case 'posZ':
                targetPosition.set(0, 0, 1);
                targetQuaternion.setFromEuler(new THREE.Euler());
                break;
            case 'negX':
                targetPosition.set(- 1, 0, 0);
                targetQuaternion.setFromEuler(new THREE.Euler(0, - Math.PI * 0.5, 0));
                break;
            case 'negY':
                targetPosition.set(0, - 1, 0);
                targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0));
                break;
            case 'negZ':
                targetPosition.set(0, 0, - 1);
                targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));
                break;
            default: console.error('ViewHelper: Invalid axis.');
        }

        const result = targetPosition.clone();
        this.radius = viewportCamera.position.distanceTo(target);
        targetPosition.multiplyScalar(this.radius).add(target);

        dummy.position.copy(target);
        dummy.lookAt(viewportCamera.position);
        q1.copy(dummy.quaternion);

        dummy.lookAt(targetPosition);
        q2.copy(dummy.quaternion);

        this.update();
        return result;
    }

    private update() {
        const { controls, q2 } = this;
        const { object: viewportCamera, target } = controls;

        viewportCamera.position.set(0, 0, 1).applyQuaternion(q2).multiplyScalar(this.radius).add(target);
        viewportCamera.quaternion.copy(q2);
        controls.update();
    }

    static getAxisMaterial(color: THREE.Color) {
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
        private readonly viewportHelper: ViewportNavigator,
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
