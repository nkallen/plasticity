import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { Settings } from "../../startup/ConfigFiles";
import { pointerEvent2keyboardEvent } from "./KeyboardEventManager";
import { ProxyCamera } from "./ProxyCamera";

const twoPI = 2 * Math.PI;

const changeEvent = { type: 'change' };
const startEvent = { type: 'start' };
const endEvent = { type: 'end' };

type State = { tag: 'none' } | { tag: 'rotate', started: boolean } | { tag: 'dolly', started: boolean } | { tag: 'pan', started: boolean } | { tag: 'touch-rotate', started: boolean } | { tag: 'touch-dolly-pan', started: boolean } | { tag: 'touch-pan', started: boolean } | { tag: 'touch-dolly-rotate', started: boolean }

export class OrbitControls extends THREE.EventDispatcher {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    private state: State = { tag: 'none' };

    // current position in spherical coordinates
    private readonly spherical = new THREE.Spherical();
    private readonly sphericalDelta = new THREE.Spherical();

    private scale = 1;
    private zoomChanged = false;
    private readonly panOffset = new THREE.Vector3();

    private _enabled = true;
    get enabled() { return this._enabled }
    enable(enabled: boolean) {
        this._enabled = enabled;
        return new Disposable(() => this._enabled = !enabled);
    }

    readonly target = new THREE.Vector3();

    zoomSpeed = this.settings.zoomSpeed;
    rotateSpeed = this.settings.rotateSpeed;
    panSpeed = this.settings.panSpeed;

    minDistance = 0.1;
    maxDistance = 1000;
    minZoom = 0.001;
    maxZoom = 10;
    minPolarAngle = 0;
    maxPolarAngle = Math.PI;
    minAzimuthAngle = -Infinity;
    maxAzimuthAngle = Infinity;

    enableZoom = true;
    enableRotate = true;
    enablePan = true;

    private readonly mouseButtons: Record<string, string>;
    private readonly touches: Record<string, string>;

    private readonly target0 = this.target.clone();
    private readonly position0 = this.object.position.clone();
    private zoom0 = this.object.zoom;

    constructor(
        readonly object: ProxyCamera,
        private readonly domElement: HTMLElement,
        private readonly keymaps: AtomKeymap.KeymapManager,
        private readonly settings: Settings['OrbitControls'],
    ) {
        super();
        domElement.style.touchAction = 'none';

        let bindings = keymaps.getKeyBindings();
        MouseButtons: {
            bindings = bindings.filter(b => b.selector == 'orbit-controls');
            const r = bindings.filter(b => b.command == 'orbit:rotate').sort((a, b) => a.compare(b))[0];
            const p = bindings.filter(b => b.command == 'orbit:pan').sort((a, b) => a.compare(b))[0];
            const d = bindings.filter(b => b.command == 'orbit:dolly').sort((a, b) => a.compare(b))[0];
            const mouseButtons: Record<string, string> = {};
            if (r !== undefined) mouseButtons[r.keystrokes] = r.command;
            if (p !== undefined) mouseButtons[p.keystrokes] = p.command;
            if (d !== undefined) mouseButtons[d.keystrokes] = d.command;
            this.mouseButtons = mouseButtons;
        }
        Touches: {
            this.touches = { 1: 'orbit:rotate', 2: 'orbit:dolly-pan' };
        }

        this.onContextMenu = this.onContextMenu.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerCancel = this.onPointerCancel.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.update();
    }

