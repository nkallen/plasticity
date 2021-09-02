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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.PossiblyBooleanFactory = exports.CutAndSplitFactory = exports.SplitFactory = exports.CutFactory = exports.DifferenceFactory = exports.IntersectionFactory = exports.UnionFactory = exports.BooleanFactory = void 0;
var THREE = require("three");
var c3d_node_1 = require("../../../build/Release/c3d.node");
var Conversion_1 = require("../../util/Conversion");
var ExtrudeSurfaceFactory_1 = require("../extrude/ExtrudeSurfaceFactory");
var GeometryFactory_1 = require("../GeometryFactory");
var BooleanFactory = /** @class */ (function (_super) {
    __extends(BooleanFactory, _super);
    function BooleanFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.operationType = c3d_node_1["default"].OperationType.Difference;
        _this.mergingFaces = true;
        _this.mergingEdges = true;
        _this.names = new c3d_node_1["default"].SNameMaker(c3d_node_1["default"].CreatorType.BooleanSolid, c3d_node_1["default"].ESides.SideNone, 0);
        _this._isOverlapping = false;
        return _this;
    }
    Object.defineProperty(BooleanFactory.prototype, "solid", {
        get: function () { return this._solid; },
        set: function (solid) {
            this._solid = solid;
            this.solidModel = this.db.lookup(solid);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BooleanFactory.prototype, "tools", {
        get: function () { return this._tools; },
        set: function (tools) {
            var _this = this;
            this._tools = tools;
            this.toolModels = tools.map(function (t) { return _this.db.lookup(t); });
        },
        enumerable: false,
        configurable: true
    });
    BooleanFactory.prototype.calculate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, solidModel, toolModels, names, mergingFaces, mergingEdges, flags, _b, result, notGluedSolids;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this, solidModel = _a.solidModel, toolModels = _a.toolModels, names = _a.names, mergingFaces = _a.mergingFaces, mergingEdges = _a.mergingEdges;
                        flags = new c3d_node_1["default"].MergingFlags();
                        flags.SetMergingFaces(mergingFaces);
                        flags.SetMergingEdges(mergingEdges);
                        return [4 /*yield*/, c3d_node_1["default"].ActionSolid.UnionResult_async(solidModel, c3d_node_1["default"].CopyMode.Copy, toolModels, c3d_node_1["default"].CopyMode.Copy, this.operationType, true, flags, names, false)];
                    case 1:
                        _b = _c.sent(), result = _b.result, notGluedSolids = _b.notGluedSolids;
                        this._isOverlapping = true;
                        return [2 /*return*/, result];
                }
            });
        });
    };
    Object.defineProperty(BooleanFactory.prototype, "phantoms", {
        get: function () {
            if (this.operationType === c3d_node_1["default"].OperationType.Union)
                return [];
            var material;
            if (this.operationType === c3d_node_1["default"].OperationType.Difference)
                material = phantom_red;
            else if (this.operationType === c3d_node_1["default"].OperationType.Intersect)
                material = phantom_green;
            else
                material = phantom_blue;
            var result = [];
            for (var _i = 0, _a = this.toolModels; _i < _a.length; _i++) {
                var phantom = _a[_i];
                result.push({ phantom: phantom, material: material });
            }
            if (this.operationType === c3d_node_1["default"].OperationType.Intersect)
                result.push({ phantom: this.solidModel, material: phantom_blue });
            return result;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BooleanFactory.prototype, "originalItem", {
        get: function () {
            return __spreadArrays([this.solid], this.tools);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BooleanFactory.prototype, "shouldRemoveOriginalItem", {
        get: function () {
            return this._isOverlapping;
        },
        enumerable: false,
        configurable: true
    });
    return BooleanFactory;
}(GeometryFactory_1.GeometryFactory));
exports.BooleanFactory = BooleanFactory;
var UnionFactory = /** @class */ (function (_super) {
    __extends(UnionFactory, _super);
    function UnionFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.operationType = c3d_node_1["default"].OperationType.Union;
        return _this;
    }
    return UnionFactory;
}(BooleanFactory));
exports.UnionFactory = UnionFactory;
var IntersectionFactory = /** @class */ (function (_super) {
    __extends(IntersectionFactory, _super);
    function IntersectionFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.operationType = c3d_node_1["default"].OperationType.Intersect;
        return _this;
    }
    return IntersectionFactory;
}(BooleanFactory));
exports.IntersectionFactory = IntersectionFactory;
var DifferenceFactory = /** @class */ (function (_super) {
    __extends(DifferenceFactory, _super);
    function DifferenceFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.operationType = c3d_node_1["default"].OperationType.Difference;
        return _this;
    }
    return DifferenceFactory;
}(BooleanFactory));
exports.DifferenceFactory = DifferenceFactory;
var AbstractCutFactory = /** @class */ (function (_super) {
    __extends(AbstractCutFactory, _super);
    function AbstractCutFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.mergingFaces = true;
        _this.mergingEdges = true;
        _this.prolongContour = true;
        _this.fantom = new ExtrudeSurfaceFactory_1.ExtrudeSurfaceFactory(_this.db, _this.materials, _this.signals);
        return _this;
    }
    Object.defineProperty(AbstractCutFactory.prototype, "curve", {
        set: function (inst) {
            var _a, _b;
            var instance = this.db.lookup(inst);
            var item = instance.GetSpaceItem();
            var curve3d = item.Cast(item.IsA());
            var planar = Conversion_1.curve3d2curve2d(curve3d, (_b = (_a = this.constructionPlane) === null || _a === void 0 ? void 0 : _a.placement) !== null && _b !== void 0 ? _b : new c3d_node_1["default"].Placement3D());
            if (planar === undefined)
                throw new GeometryFactory_1.ValidationError("Curve cannot be converted to planar");
            var curve2d = planar.curve, placement = planar.placement;
            this.contour = new c3d_node_1["default"].Contour([curve2d], true);
            this.placement = placement;
        },
        enumerable: false,
        configurable: true
    });
    AbstractCutFactory.prototype.computePhantom = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, contour, placement, fantom, Z, bbox, inout_max, inout_min, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this, contour = _a.contour, placement = _a.placement, fantom = _a.fantom;
                        Z = Conversion_1.vec2vec(placement.GetAxisZ());
                        bbox = new THREE.Box3().setFromObject(this.solid);
                        inout_max = Conversion_1.vec2cart(bbox.max);
                        inout_min = Conversion_1.vec2cart(bbox.min);
                        placement.GetPointInto(inout_max);
                        placement.GetPointInto(inout_min);
                        Z.multiplyScalar(Math.abs(inout_max.z) > Math.abs(inout_min.z) ? inout_max.z : inout_min.z);
                        fantom.model = new c3d_node_1["default"].PlaneCurve(placement, contour, true);
                        fantom.direction = Z;
                        _b = this;
                        return [4 /*yield*/, fantom.calculate()];
                    case 1:
                        _b._phantom = _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(AbstractCutFactory.prototype, "originalItem", {
        get: function () { return this.solid; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AbstractCutFactory.prototype, "phantoms", {
        get: function () {
            var phantom = this._phantom;
            var material = { surface: surface_red };
            return [{ phantom: phantom, material: material }];
        },
        enumerable: false,
        configurable: true
    });
    return AbstractCutFactory;
}(GeometryFactory_1.GeometryFactory));
var CutFactory = /** @class */ (function (_super) {
    __extends(CutFactory, _super);
    function CutFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.names = new c3d_node_1["default"].SNameMaker(c3d_node_1["default"].CreatorType.CuttingSolid, c3d_node_1["default"].ESides.SideNone, 0);
        return _this;
    }
    CutFactory.prototype.calculate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, db, contour, placement, names, solid, flags, direction, params, results;
            return __generator(this, function (_b) {
                _a = this, db = _a.db, contour = _a.contour, placement = _a.placement, names = _a.names;
                solid = db.lookup(this.solid);
                flags = new c3d_node_1["default"].MergingFlags(true, true);
                direction = new c3d_node_1["default"].Vector3D(0, 0, 0);
                this.computePhantom();
                params = new c3d_node_1["default"].ShellCuttingParams(placement, contour, false, direction, flags, true, names);
                results = c3d_node_1["default"].ActionSolid.SolidCutting(solid, c3d_node_1["default"].CopyMode.Copy, params);
                return [2 /*return*/, __spreadArrays(results)];
            });
        });
    };
    return CutFactory;
}(AbstractCutFactory));
exports.CutFactory = CutFactory;
var SplitFactory = /** @class */ (function (_super) {
    __extends(SplitFactory, _super);
    function SplitFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.names = new c3d_node_1["default"].SNameMaker(c3d_node_1["default"].CreatorType.DraftSolid, c3d_node_1["default"].ESides.SideNone, 0);
        return _this;
    }
    Object.defineProperty(SplitFactory.prototype, "faces", {
        get: function () { return this._faces; },
        set: function (faces) {
            this._faces = faces;
            var models = [];
            for (var _i = 0, faces_1 = faces; _i < faces_1.length; _i++) {
                var face = faces_1[_i];
                models.push(this.db.lookupTopologyItem(face));
            }
            this.models = models;
            this.solid = faces[0].parentItem;
        },
        enumerable: false,
        configurable: true
    });
    SplitFactory.prototype.calculate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, db, contour, placement, names, models, solid, flags, result;
            return __generator(this, function (_b) {
                _a = this, db = _a.db, contour = _a.contour, placement = _a.placement, names = _a.names, models = _a.models;
                solid = db.lookup(this.solid);
                flags = new c3d_node_1["default"].MergingFlags(true, true);
                this.computePhantom();
                result = c3d_node_1["default"].ActionSolid.SplitSolid(solid, c3d_node_1["default"].CopyMode.Copy, placement, c3d_node_1["default"].SenseValue.BOTH, [contour], false, models, flags, names);
                return [2 /*return*/, result];
            });
        });
    };
    return SplitFactory;
}(AbstractCutFactory));
exports.SplitFactory = SplitFactory;
var CutAndSplitFactory = /** @class */ (function (_super) {
    __extends(CutAndSplitFactory, _super);
    function CutAndSplitFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.cut = new CutFactory(_this.db, _this.materials, _this.signals);
        _this.split = new SplitFactory(_this.db, _this.materials, _this.signals);
        return _this;
    }
    Object.defineProperty(CutAndSplitFactory.prototype, "faces", {
        get: function () { var _a; return (_a = this.split.faces) !== null && _a !== void 0 ? _a : []; },
        set: function (faces) { if (faces.length > 0)
            this.split.faces = faces; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CutAndSplitFactory.prototype, "solid", {
        set: function (solid) { this.cut.solid = solid; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CutAndSplitFactory.prototype, "curve", {
        set: function (curve) { this.cut.curve = curve; this.split.curve = curve; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CutAndSplitFactory.prototype, "mergingFaces", {
        set: function (mergingFaces) { this.cut.mergingFaces = mergingFaces; this.split.mergingFaces = mergingFaces; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CutAndSplitFactory.prototype, "mergingEdges", {
        set: function (mergingEdges) { this.cut.mergingEdges = mergingEdges; this.split.mergingEdges = mergingEdges; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CutAndSplitFactory.prototype, "prolongContour", {
        set: function (prolongContour) { this.cut.prolongContour = prolongContour; this.split.prolongContour = prolongContour; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CutAndSplitFactory.prototype, "constructionPlane", {
        set: function (constructionPlane) { this.cut.constructionPlane = constructionPlane; this.split.constructionPlane = constructionPlane; },
        enumerable: false,
        configurable: true
    });
    CutAndSplitFactory.prototype.calculate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, faces, cut, split;
            return __generator(this, function (_b) {
                _a = this, faces = _a.faces, cut = _a.cut, split = _a.split;
                if (faces.length === 0)
                    return [2 /*return*/, cut.calculate()];
                else
                    return [2 /*return*/, split.calculate()];
                return [2 /*return*/];
            });
        });
    };
    Object.defineProperty(CutAndSplitFactory.prototype, "phantoms", {
        get: function () {
            var _a = this, faces = _a.faces, cut = _a.cut, split = _a.split;
            if (faces.length === 0)
                return cut.phantoms;
            else
                return split.phantoms;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CutAndSplitFactory.prototype, "originalItem", {
        get: function () {
            var _a = this, faces = _a.faces, cut = _a.cut, split = _a.split;
            if (faces.length === 0)
                return cut.originalItem;
            else
                return split.originalItem;
        },
        enumerable: false,
        configurable: true
    });
    return CutAndSplitFactory;
}(GeometryFactory_1.GeometryFactory));
exports.CutAndSplitFactory = CutAndSplitFactory;
var PossiblyBooleanFactory = /** @class */ (function (_super) {
    __extends(PossiblyBooleanFactory, _super);
    function PossiblyBooleanFactory() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.newBody = false;
        _this._isOverlapping = false;
        return _this;
    }
    Object.defineProperty(PossiblyBooleanFactory.prototype, "operationType", {
        get: function () { return this.bool.operationType; },
        set: function (operationType) { this.bool.operationType = operationType; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PossiblyBooleanFactory.prototype, "solid", {
        get: function () { return this._solid; },
        set: function (solid) {
            this._solid = solid;
            if (solid !== undefined) {
                this.bool.solid = solid;
                this.model = this.db.lookup(solid);
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PossiblyBooleanFactory.prototype, "isOverlapping", {
        get: function () { return this._isOverlapping; },
        enumerable: false,
        configurable: true
    });
    PossiblyBooleanFactory.prototype.precomputeGeometry = function () {
        return __awaiter(this, void 0, void 0, function () {
            var phantom;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.fantom.calculate()];
                    case 1:
                        phantom = _a.sent();
                        this._phantom = phantom;
                        if (this.solid === undefined) {
                            this._isOverlapping = false;
                        }
                        else {
                            this._isOverlapping = c3d_node_1["default"].Action.IsSolidsIntersection(this.model, phantom, new c3d_node_1["default"].SNameMaker(-1, c3d_node_1["default"].ESides.SideNone, 0));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    PossiblyBooleanFactory.prototype.calculate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.precomputeGeometry()];
                    case 1:
                        _a.sent();
                        if (!(this._isOverlapping && !this.newBody)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.bool.calculate()];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3: return [2 /*return*/, this._phantom];
                }
            });
        });
    };
    Object.defineProperty(PossiblyBooleanFactory.prototype, "phantoms", {
        get: function () {
            if (this.solid === undefined)
                return [];
            if (this.newBody)
                return [];
            if (this.operationType === c3d_node_1["default"].OperationType.Union)
                return [];
            if (!this._isOverlapping)
                return [];
            var material;
            if (this.operationType === c3d_node_1["default"].OperationType.Difference)
                material = phantom_red;
            else if (this.operationType === c3d_node_1["default"].OperationType.Intersect)
                material = phantom_green;
            else
                material = phantom_blue;
            var phantom = this._phantom;
            return [{ phantom: phantom, material: material }];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PossiblyBooleanFactory.prototype, "originalItem", {
        get: function () { return this.solid; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PossiblyBooleanFactory.prototype, "shouldRemoveOriginalItem", {
        get: function () {
            return this._isOverlapping && this.solid !== undefined && !this.newBody;
        },
        enumerable: false,
        configurable: true
    });
    return PossiblyBooleanFactory;
}(GeometryFactory_1.GeometryFactory));
exports.PossiblyBooleanFactory = PossiblyBooleanFactory;
var mesh_red = new THREE.MeshBasicMaterial();
mesh_red.color.setHex(0xff0000);
mesh_red.opacity = 0.1;
mesh_red.transparent = true;
mesh_red.fog = false;
mesh_red.polygonOffset = true;
mesh_red.polygonOffsetFactor = 0.1;
mesh_red.polygonOffsetUnits = 1;
var surface_red = mesh_red.clone();
surface_red.side = THREE.DoubleSide;
var phantom_red = {
    mesh: mesh_red
};
var mesh_green = new THREE.MeshBasicMaterial();
mesh_green.color.setHex(0x00ff00);
mesh_green.opacity = 0.1;
mesh_green.transparent = true;
mesh_green.fog = false;
mesh_green.polygonOffset = true;
mesh_green.polygonOffsetFactor = 0.1;
mesh_green.polygonOffsetUnits = 1;
var phantom_green = {
    mesh: mesh_green
};
var mesh_blue = new THREE.MeshBasicMaterial();
mesh_blue.color.setHex(0x0000ff);
mesh_blue.opacity = 0.1;
mesh_blue.transparent = true;
mesh_blue.fog = false;
mesh_blue.polygonOffset = true;
mesh_blue.polygonOffsetFactor = 0.1;
mesh_blue.polygonOffsetUnits = 1;
var phantom_blue = {
    mesh: mesh_blue
};
