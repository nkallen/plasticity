import c3d from '../build/Release/c3d.node';
import './matchers';

test("basic meshification of solids", () => {
    const points = [
        new c3d.CartPoint3D(0, 0, 0),
        new c3d.CartPoint3D(0, 0, 1),
        new c3d.CartPoint3D(1, 0, 0),
    ];
    const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);
    const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Sphere, names);

    const stepData = new c3d.StepData(c3d.StepType.SpaceStep, 0.003);
    const note = new c3d.FormNote(true, true, true, false, false);
    const item = sphere.CreateMesh(stepData, note);
    const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);

    const grids = mesh.GetBuffers();
    expect(grids.length).toBe(1);

    // Somewhat confusingly, a sphere would have edges, however they are poles and we do not
    // want to render them.
    const edges = mesh.GetEdges(true);
    expect(edges.length).toBe(0);
})