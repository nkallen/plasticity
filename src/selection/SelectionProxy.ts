import { ControlPoint, Curve3D, CurveEdge, Face, Item, PlaneInstance, Region, Solid, SpaceInstance } from "../visual_model/VisualModel";
import { ModifiesSelection, Selectable } from "./SelectionDatabase";

export class SelectionProxy implements ModifiesSelection {
    constructor(protected readonly selection: ModifiesSelection) { }

    add(items: Item | Item[]): void {
        this.selection.add(items);
    }
    remove(selectables: Selectable[]): void {
        this.selection.remove(selectables);
    }
    removeFace(object: Face): void {
        this.selection.removeFace(object);
    }
    addFace(object: Face): void {
        this.selection.addFace(object);
    }
    removeRegion(object: PlaneInstance<Region>): void {
        this.selection.removeRegion(object);
    }
    addRegion(object: PlaneInstance<Region>): void {
        this.selection.addRegion(object);
    }
    removeEdge(object: CurveEdge): void {
        this.selection.removeEdge(object);
    }
    addEdge(object: CurveEdge): void {
        this.selection.addEdge(object);
    }
    removeSolid(solid: Solid): void {
        this.selection.removeSolid(solid);
    }
    addSolid(solid: Solid): void {
        this.selection.addSolid(solid);
    }
    removeCurve(curve: SpaceInstance<Curve3D>): void {
        this.selection.removeCurve(curve);
    }
    addCurve(curve: SpaceInstance<Curve3D>): void {
        this.selection.addCurve(curve);
    }
    removeControlPoint(index: ControlPoint): void {
        this.selection.removeControlPoint(index);
    }
    addControlPoint(index: ControlPoint): void {
        this.selection.addControlPoint(index);
    }
    removeAll(): void {
        this.selection.removeAll();
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
    deselectChildren(solid: Solid | SpaceInstance<Curve3D>): void {
        this.selection.deselectChildren(solid);
    }
    get solidIds() { return this.selection.solidIds }
    get edgeIds() { return this.selection.edgeIds }
    get faceIds() { return this.selection.faceIds }
    get regionIds() { return this.selection.regionIds }
    get curveIds() { return this.selection.curveIds }
    get controlPointIds() { return this.selection.controlPointIds }
}