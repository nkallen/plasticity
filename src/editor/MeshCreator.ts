import c3d from '../../build/Release/c3d.node';

export interface MeshLike {
    faces: c3d.MeshBuffer[];
    edges: c3d.EdgeBuffer[];
}

export interface MeshCreator {
    create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike>;
}

// This is the basic mesh creation strategy. It definitely works correctly, but because it lacks parallelism it is slow
export class BasicMeshCreator implements MeshCreator {
    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
        const item = await obj.CreateMesh_async(stepData, formNote);
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        const grids = mesh.GetBuffers();
        const polygons = mesh.GetEdges(outlinesOnly);
        return {
            faces: grids,
            edges: polygons,
        };
    }
}

// This is an EXPERIMENTAL mesh creator with parallelism for solids. It is often significantly faster -- and surprisingly,
// it is never slower, even with simple solids of 3 faces. But it needs to be fully tested.
export class ParallelMeshCreator implements MeshCreator {
    private readonly fallback = new BasicMeshCreator();

    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
        if (obj.IsA() !== c3d.SpaceType.Solid) {
            return this.fallback.create(obj, stepData, formNote, outlinesOnly);
        }
        const solid = obj as c3d.Solid;

        c3d.Mutex.EnterParallelRegion();

        // Here we create mesh & grid for each face. Note that Face.CreateMesh doesn't work correctly in this context, and the below
        // is the recommended approach. Also, note that we could create instead one mesh for all of these grids, it's equivalent.
        const facePromises = [];
        const mesh = new c3d.Mesh(false);
        for (const face of solid.GetFaces()) {
            const grid = mesh.AddGrid()!;
            // face.AttributesConvert(grid); // FIXME -- losing attributes like style without this
            grid.SetItem(face);
            grid.SetPrimitiveName(face.GetNameHash());
            grid.SetPrimitiveType(c3d.RefType.TopItem);
            grid.SetStepData(stepData);
            facePromises.push(c3d.TriFace.CalculateGrid_async(face, stepData, grid, false, formNote.Quad(), formNote.Fair()));
        }

        const edgePromises = [];
        for (const edge of solid.GetEdges()) {
            edgePromises.push(edge.CalculateMesh(stepData, formNote));
        }

        await Promise.all(facePromises);
        const grids: c3d.MeshBuffer[] = [];
        const buffers = mesh.GetBuffers();
        for (const buffer of buffers) {
            grids.push(buffer);
        }

        const edges = await Promise.all(edgePromises);
        const polygons: c3d.EdgeBuffer[] = [];
        for (const [i, edge] of edges.entries()) {
            if (edge.GetEdges(outlinesOnly).length === 0) continue;
            const polygon = edge.GetEdges(outlinesOnly)[0];
            polygon.i = i;
            polygons.push(polygon);
        }

        c3d.Mutex.ExitParallelRegion();

        return {
            faces: grids,
            edges: polygons,
        };
    }
}

export class BenchmarkMeshCreator implements MeshCreator {
    private readonly basic = new BasicMeshCreator();
    private readonly parallel = new ParallelMeshCreator();

    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
        // console.time("Basic mesh creation");
        // const p1 = this.basic.create(obj, stepData, formNote, outlinesOnly);
        // const r1 = await p1;
        // console.timeEnd("Basic mesh creation");

        console.time("Parallel mesh creation");
        const p2 = this.parallel.create(obj, stepData, formNote, outlinesOnly);
        const r2 = await p2;
        console.timeEnd("Parallel mesh creation")
        
        // console.assert(r1.faces.length === r2.faces.length, "r1.faces.length === r2.faces.length", r1.faces.length, r2.faces.length);
        // console.log(r1.edges.length, r2.edges.length);
        // console.assert(r1.edges.length === r2.edges.length, "r1.edges.length === r2.edges.length", r1.edges.length, r2.edges.length);

        // for (let i = 0; i < r1.faces.length; i++) {
        //     // console.log("Checking: ", i);
        //     const face1 = r1.faces[i];
        //     const face2 = r2.faces[i];
        //     console.assert(face1.simpleName === face2.simpleName, "face1.simpleName === face2.simpleName", face1.simpleName, face2.simpleName);
        //     console.assert(face1.i === face2.i, "face1.i === face2.i", face1.i, face2.i);
        //     console.assert(face1.index.length === face2.index.length, "face1.index.length === face2.index.length", face1.index.length, face2.index.length);
        //     console.assert(face1.position.length === face2.position.length, "face1.position.length === face2.position.length", face1.position.length, face2.position.length);
        //     console.assert(face1.normal.length === face2.normal.length, "face1.normal.length === face2.normal.length", face1.normal.length, face2.normal.length);
        // }

        return r2;
    }
}
