export class Scheduler<T> {
    private queue: (() => Promise<T>)[];
    private outstanding = 0;

    constructor(
        private readonly concurrency: number,
        private readonly depth: number
    ) {
        this.queue = new Array();
    }

    schedule(p: () => Promise<T>) {
        if (this.queue.length > 0) console.warn("Dropping job because of latency");
        this.queue.push(p);
        this.queue = this.queue.slice(-this.depth, this.queue.length);
        this.pop();
    }

    private async pop() {
        if (this.outstanding < this.concurrency) {
            const p = this.queue.pop();
            if (p) {
                this.outstanding++;
                await p();
                this.outstanding--;
                this.pop();
            }
        }
    }
}