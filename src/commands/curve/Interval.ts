export class Interval {
    constructor(readonly start: number, readonly end: number, readonly cyclic: boolean = false) {
    }

    trim(from: number, to: number): Interval[] {
        const { start, end, cyclic } = this;
        if (Math.abs(from - to) <= 10e-4) return [this];
        if (from > to) throw new Error("invalid precondition");
        if (from <= start && to >= end) return [];
        
        if (!cyclic) {
            if (from >= end && to >= end) return [this];
            if (from <= start && to <= start) return [this];

            if (from <= start) {
                return [new Interval(to, end)];
            } else if (to >= end) {
                return [new Interval(start, from)];
            } else {
                return [new Interval(start, from), new Interval(to, end)];
            }
        } else {
            if (from <= start) {
                return [new Interval(to, end - (start - from))];
            } else if (to >= end) {
                return [new Interval(start + (to - end), from)];
            } else {
                return [new Interval(to, from)];
            }
        }
    }

    multitrim(trims: [from: number, to: number][]) {
        let work: Interval[] = [this];
        for (const trim of trims) {
            const [from, to] = trim;
            let next: Interval[] = [];
            while (work.length > 0) {
                const job = work.pop()!;
                next = next.concat(job.trim(from, to));
            }
            work = next;
        }
        return work;
    }
}
