import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { Viewport } from "../Viewport";

/**
 * The GPUPicker identifies objects in 3d space pointed at by the mouse. It extracts a 32-bit
 * object id from the rendered rgba color of a picking scene. Depth is extracted from the
 * z-buffer and converted to a world space position.
 * 
 * This picker is unusual in that rather than render a 1x1 pixel scene on every mouse move,
 * we render the entire width,height scene only when the camera stops moving; then on every mouse
 * move we simple read 1 pixel from the width,height buffer. Since the scene is geometry-heavy,
 * this puts less pressure on the vertex shader and more on fragment/memory bandwidth, which
 * is (currently) a good tradeoff.
 * 
 * NOTE: Rather than using this class directly, write or use a GPUPickingAdapter, which returns
 * real objects rather than object ids and is closer to the THREE.js Raycaster interface.
 */

const depthPlane = new THREE.PlaneGeometry(2, 2);

export class GPUPicker {
    static minimumEntityId = 1;

    private readonly scene = new THREE.Scene();
    private objects: THREE.Object3D[] = [];
    readonly pickingTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
    pickingBuffer: Readonly<Uint8Array> = new Uint8Array();

    private depth = new GPUDepthReader(this.pickingTarget, this.viewport);

    // FIXME verify working
    layers = new THREE.Layers();

    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Line: { threshold: 0.1 },
        Line2: { threshold: 20 },
        Points: { threshold: 1 }
    };

    constructor(private readonly viewport: Viewport) {
        this.setNeedsRender = this.setNeedsRender.bind(this);
    }

    intersect(): { id: number, position: THREE.Vector3 } | undefined {
        const { denormalizedScreenPoint, viewport: { camera }, viewport } = this;
        let i = (denormalizedScreenPoint.x | 0) + ((denormalizedScreenPoint.y | 0) * camera.offsetWidth);

        const buffer = new Uint32Array(this.pickingBuffer.buffer);
        const id = buffer[i];
        if (id === 0 || id === undefined) return undefined;

        const position = this.depth.read(denormalizedScreenPoint, this.normalizedScreenPoint);
        return { id, position };
    }

    setSize(offsetWidth: number, offsetHeight: number) {
        this.pickingTarget.setSize(offsetWidth, offsetHeight);
        this.pickingBuffer = new Uint8Array(offsetWidth * offsetHeight * 4);

        this.depth.setSize(offsetWidth, offsetHeight);
        this.setNeedsRender();
    }

    update(scene: THREE.Object3D[]) {
        this.objects = scene;
        this.setNeedsRender();
    }

    private needsRender = true;
    setNeedsRender() { this.needsRender = true }

    render() {
        if (!this.needsRender) return;
        this.needsRender = false;

        const { viewport: { renderer, camera }, objects, scene, pickingTarget, pickingBuffer } = this;

        console.time("picking");
        this.scene.clear();
        renderer.setRenderTarget(pickingTarget);
        for (const object of objects) scene.add(object);

        scene.traverse(obj => {
            if (obj instanceof LineSegments2) {
                obj.material.resolution.set(camera.offsetWidth, camera.offsetHeight);
            }
        })
        
        renderer.render(scene, camera);
        this.depth.render();

        renderer.readRenderTargetPixels(pickingTarget, 0, 0, camera.offsetWidth, camera.offsetHeight, pickingBuffer);
        console.timeEnd("picking");
    }

    show() {
        const { viewport: { renderer, camera }, objects, scene } = this;
        renderer.setRenderTarget(null);
        for (const object of objects) scene.add(object);
        renderer.render(scene, camera);
    }

    private readonly normalizedScreenPoint = new THREE.Vector2();
    private readonly denormalizedScreenPoint = new THREE.Vector2();
    setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.normalizedScreenPoint.copy(normalizedScreenPoint);
        this.viewport.denormalizeScreenPosition(this.denormalizedScreenPoint.copy(normalizedScreenPoint));
    }
}

