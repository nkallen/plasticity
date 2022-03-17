import * as THREE from "three";
import * as cmd from "../../command/Command";
import { ConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { ChangeSelectionModifier } from "../../selection/ChangeSelectionExecutor";
import * as visual from '../../visual_model/VisualModel';
import { ConstructionPlaneGenerator } from "./ConstructionPlaneGenerator";
import { OrbitControls } from "./OrbitControls";
import { EditorLike } from "./Viewport";
import { Orientation, ViewportNavigatorExecutor } from "./ViewportNavigator";

export class ViewportGeometryNavigator extends ViewportNavigatorExecutor {
    private readonly cplanes = new ConstructionPlaneGenerator(this.editor.db, this.editor.planes, this.editor.snaps);

    constructor(private readonly editor: EditorLike, controls: OrbitControls) { super(controls) }

    navigate(to: Orientation | visual.Face | visual.PlaneInstance<visual.Region> | ConstructionPlaneSnap, mode: 'keep-camera-position' | 'align-camera' = 'align-camera'): ConstructionPlaneSnap {
        const { editor, controls } = this;
        if (to instanceof visual.Face || to instanceof visual.PlaneInstance) {
            const constructionPlane = this.cplanes.constructionPlane(to);
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
            const constructionPlane = this.cplanes.constructionPlane(to);
            this.animateToPositionAndQuaternion(constructionPlane.n, new THREE.Quaternion());
            return constructionPlane;
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
