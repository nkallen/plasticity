import { CompressedPixelFormat } from 'three';
import c3d from '../../build/Release/c3d.node';
import { Delay } from '../util/SequentialExecutor';

export interface MeshLike {
    faces: c3d.MeshBuffer[];
    edges: c3d.EdgeBuffer[];
}

export interface MeshCreator {
    create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, ancestor?: c3d.Item): Promise<MeshLike>;
    register(solid: c3d.Solid, history: Map<bigint, bigint>): void;
}

export interface CachingMeshCreator extends MeshCreator {
    caching(f: () => Promise<void>): Promise<void>
}

export class SyncMeshCreator implements MeshCreator {
    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, ancestor?: c3d.Item): Promise<MeshLike> {
        const item = obj.CreateMesh(stepData, formNote)!;
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        const grids = mesh.GetBuffers();
        const polygons = mesh.GetEdges(outlinesOnly);
        return {
            faces: grids,
            edges: polygons,
        };
    }

    async caching(f: () => Promise<void>) { }
    register(solid: c3d.Solid, history: Map<bigint, bigint>) { }
}

// This is the basic mesh creation strategy. It definitely works correctly, but because it lacks parallelism it is slow
export class BasicMeshCreator implements MeshCreator {
    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, ancestor?: c3d.Item): Promise<MeshLike> {
        const item = await obj.CreateMesh_async(stepData, formNote);
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        const grids = mesh.GetBuffers();
        const polygons = mesh.GetEdges(outlinesOnly);
        return {
            faces: grids,
            edges: polygons,
        };
    }

    async caching(f: () => Promise<void>) { }
    register(solid: c3d.Solid, history: Map<bigint, bigint>) { }
}

// Optimized for solids, computes faces in parallel; faces are cached and so are entire objects.
export class ParallelMeshCreator implements MeshCreator, CachingMeshCreator {
    private readonly fallback = new BasicMeshCreator();
    private faceCache?: Map<bigint, c3d.MeshBuffer>;
    private objectCache?: Map<FormAndPrecisionKey, Map<bigint, Promise<MeshLike>>>;
    private historyCache?: Map<c3d.Solid, Map<bigint, bigint>>;

    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, ancestor?: c3d.Item): Promise<MeshLike> {
        if (obj.IsA() !== c3d.SpaceType.Solid) return this.fallback.create(obj, stepData, formNote, outlinesOnly, ancestor);
        const solid = obj as c3d.Solid;
        const shell = solid.GetShell()!;

        const { faceCache, historyCache, objectCache } = this;
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
        let history: Map<bigint, bigint> | undefined = undefined;
        history = historyCache?.get(solid);

        c3d.Mutex.EnterParallelRegion();

        // Here we create mesh & grid for each face. Note that Face.CreateMesh doesn't work correctly in this context, and the below
        // is the recommended approach. Also, note that we could create instead one mesh for all of these grids, it's equivalent.
        const facePromises: Promise<c3d.MeshBuffer>[] = [];
        const mesh = new c3d.Mesh(false);
        const faces = shell.GetFaces();
        const existing = [];
        for (const [i, face] of faces.entries()) {
            const id = history?.get(face.Id());
            const isCacheable = !face.GetOwnChanged() && id !== undefined && faceCache !== undefined;
            const existingGrid = isCacheable ? faceCache?.get(id) : undefined;
            if (isCacheable && existingGrid !== undefined) {
                existing.push(existingGrid);
            } else {
                const grid = mesh.AddGrid()!;
                face.AttributesConvert(grid);
                grid.SetItem(face);
                const simpleName = face.GetNameHash();
                grid.SetPrimitiveName(simpleName);
                grid.SetPrimitiveType(c3d.RefType.TopItem);
                grid.SetStepData(stepData);
                const promise = c3d.TriFace.CalculateGrid_async(face, stepData, grid, false, formNote.Quad(), formNote.Fair()).then(() => {
                    const { index, position, normal } = grid.GetBuffers();
                    const bufs: c3d.MeshBuffer = { index, position, normal, grid, model: face, style: face.GetStyle(), simpleName, i };
                    return bufs;
                });
                if (isCacheable) promise.then(bufs => faceCache?.set(id, bufs));
                facePromises.push(promise);
            }
        }

        const edgePromises: Promise<c3d.Mesh>[] = [];
        const edges = solid.GetEdges();
        for (const edge of edges) {
            edgePromises.push(edge.CalculateMesh_async(stepData, formNote));
        }

        const allFaces = existing.concat(await Promise.all(facePromises));

        const edgesMeshes = await Promise.all(edgePromises);
        const polygons: c3d.EdgeBuffer[] = [];
        for (const [i, edgeMesh] of edgesMeshes.entries()) {
            const edge = edges[i];
            const outlines = edgeMesh.GetEdges(outlinesOnly);
            if (outlines.length === 0) continue;
            const polygon = outlines[0];
            polygon.i = i;
            polygons.push(polygon);
            polygon.model = edge;
        }

        c3d.Mutex.ExitParallelRegion();

        const result = {
            faces: allFaces,
            edges: polygons,
        };
        delay.resolve(result);
        return result;
    }

    async caching(f: () => Promise<void>): Promise<void> {
        this.faceCache = new Map();
        this.objectCache = new Map();
        this.historyCache = new Map();
        try { await f() }
        catch (e) { throw e }
        finally {
            this.faceCache = undefined;
            this.objectCache = undefined;
            this.historyCache = undefined;
        }
    }

    register(solid: c3d.Solid, history: Map<bigint, bigint>) {
        this.historyCache?.set(solid, history);
    }
}

type FormAndPrecisionKey = number;
// NOTE: currently we only need SAG, so for perf reasons let's only use that
function formAndPrecisionCacheKey(stepData: c3d.StepData, formNote: c3d.FormNote): FormAndPrecisionKey {
    return stepData.GetSag();
}