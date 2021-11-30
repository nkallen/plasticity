import * as THREE from "three";
import { pointerEvent2keyboardEvent } from "./KeyboardEventManager";

const twoPI = 2 * Math.PI;

const changeEvent = { type: 'change' };
const startEvent = { type: 'start' };
const endEvent = { type: 'end' };

type Camera = THREE.Camera & {
    zoom: number,
    updateProjectionMatrix: () => void,
    getEffectiveFOV: () => number,
    aspect: number,
    left: number, right: number, top: number, bottom: number,
    isPerspectiveCamera: boolean,
    isOrthographicCamera: boolean,
    fov: number,
};

type State = 'none' | 'rotate' | 'dolly' | 'pan' | 'touch-rotate' | 'touch-dolly-pan' | 'touch-pan' | 'touch-dolly-rotate';

export class OrbitControls extends THREE.EventDispatcher {
    private state: State = 'none';

    // current position in spherical coordinates
    private readonly spherical = new THREE.Spherical();
    private readonly sphericalDelta = new THREE.Spherical();

    private scale = 1;
    private zoomChanged = false;
    private readonly panOffset = new THREE.Vector3();

    enabled = true;
    readonly target = new THREE.Vector3();

    zoomSpeed = 1;
    rotateSpeed = 1;
    panSpeed = 1;

    minDistance = 50;
    maxDistance = 200;
    minZoom = 0;
    maxZoom = Infinity;
    minPolarAngle = 0;
    maxPolarAngle = Math.PI;
    minAzimuthAngle = -Infinity;
    maxAzimuthAngle = Infinity;

    enableZoom = true;
    enableRotate = true;
    enablePan = true;

    mouseButtons: Record<string, string>;
    touches: Record<string, string>;

    private readonly target0 = this.target.clone();
    private readonly position0 = this.object.position.clone();
    private zoom0 = this.object.zoom;

