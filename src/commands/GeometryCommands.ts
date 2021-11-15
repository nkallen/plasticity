import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { AxisSnap, CurvePointSnap, CurveSnap, PointSnap } from "../editor/snaps/Snap";
import * as visual from "../editor/VisualModel";
import { Finish } from "../util/Cancellable";
import { decomposeMainName, point2point } from "../util/Conversion";
import { Mode } from "./AbstractGizmo";
import { CenterPointArcFactory, ThreePointArcFactory } from "./arc/ArcFactory";
import { ArrayFactory } from "./array/ArrayFactory";
import { RadialArrayDialog } from "./array/RadialArrayDialog";
import { BooleanDialog, CutDialog } from "./boolean/BooleanDialog";
import { CutAndSplitFactory, MovingBooleanFactory, MovingDifferenceFactory, MovingIntersectionFactory, MovingUnionFactory } from './boolean/BooleanFactory';
import { BooleanKeyboardGizmo } from "./boolean/BooleanKeyboardGizmo";
import { PossiblyBooleanCenterBoxFactory, PossiblyBooleanCornerBoxFactory, PossiblyBooleanThreePointBoxFactory } from './box/BoxFactory';
import { CharacterCurveDialog } from "./character-curve/CharacterCurveDialog";
import CharacterCurveFactory from "./character-curve/CharacterCurveFactory";
import { EditCircleDialog } from "./circle/CircleDialog";
import { CenterCircleFactory, EditCircleFactory, ThreePointCircleFactory, TwoPointCircleFactory } from './circle/CircleFactory';
import { CircleKeyboardGizmo } from "./circle/CircleKeyboardGizmo";
import Command from "./Command";
import { BridgeCurvesDialog } from "./curve/BridgeCurvesDialog";
import BridgeCurvesFactory from "./curve/BridgeCurvesFactory";
import CurveFactory, { CurveWithPreviewFactory } from "./curve/CurveFactory";
import { CurveKeyboardEvent, CurveKeyboardGizmo, LineKeyboardGizmo } from "./curve/CurveKeyboardGizmo";
import JoinCurvesFactory from "./curve/JoinCurvesFactory";
import OffsetCurveFactory from "./curve/OffsetContourFactory";
import { OffsetCurveGizmo } from "./curve/OffsetCurveGizmo";
import TrimFactory from "./curve/TrimFactory";
import { PossiblyBooleanCylinderFactory } from './cylinder/CylinderFactory';
import { CenterEllipseFactory, ThreePointEllipseFactory } from "./ellipse/EllipseFactory";
import { RevolutionDialog } from "./evolution/RevolutionDialog";
import RevolutionFactory from "./evolution/RevolutionFactory";
import { RevolutionGizmo } from "./evolution/RevolutionGizmo";
import { PossiblyBooleanExtrudeFactory } from "./extrude/ExtrudeFactory";
import { ExtrudeGizmo } from "./extrude/ExtrudeGizmo";
import { FilletDialog } from "./fillet/FilletDialog";
import { MaxFilletFactory } from './fillet/FilletFactory';
import { FilletMagnitudeGizmo, FilletSolidGizmo } from './fillet/FilletGizmo';
import { ChamferAndFilletKeyboardGizmo } from "./fillet/FilletKeyboardGizmo";
import { ValidationError } from "./GeometryFactory";
import LineFactory, { PhantomLineFactory } from './line/LineFactory';
import LoftFactory from "./loft/LoftFactory";
import { MirrorDialog } from "./mirror/MirrorDialog";
import { MirrorOrSymmetryFactory } from "./mirror/MirrorFactory";
import { MirrorGizmo } from "./mirror/MirrorGizmo";
import { MirrorKeyboardGizmo } from "./mirror/MirrorKeyboardGizmo";
import { DraftSolidFactory } from "./modifyface/DraftSolidFactory";
import { ActionFaceFactory, CreateFaceFactory, FilletFaceFactory, ModifyEdgeFactory, PurifyFaceFactory, RemoveFaceFactory } from "./modifyface/ModifyFaceFactory";
import { OffsetFaceFactory } from "./modifyface/OffsetFaceFactory";
import { OffsetFaceGizmo, RefilletGizmo } from "./modifyface/OffsetFaceGizmo";
import { ModifyContourFactory } from "./modify_contour/ModifyContourFactory";
import { ModifyContourGizmo } from "./modify_contour/ModifyContourGizmo";
import { FreestyleScaleContourPointFactory, MoveContourPointFactory, RemoveContourPointFactory, RotateContourPointFactory, ScaleContourPointFactory } from "./modify_contour/ModifyContourPointFactory";
import { MultilineDialog } from "./multiline/MultilineDialog";
import MultilineFactory from "./multiline/MultilineFactory";
import { ObjectPicker } from "./ObjectPicker";
import { PointPicker } from './PointPicker';
import { PolygonFactory } from "./polygon/PolygonFactory";
import { PolygonKeyboardGizmo } from "./polygon/PolygonKeyboardGizmo";
import { CenterRectangleFactory, CornerRectangleFactory, ThreePointRectangleFactory } from './rect/RectangleFactory';
import { PossiblyBooleanSphereFactory } from './sphere/SphereFactory';
import { SpiralFactory } from "./spiral/SpiralFactory";
import { SpiralGizmo } from "./spiral/SpiralGizmo";
import { ThinSolidDialog } from "./thin-solid/ThinSolidDialog";
import { ThinSolidFactory } from "./thin-solid/ThinSolidFactory";
import { MoveDialog } from "./translate/MoveDialog";
import { MoveGizmo } from './translate/MoveGizmo';
import { MoveKeyboardGizmo } from "./translate/MoveKeyboardGizmo";
import { ProjectingBasicScaleFactory, ProjectingFreestyleScaleFactory } from "./translate/ProjectCurveFactory";
import { RotateDialog } from "./translate/RotateDialog";
import { RotateGizmo } from './translate/RotateGizmo';
import { RotateKeyboardGizmo } from "./translate/RotateKeyboardGizmo";
import { ScaleDialog } from "./translate/ScaleDialog";
import { ScaleGizmo } from "./translate/ScaleGizmo";
import { ScaleKeyboardGizmo } from "./translate/ScaleKeyboardGizmo";
import { FreestyleScaleFactoryLike, MoveFactory, MoveFactoryLike, RotateFactory, RotateFactoryLike } from './translate/TranslateFactory';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class SphereCommand extends Command {
    async execute(): Promise<void> {
        const sphere = new PossiblyBooleanSphereFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) sphere.solid = selection.solids.first;

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        sphere.center = p1;
        pointPicker.restrictToPlaneThroughPoint(p1);

        const keyboard = new BooleanKeyboardGizmo("sphere", this.editor);
        keyboard.prepare(sphere).resource(this);

        await pointPicker.execute(({ point: p2 }) => {
            const radius = p1.distanceTo(p2);
            sphere.radius = radius;
            sphere.update();
            keyboard.toggle(sphere.isOverlapping);
        }).resource(this);

        const result = await sphere.commit() as visual.Solid;
        selection.addSolid(result);
    }
}

