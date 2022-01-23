import { SelectionMemento } from "../editor/History";
import { ControlPoint, Curve3D, CurveEdge, Face, Item, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../visual_model/VisualModel";
import { ModifiesSelection, Selectable } from "./SelectionDatabase";

export class SelectionProxy implements ModifiesSelection {
    constructor(protected readonly selection: ModifiesSelection) { }

    add(items: Item | Item[] | TopologyItem[]) {
        this.selection.add(items);
    }
    remove(selectables: Selectable[]) {
        this.selection.remove(selectables);
    }
    removeFace(object: Face) {
        this.selection.removeFace(object);
    }
    addFace(object: Face) {
        this.selection.addFace(object);
    }
    removeRegion(object: PlaneInstance<Region>) {
        this.selection.removeRegion(object);
    }
    addRegion(object: PlaneInstance<Region>) {
        this.selection.addRegion(object);
    }
    removeEdge(object: CurveEdge) {
        this.selection.removeEdge(object);
    }
    addEdge(object: CurveEdge) {
        this.selection.addEdge(object);
    }
    removeSolid(solid: Solid) {
        this.selection.removeSolid(solid);
    }
    addSolid(solid: Solid) {
        this.selection.addSolid(solid);
    }
    removeCurve(curve: SpaceInstance<Curve3D>) {
        this.selection.removeCurve(curve);
    }
    addCurve(curve: SpaceInstance<Curve3D>) {
        this.selection.addCurve(curve);
    }
    removeControlPoint(index: ControlPoint) {
        this.selection.removeControlPoint(index);
    }
    addControlPoint(index: ControlPoint) {
        this.selection.addControlPoint(index);
    }
    removeAll() {
        this.selection.removeAll();
    }
    saveToMemento(): SelectionMemento {
        return this.selection.saveToMemento();
    }

    get solids() { return this.selection.solids }
    get edges() { return this.selection.edges }
    get faces() { return this.selection.faces }
    get regions() { return this.selection.regions }
    get curves() { return this.selection.curves }
    get controlPoints() { return this.selection.controlPoints }
    hasSelectedChildren(solid: Solid | SpaceInstance<Curve3D>): boolean {
        return this.selection.hasSelectedChildren(solid);
    }
    deselectChildren(solid: Solid | SpaceInstance<Curve3D>) {
        this.selection.deselectChildren(solid);
    }
    get solidIds() { return this.selection.solidIds }
    get edgeIds() { return this.selection.edgeIds }
    get faceIds() { return this.selection.faceIds }
    get regionIds() { return this.selection.regionIds }
    get curveIds() { return this.selection.curveIds }
    get controlPointIds() { return this.selection.controlPointIds }
}