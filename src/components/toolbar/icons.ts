import box from 'bootstrap-icons/icons/box.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import Command from '../../commands/Command';
import { HideSelectedCommand, HideUnselectedCommand, UnhideAllCommand, DuplicateCommand, RebuildCommand, DeselectAllCommand } from '../../commands/CommandLike';
import * as cmd from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import centerCircle from './img/center-circle.svg';
import centerEllipse from './img/center-ellipse.svg';
import centerPointArc from './img/center-point-arc.svg';
import centerRectangle from './img/center-rectangle.svg';
import characterCurve from './img/character-curve.svg';
import cornerRectangle from './img/corner-rectangle.svg';
import curve from './img/curve.svg';
import cut from './img/cut.svg';
import cylinder from './img/cylinder.svg';
import difference from './img/difference.svg';
import extrude from './img/extrude.svg';
import fillet from './img/fillet.svg';
import intersection from './img/intersection.svg';
import join from './img/join.svg';
import line from './img/line.svg';
import loft from './img/loft.svg';
import mirror from './img/mirror.svg';
import move from './img/move.svg';
import offsetFace from './img/offset-face.svg';
import regularPolygon from './img/regular-polygon.svg';
import { default as draftSolid, default as rotate } from './img/rotate.svg';
import scale from './img/scale.svg';
import sphere from './img/sphere.svg';
import spiral from './img/spiral.svg';
import threePointArc from './img/three-point-arc.svg';
import threePointCircle from './img/three-point-circle.svg';
import threePointEllipse from './img/three-point-ellipse.svg';
import threePointRectangle from './img/three-point-rectangle.svg';
import trim from './img/trim.svg';
import twoPointCircle from './img/two-point-circle.svg';
import { default as changePoint, default as union } from './img/union.svg';
import c3d from '../../../build/Release/c3d.node';

export const icons = new Map<any, string>();
icons.set(cmd.MoveCommand, move);
icons.set(cmd.RotateCommand, rotate);
icons.set(cmd.ScaleCommand, scale);
icons.set(cmd.FilletSolidCommand, fillet);
icons.set(cmd.IntersectionCommand, intersection);
icons.set(cmd.DifferenceCommand, difference);
icons.set(cmd.UnionCommand, union);
icons.set(cmd.CutCommand, cut);
icons.set(cmd.OffsetFaceCommand, offsetFace);
icons.set(cmd.DraftSolidCommand, draftSolid);
icons.set(cmd.RemoveFaceCommand, trash);
icons.set(cmd.CreateFaceCommand, offsetFace);
icons.set(cmd.ActionFaceCommand, move);
icons.set(cmd.RefilletFaceCommand, fillet);
icons.set(cmd.PurifyFaceCommand, trash);
icons.set(cmd.CurveCommand, curve);
icons.set(cmd.SphereCommand, sphere);
icons.set(cmd.CenterCircleCommand, centerCircle);
icons.set(cmd.TwoPointCircleCommand, twoPointCircle);
icons.set(cmd.ThreePointCircleCommand, threePointCircle);
icons.set(cmd.CenterPointArcCommand, centerPointArc);
icons.set(cmd.ThreePointArcCommand, threePointArc);
icons.set(cmd.CenterEllipseCommand, centerEllipse);
icons.set(cmd.ThreePointEllipseCommand, threePointEllipse);
icons.set(cmd.PolygonCommand, regularPolygon);
icons.set(cmd.LineCommand, line);
icons.set(cmd.ThreePointRectangleCommand, threePointRectangle);
icons.set(cmd.CornerRectangleCommand, cornerRectangle);
icons.set(cmd.CenterRectangleCommand, centerRectangle);
icons.set(cmd.CylinderCommand, cylinder);
icons.set(cmd.ThreePointBoxCommand, box);
icons.set(cmd.CornerBoxCommand, box);
icons.set(cmd.CenterBoxCommand, box);
icons.set(cmd.LoftCommand, loft);
icons.set(cmd.ExtrudeCommand, extrude);
icons.set(cmd.MirrorCommand, mirror);
icons.set(cmd.JoinCurvesCommand, join);
icons.set(cmd.SpiralCommand, spiral);
icons.set(cmd.CharacterCurveCommand, characterCurve);
// icons.set(cmd.MergerFaceCommand, offsetFace);
icons.set(cmd.ChangePointCommand, changePoint);
icons.set(cmd.TrimCommand, trim);
icons.set(cmd.RemovePointCommand, trash);
icons.set(cmd.FilletCurveCommand, fillet);
icons.set(cmd.SelectFilletsCommand, fillet);
icons.set(cmd.OffsetCurveCommand, line);
icons.set(cmd.SymmetryCommand, mirror);
icons.set(cmd.BridgeCurvesCommand, mirror);
icons.set(cmd.MultilineCommand, line);
icons.set(cmd.ThinSolidCommand, line);
icons.set(cmd.RevolutionCommand, line);