export class CenterCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new CenterCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point, info: { snap } } = await pointPicker.execute().resource(this);
        circle.center = point;

        const keyboard = new CircleKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    circle.toggleMode();
                    circle.update();
            }
        }).resource(this);

        pointPicker.restrictToPlaneThroughPoint(point);
        snap.addAdditionalRestrictionsTo(pointPicker, point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            circle.point = p2;
            circle.constructionPlane = constructionPlane;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);

        const next = new EditCircleCommand(this.editor);
        next.circle = result;
        this.editor.enqueue(next, false);
    }
}

class EditCircleCommand extends Command {
    circle!: visual.SpaceInstance<visual.Curve3D>;
    remember = false;

    async execute(): Promise<void> {
        const edit = new EditCircleFactory(this.editor.db, this.editor.materials, this.editor.signals);
        edit.circle = this.circle;

        const dialog = new EditCircleDialog(edit, this.editor.signals);
        await dialog.execute(params => {
            edit.update();
            dialog.render();
        }).rejectOnInterrupt().resource(this);

        const result = await edit.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class TwoPointCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new TwoPointCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const keyboard = new CircleKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    circle.toggleMode();
                    circle.update();
                    break;
            }
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        circle.p1 = point;

        pointPicker.restrictToPlaneThroughPoint(point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            circle.p2 = p2;
            circle.constructionPlane = constructionPlane;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class ThreePointCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new ThreePointCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        circle.p1 = p1;

        const { point: p2 } = await pointPicker.execute().resource(this);
        circle.p2 = p2;

        await pointPicker.execute(({ point: p3 }) => {
            circle.p3 = p3;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CenterPointArcCommand extends Command {
    async execute(): Promise<void> {
        const arc = new CenterPointArcFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        arc.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        snap.addAdditionalRestrictionsTo(pointPicker, p1);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        arc.p2 = p2;

        await pointPicker.execute(({ point: p3, info: { constructionPlane } }) => {
            arc.p3 = p3;
            arc.constructionPlane = constructionPlane;
            arc.update();
        }).resource(this);

        const result = await arc.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CenterEllipseCommand extends Command {
    async execute(): Promise<void> {
        const ellipse = new CenterEllipseFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        ellipse.center = point;

        pointPicker.restrictToPlaneThroughPoint(point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = point;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        ellipse.p2 = p2;

        await pointPicker.execute(({ point }) => {
            ellipse.p3 = point;
            ellipse.update();
        }).resource(this);

        const result = await ellipse.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class ThreePointEllipseCommand extends Command {
    async execute(): Promise<void> {
        const ellipse = new ThreePointEllipseFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        ellipse.p1 = point;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = point;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        ellipse.p2 = p2;

        await pointPicker.execute(({ point: p3 }) => {
            ellipse.p3 = p3;
            ellipse.update();
        }).resource(this);

        const result = await ellipse.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class ThreePointArcCommand extends Command {
    async execute(): Promise<void> {
        const arc = new ThreePointArcFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point } = await pointPicker.execute().resource(this);
        arc.p1 = point;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = point;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        arc.p2 = p2;

        await pointPicker.execute(({ point: p3 }) => {
            arc.p3 = p3;
            arc.update();
        }).resource(this);

        const result = await arc.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class PolygonCommand extends Command {
    async execute(): Promise<void> {
        const polygon = new PolygonFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const keyboard = new PolygonKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'add-vertex':
                    polygon.vertexCount++;
                    break;
                case 'subtract-vertex':
                    polygon.vertexCount--;
                    break;
                case 'mode':
                    polygon.toggleMode();
                    break;
            }
            polygon.update();
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point, info: { snap } } = await pointPicker.execute().resource(this);
        polygon.center = point;

        pointPicker.restrictToPlaneThroughPoint(point);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        snap.addAdditionalRestrictionsTo(pointPicker, point);

        await pointPicker.execute(({ point, info: { constructionPlane } }) => {
            polygon.constructionPlane = constructionPlane;
            polygon.p2 = point;
            polygon.update();
        }).resource(this);

        const result = await polygon.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class SpiralCommand extends Command {
    async execute(): Promise<void> {
        const spiral = new SpiralFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        spiral.p1 = p1;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        spiral.p2 = p2;

        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.restrictToPlaneThroughPoint(p2);

        await pointPicker.execute(({ point }) => {
            spiral.radius = point.distanceTo(p2);
            spiral.p3 = point;
            spiral.update();
        }).resource(this);

        const spiralGizmo = new SpiralGizmo(spiral, this.editor);
        spiralGizmo.execute(params => {
            spiral.update();
        }).resource(this);

        await this.finished;

        const result = await spiral.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        const cylinder = new PossiblyBooleanCylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) cylinder.solid = selection.solids.first;

        const circle = new CenterCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        let pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        circle.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        snap.addAdditionalRestrictionsTo(pointPicker, p1);

        const { point: p2 } = await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            circle.point = p2;
            circle.constructionPlane = constructionPlane;
            circle.update();
        }).resource(this);
        circle.cancel();

        cylinder.base = p1;
        cylinder.radius = p2;

        const keyboard = new BooleanKeyboardGizmo("cylinder", this.editor);
        keyboard.prepare(cylinder).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.addSnap(...snap.additionalSnapsFor(p1));
        pointPicker.addAxesAt(p1);
        await pointPicker.execute(({ point: p3 }) => {
            cylinder.height = p3;
            cylinder.update();
            keyboard.toggle(cylinder.isOverlapping);
        }).resource(this);

        const result = await cylinder.commit() as visual.Solid;
        selection.addSolid(result);
    }
}

export class CurveCommand extends Command {
    protected type = c3d.SpaceType.Hermit3D;
    protected get keyboard() { return new CurveKeyboardGizmo(this.editor) };

    async execute(): Promise<void> {
        this.editor.layers.showControlPoints();
        this.ensure(() => this.editor.layers.hideControlPoints());

        const makeCurve = new CurveWithPreviewFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        makeCurve.type = this.type;

        const pointPicker = new PointPicker(this.editor);
        const keyboard = this.keyboard;
        keyboard.execute((e: CurveKeyboardEvent) => {
            switch (e.tag) {
                case 'type':
                    makeCurve.type = e.type;
                    makeCurve.update();
                    break;
                case 'undo':
                    pointPicker.undo();
                    makeCurve.undo();
                    makeCurve.update();
                    break;
            }
        }).resource(this);

        while (true) {
            if (makeCurve.canBeClosed) {
                pointPicker.clearAddedSnaps();
                pointPicker.addSnap(new PointSnap("Closed", makeCurve.startPoint));
            }
            try {
                const { point, info: { snap } } = await pointPicker.execute(async ({ point, info: { snap } }) => {
                    makeCurve.preview.last = point;
                    makeCurve.preview.snap = snap;
                    if (makeCurve.preview.hasEnoughPoints) await makeCurve.preview.update();
                }).rejectOnFinish().resource(this);
                if (makeCurve.wouldBeClosed(point)) {
                    makeCurve.closed = true;
                    throw Finish;
                }
                makeCurve.push(point);
                makeCurve.snap = snap;
                makeCurve.update();
            } catch (e) {
                if (e !== Finish) throw e;
                break;
            }
        }

        makeCurve.preview.cancel();
        const result = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class LineCommand extends CurveCommand {
    protected type = c3d.SpaceType.Polyline3D;
    protected get keyboard() { return new LineKeyboardGizmo(this.editor) };
}

export class JoinCurvesCommand extends Command {
    async execute(): Promise<void> {
        const contour = new JoinCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        for (const curve of this.editor.selection.selected.curves) contour.push(curve);
        const results = await contour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        this.editor.selection.selected.addCurve(results[0]);
    }
}

export class ThreePointRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const rect = new ThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        await pointPicker.execute(({ point: p3 }) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CornerRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);
        snap.addAdditionalRestrictionsTo(pointPicker, p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const rect = new CornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CenterRectangleCommand extends Command {
    async execute(): Promise<void> {
        const rect = new CenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        rect.p1 = p1;

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));
        snap.addAdditionalRestrictionsTo(pointPicker, p1);

        await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class ThreePointBoxCommand extends Command {
    async execute(): Promise<void> {
        const box = new PossiblyBooleanThreePointBoxFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) box.solid = selection.solids.first;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const rect = new ThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        rect.p2 = p2;
        const { point: p3 } = await pointPicker.execute(({ point: p3 }) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);
        rect.cancel();

        const keyboard = new BooleanKeyboardGizmo("box", this.editor);
        keyboard.prepare(box).resource(this);

        box.p1 = p1;
        box.p2 = p2;
        box.p3 = p3;
        await pointPicker.execute(({ point: p4 }) => {
            box.p4 = p4;
            box.update();
            keyboard.toggle(box.isOverlapping);
        }).resource(this);
        await box.commit();
    }
}

export class CornerBoxCommand extends Command {
    async execute(): Promise<void> {
        const box = new PossiblyBooleanCornerBoxFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) box.solid = selection.solids.first;

        let pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);

        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const rect = new CornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        const { point: p2, info: { constructionPlane } } = await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);
        rect.cancel();

        box.p1 = p1;
        box.p2 = p2;
        box.constructionPlane = constructionPlane;

        const keyboard = new BooleanKeyboardGizmo("box", this.editor);
        keyboard.prepare(box).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.restrictToLine(p2, box.heightNormal);
        await pointPicker.execute(({ point: p3 }) => {
            box.p3 = p3;
            box.update();
            keyboard.toggle(box.isOverlapping);
        }).resource(this);

        const result = await box.commit() as visual.Solid;
        selection.addSolid(result);
    }
}

export class CenterBoxCommand extends Command {
    async execute(): Promise<void> {
        const box = new PossiblyBooleanCenterBoxFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0) box.solid = selection.solids.first;

        let pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));
        snap.addAdditionalRestrictionsTo(pointPicker, p1)

        const rect = new CenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.p1 = p1;
        const { point: p2, info: { constructionPlane } } = await pointPicker.execute(({ point: p2, info: { constructionPlane } }) => {
            rect.p2 = p2;
            rect.constructionPlane = constructionPlane;
            rect.update();
        }).resource(this);
        rect.cancel();

        box.p1 = p1;
        box.p2 = p2;
        box.constructionPlane = constructionPlane;

        const keyboard = new BooleanKeyboardGizmo("box", this.editor);
        keyboard.prepare(box).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.restrictToLine(p2, box.heightNormal);
        await pointPicker.execute(({ point: p3 }) => {
            box.p3 = p3;
            box.update();
            keyboard.toggle(box.isOverlapping);
        }).resource(this);
        await box.commit();
    }
}

export class MoveCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;

        if (selected.faces.size > 0) {
            const command = new ActionFaceCommand(this.editor);
            this.editor.enqueue(command, false)
        } else if (selected.solids.size > 0 || selected.curves.size > 0) {
            const command = new MoveItemCommand(this.editor);
            this.editor.enqueue(command, false)
        } else if (selected.controlPoints.size > 0) {
            const command = new MoveControlPointCommand(this.editor);
            this.editor.enqueue(command, false)
        }
    }
}

export class MoveItemCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = bbox.getCenter(new THREE.Vector3());

        const move = new MoveFactory(editor.db, editor.materials, editor.signals).resource(this);
        move.pivot = centroid;
        move.items = objects;

        const dialog = new MoveDialog(move, editor.signals);
        const gizmo = new MoveGizmo(move, editor);
        const keyboard = new MoveKeyboardGizmo(editor);

        dialog.execute(async params => {
            await move.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            move.update();
            dialog.render();
        }).resource(this);

        keyboard.execute(async s => {
            switch (s) {
                case 'free':
                    this.finish();
                    this.editor.enqueue(new FreestyleMoveItemCommand(this.editor), false);
            }
        }).resource(this);

        await this.finished;

        const selection = await move.commit();
        this.editor.selection.selected.add(selection);
    }
}

abstract class AbstractFreestyleMoveCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;

