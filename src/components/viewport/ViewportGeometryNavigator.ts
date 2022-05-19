import * as cmd from "../../command/Command";
import { ConstructionPlane, ConstructionPlaneSnap, FaceConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { ChangeSelectionModifier } from "../../selection/ChangeSelectionExecutor";
import { Intersectable } from "../../visual_model/Intersectable";
import * as visual from '../../visual_model/VisualModel';
import { OrbitControls } from "./OrbitControls";
import { EditorLike } from "./Viewport";
import { ViewportNavigatorExecutor } from "./ViewportNavigator";

export type NavigationTarget =
    { tag: 'orientation', cplane: ConstructionPlaneSnap }
    | { tag: 'face', targets: Set<visual.Face | visual.CurveEdge>, cplane: FaceConstructionPlaneSnap }
    | { tag: 'region', target: visual.PlaneInstance<visual.Region>, cplane: ConstructionPlaneSnap }
    | { tag: 'cplane', cplane: ConstructionPlaneSnap | FaceConstructionPlaneSnap }

export class ViewportGeometryNavigator extends ViewportNavigatorExecutor {
    constructor(private readonly editor: EditorLike, controls: OrbitControls) { super(controls) }

    navigate(to: NavigationTarget, mode: 'keep-camera-position' | 'align-camera' = 'align-camera'): ConstructionPlane {
        const { editor, controls } = this;
        const cplane = to.cplane;
        switch (to.tag) {
            case 'face':
                if (mode === 'align-camera') {
                    controls.target.copy(cplane.p);
                    this.animateToPositionAndQuaternion(cplane.orientation);
                }
                editor.enqueue(new NavigateCommand(editor, to.targets));
                return cplane;
            case 'region':
                if (mode === 'align-camera') {
                    controls.target.copy(cplane.p);
                    this.animateToPositionAndQuaternion(cplane.orientation);
                }
                const set = new Set([to.target.underlying] as visual.Region[]);
                editor.enqueue(new NavigateCommand(editor, set));
                return cplane;
            case 'cplane':
                const target = cplane.p;
                if (mode === 'align-camera') {
                    controls.target.copy(target);
                    this.animateToPositionAndQuaternion(cplane.orientation);
                }
                return cplane;
            default:
                this.animateToPositionAndQuaternion(cplane.orientation);
                return cplane;
        }
    }
}

export class NavigateCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly to: ReadonlySet<Intersectable | visual.Solid>
    ) { super(editor) }

    async execute(): Promise<void> {
        this.editor.changeSelection.onBoxSelect(this.to, ChangeSelectionModifier.Remove);
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}
