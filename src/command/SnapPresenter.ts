import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import { PlaneSnap, PointSnap, Snap } from "../editor/snaps/Snap";
import { Helper, Helpers } from '../util/Helpers';
import { SnapManagerGeometryCache } from "../visual_model/SnapManagerGeometryCache";
import { GizmoSnapPicker, SnapPicker, SnapResult } from '../visual_model/SnapPicker';
import { GizmoMaterialDatabase } from './GizmoMaterials';
import { Model, pointGeometry } from './PointPicker';
import { SnapIndicator } from './SnapIndicator';

export interface SnapInfo {
    snap: Snap,
    constructionPlane: PlaneSnap,
    orientation: THREE.Quaternion
    position: THREE.Vector3;
    cursorPosition: THREE.Vector3;
    cursorOrientation: THREE.Quaternion;
}

// This is a presentation or template class that contains all info needed to show "nearby" and "snap" points to the user
// There are icons, indicators, textual name explanations, etc.

export class SnapPresentation {
    static makeForPointPicker(picker: SnapPicker, viewport: Viewport, pointPicker: Model, db: DatabaseLike, snapCache: SnapManagerGeometryCache, gizmos: GizmoMaterialDatabase) {
        const { constructionPlane, isOrthoMode } = viewport;

        const nearby = picker.nearby(pointPicker, snapCache, db);
        const intersections = picker.intersect(pointPicker, snapCache, db);
        const actualConstructionPlaneGiven = pointPicker.actualConstructionPlaneGiven(constructionPlane, isOrthoMode);
        const indicators = new SnapIndicator(gizmos);

        const presentation = new SnapPresentation(nearby, intersections, actualConstructionPlaneGiven, isOrthoMode, indicators);
        return { presentation, intersections, nearby };
    }

    static makeForGizmo(picker: GizmoSnapPicker, viewport: Viewport, db: DatabaseLike, snapCache: SnapManagerGeometryCache, gizmos: GizmoMaterialDatabase) {
        const { constructionPlane, isOrthoMode } = viewport;

        const nearby = picker.nearby(snapCache, db);
        const intersections = picker.intersect(snapCache, db);
        const indicators = new SnapIndicator(gizmos);

        const presentation = new SnapPresentation(nearby, intersections, constructionPlane, isOrthoMode, indicators);
        return { presentation, intersections, nearby };
    }

    readonly helpers: THREE.Object3D[];
    readonly info?: SnapInfo;
    readonly names: string[];
    readonly nearby: Helper[];

    constructor(nearby: PointSnap[], intersections: SnapResult[], constructionPlane: PlaneSnap, isOrtho: boolean, presenter: SnapIndicator) {
        this.nearby = nearby.map(n => presenter.nearbyIndicatorFor(n));

        if (intersections.length === 0) {
            this.names = [];
            this.helpers = [];
            return;
        }

        // First match is assumed best
        const first = intersections[0];
        const indicator = presenter.snapIndicatorFor(first);

        // Collect indicators, etc. as feedback for the user
        const helpers = [];
        helpers.push(indicator);

        // And add additional helpers associated with all matching snaps
        for (const intersection of intersections) {
            const snapHelper = intersection.snap.helper;
            if (snapHelper !== undefined) helpers.push(snapHelper);
        }
        this.helpers = helpers;

        this.info = { ...first, constructionPlane };

        // Collect names of other matches to display to user
        let names = [];
        const pos = first.position;
        for (const { snap, position } of new Set(intersections)) { // FIXME: should this be a set?
            if (position.manhattanDistanceTo(pos) > 10e-6)
                continue;
            names.push(snap.name);
        }
        names = names.filter(x => x !== undefined);
        this.names = [...new Set(names as string[])].sort();
    }
}

export class PointTarget extends Helper {
    private readonly mesh = new THREE.Mesh(pointGeometry, new THREE.MeshStandardMaterial());

    constructor() {
        super();
        this.add(this.mesh);
    }
}

interface EditorLike {
    helpers: Helpers;
    signals: EditorSignals;
    viewports: Viewport[];
}

export class SnapPresenter {
    private readonly cursorHelper = new PointTarget();
    private readonly helpers = new THREE.Scene();

    constructor(private readonly editor: EditorLike) { }

    execute() {
        const { editor, cursorHelper, helpers } = this;
        const disposables = new CompositeDisposable();
        this.cursorHelper.visible = false;
        this.editor.helpers.add(this.cursorHelper);
        disposables.add(new Disposable(() => editor.helpers.remove(cursorHelper)));
        disposables.add(new Disposable(() => editor.signals.snapped.dispatch(undefined)));

        for (const viewport of editor.viewports) {
            viewport.additionalHelpers.add(helpers);
            disposables.add(new Disposable(() => viewport.additionalHelpers.delete(helpers)));
        }
        return disposables;
    }

    onPointerMove(viewport: Viewport, presentation: SnapPresentation) {
        const { editor, cursorHelper, helpers } = this;

        helpers.clear();
        const { names, helpers: newHelpers, nearby: indicators } = presentation;
        for (const i of indicators) helpers.add(i);

        const info = presentation.info;
        if (info === undefined) {
            cursorHelper.visible = false;
            editor.signals.pointPickerChanged.dispatch();
            return;
        }
        cursorHelper.visible = true;
        const { position, cursorPosition } = info;

        if (newHelpers.length > 0) helpers.add(...newHelpers);
        cursorHelper.position.copy(cursorPosition);

        editor.signals.snapped.dispatch(
            names.length > 0 ?
                { position: position.clone().project(viewport.camera), names }
                : undefined);
    }

    clear() {
        const { editor, cursorHelper, helpers } = this;
        helpers.clear();
        cursorHelper.visible = false;
        editor.signals.pointPickerChanged.dispatch();
    }
}