        const move = await this.makeFactory();
        await move.showPhantoms();

        const dialog = new MoveDialog(move, editor.signals);

        dialog.execute(async params => {
            await move.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const line = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        const pointPicker = new PointPicker(editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            move.move = p2.clone().sub(p1);
            move.update();
            line.update();
            dialog.render();
        }).resource(this);
        line.cancel();
        dialog.finish();

        const selection = await move.commit();
        this.editor.selection.selected.add(selection);

        this.editor.enqueue(new MoveItemCommand(this.editor), false);
    }

    protected abstract makeFactory(): Promise<MoveFactoryLike>;
}

export class FreestyleMoveItemCommand extends AbstractFreestyleMoveCommand {
    protected async makeFactory(): Promise<MoveFactory> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const move = new MoveFactory(editor.db, editor.materials, editor.signals).resource(this);
        move.pivot = centroid;
        move.items = objects;
        return move;
    }
}

export class ScaleCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.solids.size > 0 || selected.curves.size > 0) {
            const command = new ScaleItemCommand(this.editor);
            this.editor.enqueue(command, false)
        } else if (selected.controlPoints.size > 0) {
            const command = new ScaleControlPointCommand(this.editor);
            this.editor.enqueue(command, false)
        }
    }
}

export class ScaleItemCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const scale = new ProjectingBasicScaleFactory(editor.db, editor.materials, editor.signals).resource(this);
        scale.items = objects;
        scale.pivot = centroid;

        const gizmo = new ScaleGizmo(scale, editor);
        const dialog = new ScaleDialog(scale, editor.signals);
        const keyboard = new ScaleKeyboardGizmo(editor);

        dialog.execute(async params => {
            await scale.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            scale.update();
            dialog.render();
        }).resource(this);

        keyboard.execute(async s => {
            switch (s) {
                case 'free':
                    this.finish();
                    this.editor.enqueue(new FreestyleItemScaleCommand(this.editor), false);
            }
        }).resource(this);

        await this.finished;

        const selection = await scale.commit();
        this.editor.selection.selected.add(selection);
    }
}

abstract class AbstractFreestyleScaleCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this

        const scale = await this.makeFactory();
        await scale.showPhantoms();

        const dialog = new ScaleDialog(scale, editor.signals);
        dialog.execute(async params => {
            await scale.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const referenceLine = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        const pointPicker = new PointPicker(editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        referenceLine.p1 = p1;
        scale.pivot = p1;

        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            referenceLine.p2 = p2;
            referenceLine.update();
        }).resource(this);
        scale.from(p1, p2);
        pointPicker.addSnap(new PointSnap("zero", p1));

        pointPicker.restrictToLine(p1, scale.ref);
        await pointPicker.execute(({ point: p3 }) => {
            scale.to(p1, p3);
            scale.update();
            dialog.render();
        }).resource(this);

        referenceLine.cancel();
        dialog.finish();

        const selection = await scale.commit();
        this.editor.selection.selected.add(selection);

        this.editor.enqueue(new ScaleCommand(this.editor), false);
    }

    protected abstract makeFactory(): Promise<FreestyleScaleFactoryLike>;
}
export class FreestyleItemScaleCommand extends AbstractFreestyleScaleCommand {
    protected async makeFactory() {
        const { editor } = this
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const scale = new ProjectingFreestyleScaleFactory(editor.db, editor.materials, editor.signals).resource(this);
        scale.items = objects;

        return scale;
    }
}

export class RotateCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.faces.size > 0) {
            const command = new DraftSolidCommand(this.editor);
            this.editor.enqueue(command, false)
        } else if (selected.solids.size > 0 || selected.curves.size > 0) {
            const command = new RotateItemCommand(this.editor);
            this.editor.enqueue(command, false)
        } else if (selected.controlPoints.size > 0) {
            const command = new RotateControlPointCommand(this.editor);
            this.editor.enqueue(command, false)
        }
    }
}

export class RotateItemCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const rotate = new RotateFactory(editor.db, editor.materials, editor.signals).resource(this);
        rotate.items = objects;
        rotate.pivot = centroid;

        const gizmo = new RotateGizmo(rotate, editor);
        const dialog = new RotateDialog(rotate, editor.signals);
        const keyboard = new RotateKeyboardGizmo(editor);

        dialog.execute(async params => {
            await rotate.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            rotate.update();
            dialog.render();
        }).resource(this);

        keyboard.execute(async s => {
            switch (s) {
                case 'free':
                    this.finish();
                    this.editor.enqueue(new FreestyleRotateItemCommand(this.editor), false);
            }
        }).resource(this);

        await this.finished;

        const selection = await rotate.commit();
        this.editor.selection.selected.add(selection);
    }
}

abstract class AbstractFreestyleRotateCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;

        const rotate = await this.makeFactory();
        await rotate.showPhantoms();

        const gizmo = new RotateGizmo(rotate, editor);
        const dialog = new RotateDialog(rotate, editor.signals);

        dialog.execute(async params => {
            await rotate.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const referenceLine = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        let pointPicker = new PointPicker(editor);
        const { point: p1, info: { constructionPlane } } = await pointPicker.execute().resource(this);
        referenceLine.p1 = p1;
        rotate.pivot = p1;
        rotate.axis = constructionPlane.n;
        pointPicker.restrictToPlaneThroughPoint(p1);
        pointPicker.straightSnaps.delete(AxisSnap.Z);

        const quat = new THREE.Quaternion().setFromUnitVectors(constructionPlane.n, Z);

        const { point: p2, info: { constructionPlane: constructionPlane2 } } = await pointPicker.execute(({ point: p2 }) => {
            referenceLine.p2 = p2;
            referenceLine.update();
        }).resource(this);
        const reference = p2.clone().sub(p1).applyQuaternion(quat).normalize();

        const transformationLine = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        transformationLine.p1 = p1;

        pointPicker = new PointPicker(this.editor);
        pointPicker.addSnap(new AxisSnap(undefined, reference, p1));
        pointPicker.restrictToPlane(constructionPlane2.move(p2));
        const transformation = new THREE.Vector3();
        await pointPicker.execute(({ point: p3 }) => {
            transformationLine.p2 = p3;
            transformationLine.update();
            transformation.copy(p3).sub(p1).applyQuaternion(quat);

            const angle = Math.atan2(transformation.y, transformation.x) - Math.atan2(reference.y, reference.x);
            rotate.angle = angle;
            rotate.update();
            dialog.render();
            gizmo.render(rotate);
        }).resource(this);

        transformationLine.cancel();
        referenceLine.cancel();
        dialog.finish();

        const selection = await rotate.commit();
        this.editor.selection.selected.add(selection);

        this.editor.enqueue(new RotateCommand(this.editor), false);
    }

    protected abstract makeFactory(): Promise<RotateFactoryLike>;
}

