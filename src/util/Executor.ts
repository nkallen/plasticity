// There are some "jobs"/tasks that are composed as sequences of promises, and we must not interleave jobs.
// Thus, the Executor class prevents that. Cf, CommandExecutor for a more idiosyncratic version of this pattern.
export class SequentialExecutor<T> {
    private readonly queue = new Array<[() => Promise<T>, Delay<T>]>();
    private active = false;

    async enqueue(f: () => Promise<T>) {
        const d = new Delay<T>();
        this.queue.push([f, d]);
        if (this.active) return d;
        else {
            await this.dequeue();
            return d.promise;
        }
    }

    async dequeue() {
        this.active = true;
        while (this.queue.length > 0) {
            const [job, delay] = this.queue.pop()!;
            try {
                const result = await job();
                delay.resolve(result);
            } catch (e) {
                console.warn(e);
                delay.reject(e);
            }
        }
        this.active = false;
    }
}

export class Delay<T> {
    readonly resolve!:(value: T | PromiseLike<T>) => void;
    readonly reject!: (reason?: any) => void;
    readonly promise: Promise<T>;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            (this['resolve'] as Delay<T>['resolve']) = resolve;
            (this['reject'] as Delay<T>['resolve']) = reject;
        })
    }
}