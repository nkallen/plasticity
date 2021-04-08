import Stats from 'stats.js';
import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import license from '../license-key.json';
import BoxFactory from './commands/box/Box';
import CurveFactory from './commands/curve/Curve';
import SphereFactory from './commands/sphere/Sphere';
import './css/index.less';
import { Editor } from './Editor';
import './Pane';
import Toolbar from './Toolbar';
import './types/c3d-enum';
import Viewport from './Viewport';
import * as visual from '../src/VisualModel';

const editor = new Editor();
const stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

editor.keymaps.add('/key/for/these/keymaps', {
    "body": {
        "escape": "command:aborted",
        "enter": "command:finished",
    }
});

c3d.Enabler.EnableMathModules(license.name, license.key);

requestAnimationFrame(function loop() {
    stats.update();
    requestAnimationFrame(loop)
});

Toolbar(editor);
Viewport(editor);

const box = new BoxFactory(editor.db, editor.materials, editor.signals);
box.p1 = new THREE.Vector3();
box.p2 = new THREE.Vector3(1, 0, 0);
box.p3 = new THREE.Vector3(1, 1, 0);
box.p4 = new THREE.Vector3(1, 1, 1);
box.commit();
const solid = editor.db.scene.children[1] as visual.Solid;

// editor.selection.onClick([{
//     distance: 1,
//     point: new THREE.Vector3(),
//     object: solid.faces.children[0]
// }]);
// editor.selection.onClick([{
//     distance: 1,
//     point: new THREE.Vector3(),
//     object: solid.faces.children[0]
// }]);


const makeSphere = new SphereFactory(editor.db, editor.materials, editor.signals);
makeSphere.center = new THREE.Vector3(0.5, 0.5, 1.25);
makeSphere.radius = 0.5;
makeSphere.commit();

const makeCurve = new CurveFactory(editor.db, editor.materials, editor.signals);
makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
makeCurve.points.push(new THREE.Vector3(0, 2, 0.5));
makeCurve.points.push(new THREE.Vector3(2, 2, 0));
makeCurve.commit();