    constructor(readonly object: Camera, private readonly domElement: HTMLElement, private readonly keymaps: AtomKeymap.KeymapManager) {
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

        domElement.addEventListener('contextmenu', this.onContextMenu);
        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointercancel', this.onPointerCancel);
        domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });

        this.update();
    }

    dispose() {
        const domElement = this.domElement;
        domElement.removeEventListener('contextmenu', this.onContextMenu);
        domElement.removeEventListener('pointerdown', this.onPointerDown);
        domElement.removeEventListener('pointercancel', this.onPointerCancel);
        domElement.removeEventListener('wheel', this.onMouseWheel);
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
        this.state = 'none';
    }

    private readonly box = new THREE.Box3();
    private readonly sphere = new THREE.Sphere();
    private readonly size = new THREE.Vector3();
    private lastFingerprint = "";
    focus(targets: THREE.Object3D[], everything: THREE.Object3D[]) {
        if (this.fingerprint(targets) == this.lastFingerprint) {
            this.lastFingerprint = this._focus(everything);
        } else {
            this.lastFingerprint = (targets.length > 0) ? this._focus(targets) : this._focus(everything);
        }
    }

    private _focus(targets: THREE.Object3D[]) {
        const { box, object, target, spherical, minZoom, maxZoom, sphere } = this;
        box.makeEmpty();
        for (const target of targets) box.expandByObject(target);
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

    private fingerprint(targets: THREE.Object3D[]) {
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
        const { object, target, offset, spherical, sphericalDelta, quat, quatInverse, lastPosition, lastQuaternion, minAzimuthAngle, maxAzimuthAngle, minPolarAngle, maxPolarAngle, minDistance, maxDistance, scale, panOffset, zoomChanged } = this;

        const position = object.position;
        offset.copy(position).sub(target);

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
        position.copy(target).add(offset);
        object.lookAt(target);

        sphericalDelta.set(0, 0, 0);
        panOffset.set(0, 0, 0);

        this.scale = 1;

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (zoomChanged ||
            lastPosition.distanceToSquared(object.position) > 10e-6 ||
            8 * (1 - lastQuaternion.dot(object.quaternion)) > 10e-6) {
            this.dispatchEvent(changeEvent);

            lastPosition.copy(object.position);
            lastQuaternion.copy(object.quaternion);
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
            const position = object.position;
            o.copy(position).sub(target);
            let targetDistance = o.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan((object.fov / 2) * Math.PI / 180.0);

            // we use only clientHeight here so aspect ratio does not distort speed
            const factor = 2 * targetDistance / domElement.clientHeight;
            delta.x *= -factor;
            delta.y *= factor;
        } else if (this.object.isOrthographicCamera) {
            delta.x *= -(object.right - object.left) / object.zoom / domElement.clientWidth;
            delta.y *= (object.top - object.bottom) / object.zoom / domElement.clientWidth;
        }
        delta.applyMatrix3(normalMatrix.getNormalMatrix(object.matrix));
        panOffset.add(delta);
    }

    private readonly pointers: PointerEvent[] = [];
    private readonly pointerPositions = new Map<number, any>();
    private onPointerDown(event: PointerEvent) {
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
                this.state = 'dolly';
                break;
            case "orbit:rotate":
                if (this.enableRotate === false) return;

                this.rotateStart.set(event.clientX, event.clientY);
                this.state = 'rotate';
                break;
            case "orbit:pan":
                if (this.enablePan === false) return;

                this.panStart.set(event.clientX, event.clientY, 0);
                this.state = 'pan';
                break;
            default:
                this.state = 'none';
        }

        if (this.state !== 'none') {
            event.preventDefault();
            this.dispatchEvent(startEvent);
        }
    }

    onMouseMove(event: PointerEvent) {
        if (this.enabled === false) return;

        switch (this.state) {
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
    }

    onMouseUp(event: PointerEvent) {
        this.dispatchEvent(endEvent);
        this.state = 'none';
    }

    onMouseWheel(event: WheelEvent) {
        const { state, enabled, enableZoom, zoomScale } = this;
        if (!enabled || !enableZoom || state !== 'none') return;

        event.preventDefault();
        this.dispatchEvent(startEvent);
        this.dolly(Math.sign(event.deltaY) > 0 ? 1 / this.zoomScale : this.zoomScale);
        this.update();
        this.dispatchEvent(endEvent);
    }

    onTouchStart(event: PointerEvent) {
        this.trackTouch(event);
        switch (this.touches[this.pointers.length]) {
            case 'orbit:rotate':
                if (!this.enableRotate) return;
                this.handleTouchStartRotate();
                this.state = 'touch-rotate';
                break;
            case 'orbit:dolly-pan':
                if (!this.enableZoom && !this.enablePan) return;
                this.handleTouchStartDollyPan();
                this.state = 'touch-dolly-pan';
                break;
            default:
                this.state = 'none';
        }

        if (this.state !== 'none') this.dispatchEvent(startEvent);
    }

    onTouchMove(event: PointerEvent) {
        this.trackTouch(event);
        switch (this.state) {
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
                this.state = 'none';
        }
    }

    onTouchEnd(event: PointerEvent) {
        // this.handleTouchEnd(event);
        this.dispatchEvent(endEvent);
        this.state = 'none';
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

    private handleTouchStartDollyRotate() {
        if (this.enableZoom) this.handleTouchStartDolly();
        if (this.enableRotate) this.handleTouchStartRotate();
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
        const element = domElement;
        const left = 2 * Math.PI * rotateDelta.x / element.clientHeight; // yes, height
        const up = 2 * Math.PI * rotateDelta.y / element.clientHeight;
        sphericalDelta.theta -= left;
        sphericalDelta.phi -= up;
        rotateStart.copy(rotateEnd);
        this.update();
    }

    private readonly dollyStart = new THREE.Vector2();
    private readonly dollyEnd = new THREE.Vector2();
    private readonly dollyDelta = new THREE.Vector2();
    private handleMouseMoveDolly(event: PointerEvent) {
        const { dollyStart, dollyEnd, dollyDelta } = this;

        dollyEnd.set(event.clientX, event.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);

        this.dolly(Math.sign(dollyDelta.y) > 0 ? 1 / this.zoomScale : this.zoomScale);

        dollyStart.copy(dollyEnd);
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