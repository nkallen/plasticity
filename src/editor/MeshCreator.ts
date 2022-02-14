import c3d from '../../build/Release/c3d.node';
import { Delay } from '../util/SequentialExecutor';

export interface MeshLike {
    faces: c3d.MeshBuffer[];
    edges: c3d.EdgeBuffer[];
}

export interface MeshCreator {
    create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, name?: c3d.SimpleName): Promise<MeshLike>;
}

export interface CachingMeshCreator extends MeshCreator {
    caching(f: () => Promise<void>): Promise<void>
}

export class SyncMeshCreator implements MeshCreator {
    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, name?: c3d.SimpleName): Promise<MeshLike> {
        const item = obj.CreateMesh(stepData, formNote)!;
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        const grids = mesh.GetBuffers();
        const polygons = mesh.GetEdges(outlinesOnly);
        return {
            faces: grids,
            edges: polygons,
        };
    }
}

// This is the basic mesh creation strategy. It definitely works correctly, but because it lacks parallelism it is slow
export class BasicMeshCreator implements MeshCreator {
    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, name?: c3d.SimpleName): Promise<MeshLike> {
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

// Optimized for solids, computes faces in parallel; faces are cached and so are entire objects.
export class ParallelMeshCreator implements MeshCreator, CachingMeshCreator {
    private readonly fallback = new BasicMeshCreator();
    private faceCache?: Map<c3d.SimpleName, Map<string, c3d.Grid>>;
    private objectCache?: Map<FormAndPrecisionKey, Map<bigint, Promise<MeshLike>>>;

    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, name?: c3d.SimpleName): Promise<MeshLike> {
        if (obj.IsA() !== c3d.SpaceType.Solid) return this.fallback.create(obj, stepData, formNote, outlinesOnly, name);
        const solid = obj as c3d.Solid;

        const { faceCache, objectCache } = this;
        const delay = new Delay<MeshLike>();
        ObjectCache: {
            const id = obj.Id();
            if (objectCache !== undefined) {
                const key = formAndPrecisionCacheKey(stepData, formNote);
                let level = objectCache.get(key);
                if (level === undefined) {
                    level = new Map();
                    objectCache.set(key, level);
                }
                const memoized = level.get(id);
                if (memoized !== undefined) return memoized;
                else level.set(id, delay.promise);
            }
        }

        let cache: Map<string, c3d.Grid> | undefined = undefined;
        FaceCache: {
            if (faceCache !== undefined && name !== undefined) {
                if (faceCache.has(name)) {
                    cache = faceCache.get(name)!;
                } else {
                    cache = new Map();
                    faceCache.set(name, cache);
                }
            }
        }

        c3d.Mutex.EnterParallelRegion();

        // Here we create mesh & grid for each face. Note that Face.CreateMesh doesn't work correctly in this context, and the below
        // is the recommended approach. Also, note that we could create instead one mesh for all of these grids, it's equivalent.
        const facePromises: Promise<void>[] = [];
        const mesh = new c3d.Mesh(false);
        for (const [i, face] of solid.GetFaces().entries()) {
            // Here, "color" is re-used as face index. A face with the same index, the same name, and !GetOwnChanged() is considered cachable
            const id = `${face.GetColor()}/${face.GetNameHash()}`;
            face.SetColor(i);
            if (!face.GetOwnChanged() && cache?.has(id)) {
                mesh.AddExistingGrid(cache?.get(id)!);
            } else {
                const grid = mesh.AddGrid()!;
                face.AttributesConvert(grid);
                grid.SetItem(face);
                grid.SetPrimitiveName(face.GetNameHash());
                grid.SetPrimitiveType(c3d.RefType.TopItem);
                grid.SetStepData(stepData);
                const promise = c3d.TriFace.CalculateGrid_async(face, stepData, grid, false, formNote.Quad(), formNote.Fair());
                if (cache !== undefined) promise.then(() => cache?.set(id, grid));
                facePromises.push(promise);
            }
        }

        const edgePromises: Promise<c3d.Mesh>[] = [];
        for (const edge of solid.GetEdges()) {
            edgePromises.push(edge.CalculateMesh_async(stepData, formNote));
        }

        await Promise.all(facePromises);
        const grids = mesh.GetBuffers();

        const edges = await Promise.all(edgePromises);
        const polygons: c3d.EdgeBuffer[] = [];
        for (const [i, edge] of edges.entries()) {
            const outlines = edge.GetEdges(outlinesOnly);
            if (outlines.length === 0) continue;
            const polygon = outlines[0];
            polygon.i = i;
            polygons.push(polygon);
        }

        c3d.Mutex.ExitParallelRegion();

        const result = {
            faces: grids,
            edges: polygons,
        };
        delay.resolve(result);
        return result;
    }

    async caching(f: () => Promise<void>): Promise<void> {
        this.faceCache = new Map();
        this.objectCache = new Map();
        try { await f() }
        catch (e) { throw e }
        finally {
            this.faceCache = undefined;
            this.objectCache = undefined;
        }
    }
}

type FormAndPrecisionKey = number;
// NOTE: currently we only need SAG, so for perf reasons let's only use that
function formAndPrecisionCacheKey(stepData: c3d.StepData, formNote: c3d.FormNote): FormAndPrecisionKey {
    return stepData.GetSag();
}