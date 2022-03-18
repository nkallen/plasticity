import { CompositeDisposable } from "event-kit";
import * as THREE from "three";
import { PointPickerModel } from "../../command/point-picker/PointPickerModel";
import { Viewport } from "../../components/viewport/Viewport";
import { DatabaseLike } from "../DatabaseLike";
import { PointPickerSnapPickerStrategy } from "./PointPickerSnapPickerStrategy";
import { PointSnap } from "./Snap";
import { SnapManagerGeometryCache } from "./SnapManagerGeometryCache";
import { defaultIntersectParams, defaultNearbyParams, RaycasterParams, SnapPicker, SnapResult } from "./SnapPicker";

export class PointPickerSnapPicker {
    readonly disposable = new CompositeDisposable();
    private readonly strategy = new PointPickerSnapPickerStrategy(this.intersectParams, this.nearbyParams);
    private readonly picker = new SnapPicker(this.raycaster, this.strategy);

    constructor(
        private readonly intersectParams: RaycasterParams = defaultIntersectParams,
        private readonly nearbyParams: THREE.RaycasterParameters = defaultNearbyParams,
        private readonly raycaster = new THREE.Raycaster()
    ) {
        this.disposable.add(this.strategy);
    }

    setFromViewport(e: MouseEvent, viewport: Viewport) {
        this.picker.setFromViewport(e, viewport);
    }

    nearby(pointPicker: PointPickerModel, snaps: SnapManagerGeometryCache, db: DatabaseLike): PointSnap[] {
        const points = this.collectPickerSnaps(pointPicker).points;
        return this.picker.nearby(points, snaps);
    }

    private collectPickerSnaps(pointPicker: PointPickerModel) {
        const { disabled, snapsForLastPickedPoint, activatedSnaps, otherAddedSnaps } = pointPicker.snaps;
        const notPoints = [
            ...snapsForLastPickedPoint.other,
            ...otherAddedSnaps.other,
            ...activatedSnaps.other
        ].filter(item => !disabled.has(item));
        const points = [
            otherAddedSnaps.cache,
            snapsForLastPickedPoint.cache,
            activatedSnaps.cache,
        ];
        return { points, notPoints };
    }

    intersect(pointPicker: PointPickerModel, snaps: SnapManagerGeometryCache, db: DatabaseLike): SnapResult[] {
        const { picker, picker: { viewport }, strategy, raycaster } = this;
        const { choice } = pointPicker;

        if (!snaps.enabled) {
            if (choice !== undefined) {
                const chosen = strategy.intersectChoice(choice, raycaster);
                return strategy.applyRestrictions(pointPicker, viewport, chosen);
            } else {
                return strategy.intersectConstructionPlane(snaps.snapToGrid, pointPicker, raycaster, viewport);
            }
        }

        const ppSnaps = this.collectPickerSnaps(pointPicker);
        const notPoints = ppSnaps.notPoints.map(s => s.snapper);
        const points = ppSnaps.points;
        const restrictionSnaps = pointPicker.restrictionSnapsFor().map(r => r.snapper);
        const preference = pointPicker.preference?.snap;

        // NOTE: the construction plane can either act just as a fallback (when its the default floor) OR
        // it can act like a real object (when the user explicity set the cplane). When "real", it needs
        // to be ranked with other snaps/intersect/raycasting in the standard way.
        const cplane = strategy.intersectConstructionPlane(snaps.snapToGrid, pointPicker, raycaster, viewport);
        const cplaneIsFallback = !viewport.preferConstructionPlane;
        const other = !cplaneIsFallback ? cplane : [];

        let intersections = picker.intersect([...notPoints, ...restrictionSnaps], points, snaps, db, other, preference);

        if (choice !== undefined) {
            const chosen = strategy.intersectChoice(choice, raycaster);
            const projected = strategy.projectIntersectionOntoChoice(choice.snap, viewport, intersections);
            const result = projected.length > 0 ? projected : chosen;
            return strategy.applyRestrictions(pointPicker, viewport, result);
        }

        if (cplaneIsFallback) intersections = intersections.concat(cplane);
        const restricted = strategy.applyRestrictions(pointPicker, viewport, intersections);

        return findAllSnapsInTheSamePlace(restricted);
    }
}

function findAllSnapsInTheSamePlace(snaps: SnapResult[]) {
    if (snaps.length === 0) return [];

    const { position: nearest } = snaps[0];
    const result = [];
    for (const snap of snaps) {
        if (Math.abs(nearest.manhattanDistanceTo(snap.position)) < 10e-5) {
            result.push(snap);
        }
    }
    return result;
}
