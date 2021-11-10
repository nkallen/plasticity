import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EditorSignals } from "../../editor/EditorSignals";
import { DatabaseLike } from "../../editor/GeometryDatabase";
import * as intersectable from "../../editor/Intersectable";
import { AxisSnap, CurveEdgeSnap, CurveSnap, FaceSnap, PointSnap, Snap } from "../../editor/snaps/Snap";
import { SnapManager, SnapResult } from "../../editor/snaps/SnapManager";
import * as visual from "../../editor/VisualModel";
import { inst2curve } from "../../util/Conversion";
import { Viewport } from "./Viewport";

export class GPUPicker {
    static minimumEntityId = 1;

    private readonly scene = new THREE.Scene();
    private objects: THREE.Object3D[] = [];
    readonly pickingTarget = new THREE.WebGLRenderTarget(1, 1);
    pickingBuffer: Readonly<Uint8Array> = new Uint8Array();

    layers = new THREE.Layers();

    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Line: { threshold: 0.1 },
        Line2: { threshold: 20 },
        Points: { threshold: 1 }
    };

    constructor(private readonly viewport: Viewport) {
        this.render = this.render.bind(this);
    }

    setSize(offsetWidth: number, offsetHeight: number) {
        this.pickingTarget.setSize(offsetWidth, offsetHeight);
        this.pickingBuffer = new Uint8Array(offsetWidth * offsetHeight * 4);
        this.render();
    }

    update(scene: THREE.Object3D[]) {
        this.objects = scene;
        this.render();
    }

    render() {
        const { viewport: { renderer, camera }, objects, scene, pickingTarget, pickingBuffer } = this;

        console.time();
        renderer.setRenderTarget(pickingTarget);
        for (const object of objects) scene.add(object);
        renderer.render(scene, camera);
        renderer.readRenderTargetPixels(pickingTarget, 0, 0, camera.offsetWidth, camera.offsetHeight, pickingBuffer);
        console.timeEnd();
    }

    show() {
        const { viewport: { renderer, camera }, objects, scene } = this;
        renderer.setRenderTarget(null);
        for (const object of objects) scene.add(object);
        renderer.render(scene, camera);
    }

    private readonly screenPoint = new THREE.Vector2();
    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.screenPoint.copy(screenPoint);
    }

    intersect(): { id: number, position: THREE.Vector3 } | undefined {
        const { viewport, screenPoint } = this;
        let i = (screenPoint.x | 0) + ((screenPoint.y | 0) * viewport.camera.offsetWidth);

        const buffer = new Uint32Array(this.pickingBuffer.buffer);
        const id = buffer[i];
        if (id === 0 || id === undefined) return undefined;
        return { id, position: new THREE.Vector3() };
    }

    static compactTopologyId(type: 'edge' | 'face', parentId: number, index: number): number {
        if (parentId > (1 << 16)) throw new Error("precondition failure");
        if (index > (1 << 15)) throw new Error("precondition failure");

        parentId <<= 16;
        const c = (type === 'edge' ? 0 : 1) << 7;
        const d = c | ((index >> 8) & 0xef);
        const e = ((index >> 0) & 255);

        const id = parentId | (d << 8) | e;
        return id;
    }

    static extract(compact: number) {
        const parentId = compact >> 16;
        compact &= 0xffff;
        const type = compact >> 15;
        compact &= 0x7fff;
        const index = compact;
        return { parentId, type, index };
    }

    static compact2full(compact: number): string {
        const { parentId, type, index } = this.extract(compact);
        return type === 0 ? visual.CurveEdge.simpleName(parentId, index) : visual.Face.simpleName(parentId, index);
    }
}

export class VertexColorMaterial extends THREE.ShaderMaterial {
    static mergeBufferGeometries(geos: THREE.BufferGeometry[], id: (i: number) => number) {
        const merged = BufferGeometryUtils.mergeBufferGeometries(geos, true);
        const colors = new Uint32Array(merged.index!.count);
        let offset = 0;
        for (const geo of geos) {
            const count = geo.getAttribute('position').count;
            colors.fill(id(geo.userData.index), offset, offset + count);
            offset += count;
        }
        const attribute = new THREE.Uint8BufferAttribute(new Uint8Array(colors.buffer), 4, true);
        merged.setAttribute('color', attribute);
        return merged;
    }

    constructor() {
        super({
            vertexShader: `
            attribute vec4 color;
            varying vec4 vColor;
            void main() {
                vColor = color;
                #include <begin_vertex>
                #include <project_vertex>
                #include <clipping_planes_vertex>
            }
            `,
            fragmentShader: `
            varying vec4 vColor;
            void main() {
                gl_FragColor = vColor;
            }
            `,
            side: THREE.DoubleSide,
            blending: THREE.NoBlending,
        })
    }
}