icons.set(c3d.ElementarySolid, box);
icons.set(c3d.FilletSolid, fillet);
icons.set(c3d.FaceModifiedSolid, offsetFace);
icons.set(c3d.BooleanSolid, union);
icons.set(c3d.CurveExtrusionSolid, extrude);
icons.set(c3d.ChamferSolid, fillet);
icons.set(c3d.TransformedSolid, move);
icons.set(c3d.SymmetrySolid, mirror);
icons.set(c3d.CuttingSolid, cut);

export const tooltips = new Map<typeof Command, string>();
tooltips.set(cmd.MoveCommand, "Move");
tooltips.set(cmd.RotateCommand, "Rotate");
tooltips.set(cmd.ScaleCommand, "Scale");
tooltips.set(cmd.FilletSolidCommand, "Fillet");
tooltips.set(cmd.IntersectionCommand, "Boolean intersection");
tooltips.set(cmd.DifferenceCommand, "Boolean difference");
tooltips.set(cmd.UnionCommand, "Boolean union");
tooltips.set(cmd.CutCommand, "Cut solid with curve");
tooltips.set(cmd.OffsetFaceCommand, "Offset face");
tooltips.set(cmd.DraftSolidCommand, "Draft solid");
tooltips.set(cmd.RemoveFaceCommand, "Delete face");
tooltips.set(cmd.CreateFaceCommand, "Copy face");
tooltips.set(cmd.ActionFaceCommand, "Move face");
tooltips.set(cmd.RefilletFaceCommand, "Modify fillet of face");
tooltips.set(cmd.PurifyFaceCommand, "Remove fillet");
tooltips.set(cmd.CurveCommand, "Curve");
tooltips.set(cmd.SphereCommand, "Sphere");
tooltips.set(cmd.CenterCircleCommand, "Center and radius circle");
tooltips.set(cmd.TwoPointCircleCommand, "Two-point circle");
tooltips.set(cmd.ThreePointCircleCommand, "Three-point circle");
tooltips.set(cmd.CenterPointArcCommand, "Center-point arc");
tooltips.set(cmd.ThreePointArcCommand, "Three-point arc");
tooltips.set(cmd.CenterEllipseCommand, "Center ellipse");
tooltips.set(cmd.ThreePointEllipseCommand, "Three-point ellipse");
tooltips.set(cmd.PolygonCommand, "Regular polygon");
tooltips.set(cmd.LineCommand, "Line");
tooltips.set(cmd.ThreePointRectangleCommand, "Three point rectangle");
tooltips.set(cmd.CornerRectangleCommand, "Corner rectangle");
tooltips.set(cmd.CenterRectangleCommand, "Center rectangle");
tooltips.set(cmd.CylinderCommand, "Cylinder");
tooltips.set(cmd.ThreePointBoxCommand, "Three point Box");
tooltips.set(cmd.CornerBoxCommand, "Corner box");
tooltips.set(cmd.CenterBoxCommand, "Center box");
tooltips.set(cmd.LoftCommand, "Loft");
tooltips.set(cmd.MirrorCommand, "Mirror");
tooltips.set(cmd.JoinCurvesCommand, "Join curves");
tooltips.set(cmd.RegionCommand, "Region");
tooltips.set(cmd.ExtrudeCommand, "Extrude");
tooltips.set(cmd.SpiralCommand, "Spiral");
tooltips.set(cmd.CharacterCurveCommand, "Custom Function");
tooltips.set(cmd.ChangePointCommand, "Move control point");
tooltips.set(cmd.TrimCommand, "Cut off line segments at intersections of curves");
tooltips.set(cmd.RemovePointCommand, "Remove point from polyline or curve");
tooltips.set(cmd.FilletCurveCommand, "Fillet curve");
tooltips.set(cmd.SelectFilletsCommand, "Select removable faces");
tooltips.set(cmd.OffsetCurveCommand, "Offset Loop");
tooltips.set(cmd.SymmetryCommand, "Mirror solid");
tooltips.set(cmd.BridgeCurvesCommand, "Bridge two curves");
tooltips.set(cmd.MultilineCommand, "Add stroke to curve");
tooltips.set(cmd.ThinSolidCommand, "Thin Solid");
tooltips.set(cmd.RevolutionCommand, "Revolve");

