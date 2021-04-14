import * as THREE from 'three';
import { PlaneSnap } from '../src/SnapManager';
import { Viewport } from '../src/Viewport';

export class FakeViewport implements Viewport {
    controlsEnabled: boolean = true;

    renderer: THREE.Renderer;
    camera = new THREE.PerspectiveCamera();
    constructionPlane: PlaneSnap;
    enableControls(): void {
        this.controlsEnabled = true;
    }
    disableControls(): void {
        this.controlsEnabled = false;
    }
    overlay: THREE.Scene;
    lastPointerEvent: PointerEvent;
}