export const vertexColorMaterial = new VertexColorMaterial();

export class PointsVertexColorMaterial extends THREE.ShaderMaterial {
    static make(points: [number, THREE.Vector3][]) {
        const positions = new Float32Array(points.length * 3);
        const colors = new Uint32Array(points.length);
        for (const [i, [id, point]] of points.entries()) {
            const position = point;
            positions[i * 3 + 0] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            colors[i] = id;
        }
        console.log(positions);
        console.log(colors);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Uint8BufferAttribute(colors.buffer, 4, true));
        const material = new PointsVertexColorMaterial(20);
        return new THREE.Points(geometry, material);
    }

    constructor(size: number) {
        super({
            vertexShader: `
            uniform float size;
            attribute vec4 color;
            varying vec4 vColor;

            #include <common>
            #include <clipping_planes_pars_vertex>
            void main() {
                vColor = color;
                #include <begin_vertex>
                #include <project_vertex>
                gl_PointSize = size;
                #include <clipping_planes_vertex>
                #include <worldpos_vertex>
            }`,
            fragmentShader: `
            varying vec4 vColor;
            void main() {
                gl_FragColor = vColor;
                // gl_FragColor = vec4(1,1,1,1);
            }
            `,
            clipping: true,
            uniforms: {
                size: { value: size }
            },
            blending: THREE.NoBlending,
        })
    }
}

export class IdMaterial extends THREE.ShaderMaterial {
    constructor(id: number) {
        super({
            vertexShader: THREE.ShaderChunk.meshbasic_vert,
            fragmentShader: `
            uniform vec4 id;
            void main() {
                gl_FragColor = id;
            }
            `,
            side: THREE.FrontSide,
            blending: THREE.NoBlending,
            uniforms: {
                id: {
                    value: [
                        (id >> 24 & 255) / 255,
                        (id >> 16 & 255) / 255,
                        (id >> 8 & 255) / 255,
                        (id & 255) / 255,
                    ]
                }
            }
        });
    }
}

export class LineSegmentGeometryAddon {
    static mergePositions(positions: Float32Array[]) {
        const groups: visual.GeometryGroup[] = [];
        let arrayLength = 0;
        for (const position of positions) {
            arrayLength += (position.length - 3) * 2;
        }
        const array = new Float32Array(arrayLength);
        let offset = 0;
        for (const [i, position] of positions.entries()) {
            // converts [ x1, y1, z1,  x2, y2, z2, ... ] to pairs format
            for (let i = 0; i < position.length; i += 3) {
                array[offset + 2 * i + 0] = position[i + 0];
                array[offset + 2 * i + 1] = position[i + 1];
                array[offset + 2 * i + 2] = position[i + 2];
                array[offset + 2 * i + 3] = position[i + 3];
                array[offset + 2 * i + 4] = position[i + 4];
                array[offset + 2 * i + 5] = position[i + 5];
            }
            const length = (position.length - 3) * 2;
            groups.push({ start: offset, count: length, materialIndex: i })
            offset += length;
        }

        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(array);

        return { geometry, array, groups };
    }
}

export class LineVertexColorMaterial extends THREE.ShaderMaterial {
    static mergePositions(lines: { position: Float32Array, userData: { index: number } }[], id: (i: number) => number) {
        const { geometry, array, groups } = LineSegmentGeometryAddon.mergePositions(lines.map(l => l.position));

        const colors = new Uint32Array(array.length / 3);
        let offset = 0;
        for (const { position, userData } of lines) {
            const length = (position.length - 3) * 2 / 3;
            colors.fill(id(userData.index), offset, offset + length);
            offset += length;
        }
        const instanceColorBuffer = new THREE.InstancedInterleavedBuffer(new Uint8Array(colors.buffer), 8, 1); // rgb, rgb
        geometry.setAttribute('instanceColorStart', new THREE.InterleavedBufferAttribute(instanceColorBuffer, 4, 0)); // rgb
        geometry.setAttribute('instanceColorEnd', new THREE.InterleavedBufferAttribute(instanceColorBuffer, 4, 4)); // rgb
        geometry.userData.groups = groups;
        return geometry;
    }

    constructor() {
        super({
            vertexShader: THREE.ShaderLib['line'].vertexShader
                .replace('attribute vec3 instanceColorStart;', 'attribute vec4 instanceColorStart;')
                .replace('attribute vec3 instanceColorEnd;', 'attribute vec4 instanceColorEnd;')
                .replace('vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd', 'vColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd')
                .replace(`#ifdef USE_COLOR`, `#ifdef USE_COLOR_ALPHA`),
            fragmentShader: `
            varying vec4 vColor;
            void main() {
                gl_FragColor = vColor / 255.;
            }
            `,
            blending: THREE.NoBlending,
            uniforms: {
                ...THREE.UniformsUtils.clone(THREE.ShaderLib['line'].uniforms),
                diffuse: { value: [1, 1, 1] }, opacity: { value: 1 }, linewidth: { value: 10 }
            },
            defines: { 'USE_COLOR_ALPHA': '' },
            clipping: true,
        });
    }
}

