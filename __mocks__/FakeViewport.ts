import * as THREE from 'three';
import { PlaneSnap } from '../src/SnapManager';
import { Viewport } from '../src/Viewport';

const canvas = document.createElement('canvas');
// @ts-expect-error('Cannot mock DomRect')
canvas.getBoundingClientRect = () => { return { left: 0, top: 0, width: 100, height: 100 } };

export class FakeViewport extends HTMLElement implements Viewport {
    controlsEnabled = true;

    renderer = { domElement: canvas, render: (): void => { }, setSize: () => { } };
    camera = new THREE.PerspectiveCamera();
    constructionPlane: PlaneSnap;
    enableControls(): void {
        this.controlsEnabled = true;
    }
    disableControls(): void {
        this.controlsEnabled = false;
    }
    overlay: THREE.Scene;
    lastPointerEvent = new MouseEvent('pointermove') as PointerEvent;
}
customElements.define('ispace-viewport', FakeViewport);