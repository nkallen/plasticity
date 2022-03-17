import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { Choice, PointPickerModel } from "../../command/point-picker/PointPickerModel";
import { Viewport } from "../../components/viewport/Viewport";
import * as visual from "../../visual_model/VisualModel";
import { ChoosableSnap } from "./Snap";
import { SnapManagerGeometryCache } from "./SnapManagerGeometryCache";
import { SnapResult } from "./SnapPicker";
import { SnapPickerStrategy } from "./SnapPickerStrategy";

export class PointPickerSnapPickerStrategy extends SnapPickerStrategy {
    readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose(); }

    configureNearbyRaycaster(raycaster: THREE.Raycaster, snaps: SnapManagerGeometryCache, viewport: Viewport) {
        super.configureNearbyRaycaster(raycaster, snaps, viewport);
        this.toggleFaceLayer(raycaster, viewport);
    }

    configureIntersectRaycaster(raycaster: THREE.Raycaster, snaps: SnapManagerGeometryCache, viewport: Viewport) {
        super.configureIntersectRaycaster(raycaster, snaps, viewport);
        this.toggleFaceLayer(raycaster, viewport);
    }

    intersectConstructionPlane(snapToGrid: boolean, pointPicker: PointPickerModel, raycaster: THREE.Raycaster, viewport: Viewport): SnapResult[] {
        const constructionPlane = pointPicker.actualConstructionPlaneGiven(viewport.constructionPlane, viewport.isOrthoMode);
        const intersections = raycaster.intersectObject(constructionPlane.snapper);
        if (intersections.length === 0) return [];
        const approximatePosition = intersections[0].point;
        const { position: precisePosition, orientation } = constructionPlane.project(approximatePosition, snapToGrid);
        return [{ snap: constructionPlane, position: precisePosition, cursorPosition: precisePosition, orientation, cursorOrientation: orientation }];
    }

    intersectChoice(choice: Choice, raycaster: THREE.Raycaster): [SnapResult] | [] {
        const snap = choice.snap;
        const intersection = snap.intersect(raycaster, choice.info);
        if (intersection === undefined) return [];
        const { position, orientation } = intersection;
        return [{ snap, orientation: orientation, position, cursorPosition: position, cursorOrientation: orientation }];
    }

    applyRestrictions(pointPicker: PointPickerModel, viewport: Viewport, input: SnapResult[]): SnapResult[] {
        const constructionPlane = viewport.constructionPlane;
        const restriction = pointPicker.restrictionFor(constructionPlane, viewport.isOrthoMode);
        if (restriction === undefined) return input.filter(info => constructionPlane.isCompatibleWithSnap(info.snap));

        const output = [];
        for (const info of input) {
            if (!restriction.isValid(info.position)) continue;
            const { position, orientation } = restriction.project(info.position);
            info.position = position;
            info.orientation = orientation;
            output.push(info);
        }
        return output;
    }

    projectIntersectionOntoChoice(choice: ChoosableSnap, viewport: Viewport, input: SnapResult[]): SnapResult[] {
        const valid = input.filter(info => choice.isValid(info.position));
        if (valid.length === 0) return [];
        const first = valid[0];
        valid.unshift({ ...first, snap: choice });
        return valid;
    }

    private toggleFaceLayer(raycaster: THREE.Raycaster, viewport: Viewport) {
        const { disposable } = this;
        if (viewport.isOrthoMode && viewport.isXRay) {
            raycaster.layers.disable(visual.Layers.Face);
            disposable.add(new Disposable(() => { raycaster.layers.enable(visual.Layers.Face); }));
        }
    }
}
