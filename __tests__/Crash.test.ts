import c3d from '../build/Release/c3d.node';

test("reproduce crash", () => {
    const box = (() => {
        const points = [
            new c3d.CartPoint3D(0, 0, 0),
            new c3d.CartPoint3D(1, 0, 0),
            new c3d.CartPoint3D(1, 1, 0),
            new c3d.CartPoint3D(1, 1, 1),
        ]
        const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);
        const box = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, names);
        return box;
    })();
    
    const sphere = (() => {
        const points = [
            new c3d.CartPoint3D(0.5, 0.5, 1.25),
            new c3d.CartPoint3D(0.5, 0.5, 1.25 + 0.5),
            new c3d.CartPoint3D(0.5 + 0.5, 0.5, 1.25),
        ];
        const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Sphere, names);
        return sphere;
    })();
    
    const union = (() => {
        const names = new c3d.SNameMaker(c3d.CreatorType.BooleanSolid, c3d.ESides.SideNone, 0);
    
        const flags = new c3d.BooleanFlags();
        flags.InitBoolean(true);
        flags.SetMergingFaces(true);
        flags.SetMergingEdges(true);
    
        const union = c3d.ActionSolid.BooleanResult(sphere, c3d.CopyMode.Copy, box, c3d.CopyMode.Copy, c3d.OperationType.Union, flags, names);
        return union;
    })();
    
    const edge = union.GetEdges()[0];
    
    const fillet = (() => {
        const params = new c3d.SmoothValues();
        const d = 0.02;
        params.distance1 = d;
        params.distance2 = d;
        params.form = 0;
        params.conic = 0;
        params.prolong = false;
        params.smoothCorner = 2;
        params.keepCant = -1;
        params.strict = true;
    
        const names = new c3d.SNameMaker(c3d.CreatorType.FilletSolid, c3d.ESides.SideNone, 0);
        return c3d.ActionSolid.FilletSolid(union, c3d.CopyMode.Copy, [edge], [], params, names);
    })();
    
    const face = fillet.GetFaces()[0];
    
    const modify = (() => {
        const params = new c3d.ModifyValues();
        params.way = c3d.ModifyingType.Action;
        params.direction = new c3d.Vector3D(0.7800048970850955, 0, -0);
        // params.direction = new c3d.Vector3D(0.05, 0, 0);
        const names = new c3d.SNameMaker(c3d.CreatorType.FaceModifiedSolid, c3d.ESides.SideNone, 0);
        // return c3d.ActionDirect.FaceModifiedSolid(fillet, c3d.CopyMode.Copy, params, [face], names);
    })();
});