export const keybindings = new Map<string, string>();
keybindings.set("gizmo:move:x", "X axis");
keybindings.set("gizmo:move:y", "Y axis");
keybindings.set("gizmo:move:z", "Z axis");
keybindings.set("gizmo:move:xy", "Z plane");
keybindings.set("gizmo:move:yz", "X plane");
keybindings.set("gizmo:move:xz", "Y plane");
keybindings.set("gizmo:move:screen", "Screen space");
keybindings.set("gizmo:move:free", "Freestyle");
keybindings.set("gizmo:rotate:x", "X axis");
keybindings.set("gizmo:rotate:y", "Y axis");
keybindings.set("gizmo:rotate:z", "Z axis");
keybindings.set("gizmo:rotate:screen", "Screen space");
keybindings.set("gizmo:rotate:free", "Freestyle");
keybindings.set("gizmo:scale:x", "X axis");
keybindings.set("gizmo:scale:y", "Y axis");
keybindings.set("gizmo:scale:z", "Z axis");
keybindings.set("gizmo:scale:xy", "Z plane");
keybindings.set("gizmo:scale:yz", "X plane");
keybindings.set("gizmo:scale:xz", "Y plane");
keybindings.set("gizmo:scale:xyz", "Uniform");
keybindings.set("gizmo:scale:free", "Freestyle");
keybindings.set("command:abort", "Abort");
keybindings.set("command:finish", "Finish");
keybindings.set("gizmo:curve:line-segment", "Line segment");
keybindings.set("gizmo:curve:arc", "Arc");
keybindings.set("gizmo:curve:polyline", "Polyline");
keybindings.set("gizmo:curve:nurbs", "NURBS");
keybindings.set("gizmo:curve:hermite", "Hermite");
keybindings.set("gizmo:curve:bezier", "Bezier");
keybindings.set("gizmo:curve:cubic-spline", "Cubic spline");
keybindings.set("gizmo:curve:undo", "Undo");
keybindings.set("gizmo:line:undo", "Undo");
keybindings.set("gizmo:fillet-solid:add", "Add variable fillet point");
keybindings.set("gizmo:fillet-solid:distance", "Distance");
keybindings.set("gizmo:fillet-solid:angle", "Chamfer angle");
keybindings.set("gizmo:circle:mode", "Toggle vertical/horizontal");
keybindings.set("gizmo:polygon:add-vertex", "Add a vertex");
keybindings.set("gizmo:polygon:subtract-vertex", "Subtract a vertex");
keybindings.set("gizmo:polygon:mode", "Toggle vertical/horizontal");
keybindings.set("gizmo:spiral:angle", "Angle");
keybindings.set("gizmo:spiral:radius", "Radius");
keybindings.set("gizmo:spiral:length", "Length");
keybindings.set("gizmo:extrude:race1", "Angle 1");
keybindings.set("gizmo:extrude:distance1", "Distance 1");
keybindings.set("gizmo:extrude:race2", "Angle 2");
keybindings.set("gizmo:extrude:distance2", "Distance 2");
keybindings.set("gizmo:extrude:thickness", "Thickness");
keybindings.set("gizmo:extrude:union", "Union");
keybindings.set("gizmo:extrude:difference", "Difference");
keybindings.set("gizmo:extrude:intersect", "Intersect");
keybindings.set("gizmo:extrude:new-body", "New body");
keybindings.set("gizmo:sphere:union", "Union");
keybindings.set("gizmo:sphere:difference", "Difference");
keybindings.set("gizmo:sphere:intersect", "Intersect");
keybindings.set("gizmo:sphere:new-body", "New body");
keybindings.set("gizmo:box:union", "Union");
keybindings.set("gizmo:box:difference", "Difference");
keybindings.set("gizmo:box:intersect", "Intersect");
keybindings.set("gizmo:box:new-body", "New body");
keybindings.set("gizmo:cylinder:union", "Union");
keybindings.set("gizmo:cylinder:difference", "Difference");
keybindings.set("gizmo:cylinder:intersect", "Intersect");
keybindings.set("gizmo:cylinder:new-body", "New body");
keybindings.set("gizmo:offset-face:distance", "Distance");
keybindings.set("gizmo:symmetry:x", "Positive X");
keybindings.set("gizmo:symmetry:y", "Positive Y");
keybindings.set("gizmo:symmetry:z", "Positive Z");
keybindings.set("gizmo:symmetry:-x", "Negative X");
keybindings.set("gizmo:symmetry:-y", "Negative Y");
keybindings.set("gizmo:symmetry:-z", "Negative Z");
keybindings.set("gizmo:rebuild:forward", "Go forward in history");
keybindings.set("gizmo:rebuild:backward", "Go backward in history");
keybindings.set("gizmo:fillet-curve:radius", "Fillet radius");
keybindings.set("gizmo:revolution:angle", "Revolution angle");
keybindings.set("gizmo:revolution:thickness", "Revolution thickness");
keybindings.set("gizmo:offset-curve:distance", "Offset distance");

