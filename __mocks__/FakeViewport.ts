import * as THREE from 'three';
import { PlaneSnap } from '../src/editor/SnapManager';
import { Viewport } from '../src/components/viewport/Viewport';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';

const canvas = document.createElement('canvas');
// @ts-expect-error('Cannot mock DomRect')
canvas.getBoundingClientRect = () => { return { left: 0, top: 0, width: 100, height: 100 } };

export class FakeViewport extends HTMLElement implements Viewport {
    outlinePassSelection: OutlinePass;
    outlinePassHover: OutlinePass;

    start(): void {
        throw new Error('Method not implemented.');
    }
    controlsEnabled = true;

    renderer = { domElement: canvas, render: (): void => { }, setSize: () => { } };
    camera = new THREE.PerspectiveCamera();
    constructionPlane = new PlaneSnap(new THREE.Vector3(0,0,1));
    enableControls(): void {
        this.controlsEnabled = true;
    }
    disableControls(): void {
        this.controlsEnabled = false;
    }
    overlay = new THREE.Scene();
    lastPointerEvent = new MouseEvent('pointermove') as PointerEvent;
}
customElements.define('ispace-viewport', FakeViewport);