class GPUDepthReader {
    readonly depthTarget = new THREE.WebGLRenderTarget(1, 1);
    private readonly depthScene = new THREE.Scene();
    private readonly depthCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    depthBuffer: Readonly<Uint8Array> = new Uint8Array();
    depthMaterial = new THREE.ShaderMaterial({
        vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragmentShader: `
        #include <packing>

        varying vec2 vUv;
        uniform sampler2D tDepth;
        uniform float cameraNear;
        uniform float cameraFar;

        void main() {
            float depth;
            float fragCoordZ = texture2D( tDepth, vUv ).x;
            depth = fragCoordZ;
            gl_FragColor = packDepthToRGBA(depth); // for higher precision, spread float onto 4 bytes
        }
        `,
        uniforms: {
            cameraNear: { value: null },
            cameraFar: { value: null },
            isOrthographic: { value: null },
            tDepth: { value: null }
        }
    });
    private readonly depthQuad = new THREE.Mesh(depthPlane, this.depthMaterial);

    constructor(private readonly pickingTarget: THREE.WebGLRenderTarget, private readonly viewport: Viewport) {
        this.depthScene.add(this.depthQuad);
    }

    setSize(offsetWidth: number, offsetHeight: number) {
        this.depthTarget.setSize(offsetWidth, offsetHeight);
        this.depthBuffer = new Uint8Array(offsetWidth * offsetHeight * 4);
        const depthTexture = new THREE.DepthTexture(offsetWidth, offsetHeight);
        this.pickingTarget.depthTexture = depthTexture;
    }

    render() {
        const { viewport: { renderer, camera }, depthMaterial, depthTarget, depthCamera, depthScene, pickingTarget, depthBuffer } = this;
        depthMaterial.uniforms.cameraNear.value = camera.near;
        depthMaterial.uniforms.cameraFar.value = camera.far;
        depthMaterial.uniforms.isOrthographic.value = camera.isOrthographicCamera;
        depthMaterial.uniforms.tDepth.value = pickingTarget.depthTexture;
        renderer.setRenderTarget(depthTarget);
        renderer.render(depthScene, depthCamera);

        renderer.readRenderTargetPixels(depthTarget, 0, 0, camera.offsetWidth, camera.offsetHeight, depthBuffer);
    }

    private readonly positionh = new THREE.Vector4();
    private readonly unpackDepth = new THREE.Vector4()
    read(denormalizedScreenPoint: THREE.Vector2, normalizedScreenPoint: THREE.Vector2): THREE.Vector3 {
        const { viewport: { camera }, positionh, unpackDepth } = this;
        let i = (denormalizedScreenPoint.x | 0) + ((denormalizedScreenPoint.y | 0) * camera.offsetWidth);

        // depth from shader a float [0,1] packed over 4 bytes, each [0,255].
        unpackDepth.fromArray(this.depthBuffer.slice(i * 4, i * 4 + 4));
        unpackDepth.divideScalar(255);
        const ndc_z = unpackDepth.dot(UnpackFactors) * 2 - 1;

        // unproject in homogeneous coordinates, cf https://stackoverflow.com/questions/11277501/how-to-recover-view-space-position-given-view-space-depth-value-and-ndc-xy/46118945#46118945
        camera.updateProjectionMatrix(); // ensure up-to-date
        positionh.set(normalizedScreenPoint.x, normalizedScreenPoint.y, ndc_z, 1);
        positionh.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);

        // for perspective, unhomogenize
        const position = new THREE.Vector3(positionh.x, positionh.height, positionh.z).divideScalar(positionh.w);
        
        return position;
    }
}

const UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)
const PackFactors = new THREE.Vector3(256. * 256. * 256., 256. * 256., 256.);
const UnpackFactors = new THREE.Vector4(1 / PackFactors.x, 1 / PackFactors.y, 1 / PackFactors.z, 1)
UnpackFactors.multiplyScalar(UnpackDownscale);