export class FreestyleRotateItemCommand extends AbstractFreestyleRotateCommand {
    protected async makeFactory(): Promise<RotateFactory> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        if (objects.length === 0) throw new ValidationError("Select something first");

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const rotate = new RotateFactory(editor.db, editor.materials, editor.signals).resource(this);
        rotate.items = objects;
        rotate.pivot = centroid;
        return rotate;
    }
}

abstract class BooleanCommand extends Command {
    protected abstract factory: MovingBooleanFactory;

    async execute(): Promise<void> {
        const { factory, editor } = this;
        factory.resource(this);

        const items = [...editor.selection.selected.solids];
        const tools = items.slice(1);

        const bbox = new THREE.Box3();
        for (const object of tools) bbox.expandByObject(object);
        const centroid = bbox.getCenter(new THREE.Vector3());

        factory.solid = items[0];
        factory.tools = tools;
        await factory.update();

        const dialog = new BooleanDialog(factory, editor.signals);
        const gizmo = new MoveGizmo(factory, editor);

        dialog.execute(async params => {
            await factory.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            factory.update();
        }).resource(this);

        await this.finished;

        await factory.commit();
    }
}

export class UnionCommand extends BooleanCommand {
    protected factory = new MovingUnionFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class IntersectionCommand extends BooleanCommand {
    protected factory = new MovingIntersectionFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class DifferenceCommand extends BooleanCommand {
    protected factory = new MovingDifferenceFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class CutCommand extends Command {
    async execute(): Promise<void> {
        const cut = new CutAndSplitFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        cut.constructionPlane = this.editor.activeViewport?.constructionPlane;
        cut.solid = this.editor.selection.selected.solids.first;
        cut.curve = this.editor.selection.selected.curves.first;
        cut.faces = [...this.editor.selection.selected.faces];
        await cut.update();

        const dialog = new CutDialog(cut, this.editor.signals);
        await dialog.execute(async params => {
            await cut.update();
        }).resource(this);

        const results = await cut.commit() as visual.Solid[];
        this.editor.selection.selected.addSolid(results[0]);
    }
}

export class FilletSolidCommand extends Command {
    point?: THREE.Vector3

    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selected.edges];
        const edge = edges[edges.length - 1];
        const item = edge.parentItem as visual.Solid;

        const fillet = new MaxFilletFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        fillet.solid = item;
        fillet.edges = edges;
        fillet.start();

        const gizmo = new FilletSolidGizmo(fillet, this.editor, this.point);
        gizmo.showEdges();

        const keyboard = new ChamferAndFilletKeyboardGizmo(this.editor);
        const dialog = new FilletDialog(fillet, this.editor.signals);

        dialog.execute(async params => {
            gizmo.toggle(fillet.mode);
            keyboard.toggle(fillet.mode);
            gizmo.render(params.distance1);
            await fillet.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const pp = new PointPicker(this.editor);
        const restriction = pp.restrictToEdges(edges);
        keyboard.execute(async s => {
            switch (s) {
                case 'add':
                    const { point } = await pp.execute().resource(this);
                    const { view, t } = restriction.match;
                    const fn = fillet.functions.get(view.simpleName)!;
                    const added = gizmo.addVariable(point, restriction.match);
                    added.execute(async delta => {
                        fn.InsertValue(t, delta);
                        await fillet.update();
                    }, Mode.Persistent).resource(this);
                    break;
            }
        }).resource(this);

        gizmo.execute(async params => {
            keyboard.toggle(fillet.mode);
            gizmo.toggle(fillet.mode);
            dialog.toggle(fillet.mode);
            dialog.render();
            await fillet.update();
        }).resource(this);

        await this.finished;

        const result = await fillet.commit() as visual.Solid;
        this.editor.selection.selected.addSolid(result);
    }
}

export class CharacterCurveCommand extends Command {
    async execute(): Promise<void> {
        const character = new CharacterCurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        character.update(); // It has sensible defaults, so show something immediately

        const characterDialog = new CharacterCurveDialog(character, this.editor.signals);
        const dialog = characterDialog.execute(async params => {
            await character.update();
        }).resource(this);

        // Dialog OK/Cancel buttons trigger completion of the entire command.
        dialog.then(() => this.finish(), () => this.cancel());

        await this.finished;

        character.commit();
    }
}

export class OffsetFaceCommand extends Command {
    point?: THREE.Vector3

    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid;

        const fillet = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const offset = new OffsetFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const shouldRefillet = fillet.areFilletFaces(faces);

        const factory = shouldRefillet ? fillet : offset;
        factory.solid = parent;
        factory.faces = faces;

        for (const face of faces) {
            const model = this.editor.db.lookupTopologyItem(face);
            const [type] = decomposeMainName(model.GetMainName());
        }

        const gizmo = shouldRefillet ? new RefilletGizmo(fillet, this.editor, this.point) : new OffsetFaceGizmo(offset, this.editor, this.point);

        await gizmo.execute(async params => {
            await factory.update();
        }).resource(this);

        const result = await factory.commit() as visual.Solid;
        this.editor.selection.selected.addSolid(result);
    }
}

export class DraftSolidCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const face = faces[0];
        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point = point2point(faceModel.Point(0.5, 0.5));

        const draftSolid = new DraftSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        draftSolid.solid = parent;
        draftSolid.faces = faces;
        draftSolid.pivot = point;

        const gizmo = new RotateGizmo(draftSolid, this.editor);

        const bbox = new THREE.Box3();
        for (const face of faces) bbox.expandByObject(face);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);
        gizmo.position.copy(centroid);