    addEventListeners() {
        const domElement = this.domElement;

        domElement.addEventListener('contextmenu', this.onContextMenu);
        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointercancel', this.onPointerCancel);
        domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });

        this.disposable.add(new Disposable(() => {
            domElement.removeEventListener('contextmenu', this.onContextMenu);
            domElement.removeEventListener('pointerdown', this.onPointerDown);
            domElement.removeEventListener('pointercancel', this.onPointerCancel);
            domElement.removeEventListener('wheel', this.onMouseWheel);
        }))
    }

    saveState() {
        this.target0.copy(this.target);
        this.position0.copy(this.object.position);
        this.zoom0 = this.object.zoom;
    }

    reset() {
        this.target.copy(this.target0);
        this.object.position.copy(this.position0);
        this.object.zoom = this.zoom0;

        this.object.updateProjectionMatrix();
        this.dispatchEvent(changeEvent);

        this.update();
        this.state = { tag: 'none' };
    }

    private readonly box = new THREE.Box3();
    private readonly sphere = new THREE.Sphere();
    private readonly size = new THREE.Vector3();
    private lastFingerprint = "";
    focus(targets: FocusableObject[], everything: THREE.Object3D[]) {
        if (this.fingerprint(targets) == this.lastFingerprint) {
            this.lastFingerprint = this._focus(everything);
        } else {
            this.lastFingerprint = (targets.length > 0) ? this._focus(targets) : this._focus(everything);
        }
    }

    private _focus(targets: FocusableObject[]) {
        const { box, object, target, spherical, minZoom, maxZoom, sphere } = this;
        box.makeEmpty();
        for (const target of targets) {
            if (target instanceof THREE.Object3D) box.expandByObject(target);
            else box.union(target.getBoundingBox())
        }
        if (box.isEmpty()) {
            this.reset();
            return "";
        }
        box.getCenter(target);
        box.getBoundingSphere(sphere);

        const fitHeightDistance = sphere.radius / Math.sin((object.getEffectiveFOV() / 2) * Math.PI / 180);
        const fitWidthDistance = sphere.radius / Math.sin((object.getEffectiveFOV() * object.aspect / 2) * Math.PI / 180);
        const distance = Math.max(fitHeightDistance, fitWidthDistance);
        this.scale = distance / spherical.radius;

        const fitWidthZoom = (object.right - object.left) / sphere.radius / 2;
        const fitHeightZoom = (object.top - object.bottom) / sphere.radius / 2;
        const zoom = Math.min(fitHeightZoom, fitWidthZoom);
        object.zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
        object.updateProjectionMatrix();
        this.zoomChanged = true;

        this.update();
        return this.fingerprint(targets);
    }

    private fingerprint(targets: { uuid: string }[]) {
        const uuids = targets.map(t => t.uuid).join(',');
        const target = this.target.toArray().join(',');
        const offset = this.panOffset.toArray().join(',');
        const result = uuids + ':' + target + ':' + this.object.zoom + ':' + offset;
        return result;
    }

    private readonly offset = new THREE.Vector3();
    // so camera.up is the orbit axis
    private readonly quat = new THREE.Quaternion().setFromUnitVectors(this.object.up, new THREE.Vector3(0, 1, 0));
    private readonly quatInverse = this.quat.clone().invert();
    private readonly lastPosition = new THREE.Vector3();
    private readonly lastQuaternion = new THREE.Quaternion();
    update() {
        const { object: camera, target, offset, spherical, sphericalDelta, quat, quatInverse, lastPosition, lastQuaternion, minAzimuthAngle, maxAzimuthAngle, minPolarAngle, maxPolarAngle, minDistance, maxDistance, scale, panOffset, zoomChanged } = this;

        offset.copy(camera.position).sub(target);

        // rotate offset to "y-axis-is-up" space
        offset.applyQuaternion(quat);

        // angle from z-axis around y-axis
        spherical.setFromVector3(offset);
        spherical.theta += sphericalDelta.theta;
        spherical.phi += sphericalDelta.phi;

        // restrict theta to be between desired limits
        let min = minAzimuthAngle;
        let max = maxAzimuthAngle;

        if (isFinite(min) && isFinite(max)) {
            if (min < - Math.PI) min += twoPI; else if (min > Math.PI) min -= twoPI;
            if (max < - Math.PI) max += twoPI; else if (max > Math.PI) max -= twoPI;

            if (min <= max) {
                spherical.theta = Math.max(min, Math.min(max, spherical.theta));
            } else {
                spherical.theta = (spherical.theta > (min + max) / 2) ?
                    Math.max(min, spherical.theta) :
                    Math.min(max, spherical.theta);
            }
        }

        // restrict phi to be between desired limits
        spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));

        spherical.makeSafe();
        spherical.radius *= scale;

        // restrict radius to be between desired limits
        spherical.radius = Math.max(minDistance, Math.min(maxDistance, spherical.radius));

        // move target to panned location
        target.add(panOffset);

        offset.setFromSpherical(spherical);

        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion(quatInverse);
        camera.position.copy(target).add(offset);
        camera.lookAt(target);
        camera.target.copy(target);

        sphericalDelta.set(0, 0, 0);
        panOffset.set(0, 0, 0);

        this.scale = 1;

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (zoomChanged ||
            lastPosition.distanceToSquared(camera.position) > 10e-6 ||
            8 * (1 - lastQuaternion.dot(camera.quaternion)) > 10e-6) {
            this.dispatchEvent(changeEvent);

            lastPosition.copy(camera.position);
            lastQuaternion.copy(camera.quaternion);
            this.zoomChanged = false;

            return true;
        }
        return false;
    }

    private readonly o = new THREE.Vector3();
    private readonly normalMatrix = new THREE.Matrix3();
    pan(delta: THREE.Vector3) {
        const { object, domElement, target, o, normalMatrix, panOffset } = this;
        if (object.isPerspectiveCamera) {
            o.copy(object.position).sub(target);
            let targetDistance = o.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan((object.fov / 2) * Math.PI / 180.0);

            // we use only clientHeight here so aspect ratio does not distort speed
            const factor = 2 * targetDistance / domElement.clientHeight;
            delta.x *= -factor;
            delta.y *= factor;
        } else if (this.object.isOrthographicCamera) {
            delta.x *= -(object.right - object.left) / object.zoom / domElement.clientWidth;
            delta.y *= (object.top - object.bottom) / object.zoom / domElement.clientHeight;
        }
        delta.applyMatrix3(normalMatrix.getNormalMatrix(object.matrix));
        panOffset.add(delta);
    }

    private readonly pointers: PointerEvent[] = [];
    private readonly pointerPositions = new Map<number, any>();
    onPointerDown(event: PointerEvent) {
        const { enabled, domElement, pointers } = this;
        if (enabled === false) return;

        if (pointers.length === 0) {
            domElement.setPointerCapture(event.pointerId);

            domElement.addEventListener('pointermove', this.onPointerMove);
            domElement.addEventListener('pointerup', this.onPointerUp);
        }

        this.addPointer(event);

        if (event.pointerType === 'touch') {
            this.onTouchStart(event);
        } else {
            this.onMouseDown(event);
        }
    }

    private onPointerMove(event: PointerEvent) {
        const { enabled } = this;
        if (enabled === false) return;

        if (event.pointerType === 'touch') {
            this.onTouchMove(event);
        } else {
            this.onMouseMove(event);
        }
    }

    private onPointerUp(event: PointerEvent) {
        const { enabled, domElement, pointers } = this;
        if (enabled === false) return;

        if (event.pointerType === 'touch') {
            this.onTouchEnd(event);
        } else {
            this.onMouseUp(event);
        }

        this.removePointer(event);
        if (pointers.length === 0) {
            domElement.releasePointerCapture(event.pointerId);

            domElement.removeEventListener('pointermove', this.onPointerMove);
            domElement.removeEventListener('pointerup', this.onPointerUp);
        }
    }

    private onPointerCancel(event: PointerEvent) {
        this.removePointer(event);
    }

    private onContextMenu(event: MouseEvent) {
        if (this.enabled === false) return;
        event.preventDefault();
    }

    private addPointer(event: PointerEvent) {
        this.pointers.push(event);
    }

    private removePointer(event: PointerEvent) {
        const { pointers, pointerPositions } = this;
        pointerPositions.delete(event.pointerId);

        for (let i = 0; i < pointers.length; i++) {
            if (pointers[i].pointerId == event.pointerId) {
                pointers.splice(i, 1);
                return;

            }
        }
    }

    private onMouseDown(event: PointerEvent) {
        const keyboard = pointerEvent2keyboardEvent(event);
        const keystroke = this.keymaps.keystrokeForKeyboardEvent(keyboard);
        const mouseAction = this.mouseButtons[keystroke];

        switch (mouseAction) {
            case "orbit:dolly":
                if (this.enableZoom === false) return;

                this.dollyStart.set(event.clientX, event.clientY);
                this.state = { tag: 'dolly', started: false };
                break;
            case "orbit:rotate":
                if (this.enableRotate === false) return;

                this.rotateStart.set(event.clientX, event.clientY);
                this.state = { tag: 'rotate', started: false };
                break;
            case "orbit:pan":
                if (this.enablePan === false) return;

                this.panStart.set(event.clientX, event.clientY, 0);
                this.state = { tag: 'pan', started: false };
                break;
            default:
                this.state = { tag: 'none' };
        }

        if (this.state.tag !== 'none') {
            event.preventDefault();
        }
    }

    onMouseMove(event: PointerEvent) {
        if (this.enabled === false) return;

        switch (this.state.tag) {
            case 'rotate':
                if (this.enableRotate === false) return;
                this.handleMouseMoveRotate(event);
                break;
            case 'dolly':
                if (this.enableZoom === false) return;
                this.handleMouseMoveDolly(event);
                break;
            case 'pan':
                if (this.enablePan === false) return;
                this.handleMouseMovePan(event);
                break;
        }
        if (this.state.tag != 'none' && !this.state.started) {
            this.dispatchEvent(startEvent);
            this.state.started = true;
        }
    }

    onMouseUp(event: PointerEvent) {
        this.dispatchEvent(endEvent);
        this.state = { tag: 'none' };
    }

    onMouseWheel(event: WheelEvent) {
        const { state, enabled } = this;
        if (!enabled || state.tag !== 'none') return;

        if (this.mouseButtons["pinch"] === "orbit:dolly") {
            this.onGesture(event);
        } else {
            const { enableZoom, zoomScale } = this;
            if (!enableZoom) return;
            if (event.ctrlKey || event.altKey || event.shiftKey) return;

            let deltaY = event.deltaY;
            if (deltaY === 0 && event.shiftKey && event.deltaX !== 0) deltaY = event.deltaX;

            event.preventDefault();
            this.dispatchEvent(startEvent);
            this.dolly(Math.sign(deltaY) > 0 ? 1 / zoomScale : zoomScale);
            this.update();
            this.dispatchEvent(endEvent);
        }
    }

    private onGesture(event: WheelEvent) {
        if (event.ctrlKey) {
            const { enableZoom, zoomSpeed } = this;
            if (!enableZoom) return;

            const zoom = 1 - Math.abs(event.deltaY) / 100;
            const dolly = Math.sign(event.deltaY) > 0 ? zoomSpeed / zoom : zoom / zoomSpeed;

            event.preventDefault();
            this.dispatchEvent(startEvent);
            this.dolly(dolly);
            this.update();
            this.dispatchEvent(endEvent);
        } else if (event.shiftKey) {
            const { enablePan, panDelta, panStart, panEnd } = this;
            if (!enablePan) return;
            panEnd.set(event.clientX, event.clientY, 0);
            panDelta.set(-event.deltaX, -event.deltaY, 0);
            this.pan(panDelta);
            panStart.copy(panEnd);
            this.update();
            this.dispatchEvent(endEvent);
        } else {
            const { rotateDelta, rotateSpeed, enableRotate } = this;
            if (!enableRotate) return;

            rotateDelta.set(-event.deltaX, -event.deltaY).multiplyScalar(rotateSpeed / 2);
            this.dispatchEvent(startEvent);
            this.rotate(rotateDelta);
            this.update();
            this.dispatchEvent(endEvent);
        }
    }

    onTouchStart(event: PointerEvent) {
        this.trackTouch(event);
        switch (this.touches[this.pointers.length]) {
            case 'orbit:rotate':
                if (!this.enableRotate) return;
                this.handleTouchStartRotate();
                this.state = { tag: 'touch-rotate', started: false };
                break;
            case 'orbit:dolly-pan':
                if (!this.enableZoom && !this.enablePan) return;
                this.handleTouchStartDollyPan();
                this.state = { tag: 'touch-dolly-pan', started: false };
                break;
            default:
                this.state = { tag: 'none' };
        }
    }

    onTouchMove(event: PointerEvent) {
        this.trackTouch(event);
        switch (this.state.tag) {
            case 'touch-rotate':
                if (this.enableRotate === false) return;
                this.handleTouchMoveRotate(event);
                this.update();
                break;
            case 'touch-pan':
                if (this.enablePan === false) return;
                this.handleTouchMovePan(event);
                this.update();
                break;
            case 'touch-dolly-pan':
                if (this.enableZoom === false && this.enablePan === false) return;
                this.handleTouchMoveDollyPan(event);
                this.update();
                break;
            case 'touch-dolly-rotate':
                if (this.enableZoom === false && this.enableRotate === false) return;
                this.handleTouchMoveDollyRotate(event);
                this.update();
                break;
            default:
                this.state = { tag: 'none' };
        }
        if (this.state.tag != 'none' && !this.state.started) {
            this.dispatchEvent(startEvent);
            this.state.started = true;
        }
    }

    onTouchEnd(event: PointerEvent) {
        // this.handleTouchEnd(event);
        this.dispatchEvent(endEvent);
        this.state = { tag: 'none' };
    }

    private readonly pointerPosition = new Map<number, THREE.Vector2>();
    private trackTouch(event: PointerEvent) {
        let position = this.pointerPositions.get(event.pointerId);
        if (position === undefined) {
            position = new THREE.Vector2();
            this.pointerPositions.set(event.pointerId, position);
        }

        position.set(event.pageX, event.pageY);
    }

    private getSecondPointerPosition(event: PointerEvent): THREE.Vector2 {
        const pointer = (event.pointerId === this.pointers[0].pointerId) ? this.pointers[1] : this.pointers[0];
        return this.pointerPositions.get(pointer.pointerId);
    }

    private handleTouchStartRotate() {
        const { pointers, rotateStart } = this;
        if (pointers.length === 1) {
            rotateStart.set(pointers[0].pageX, pointers[0].pageY);
        } else {
            const x = 0.5 * (pointers[0].pageX + pointers[1].pageX);
            const y = 0.5 * (pointers[0].pageY + pointers[1].pageY);
            rotateStart.set(x, y);
        }
    }

    private handleTouchStartPan() {
        const { pointers, panStart } = this;
        if (pointers.length === 1) {
            panStart.set(pointers[0].pageX, pointers[0].pageY, 0);
        } else {
            const x = 0.5 * (pointers[0].pageX + pointers[1].pageX);
            const y = 0.5 * (pointers[0].pageY + pointers[1].pageY);
            panStart.set(x, y, 0);
        }
    }

    private handleTouchStartDolly() {
        const { pointers, dollyStart } = this;
        const dx = pointers[0].pageX - pointers[1].pageX;
        const dy = pointers[0].pageY - pointers[1].pageY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        dollyStart.set(0, distance);
    }

    private handleTouchStartDollyPan() {
        if (this.enableZoom) this.handleTouchStartDolly();
        if (this.enablePan) this.handleTouchStartPan();
    }

    private handleTouchMoveRotate(event: PointerEvent) {
        const { pointers, rotateDelta, rotateEnd, rotateStart, domElement, rotateSpeed, sphericalDelta } = this;
        if (pointers.length == 1) {
            rotateEnd.set(event.pageX, event.pageY);
        } else {
            const position = this.getSecondPointerPosition(event);
            const x = 0.5 * (event.pageX + position.x);
            const y = 0.5 * (event.pageY + position.y);
            rotateEnd.set(x, y);
        }

        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(rotateSpeed);
        sphericalDelta.theta = -(2 * Math.PI * rotateDelta.x / domElement.clientHeight); // yes, height
        sphericalDelta.phi = -(2 * Math.PI * rotateDelta.y / domElement.clientHeight);
        rotateStart.copy(rotateEnd);
    }

    private readonly touchMovePan = new THREE.Vector3();
    private handleTouchMovePan(event: PointerEvent) {
        const { pointers, panEnd, panDelta, panStart, panSpeed, touchMovePan } = this;
        if (pointers.length === 1) {
            panEnd.set(event.pageX, event.pageY, 0);
        } else {
            const position = this.getSecondPointerPosition(event);

            const x = 0.5 * (event.pageX + position.x);
            const y = 0.5 * (event.pageY + position.y);

            panEnd.set(x, y, 0);
        }
        panDelta.subVectors(panEnd, panStart).multiplyScalar(panSpeed);

        this.pan(touchMovePan.set(panDelta.x, panDelta.y, 0));
        panStart.copy(panEnd);
    }

    private handleTouchMoveDolly(event: PointerEvent) {
        const { dollyEnd, dollyDelta, dollyStart, zoomSpeed } = this;
        const position = this.getSecondPointerPosition(event);

        const dx = event.pageX - position.x;
        const dy = event.pageY - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        dollyEnd.set(0, distance);
        dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, zoomSpeed));
        this.dolly(-dollyDelta.y);
        dollyStart.copy(dollyEnd);
    }

    private handleTouchMoveDollyPan(event: PointerEvent) {
        if (this.enableZoom) this.handleTouchMoveDolly(event);
        if (this.enablePan) this.handleTouchMovePan(event);
    }

    private handleTouchMoveDollyRotate(event: PointerEvent) {
        if (this.enableZoom) this.handleTouchMoveDolly(event);
        if (this.enableRotate) this.handleTouchMoveRotate(event);
    }

    private get zoomScale() { return Math.pow(0.95, this.zoomSpeed) }

    private dolly(dollyScale: number) {
        const { object, minZoom, maxZoom } = this;
        this.scale *= dollyScale;

        object.zoom = Math.max(minZoom, Math.min(maxZoom, object.zoom / dollyScale));
        object.updateProjectionMatrix();
        this.zoomChanged = true;
    }

    private readonly rotateStart = new THREE.Vector2();
    private readonly rotateEnd = new THREE.Vector2();
    private readonly rotateDelta = new THREE.Vector2();
    private handleMouseMoveRotate(event: PointerEvent) {
        const { rotateStart, rotateEnd, rotateDelta, domElement, sphericalDelta, rotateSpeed } = this;

        rotateEnd.set(event.clientX, event.clientY);
        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(rotateSpeed);
        this.rotate(rotateDelta);
        this.update();
    }

    private rotate(rotateDelta: THREE.Vector2) {
        const { rotateStart, rotateEnd, domElement, sphericalDelta } = this;
        const left = 2 * Math.PI * rotateDelta.x / domElement.clientHeight; // yes, height
        const up = 2 * Math.PI * rotateDelta.y / domElement.clientHeight;
        sphericalDelta.theta -= left;
        sphericalDelta.phi -= up;
        rotateStart.copy(rotateEnd);
    }

    private readonly dollyStart = new THREE.Vector2();
    private readonly dollyEnd = new THREE.Vector2();
    private readonly dollyDelta = new THREE.Vector2();
    private readonly up = new THREE.Vector2(-1, -1);
    private handleMouseMoveDolly(event: PointerEvent) {
        const { dollyStart, dollyEnd, dollyDelta, up } = this;

        dollyEnd.set(event.clientX, event.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);
        const sign = up.dot(dollyDelta);
        const scale = this.zoomScale;
        dollyStart.copy(dollyEnd);
        this.dolly(sign > 0 ? 1 / scale : scale);
        this.update();
    }

    private readonly panStart = new THREE.Vector3();
    private readonly panEnd = new THREE.Vector3();
    private readonly panDelta = new THREE.Vector3();
    private handleMouseMovePan(event: PointerEvent) {
        const { panStart, panEnd, panDelta, panSpeed } = this;
        panEnd.set(event.clientX, event.clientY, 0);
        panDelta.subVectors(panEnd, panStart).multiplyScalar(panSpeed);
        this.pan(panDelta);
        panStart.copy(panEnd);
        this.update();
    }
}

export type FocusableObject = THREE.Object3D | { uuid: string, getBoundingBox(): THREE.Box3 }