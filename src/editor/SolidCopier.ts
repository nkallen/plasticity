import c3d from '../../build/Release/c3d.node';

export class SolidCopier {
    private _faces?: Map<bigint, bigint> = undefined;
    get faces(): ReadonlyMap<bigint, bigint> { return this._faces ?? new Map() }

    pool(solid: c3d.Solid, size: number) {
        const underlying = new c3d.SolidPool(solid);
        return new SolidCopierPool(underlying, this._faces);
    }

    async caching(f: () => Promise<void>) {
        this._faces = new Map();
        try {
            const result = await f();
            return result;
        } finally {
            this._faces = undefined;
        }
    }
}

const defaultPoolSize = 10;
const refillAt = 5;
export class SolidCopierPool {
    constructor(private readonly pool: c3d.SolidPool, private readonly faceHistory: Map<bigint, bigint> | undefined) {
        this.pool.Alloc_async(defaultPoolSize);
    }

    async Pop(): Promise<c3d.Solid> {
        const result = await this.pool.Pop_async();
        if (this.pool.Count() == refillAt) this.pool.Alloc_async(defaultPoolSize);
        const { faceHistory } = this;
        if (faceHistory !== undefined) {
            const { originalFaceIds, copyFaceIds } = result.GetBuffers();
            for (let i = 0, n = originalFaceIds.length; i < n; i++) {
                faceHistory.set(copyFaceIds[i], originalFaceIds[i]);
            }
        }
        return result.GetCopy()!;
    }
}