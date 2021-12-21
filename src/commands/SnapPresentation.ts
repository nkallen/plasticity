import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { DatabaseLike } from '../editor/GeometryDatabase';
import { PlaneSnap, PointSnap, Snap } from "../editor/snaps/Snap";
import { SnapPresenter } from '../editor/snaps/SnapPresenter';
import { Helper } from '../util/Helpers';
import { SnapManagerGeometryCache } from "../visual_model/SnapManagerGeometryCache";
import { SnapPicker, SnapResult } from '../visual_model/SnapPicker';
import { EditorLike, Model, pointGeometry, RaycasterParams } from './PointPicker';

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
    static make(picker: SnapPicker, viewport: Viewport, pointPicker: Model, db: DatabaseLike, snapCache: SnapManagerGeometryCache, presenter: SnapPresenter) {
        const { constructionPlane, isOrthoMode: isOrtho } = viewport;

        const nearby = picker.nearby(pointPicker, snapCache, db);
        const intersections = picker.intersect(pointPicker, snapCache, db);
        const actualConstructionPlaneGiven = pointPicker.actualConstructionPlaneGiven(constructionPlane, isOrtho);

        const presentation = new SnapPresentation(nearby, intersections, actualConstructionPlaneGiven, isOrtho, presenter);
        return { presentation, snappers: intersections, nearby };
    }

    readonly helpers: THREE.Object3D[];
    readonly info?: SnapInfo;
    readonly names: string[];
    readonly nearby: Helper[];

    constructor(nearby: PointSnap[], intersections: SnapResult[], constructionPlane: PlaneSnap, isOrtho: boolean, presenter: SnapPresenter) {
        this.nearby = nearby.map(n => presenter.nearbyIndicatorFor(n));

        if (intersections.length === 0) {
            this.names = [];
            this.helpers = [];
            return;
        }

        // First match is assumed best
        const first = intersections[0];
        const { snap } = first;
        const indicator = presenter.snapIndicatorFor(first);

        // Collect indicators, etc. as feedback for the user
        const helpers = [];
        helpers.push(indicator);
        const snapHelper = snap.helper;
        if (snapHelper !== undefined)
            helpers.push(snapHelper);
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

export class SnapPresentationInteractor {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose(); }

    private readonly cursorHelper = new PointTarget();
    private readonly helpers = new THREE.Scene();

    constructor(private readonly editor: EditorLike, private readonly raycasterParams: RaycasterParams) {
    }

    execute() {
        const { editor, cursorHelper, helpers } = this;
        const disposables = new CompositeDisposable();
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
        for (const i of indicators)
            helpers.add(i);

        const info = presentation.info;
        if (info === undefined) {
            cursorHelper.visible = false;
            editor.signals.pointPickerChanged.dispatch();
            return;
        }
        cursorHelper.visible = true;
        const { position, cursorPosition } = info;

        helpers.add(...newHelpers);
        cursorHelper.position.copy(cursorPosition);

        editor.signals.snapped.dispatch(
            names.length > 0 ?
                { position: position.clone().project(viewport.camera), names }
                : undefined);
    }
}
