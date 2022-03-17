import * as THREE from "three";
import * as cmd from "../../command/Command";
import { ConstructionPlane, ConstructionPlaneSnap, FaceConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { ChangeSelectionModifier } from "../../selection/ChangeSelectionExecutor";
import * as visual from '../../visual_model/VisualModel';
import { OrbitControls } from "./OrbitControls";
import { EditorLike } from "./Viewport";
import { ViewportNavigatorExecutor } from "./ViewportNavigator";

export type NavigationTarget =
    { tag: 'orientation', cplane: ConstructionPlaneSnap }
    | { tag: 'face', target: visual.Face, cplane: FaceConstructionPlaneSnap }
    | { tag: 'region', target: visual.PlaneInstance<visual.Region>, cplane: ConstructionPlaneSnap }
    | { tag: 'cplane', cplane: ConstructionPlaneSnap | FaceConstructionPlaneSnap }

export class ViewportGeometryNavigator extends ViewportNavigatorExecutor {
    constructor(private readonly editor: EditorLike, controls: OrbitControls) { super(controls) }

    navigate(to: NavigationTarget, mode: 'keep-camera-position' | 'align-camera' = 'align-camera'): ConstructionPlane {
        const { editor, controls } = this;
        const cplane = to.cplane;
        switch (to.tag) {
            case 'face':
            case 'region':
                if (mode === 'align-camera') {
                    controls.target.copy(cplane.p);
                    this.animateToPositionAndQuaternion(cplane.n, new THREE.Quaternion());
                }
                editor.enqueue(new NavigateCommand(editor, to.target));
                return cplane;
            case 'cplane':
                const normal = cplane.n, target = cplane.p;
                if (mode === 'align-camera') {
                    controls.target.copy(target);
                    this.animateToPositionAndQuaternion(normal, new THREE.Quaternion());
                }
                return cplane;
            default:
                this.animateToPositionAndQuaternion(cplane.n, new THREE.Quaternion());
                return cplane;
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
