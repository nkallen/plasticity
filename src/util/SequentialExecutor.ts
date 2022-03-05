// There are some "jobs"/tasks that are composed as sequences of promises, and we must not interleave jobs.
// Thus, the SequentialExecutor class prevents that. Cf, CommandExecutor for a more idiosyncratic version of this pattern.
type Queue = Array<[() => Promise<any>, Delay<any>]>;
export class SequentialExecutor {
    private recursive = false;
    private readonly queue: Queue = [];
    private readonly recursiveQueue: Queue = [];
    private active = false;

    async enqueue<T>(f: () => Promise<T>) {
        const completionOfThisJob = new Delay<T>();
        const queue = this.recursive ? this.recursiveQueue : this.queue;
        queue.push([f, completionOfThisJob]);

        if (!this.active) {
            this.active = true;
            this.dequeue(this.queue);
        }
        return completionOfThisJob.promise;
    }
    
    private async dequeue(queue: Queue, deactivateOnCompletion = true) {
        while (queue.length > 0) {
            const [job, delay] = queue.pop()!;
            try {
                this.recursive = true;
                const promise = job();
                this.recursive = false;
                const result = await promise;
                if (this.recursiveQueue.length === 0)
                    delay.resolve(result);
                else {
                    await this.dequeue(this.recursiveQueue, false);
                    delay.resolve(result);
                }
            } catch (e) {
                console.warn(e);
                delay.reject(e);
            }
        }
        if (deactivateOnCompletion) this.active = false;
    }
}

export class Delay<T> {
    readonly resolve!: (value: T | PromiseLike<T>) => void;
    readonly reject!: (reason?: any) => void;
    readonly promise: Promise<T>;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            (this['resolve'] as Delay<T>['resolve']) = resolve;
            (this['reject'] as Delay<T>['resolve']) = reject;
        })
    }
}