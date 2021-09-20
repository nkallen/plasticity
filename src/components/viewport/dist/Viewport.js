"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.Viewport = void 0;
var event_kit_1 = require("event-kit");
var THREE = require("three");
var OrbitControls_js_1 = require("three/examples/jsm/controls/OrbitControls.js");
var EffectComposer_js_1 = require("three/examples/jsm/postprocessing/EffectComposer.js");
var RenderPass_js_1 = require("three/examples/jsm/postprocessing/RenderPass.js");
var ShaderPass_js_1 = require("three/examples/jsm/postprocessing/ShaderPass.js");
var CopyShader_js_1 = require("three/examples/jsm/shaders/CopyShader.js");
var GammaCorrectionShader_js_1 = require("three/examples/jsm/shaders/GammaCorrectionShader.js");
var Snap_1 = require("../../editor/snaps/Snap");
var visual = require("../../editor/VisualModel");
var ViewportSelector_1 = require("../../selection/ViewportSelector");
var GridHelper_1 = require("./GridHelper");
var OutlinePass_1 = require("./OutlinePass");
var ViewportHelper_1 = require("./ViewportHelper");
var near = 0.01;
var far = 10000;
var frustumSize = 20;
var gridColor = new THREE.Color(0x666666).convertGammaToLinear();
var X = new THREE.Vector3(1, 0, 0);
var Y = new THREE.Vector3(0, 1, 0);
var Z = new THREE.Vector3(0, 0, 1);
var Viewport = /** @class */ (function () {
    function Viewport(editor, renderer, domElement, camera, constructionPlane, navigationControls) {
        var _this = this;
        this.editor = editor;
        this.renderer = renderer;
        this.domElement = domElement;
        this.camera = camera;
        this.navigationControls = navigationControls;
        this.selector = new ViewportSelector_1.ViewportSelector(this.camera, this.renderer.domElement, this.editor);
        this.disposable = new event_kit_1.CompositeDisposable();
        this.scene = new THREE.Scene();
        this.phantomsScene = new THREE.Scene();
        this.helpersScene = new THREE.Scene();
        this.navigator = new ViewportHelper_1.ViewportNavigator(this.navigationControls, this.domElement, 128);
        this.grid = new GridHelper_1.GridHelper(300, 300, gridColor, gridColor);
        this.started = false;
        this.needsRender = true;
        this.lastFrameNumber = -1;
        this.offsetWidth = 100;
        this.offsetHeight = 100;
        this.navigationState = { tag: 'none' };
        this._isOrtho = false;
        this.constructionPlane = constructionPlane;
        var rendererDomElement = this.renderer.domElement;
        rendererDomElement.addEventListener('pointermove', function (e) {
            _this.lastPointerEvent = e;
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        var size = this.renderer.getSize(new THREE.Vector2());
        var renderTarget = new THREE.WebGLMultisampleRenderTarget(size.width, size.height, { type: THREE.FloatType });
        renderTarget.samples = 8;
        EffectComposer: {
            this.composer = new EffectComposer_js_1.EffectComposer(this.renderer, renderTarget);
            this.composer.setPixelRatio(window.devicePixelRatio);
            var renderPass = new RenderPass_js_1.RenderPass(this.scene, this.camera);
            this.phantomsPass = new RenderPass_js_1.RenderPass(this.phantomsScene, this.camera);
            this.helpersPass = new RenderPass_js_1.RenderPass(this.helpersScene, this.camera);
            var copyPass = new ShaderPass_js_1.ShaderPass(CopyShader_js_1.CopyShader);
            this.phantomsPass.clear = false;
            this.phantomsPass.clearDepth = true;
            this.helpersPass.clear = false;
            this.helpersPass.clearDepth = true;
            var outlinePassSelection = new OutlinePass_1.OutlinePass(new THREE.Vector2(this.offsetWidth, this.offsetHeight), editor.db.scene, this.camera);
            outlinePassSelection.edgeStrength = 3;
            outlinePassSelection.edgeGlow = 0;
            outlinePassSelection.edgeThickness = 1;
            outlinePassSelection.visibleEdgeColor.setHex(0xfffff00);
            outlinePassSelection.hiddenEdgeColor.setHex(0xfffff00);
            outlinePassSelection.downSampleRatio = 1;
            this.outlinePassSelection = outlinePassSelection;
            var outlinePassHover = new OutlinePass_1.OutlinePass(new THREE.Vector2(this.offsetWidth, this.offsetHeight), editor.db.scene, this.camera);
            outlinePassHover.edgeStrength = 3;
            outlinePassHover.edgeGlow = 0;
            outlinePassHover.edgeThickness = 1;
            outlinePassHover.visibleEdgeColor.setHex(0xfffffff);
            outlinePassHover.hiddenEdgeColor.setHex(0xfffffff);
            outlinePassHover.downSampleRatio = 1;
            this.outlinePassHover = outlinePassHover;
            var navigatorPass = new ViewportHelper_1.ViewportNavigatorPass(this.navigator, this.camera);
            var gammaCorrection = new ShaderPass_js_1.ShaderPass(GammaCorrectionShader_js_1.GammaCorrectionShader);
            this.composer.addPass(renderPass);
            this.composer.addPass(this.outlinePassHover);
            this.composer.addPass(this.outlinePassSelection);
            this.composer.addPass(this.phantomsPass);
            this.composer.addPass(this.helpersPass);
            this.composer.addPass(navigatorPass);
            this.composer.addPass(gammaCorrection);
        }
        this.render = this.render.bind(this);
        this.setNeedsRender = this.setNeedsRender.bind(this);
        this.outlineSelection = this.outlineSelection.bind(this);
        this.outlineHover = this.outlineHover.bind(this);
        this.navigationStart = this.navigationStart.bind(this);
        this.navigationEnd = this.navigationEnd.bind(this);
        this.navigationChange = this.navigationChange.bind(this);
        this.selectionStart = this.selectionStart.bind(this);
        this.selectionEnd = this.selectionEnd.bind(this);
        this.disposable.add(this.editor.registry.add(this.domElement, {
            'viewport:front': function () { return _this.navigate(ViewportHelper_1.Orientation.negY); },
            'viewport:right': function () { return _this.navigate(ViewportHelper_1.Orientation.posX); },
            'viewport:top': function () { return _this.navigate(ViewportHelper_1.Orientation.posZ); }
        }));
        this.disposable.add(new event_kit_1.Disposable(function () {
            _this.selector.dispose();
            _this.navigationControls.dispose();
        }));
        this.scene.background = new THREE.Color(0x424242).convertGammaToLinear();
    }
    Viewport.prototype.start = function () {
        var _this = this;
        if (this.started)
            return;
        this.editor.signals.selectionChanged.add(this.outlineSelection);
        this.editor.signals.historyChanged.add(this.outlineSelection);
        this.editor.signals.objectHovered.add(this.outlineHover);
        this.editor.signals.objectUnhovered.add(this.outlineHover);
        this.editor.signals.selectionChanged.add(this.setNeedsRender);
        this.editor.signals.sceneGraphChanged.add(this.setNeedsRender);
        this.editor.signals.factoryUpdated.add(this.setNeedsRender);
        this.editor.signals.factoryCancelled.add(this.setNeedsRender);
        this.editor.signals.pointPickerChanged.add(this.setNeedsRender);
        this.editor.signals.gizmoChanged.add(this.setNeedsRender);
        this.editor.signals.objectHovered.add(this.setNeedsRender);
        this.editor.signals.objectUnhovered.add(this.setNeedsRender);
        this.editor.signals.objectAdded.add(this.setNeedsRender);
        this.editor.signals.historyChanged.add(this.setNeedsRender);
        this.editor.signals.commandEnded.add(this.setNeedsRender);
        this.editor.signals.moduleReloaded.add(this.setNeedsRender);
        this.navigationControls.addEventListener('change', this.setNeedsRender);
        this.navigationControls.addEventListener('start', this.navigationStart);
        this.selector.addEventListener('start', this.selectionStart);
        this.selector.addEventListener('end', this.selectionEnd);
        this.started = true;
        this.render(-1);
        this.disposable.add(new event_kit_1.Disposable(function () {
            _this.editor.signals.selectionChanged.remove(_this.outlineSelection);
            _this.editor.signals.historyChanged.remove(_this.outlineSelection);
            _this.editor.signals.objectHovered.remove(_this.outlineHover);
            _this.editor.signals.selectionChanged.remove(_this.setNeedsRender);
            _this.editor.signals.sceneGraphChanged.remove(_this.setNeedsRender);
            _this.editor.signals.factoryUpdated.remove(_this.setNeedsRender);
            _this.editor.signals.factoryCancelled.remove(_this.setNeedsRender);
            _this.editor.signals.pointPickerChanged.remove(_this.setNeedsRender);
            _this.editor.signals.gizmoChanged.remove(_this.setNeedsRender);
            _this.editor.signals.objectHovered.remove(_this.setNeedsRender);
            _this.editor.signals.objectUnhovered.remove(_this.setNeedsRender);
            _this.editor.signals.objectAdded.remove(_this.setNeedsRender);
            _this.editor.signals.historyChanged.remove(_this.setNeedsRender);
            _this.editor.signals.moduleReloaded.remove(_this.setNeedsRender);
            _this.navigationControls.removeEventListener('change', _this.setNeedsRender);
            _this.navigationControls.removeEventListener('start', _this.navigationStart);
            _this.selector.removeEventListener('start', _this.selectionStart);
            _this.selector.removeEventListener('end', _this.selectionEnd);
            _this.started = false;
        }));
    };
    Viewport.prototype.setNeedsRender = function () {
        this.needsRender = true;
    };
    Viewport.prototype.render = function (frameNumber) {
        if (!this.started)
            return;
        requestAnimationFrame(this.render);
        if (!this.needsRender)
            return;
        var _a = this, _b = _a.editor, db = _b.db, helpers = _b.helpers, signals = _b.signals, scene = _a.scene, phantomsScene = _a.phantomsScene, helpersScene = _a.helpersScene, composer = _a.composer, camera = _a.camera, lastFrameNumber = _a.lastFrameNumber, offsetWidth = _a.offsetWidth, offsetHeight = _a.offsetHeight, phantomsPass = _a.phantomsPass, helpersPass = _a.helpersPass, grid = _a.grid, constructionPlane = _a.constructionPlane;
        try {
            // prepare the scene, once per frame:
            if (frameNumber > lastFrameNumber) {
                db.rebuildScene();
                scene.add(helpers.axes);
                scene.add(db.scene);
                grid.quaternion.setFromUnitVectors(Y, constructionPlane.n);
                grid.update(camera);
                scene.add(grid);
                helpersScene.add(helpers.scene);
                phantomsScene.add(db.phantomObjects);
                phantomsPass.enabled = db.phantomObjects.children.length > 0;
                helpersPass.enabled = helpers.scene.children.length > 0;
            }
            var resolution = new THREE.Vector2(offsetWidth, offsetHeight);
            signals.renderPrepared.dispatch({ camera: camera, resolution: resolution });
            composer.render();
            if (frameNumber > lastFrameNumber) {
                scene.clear();
                helpersScene.clear();
                phantomsScene.clear();
            }
        }
        finally {
            this.needsRender = false;
            this.lastFrameNumber = frameNumber;
        }
    };
    Viewport.prototype.outlineSelection = function () {
        var selection = this.editor.highlighter.outlineSelection;
        var toOutline = __spreadArrays(selection).flatMap(function (item) { return item.outline; });
        this.outlinePassSelection.selectedObjects = toOutline;
    };
    Viewport.prototype.outlineHover = function () {
        var hover = this.editor.highlighter.outlineHover;
        var toOutline = __spreadArrays(hover).flatMap(function (item) { return item.outline; });
        this.outlinePassHover.selectedObjects = toOutline;
    };
    Viewport.prototype.setSize = function (offsetWidth, offsetHeight) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;
        var camera = this.camera;
        var aspect = offsetWidth / offsetHeight;
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.aspect = aspect;
        }
        else if (camera instanceof THREE.OrthographicCamera) {
            camera.left = frustumSize * aspect / -2;
            camera.right = frustumSize * aspect / 2;
        }
        else
            throw new Error("Invalid camera");
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
        this.renderer.setSize(offsetWidth, offsetHeight);
        this.composer.setSize(offsetWidth, offsetHeight);
        this.outlinePassHover.setSize(offsetWidth, offsetHeight);
        this.outlinePassSelection.setSize(offsetWidth, offsetHeight);
        this.setNeedsRender();
    };
    Viewport.prototype.disableControls = function () {
        this.selector.enabled = this.navigationControls.enabled = false;
    };
    Viewport.prototype.enableControls = function () {
        this.selector.enabled = this.navigationControls.enabled = true;
    };
    Viewport.prototype.navigationStart = function () {
        this.navigationControls.addEventListener('change', this.navigationChange);
        this.navigationControls.addEventListener('end', this.navigationEnd);
        this.navigationState = { tag: 'navigating', selectorEnabled: this.selector.enabled, quaternion: this.camera.quaternion.clone() };
        this.selector.enabled = false;
        this.editor.signals.viewportActivated.dispatch(this);
    };
    Viewport.prototype.navigationChange = function () {
        switch (this.navigationState.tag) {
            case 'navigating':
                if (!this.navigationState.quaternion.equals(this.camera.quaternion)) {
                    this._isOrtho = false;
                    this.constructionPlane = new Snap_1.PlaneSnap(Z);
                }
                this.constructionPlane.update(this.camera);
                break;
            default: throw new Error("invalid state");
        }
    };
    Viewport.prototype.navigationEnd = function () {
        switch (this.navigationState.tag) {
            case 'navigating':
                this.navigationControls.removeEventListener('change', this.navigationChange);
                this.navigationControls.removeEventListener('end', this.navigationEnd);
                this.selector.enabled = this.navigationState.selectorEnabled;
                this.navigationState = { tag: 'none' };
                break;
            default: throw new Error("invalid state");
        }
    };
    Viewport.prototype.selectionStart = function () {
        this.editor.signals.viewportActivated.dispatch(this);
    };
    Viewport.prototype.selectionEnd = function () { };
    Viewport.prototype.dispose = function () {
        this.disposable.dispose();
    };
    Object.defineProperty(Viewport.prototype, "constructionPlane", {
        get: function () { return this._constructionPlane; },
        set: function (plane) {
            this._constructionPlane = plane;
            this.setNeedsRender();
        },
        enumerable: false,
        configurable: true
    });
    Viewport.prototype.toggleConstructionPlane = function () {
        if (this.constructionPlane instanceof Snap_1.CameraPlaneSnap) {
            this.constructionPlane = new Snap_1.ConstructionPlaneSnap(new THREE.Vector3(0, 0, 1));
        }
        else {
            this.constructionPlane = new Snap_1.CameraPlaneSnap(this.camera);
        }
    };
    Viewport.prototype.navigate = function (to) {
        var n = this.navigator.prepareAnimationData(to);
        var constructionPlane = new Snap_1.PlaneSnap(n);
        this.constructionPlane = constructionPlane;
        this._isOrtho = true;
    };
    Object.defineProperty(Viewport.prototype, "isOrtho", {
        get: function () { return this._isOrtho; },
        enumerable: false,
        configurable: true
    });
    return Viewport;
}());
exports.Viewport = Viewport;
exports["default"] = (function (editor) {
    var ViewportElement = /** @class */ (function (_super) {
        __extends(ViewportElement, _super);
        function ViewportElement() {
            var _this = _super.call(this) || this;
            var renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
            _this.append(renderer.domElement);
            var view = _this.getAttribute("view");
            var orthographicCamera = new THREE.OrthographicCamera(-frustumSize / 2, frustumSize / 2, frustumSize / 2, -frustumSize / 2, 0, far);
            orthographicCamera.zoom = 3;
            var perspectiveCamera = new THREE.PerspectiveCamera(frustumSize, 1, near, far);
            var camera;
            var n;
            var enableRotate = false;
            switch (view) {
                case "3d":
                    camera = orthographicCamera;
                    camera.position.set(100, -100, 100);
                    n = Z;
                    enableRotate = true;
                    break;
                case "top":
                    camera = orthographicCamera;
                    camera.position.set(0, 0, 10);
                    n = Z;
                    break;
                case "right":
                    camera = orthographicCamera;
                    camera.position.set(10, 0, 0);
                    n = X;
                    break;
                case "front":
                default:
                    camera = orthographicCamera;
                    camera.position.set(0, 10, 0);
                    n = Y;
                    break;
            }
            camera.layers = visual.VisibleLayers;
            var navigationControls = new OrbitControls_js_1.OrbitControls(camera, renderer.domElement);
            navigationControls.enableRotate = enableRotate;
            navigationControls.mouseButtons = {
                // @ts-expect-error
                LEFT: undefined,
                MIDDLE: THREE.MOUSE.ROTATE,
                RIGHT: THREE.MOUSE.PAN
            };
            camera.up.set(0, 0, 1);
            camera.lookAt(new THREE.Vector3());
            camera.updateMatrixWorld();
            var constructionPlane = new Snap_1.PlaneSnap(n);
            _this.model = new Viewport(editor, renderer, _this, camera, constructionPlane, navigationControls);
            _this.resize = _this.resize.bind(_this);
            return _this;
        }
        ViewportElement.prototype.connectedCallback = function () {
            editor.viewports.push(this.model);
            var pane = this.parentElement;
            pane.signals.flexScaleChanged.add(this.resize);
            editor.signals.windowLoaded.add(this.resize);
            editor.signals.windowResized.add(this.resize);
            if (editor.windowLoaded)
                this.model.start();
        };
        ViewportElement.prototype.disconnectedCallback = function () {
            this.model.dispose();
        };
        ViewportElement.prototype.resize = function () {
            this.model.start();
            this.model.setSize(this.offsetWidth, this.offsetHeight);
        };
        return ViewportElement;
    }(HTMLElement));
    customElements.define('ispace-viewport', ViewportElement);
});
