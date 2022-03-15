import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as cmd from "../../command/Command";
import { ConstructionPlane, ConstructionPlaneSnap, FaceConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { FaceSnap } from "../../editor/snaps/Snap";
import { ChangeSelectionModifier } from "../../selection/ChangeSelectionExecutor";
import { point2point, vec2vec } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { OrbitControls } from "./OrbitControls";
import { EditorLike } from "./Viewport";
import { Orientation, ViewportNavigatorExecutor } from "./ViewportNavigator";

export class ViewportGeometryNavigator extends ViewportNavigatorExecutor {
    constructor(
        private readonly editor: EditorLike,
        controls: OrbitControls,
    ) { super(controls) }

    private constructionPlane(to: visual.Face | visual.PlaneInstance<visual.Region>): ConstructionPlaneSnap {
        const { editor: { db, planes } } = this;
        if (to instanceof visual.Face) {
            const model = db.lookupTopologyItem(to);
            const placement = model.GetControlPlacement();
            model.OrientPlacement(placement);
            placement.Normalize(); // FIXME: for some reason necessary with curved faces
            const normal = vec2vec(placement.GetAxisY(), 1);
            const target = point2point(model.Point(0.5, 0.5));
            const faceSnap = new FaceSnap(to, db.lookupTopologyItem(to));
            return planes.temp(new FaceConstructionPlaneSnap(normal, target, faceSnap));
        } else if (to instanceof visual.PlaneInstance) {
            const model = db.lookup(to);
            const placement = model.GetPlacement();
            const normal = vec2vec(placement.GetAxisZ(), 1);
            const cube = new c3d.Cube();
            model.AddYourGabaritTo(cube);
            const min = point2point(cube.pmin), max = point2point(cube.pmax);
            const target = min.add(max).multiplyScalar(0.5);
            return planes.temp(new ConstructionPlaneSnap(normal, target));
        } else {
            return to;
        }
    }

    navigate(to: Orientation | visual.Face | visual.PlaneInstance<visual.Region> | ConstructionPlaneSnap, mode: 'keep-camera-position' | 'align-camera' = 'align-camera'): ConstructionPlaneSnap {
        const { editor, controls } = this;
        if (to instanceof visual.Face || to instanceof visual.PlaneInstance) {
            const constructionPlane = this.constructionPlane(to);
            if (mode === 'align-camera') {
                controls.target.copy(constructionPlane.p);
                this.animateToPositionAndQuaternion(constructionPlane.n, new THREE.Quaternion());
            }
            editor.enqueue(new NavigateCommand(editor, to));
            return constructionPlane;
        } else if (to instanceof ConstructionPlaneSnap) {
            const normal = to.n;
            const target = to.p;
            if (mode === 'align-camera') {
                controls.target.copy(target);
                this.animateToPositionAndQuaternion(normal, new THREE.Quaternion());
            }
            return to;
        } else {
            return this.animateToOrientation(to);
        }
    }
}

export class NavigateCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly to: visual.Face | visual.PlaneInstance<visual.Region>
    ) { super(editor) }

    async execute(): Promise<void> {
        const { to } = this;
        const select = (to instanceof visual.PlaneInstance) ? new Set([to.underlying]) : new Set([to]);
        this.editor.changeSelection.onBoxSelect(select, ChangeSelectionModifier.Remove);
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

