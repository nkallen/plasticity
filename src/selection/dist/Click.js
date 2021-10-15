"use strict";
exports.__esModule = true;
exports.ClickStrategy = void 0;
var VisualModel_1 = require("../editor/VisualModel");
var SelectionInteraction_1 = require("./SelectionInteraction");
var ClickStrategy = /** @class */ (function () {
    function ClickStrategy(mode, selected, hovered) {
        this.mode = mode;
        this.selected = selected;
        this.hovered = hovered;
    }
    ClickStrategy.prototype.emptyIntersection = function () {
        this.selected.removeAll();
        this.hovered.removeAll();
    };
    ClickStrategy.prototype.curve3D = function (object, parentItem) {
        if (!this.mode.has(SelectionInteraction_1.SelectionMode.Curve))
            return false;
        if (this.selected.hasSelectedChildren(parentItem))
            return false;
        if (this.selected.curves.has(parentItem)) {
            this.selected.removeCurve(parentItem);
        }
        else {
            this.selected.addCurve(parentItem);
        }
        this.hovered.removeAll();
        return true;
    };
    ClickStrategy.prototype.solid = function (object, parentItem) {
        if (!this.mode.has(SelectionInteraction_1.SelectionMode.Solid))
            return false;
        if (this.selected.solids.has(parentItem)) {
            if (this.topologicalItem(object, parentItem)) {
                this.selected.removeSolid(parentItem);
                this.hovered.removeAll();
                return true;
            }
            return false;
        }
        else if (!this.selected.hasSelectedChildren(parentItem)) {
            this.selected.addSolid(parentItem);
            this.hovered.removeAll();
            return true;
        }
        return false;
    };
    ClickStrategy.prototype.topologicalItem = function (object, parentItem) {
        if (this.mode.has(SelectionInteraction_1.SelectionMode.Face) && object instanceof VisualModel_1.Face) {
            if (this.selected.faces.has(object)) {
                this.selected.removeFace(object, parentItem);
            }
            else {
                this.selected.addFace(object, parentItem);
            }
            this.hovered.removeAll();
            return true;
        }
        else if (this.mode.has(SelectionInteraction_1.SelectionMode.CurveEdge) && object instanceof VisualModel_1.CurveEdge) {
            if (this.selected.edges.has(object)) {
                this.selected.removeEdge(object, parentItem);
            }
            else {
                this.selected.addEdge(object, parentItem);
            }
            this.hovered.removeAll();
            return true;
        }
        return false;
    };
    ClickStrategy.prototype.region = function (object, parentItem) {
        if (!this.mode.has(SelectionInteraction_1.SelectionMode.Face))
            return false;
        if (this.selected.regions.has(parentItem)) {
            this.selected.removeRegion(parentItem);
        }
        else {
            this.selected.addRegion(parentItem);
        }
        this.hovered.removeAll();
        return true;
    };
    ClickStrategy.prototype.controlPoint = function (object, parentItem) {
        if (!this.mode.has(SelectionInteraction_1.SelectionMode.ControlPoint))
            return false;
        if (!this.selected.curves.has(parentItem) && !this.selected.hasSelectedChildren(parentItem))
            return false;
        if (this.selected.controlPoints.has(object)) {
            this.selected.removeControlPoint(object, parentItem);
        }
        else {
            if (this.selected.curves.has(parentItem)) {
                this.selected.removeCurve(parentItem);
            }
            this.selected.addControlPoint(object, parentItem);
        }
        this.hovered.removeAll();
        return true;
    };
    ClickStrategy.prototype.box = function (set) {
        var _a = this, hovered = _a.hovered, selected = _a.selected;
        hovered.removeAll();
        for (var _i = 0, set_1 = set; _i < set_1.length; _i++) {
            var object = set_1[_i];
            if (object instanceof VisualModel_1.Face || object instanceof VisualModel_1.CurveEdge) {
                var parentItem = object.parentItem;
                if (this.mode.has(SelectionInteraction_1.SelectionMode.Solid) && !selected.hasSelectedChildren(parentItem)) {
                    selected.addSolid(parentItem);
                }
                else if (object instanceof VisualModel_1.Face) {
                    if (!this.mode.has(SelectionInteraction_1.SelectionMode.Face))
                        continue;
                    selected.addFace(object, object.parentItem);
                }
                else if (object instanceof VisualModel_1.CurveEdge) {
                    if (!this.mode.has(SelectionInteraction_1.SelectionMode.CurveEdge))
                        continue;
                    selected.addEdge(object, object.parentItem);
                }
            }
            else if (object instanceof VisualModel_1.Curve3D) {
                if (!this.mode.has(SelectionInteraction_1.SelectionMode.Curve))
                    continue;
                selected.addCurve(object.parentItem);
            }
            else if (object instanceof VisualModel_1.ControlPoint) {
                if (!this.mode.has(SelectionInteraction_1.SelectionMode.ControlPoint))
                    continue;
                selected.addControlPoint(object, object.parentItem);
            }
            else if (object instanceof VisualModel_1.Region) {
                if (!this.mode.has(SelectionInteraction_1.SelectionMode.Face))
                    continue;
                selected.addRegion(object.parentItem);
            }
        }
    };
    return ClickStrategy;
}());
exports.ClickStrategy = ClickStrategy;
