import c3d from '../../build/Release/c3d.node';
import { Delay } from '../util/SequentialExecutor';
import { SolidCopier } from './SolidCopier';

export interface MeshLike {
    faces: c3d.MeshBuffer[];
    edges: c3d.EdgeBuffer[];
}

export interface MeshCreator {
    create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike>;
}

export interface CachingMeshCreator extends MeshCreator {
    caching(f: () => Promise<void>): Promise<void>
}

export class SyncMeshCreator implements MeshCreator {
    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
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

export class ParallelMeshCreator implements MeshCreator {
    private readonly fallback = new BasicMeshCreator();

    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
        if (obj.IsA() !== c3d.SpaceType.Solid) return this.fallback.create(obj, stepData, formNote, outlinesOnly);
        const solid = obj as c3d.Solid;
        const shell = solid.GetShell()!;

        c3d.Mutex.EnterParallelRegion();

        const facePromises: Promise<c3d.MeshBuffer>[] = [];
        const mesh = new c3d.Mesh(false);
        const faces = shell.GetFaces();
        for (const [i, face] of faces.entries()) {
            const grid = mesh.AddGrid()!;
            face.AttributesConvert(grid);
            grid.SetItem(face);
            const simpleName = face.GetNameHash();
            grid.SetPrimitiveName(simpleName);
            grid.SetPrimitiveType(c3d.RefType.TopItem);
            grid.SetStepData(stepData);
            // NOTE: there is a significant performance penalty for using calculateFace, so it is inlined here
            const buf = c3d.TriFace.CalculateGrid_async(face, stepData, grid, false, formNote.Quad(), formNote.Fair()).then(() => {
                const { index, position, normal } = grid.GetBuffers();
                const bufs: c3d.MeshBuffer = { index, position, normal, grid, model: face, style: face.GetStyle(), simpleName, i };
                return bufs;
            })
            facePromises.push(buf);
        }

        const edgePromises: Promise<c3d.Mesh>[] = [];
        const edges = solid.GetEdges();
        for (const edge of edges) {
            edgePromises.push(edge.CalculateMesh_async(stepData, formNote));
        }

        const edgeResult_ = await Promise.all(edgePromises);
        const edgeResult = [];
        for (const [i, mesh] of edgeResult_.entries()) {
            // NOTE: there is a significant performance penalty for using calculateEdges, so it is inlined here
            const edge = edges[i];
            const outlines = mesh.GetEdges(outlinesOnly);
            if (outlines.length === 0) continue;
            const polygon = outlines[0];
            polygon.i = i;
            polygon.model = edge;
            edgeResult.push(polygon);
        }

        const faceResult = await Promise.all(facePromises);
        c3d.Mutex.ExitParallelRegion();

        return {
            faces: faceResult,
            edges: edgeResult
        };
    }

    async calculateFace(mesh: c3d.Mesh, face: c3d.Face, stepData: c3d.StepData, formNote: c3d.FormNote, i: number): Promise<c3d.MeshBuffer> {
        const grid = mesh.AddGrid()!;
        face.AttributesConvert(grid);
        grid.SetItem(face);
        const simpleName = face.GetNameHash();
        grid.SetPrimitiveName(simpleName);
        grid.SetPrimitiveType(c3d.RefType.TopItem);
        grid.SetStepData(stepData);
        await c3d.TriFace.CalculateGrid_async(face, stepData, grid, false, formNote.Quad(), formNote.Fair())
        const { index, position, normal } = grid.GetBuffers();
        const bufs: c3d.MeshBuffer = { index, position, normal, grid, model: face, style: face.GetStyle(), simpleName, i };
        return bufs;
    }

    async calculateEdge(edge: c3d.CurveEdge, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean, i: number): Promise<c3d.EdgeBuffer | undefined> {
        const mesh = await edge.CalculateMesh_async(stepData, formNote);
        const outlines = mesh.GetEdges(outlinesOnly);
        if (outlines.length === 0) return;
        const polygon = outlines[0];
        polygon.i = i;
        polygon.model = edge;
        return polygon;
    }
}

export class DontCacheMeshCreator implements CachingMeshCreator {
    constructor(private readonly underlying: MeshCreator) { }
    caching(f: () => Promise<void>) { return f() }
    create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
        return this.underlying.create(obj, stepData, formNote, outlinesOnly);
    }
}

export class DoCacheMeshCreator implements CachingMeshCreator {
    cache?: MeshCreator;

    constructor(private readonly fallback: ParallelMeshCreator, private readonly copier: SolidCopier) { }

    async caching(f: () => Promise<void>) {
        this.cache = new ObjectCacheMeshCreator(new FaceCacheMeshCreator(this.fallback, this.copier));
        try {
            const result = await f();
            return result;
        } finally {
            this.cache = undefined;
        }
    }