        await gizmo.execute(params => {
            draftSolid.update();
        }, Mode.Persistent).resource(this);

        await draftSolid.commit();
    }
}

export class PurifyFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new PurifyFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class ActionFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid
        const face = faces[0];

        const actionFace = new ActionFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        actionFace.solid = parent;
        actionFace.faces = faces;

        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point = point2point(faceModel.Point(0.5, 0.5));
        const gizmo = new MoveGizmo(actionFace, this.editor);
        gizmo.position.copy(point);

        await gizmo.execute(async delta => {
            await actionFace.update();
        }).resource(this);

        await actionFace.commit();
    }
}

export class SuppleFaceCommand extends Command { async execute(): Promise<void> { } }

export class MergerFaceCommand extends Command { async execute(): Promise<void> { } }

export class LoftCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selected.curves];
        const loft = new LoftFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        loft.curves = curves;
        await loft.update();
        const spine = loft.spine;

        // const curve = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        // curve.type = c3d.SpaceType.Bezier3D;
        // for (const { point, Z } of spine) {
        //     curve.points.push(point);
        // }
        // await curve.update();

        const { point, Z } = spine[0];
        const gizmo = new FilletMagnitudeGizmo("loft:thickness", this.editor);
        gizmo.position.copy(point);
        gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), Z);
        await gizmo.execute(async thickness => {
            loft.thickness = thickness;
            loft.update();
        }, Mode.Persistent).resource(this);

        // curve.cancel();
        await loft.commit();
    }
}

export class ExtrudeCommand extends Command {
    point?: THREE.Vector3

    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        const extrude = new PossiblyBooleanExtrudeFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        extrude.solid = selected.solids.first;
        extrude.curves = [...selected.curves];
        if (selected.faces.size > 0) extrude.face = selected.faces.first;
        extrude.region = selected.regions.first;

        const keyboard = new BooleanKeyboardGizmo("extrude", this.editor);
        keyboard.prepare(extrude).resource(this);

        const gizmo = new ExtrudeGizmo(extrude, this.editor);
        gizmo.position.copy(this.point ?? extrude.center);
        gizmo.quaternion.setFromUnitVectors(Y, extrude.direction);

        await gizmo.execute(params => {
            extrude.update();
            keyboard.toggle(extrude.isOverlapping);
        }).resource(this);

        const result = await extrude.commit() as visual.Solid;

        selected.addSolid(result);
        const extruded = extrude.extruded;
        if (!(extruded instanceof visual.Face)) selected.remove(extruded);
    }
}

export class MirrorCommand extends Command {
    async execute(): Promise<void> {
        const solid = this.editor.selection.selected.solids.first;
        const curve = this.editor.selection.selected.curves.first;
        const mirror = new MirrorOrSymmetryFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        mirror.item = solid ?? curve;
        mirror.origin = new THREE.Vector3();

        const gizmo = new MirrorGizmo(mirror, this.editor);
        const dialog = new MirrorDialog(mirror, this.editor.signals);
        const keyboard = new MirrorKeyboardGizmo(this.editor);

        dialog.execute(async params => {
            await mirror.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.execute(s => {
            mirror.update();
        }).resource(this);

        keyboard.execute(async s => {
            switch (s) {
                case 'free':
                    this.cancel();
                    this.editor.enqueue(new FreestyleMirrorCommand(this.editor), true);
            }
        }).resource(this);

        await this.finished;

        await mirror.commit();
    }
}

export class FreestyleMirrorCommand extends Command {
    async execute(): Promise<void> {
        const solid = this.editor.selection.selected.solids.first;
        const curve = this.editor.selection.selected.curves.first;
        const mirror = new MirrorOrSymmetryFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        mirror.item = solid ?? curve;

        const pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { constructionPlane } } = await pointPicker.execute().resource(this);
        // pointPicker.restrictToPlaneThroughPoint(p1);

        mirror.origin = p1;

        const line = new PhantomLineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = p1;

        await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();

            mirror.normal = p2.clone().sub(p1).cross(constructionPlane.n);
            mirror.update();
        }).resource(this);

        line.cancel();

        await mirror.commit();
    }
}

export class DeleteCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.faces.size > 0) {
            const faces = [...selected.faces];
            const fillet = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
            if (fillet.areFilletFaces(faces)) {
                const command = new PurifyFaceCommand(this.editor);
                await command.execute();
            } else {
                const command = new RemoveFaceCommand(this.editor);
                await command.execute();
            }
        }
        if (selected.edges.size > 0) {
            const command = new RemoveEdgeCommand(this.editor);
            await command.execute();
        }
        if (selected.solids.size > 0 || selected.curves.size > 0) {
            const command = new RemoveItemCommand(this.editor);
            await command.execute();
        }
        if (selected.controlPoints.size > 0) {
            const command = new RemoveControlPointCommand(this.editor);
            await command.execute();
        }
    }
}

export class RemoveItemCommand extends Command {
    async execute(): Promise<void> {
        const items = [...this.editor.selection.selected.curves, ...this.editor.selection.selected.solids];
        const ps = items.map(i => this.editor.db.removeItem(i));
        await Promise.all(ps);
    }
}

export class RemoveControlPointCommand extends Command {
    async execute(): Promise<void> {
        const points = [...this.editor.selection.selected.controlPoints];
        const curve = points[0].parentItem;

        const removePoint = new RemoveContourPointFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removePoint.controlPoints = points;
        removePoint.originalItem = curve;
        removePoint.contour = await removePoint.prepare(curve);

        const newInstances = await removePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];
        for (const inst of newInstances) this.editor.selection.selected.addCurve(inst);
    }
}


export class RemoveFaceCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid

        const removeFace = new RemoveFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.faces = faces;

        await removeFace.commit();
    }
}

export class RemoveEdgeCommand extends Command {
    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selected.edges];
        const parent = edges[0].parentItem as visual.Solid

        const removeFace = new ModifyEdgeFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        removeFace.solid = parent;
        removeFace.edges = edges;

        await removeFace.commit();
    }
}

