import * as THREE from "three";
import { SelectionBox } from 'three/examples/jsm/interactive/SelectionBox.js';

export class BetterSelectionBox extends SelectionBox {
//     searchChildInFrustum(frustrum: THREE.Frustum, object: THREE.Object3D) {
//         if (object instanceof BetterRaycastingPoints) {
//             const geometry = object.geometry
//             const { drawRange, attributes: { position: positionAttribute } } = geometry;
//             const { matrixWorld } = object;

//             const start = Math.max(0, drawRange.start);
//             const end = Math.min(positionAttribute.count, (drawRange.start + drawRange.count));
//             for (let i = start; i < end; i++) {
//                 _position.fromBufferAttribute(positionAttribute, i);
//                 _position.applyMatrix4(matrixWorld);
//                 if (frustrum.containsPoint(_position)) {
//                     const mesh = new BetterRaycastingPoint(i, object);
//                     this.collection.push(mesh);
//                 }
//             }
//         } else {
//             super.searchChildInFrustum(frustrum, object);
//         }
//     };
}