export const vertexColorLineMaterial = new LineVertexColorMaterial();

export class SnapPicker implements Picker<SnapResult> {
    private all: Snap[] = [];
    private pickers: THREE.Object3D[] = [];

    constructor(private readonly picker: GPUPicker, private readonly snaps: SnapManager, private readonly db: DatabaseLike) {
        this.refresh();
        this.picker.update(this.pickers);
    }

    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.picker.setFromCamera(screenPoint, camera);
    }

    intersect(): SnapResult[] {
        const intersection = this.picker.intersect();
        if (intersection === undefined) return [];
        const { id, position } = intersection;

        if (0xffff0000 & id) { // parentId is in the high bits; snaps have 0
            const intersectable = GeometryPicker.get(id, this.db);
            return [{ snap: this.intersectable2snap(intersectable), position, orientation: new THREE.Quaternion }];
        } else {
            return [{ snap: this.all[id], position, orientation: new THREE.Quaternion }];
        }
    }

    private intersectable2snap(intersectable: intersectable.Intersectable): Snap {
        if (intersectable instanceof visual.Face) {
            const model = this.db.lookupTopologyItem(intersectable);
            return new FaceSnap(intersectable, model);
        } else if (intersectable instanceof visual.CurveEdge) {
            const model = this.db.lookupTopologyItem(intersectable);
            return new CurveEdgeSnap(intersectable, model);
        } else if (intersectable instanceof visual.SpaceInstance) {
            const model = this.db.lookup(intersectable);
            return new CurveSnap(intersectable, inst2curve(model)!);
        } else {
            throw new Error("invalid snap target");
        }
    }

    refresh() {
        this.all = this.snaps.all;
        console.log(this.all);

        const points: [number, THREE.Vector3][] = [];
        const axes: { position: Float32Array, userData: { index: number } }[] = [];
        const p = new THREE.Vector3;
        for (const [i, snap] of this.all.entries()) {
            if (snap instanceof PointSnap) points.push([i, snap.position]);
            else if (snap instanceof AxisSnap) {
                p.copy(snap.o).add(snap.n).multiplyScalar(100);
                const position = new Float32Array([snap.o.x, snap.o.y, snap.o.z, p.x, p.y, p.z]);
                axes.push({ position, userData: { index: i } });
            } else {
                console.error(snap.constructor.name);
                throw new Error("Invalid snap");
            }
        }
        const pointCloud = PointsVertexColorMaterial.make(points);
        const lineGeometry = LineVertexColorMaterial.mergePositions(axes, id => id);
        // @ts-expect-error
        const line = new LineSegments2(lineGeometry, vertexColorLineMaterial);

        this.pickers = [];
        this.pickers.push(pointCloud);
        this.pickers.push(line, pointCloud);
        this.pickers.push(...this.db.visibleObjects.map(o => o.picker))
    }
}

interface Picker<T> {
    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera): void;
    intersect(): T[];
}

export class GeometryPicker implements Picker<intersectable.Intersectable> {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    constructor(private readonly picker: GPUPicker, private readonly db: DatabaseLike, signals: EditorSignals) {
        this.update = this.update.bind(this);
        signals.sceneGraphChanged.add(this.update);
        signals.historyChanged.add(this.update);
        signals.commandEnded.add(this.update);
        this.disposable.add(new Disposable(() => {
            signals.sceneGraphChanged.remove(this.update);
            signals.historyChanged.remove(this.update);
            signals.commandEnded.remove(this.update);
        }));
        this.update();
    }

    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.picker.setFromCamera(screenPoint, camera);
    }

    intersect() {
        const intersection = this.picker.intersect();
        if (intersection === undefined) return [];
        else return [GeometryPicker.get(intersection.id, this.db)];
    }

    static get(id: number, db: DatabaseLike): intersectable.Intersectable {
        const { parentId } = GPUPicker.extract(id);
        const item = db.lookupItemById(parentId).view;
        if (item instanceof visual.Solid) {
            const simpleName = GPUPicker.compact2full(id)
            const data = db.lookupTopologyItemById(simpleName);
            return [...data.views][0];
        } else if (item instanceof visual.SpaceInstance) {
            return item.underlying;
        } else if (item instanceof visual.PlaneInstance) {
            return item.underlying;
        } else {
            throw new Error("invalid item");
        }
    }

    update() {
        this.picker.update(this.db.visibleObjects.map(o => o.picker));
    }
}