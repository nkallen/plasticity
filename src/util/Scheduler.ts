export class Scheduler<T> {
    private queue: (() => Promise<T>)[];
    private outstanding = 0;

    constructor(
        private readonly concurrency: number,
        private readonly depth: number
    ) {
        this.queue = new Array(concurrency);
    }

    schedule(p: () => Promise<T>) {
        this.queue.push(p);
        this.queue = this.queue.slice(-this.depth, this.queue.length);
        this.pop();
    }

    private async pop() {
        if (this.outstanding < this.concurrency) {
            this.outstanding++;
            const p = this.queue.pop();
            if (p) {
                const result = await p();
                this.outstanding--;
                this.pop();
            }
        }
    }
}