export default (editor: Editor): void => {
    editor.registry.add('ispace-viewport', {
        'command:move': () => editor.enqueue(new cmd.MoveCommand(editor)),
        'command:rotate': () => editor.enqueue(new cmd.RotateCommand(editor)),
        'command:scale': () => editor.enqueue(new cmd.ScaleCommand(editor)),
        'command:sphere': () => editor.enqueue(new cmd.SphereCommand(editor)),
        'command:center-circle': () => editor.enqueue(new cmd.CenterCircleCommand(editor)),
        'command:center-rectangle': () => editor.enqueue(new cmd.CenterRectangleCommand(editor)),
        'command:line': () => editor.enqueue(new cmd.LineCommand(editor)),
        'command:curve': () => editor.enqueue(new cmd.CurveCommand(editor)),
        'command:corner-rectangle': () => editor.enqueue(new cmd.CornerRectangleCommand(editor)),
        'command:corner-box': () => editor.enqueue(new cmd.CornerBoxCommand(editor)),
        'command:union': () => editor.enqueue(new cmd.UnionCommand(editor)),
        'command:intersection': () => editor.enqueue(new cmd.IntersectionCommand(editor)),
        'command:difference': () => editor.enqueue(new cmd.DifferenceCommand(editor)),
        'command:offset': () => editor.enqueue(new cmd.OffsetCurveCommand(editor)),
        'command:cut': () => editor.enqueue(new cmd.CutCommand(editor)),
        'command:fillet': () => editor.enqueue(new cmd.FilletCommand(editor)),
        'command:modify-face': () => editor.enqueue(new cmd.OffsetFaceCommand(editor)),
        'command:delete': () => editor.enqueue(new cmd.DeleteCommand(editor)),
        'command:extrude': () => editor.enqueue(new cmd.ExtrudeCommand(editor)),
        'command:trim': () => editor.enqueue(new cmd.TrimCommand(editor)),
        'command:unhide-all': () => editor.enqueue(new UnhideAllCommand(editor)),
        'command:hide-selected': () => editor.enqueue(new HideSelectedCommand(editor)),
        'command:hide-unselected': () => editor.enqueue(new HideUnselectedCommand(editor)),
        'command:duplicate': () => editor.enqueue(new DuplicateCommand(editor)),
        'command:symmetry': () => editor.enqueue(new cmd.SymmetryCommand(editor)),
        'command:rebuild': () => editor.enqueue(new RebuildCommand(editor)),
        'command:deselect-all': () => editor.enqueue(new DeselectAllCommand(editor)),
    })
}