    create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
        const creator = this.cache ?? this.fallback;
        return creator.create(obj, stepData, formNote, outlinesOnly);
    }
}

export class ObjectCacheMeshCreator implements MeshCreator {
    private objectCache = new Map<FormAndPrecisionKey, Map<bigint, Promise<MeshLike>>>();

    constructor(private readonly underlying: MeshCreator) { }

    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
        const { objectCache, underlying } = this;
        const delay = new Delay<MeshLike>();
        const id = obj.Id();
        const key = formAndPrecisionCacheKey(stepData, formNote);
        let level = objectCache.get(key);
        if (level === undefined) {
            level = new Map();
            objectCache.set(key, level);
        }

        const memoized = level.get(id);
        if (memoized !== undefined) return memoized;
        else level.set(id, delay.promise);

        const result = underlying.create(obj, stepData, formNote, outlinesOnly);
        delay.resolve(result);
        return result;
    }
}

export class FaceCacheMeshCreator implements MeshCreator {
    private readonly fallback = new BasicMeshCreator();
    private readonly faceCache = new Map<bigint, [c3d.MeshBuffer, c3d.EdgeBuffer[]]>();

    constructor(private readonly underlying: ParallelMeshCreator, private readonly copier: SolidCopier) { }

    async create(obj: c3d.Item, stepData: c3d.StepData, formNote: c3d.FormNote, outlinesOnly: boolean): Promise<MeshLike> {
        if (obj.IsA() !== c3d.SpaceType.Solid) return this.fallback.create(obj, stepData, formNote, outlinesOnly);
        const { faceCache, copier: { faces: history }, underlying } = this;

        const solid = obj as c3d.Solid;
        const shell = solid.GetShell()!;

        c3d.Mutex.EnterParallelRegion();

        const facePromises: Promise<c3d.MeshBuffer>[] = [];
        const edgePromises: Promise<c3d.EdgeBuffer[]>[] = [];
        const mesh = new c3d.Mesh(false);
        const cachedFaces = [];
        const cachedEdges = [];
        let j = 0;
        const faces = shell.GetFaces();
        const seenEdges = new Set<bigint>();
        for (const [i, face] of faces.entries()) {
            const id = history.get(face.Id());
            const isCacheable = !face.GetOwnChanged() && id !== undefined;
            const existingGrid = isCacheable ? faceCache.get(id) : undefined;
            if (isCacheable && existingGrid !== undefined) {
                const [face, edges] = existingGrid;
                cachedFaces.push(face);
                cachedEdges.push(...edges);
            } else {
                const facePromise = underlying.calculateFace(mesh, face, stepData, formNote, i);
                const edges = face.GetEdges().filter(e => !seenEdges.has(e.Id()));
                const indexes: number[] = [];
                const edgeMeshPromises = edges.map(e => {
                    seenEdges.add(e.Id());
                    indexes.push(j++);
                    return e.CalculateMesh_async(stepData, formNote)
                });
                const edgeBufferPromises = this.cacheFace(id, isCacheable, facePromise, edges, indexes, edgeMeshPromises, outlinesOnly);
                facePromises.push(facePromise);
                edgePromises.push(edgeBufferPromises);
            }
        }

        const edgeBufferss = await Promise.all(edgePromises);
        const edgeBuffers = [];
        for (const edge of edgeBufferss) {
            edgeBuffers.push(...edge);
        }
        const allEdges = cachedEdges.concat(edgeBuffers);

        const allFaces = cachedFaces.concat(await Promise.all(facePromises));
        c3d.Mutex.ExitParallelRegion();

        return {
            faces: allFaces,
            edges: allEdges,
        };
    }

    private async cacheFace(id: bigint | undefined, isCacheable: boolean, facePromise: Promise<c3d.MeshBuffer>, edges: c3d.CurveEdge[], indexes: number[], edgePromises: Promise<c3d.Mesh>[], outlinesOnly: boolean) {
        const faceCache = this.faceCache;
        const edges_ = await Promise.all(edgePromises);
        const edgeResult = [];
        for (const [i, mesh] of edges_.entries()) {
            const outlines = mesh.GetEdges(outlinesOnly);
            if (outlines.length === 0) continue;
            const polygon = outlines[0];
            polygon.i = indexes[i];
            polygon.model = edges[i];
            edgeResult.push(polygon);
        }
        if (isCacheable) {
            const faceResult = await facePromise;
            faceCache.set(id!, [faceResult, edgeResult]);
        }
        return edgeResult;
    }
}

type FormAndPrecisionKey = number;
// NOTE: currently we only need SAG, so for perf reasons let's only use that
function formAndPrecisionCacheKey(stepData: c3d.StepData, formNote: c3d.FormNote): FormAndPrecisionKey {
    return stepData.GetSag();
}
