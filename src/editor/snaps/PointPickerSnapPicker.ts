import { CompositeDisposable } from "event-kit";
import * as THREE from "three";
import { PointPickerModel } from "../../command/point-picker/PointPickerModel";
import { Viewport } from "../../components/viewport/Viewport";
import { DatabaseLike } from "../DatabaseLike";
import { PointPickerSnapPickerStrategy } from "./PointPickerSnapPickerStrategy";
import { PointSnap } from "./Snap";
import { SnapManagerGeometryCache } from "./SnapManagerGeometryCache";
import { defaultIntersectParams, defaultNearbyParams, findAllSnapsInTheSamePlace, RaycasterParams, SnapPicker, SnapResult } from "./SnapPicker";

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
                return strategy.intersectConstructionPlane(false, pointPicker, raycaster, viewport);
            }
        }

        const ppSnaps = this.collectPickerSnaps(pointPicker);
        const notPoints = ppSnaps.notPoints.map(s => s.snapper);
        const points = ppSnaps.points;
        const restrictionSnaps = pointPicker.restrictionSnapsFor().map(r => r.snapper);
        let intersections = picker.intersect([...notPoints, ...restrictionSnaps], points, snaps, db, pointPicker.preference?.snap);

        if (choice !== undefined) {
            const chosen = strategy.intersectChoice(choice, raycaster);
            const projected = strategy.projectIntersectionOntoChoice(choice.snap, viewport, intersections);
            const result = projected.length > 0 ? projected : chosen;
            return strategy.applyRestrictions(pointPicker, viewport, result);
        }

        intersections = intersections.concat(strategy.intersectConstructionPlane(false, pointPicker, raycaster, viewport));
        const restricted = strategy.applyRestrictions(pointPicker, viewport, intersections);

        return findAllSnapsInTheSamePlace(restricted);
    }
}