export class TrimCommand extends Command {
    async execute(): Promise<void> {
        this.editor.layers.showFragments();
        this.ensure(() => this.editor.layers.hideFragments());

        const picker = new ObjectPicker(this.editor);
        picker.allowCurves();
        picker.raycasterParams.Line2.threshold = 30;
        const selection = await picker.execute().resource(this);
        const fragment = selection.curves.first;
        if (fragment === undefined) return;

        const factory = new TrimFactory(this.editor.db, this.editor.materials, this.editor.signals);
        factory.fragment = fragment;
        await factory.commit();

        this.editor.enqueue(new TrimCommand(this.editor), false);
    }
}

export class ModifyContourCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        let curve = selected.curves.last!;

        const factory = new ModifyContourFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.originalItem = curve;
        factory.contour = await factory.prepare(curve);

        const gizmo = new ModifyContourGizmo(factory, this.editor);
        gizmo.execute(params => {
            factory.update();
        }).resource(this);

        await this.finished;

        const result = await factory.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class MoveControlPointCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const selected = editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const factory = new MoveContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        factory.controlPoints = points;
        factory.originalItem = curve;
        factory.contour = await factory.prepare(curve);

        const centroid = new THREE.Vector3();
        for (const point of points) centroid.add(point.position);
        centroid.divideScalar(points.length);

        const dialog = new MoveDialog(factory, editor.signals);
        const gizmo = new MoveGizmo(factory, editor);
        const keyboard = new MoveKeyboardGizmo(editor);

        dialog.execute(async params => {
            await factory.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(params => {
            factory.update();
        }).resource(this);

        keyboard.execute(async s => {
            switch (s) {
                case 'free':
                    this.finish();
                    this.editor.enqueue(new FreestyleMoveControlPointCommand(this.editor), false);
            }
        }).resource(this);

        await this.finished;

        const result = await factory.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class FreestyleMoveControlPointCommand extends AbstractFreestyleMoveCommand {
    protected async makeFactory(): Promise<MoveFactoryLike> {
        const { editor } = this;
        const selected = editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const move = new MoveContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        move.controlPoints = points;
        move.originalItem = curve;
        move.contour = await move.prepare(curve);

        return move;
    }
}


export class RotateControlPointCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const selected = editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const centroid = new THREE.Vector3();
        for (const point of points) centroid.add(point.position);
        centroid.divideScalar(points.length);

        const rotate = new RotateContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        rotate.controlPoints = points;
        rotate.originalItem = curve;
        rotate.contour = await rotate.prepare(curve);
        rotate.pivot = centroid;

        const gizmo = new RotateGizmo(rotate, editor);
        const dialog = new RotateDialog(rotate, editor.signals);
        const keyboard = new RotateKeyboardGizmo(editor);
        dialog.execute(async params => {
            await rotate.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(params => {
            rotate.update();
        }).resource(this);

        keyboard.execute(async s => {
            switch (s) {
                case 'free':
                    this.finish();
                    this.editor.enqueue(new FreestyleRotateControlPointCommand(this.editor), false);
            }
        }).resource(this);

        await this.finished;

        const result = await rotate.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class FreestyleRotateControlPointCommand extends AbstractFreestyleRotateCommand {
    protected async makeFactory(): Promise<RotateFactoryLike> {
        const { editor } = this;
        const selected = editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const centroid = new THREE.Vector3();
        for (const point of points) centroid.add(point.position);
        centroid.divideScalar(points.length);

        const rotate = new RotateContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        rotate.controlPoints = points;
        rotate.originalItem = curve;
        rotate.contour = await rotate.prepare(curve);
        rotate.pivot = centroid;

        return rotate;
    }
}

export class ScaleControlPointCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const centroid = new THREE.Vector3();
        for (const point of points) centroid.add(point.position);
        centroid.divideScalar(points.length);

        const scale = new ScaleContourPointFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        scale.controlPoints = points;
        scale.originalItem = curve;
        scale.contour = await scale.prepare(curve);
        scale.pivot = centroid;

        const gizmo = new ScaleGizmo(scale, this.editor);
        const dialog = new ScaleDialog(scale, this.editor.signals);
        const keyboard = new ScaleKeyboardGizmo(this.editor);

        dialog.execute(async params => {
            await scale.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(params => {
            scale.update();
        }).resource(this);

        keyboard.execute(async s => {
            switch (s) {
                case 'free':
                    this.finish();
                    this.editor.enqueue(new FreestyleScaleControlPointCommand(this.editor), false);
            }
        }).resource(this);

        await this.finished;

        const result = await scale.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class FreestyleScaleControlPointCommand extends AbstractFreestyleScaleCommand {
    protected async makeFactory() {
        const { editor, editor: { selection: { selected } } } = this
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const centroid = new THREE.Vector3();
        for (const point of points) centroid.add(point.position);
        centroid.divideScalar(points.length);

        const scale = new FreestyleScaleContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        scale.controlPoints = points;
        scale.originalItem = curve;
        scale.contour = await scale.prepare(curve);
        return scale;
    }
}

export class BridgeCurvesCommand extends Command {
    async execute(): Promise<void> {
        const factory = new BridgeCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selected = this.editor.selection.selected;

        // const mask = this.editor.snaps.layers.mask;
        // this.editor.snaps.layers.disableAll();
        // this.editor.snaps.layers.enable(Layers.Curve);
        // this.editor.snaps.layers.enable(Layers.Plane);
        // this.editor.snaps.layers.enable(Layers.CurvePoint);
        // this.ensure(() => this.editor.snaps.layers.mask = mask);

        const dialog = new BridgeCurvesDialog(factory, this.editor.signals);
        dialog.execute(params => {
            factory.update();
            dialog.render();
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        pointPicker.raycasterParams.Line2.threshold = 400;
        const line = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.style = 1;
        const { point: p1, info: { snap: snap1 } } = await pointPicker.execute().resource(this);
        if (!(snap1 instanceof CurveSnap || snap1 instanceof CurvePointSnap)) throw new ValidationError();

        line.push(p1);
        line.push(p1);
        factory.curve1 = snap1.view;
        factory.t1 = snap1.t;

        const { info: { snap: snap2 } } = await pointPicker.execute(({ point: p2, info: { snap: snap2 } }) => {
            line.last = p2;
            line.update();

            if (!(snap2 instanceof CurveSnap || snap2 instanceof CurvePointSnap)) return;
            factory.curve2 = snap2.view;
            factory.t2 = snap2.t;
            factory.update();
            dialog.render();
        }).resource(this);
        if (!(snap2 instanceof CurveSnap || snap2 instanceof CurvePointSnap)) throw new ValidationError();
        line.cancel();

        await this.finished;

        const result = await factory.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class OffsetCurveCommand extends Command {
    async execute(): Promise<void> {
        const face = this.editor.selection.selected.faces.first;
        const curve = this.editor.selection.selected.curves.first;

        const offsetContour = new OffsetCurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        if (face !== undefined) offsetContour.face = face;
        if (curve !== undefined) offsetContour.curve = curve;

        const gizmo = new OffsetCurveGizmo("offset-curve:distance", this.editor);
        gizmo.position.copy(offsetContour.center);
        gizmo.quaternion.setFromUnitVectors(Y, offsetContour.normal);
        gizmo.relativeScale.setScalar(0.8);

        await gizmo.execute(async distance => {
            offsetContour.distance = distance;
            offsetContour.update();
        }, Mode.Persistent).resource(this);

        if (face !== undefined) this.editor.selection.selected.removeFace(face, face.parentItem);
        if (curve !== undefined) this.editor.selection.selected.removeCurve(curve);

        const offset = await offsetContour.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(offset);
    }
}

export class MultilineCommand extends Command {
    async execute(): Promise<void> {
        const curve = this.editor.selection.selected.curves.first;
        const factory = new MultilineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.curve = curve;

        const dialog = new MultilineDialog(factory, this.editor.signals);

        await factory.update();
        await dialog.execute(params => {
            factory.update();
        }).resource(this);

        await factory.commit();
    }
}

export class ShellCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.solids.size > 0 || selected.faces.size > 0) {
            const command = new ThinSolidCommand(this.editor);
            this.editor.enqueue(command, false)
        } else if (selected.curves.size > 0) {
            const command = new MultilineCommand(this.editor);
            this.editor.enqueue(command, false)
        }
    }
}

export class ThinSolidCommand extends Command {
    async execute(): Promise<void> {
        const thin = new ThinSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        let face;
        if (this.editor.selection.selected.faces.size > 0) {
            const faces = [...this.editor.selection.selected.faces];
            face = faces[0];
            const solid = face.parentItem;
            thin.solid = solid;
            thin.faces = faces;
        } else {
            const solid = this.editor.selection.selected.solids.first;
            thin.solid = solid;
            face = solid.faces.get(0);
        }

        const gizmo = new FilletMagnitudeGizmo("thin-solid:thickness", this.editor);
        const dialog = new ThinSolidDialog(thin, this.editor.signals);

        dialog.execute(async params => {
            gizmo.render(params.thickness1);
            await thin.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const { point, normal } = OffsetFaceGizmo.placement(this.editor.db.lookupTopologyItem(face));
        gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        gizmo.position.copy(point);

        gizmo.execute(thickness => {
            thin.thickness1 = thickness;
            dialog.render();
            thin.update();
        }).resource(this);

        await this.finished;

        await thin.commit();
    }
}

export class RevolutionCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selected.curves];
        const revolution = new RevolutionFactory(this.editor.db, this.editor.materials, this.editor.signals);

        revolution.curves = curves;

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        revolution.origin = p1;

        await pointPicker.execute(({ point: p2 }) => {
            revolution.axis = p2.clone().sub(p1);
            revolution.update();
        }).resource(this);

        const dialog = new RevolutionDialog(revolution, this.editor.signals);
        const gizmo = new RevolutionGizmo(revolution, this.editor);

        dialog.execute(async params => {
            await revolution.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.execute(params => {
            revolution.update();
            dialog.render();
        }).resource(this);

        await this.finished;

        const revolved = await revolution.commit();
        this.editor.selection.selected.add(revolved);
    }
}

export class DuplicateCommand extends Command {
    async execute(): Promise<void> {
        const { editor: { selection: { selected: { solids, curves, edges, faces }, selected } } } = this;
        const db = this.editor.db;

        const promises: Promise<visual.Item>[] = [];
        for (const solid of solids) promises.push(db.duplicate(solid));
        for (const curve of curves) promises.push(db.duplicate(curve));
        for (const edge of edges) promises.push(db.duplicate(edge));

        if (faces.size > 0) {
            const parent = faces.first.parentItem as visual.Solid
            const createFace = new CreateFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
            createFace.solid = parent;
            createFace.faces = [...faces];
            const result = createFace.commit() as Promise<visual.Solid>;
            promises.push(result);
        }

        const objects = await Promise.all(promises);

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        move.pivot = centroid;
        move.items = objects;

        const gizmo = new MoveGizmo(move, this.editor);
        gizmo.position.copy(centroid);
        await gizmo.execute(s => {
            move.update();
        }).resource(this);

        const selection = await move.commit();

        for (const solid of solids) selected.removeSolid(solid);
        for (const curve of curves) selected.removeCurve(curve);
        for (const edge of edges) selected.removeEdge(edge, edge.parentItem);
        for (const face of faces) selected.removeFace(face, face.parentItem);

        this.editor.selection.selected.add(selection);
    }
}

export class RadialArrayCommand extends Command {
    async execute(): Promise<void> {
        const solid = this.editor.selection.selected.solids.first;

        const factory = new ArrayFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.isPolar = true;
        factory.solid = solid;
        factory.num1 = 1;
        factory.num2 = 8;
        factory.isAlongAxis = true;
        factory.step2 = Math.PI / 4;

        const dialog = new RadialArrayDialog(factory, this.editor.signals);

        let pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { constructionPlane } } = await pointPicker.execute().resource(this);

        const bbox = new THREE.Box3();
        bbox.setFromObject(solid);
        const centroid = bbox.getCenter(new THREE.Vector3());

        centroid.sub(p1);
        factory.step1 = centroid.length();
        factory.dir1 = centroid.normalize();
        factory.dir2 = constructionPlane.n.clone().normalize();
        factory.center = p1;

        await factory.update();

        await dialog.execute(async params => {
            factory.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        await factory.commit();
    }
}

module.hot?.accept();