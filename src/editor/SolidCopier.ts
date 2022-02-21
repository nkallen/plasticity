import c3d from '../../build/Release/c3d.node';

export class SolidCopier {
    private readonly _faces = new Map<bigint, bigint>();
    get faces(): ReadonlyMap<bigint, bigint> { return this._faces }

    pool(solid: c3d.Solid, size: number) {
        const underlying = new c3d.SolidPool(solid);
        return new SolidCopierPool(underlying, this._faces);
    }
}

const defaultPoolSize = 10;
const refillAt = 5;
export class SolidCopierPool {
    constructor(private readonly pool: c3d.SolidPool, private readonly faceHistory: Map<bigint, bigint>) {
        this.pool.Alloc_async(defaultPoolSize);
    }

    async Pop(): Promise<c3d.Solid> {
        const { faceHistory } = this;
        const result = await this.pool.Pop_async();
        if (this.pool.Count() == refillAt) this.pool.Alloc_async(defaultPoolSize);
        const { originalFaceIds, copyFaceIds } = result.GetBuffers();
        for (let i = 0, n = originalFaceIds.length; i < n; i++) {
            faceHistory.set(copyFaceIds[i], originalFaceIds[i]);
        }
        return result.GetCopy()!;
    }
}