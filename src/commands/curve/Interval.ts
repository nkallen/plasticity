export class Interval {
    constructor(readonly start: number, readonly end: number, readonly cyclic: boolean = false) {
        if (Math.abs(start - end) < 10e-5) throw new Error("invalid precondition");
    }

    trim(from: number, to: number): this[] {
        const { start, end, cyclic } = this;
        if (Math.abs(from - to) <= 10e-4) return [this];
        if (!this.cyclic && from > to) throw new Error("invalid precondition");
        if (from <= start && to >= end && this.start < this.end) return [];
        // if (from >= start && to >= end && this.start > this.end) return [];

        if (!cyclic) {
            if (from >= end && to >= end && this.start < this.end) return [this];
            if (from <= start && to <= start && this.start < this.end) return [this];
            if (from <= start && to <= start && from >= end && this.start > this.end) return [this];

            if (from <= start) {
                if (this.start < this.end) {
                    return [new Interval(to, end)] as this[];
                } else {
                    if (from < start && to <= start) {
                        return [new Interval(start, from)] as this[];
                    } else {
                        return [new Interval(to, end)] as this[];
                    }
                }
            } else if (to >= end) {
                return [new Interval(start, from)] as this[];
            } else {
                return [new Interval(start, from), new Interval(to, end)] as this[];
            }
        } else {
            if (from <= start) {
                return [new Interval(to, end - (start - from))] as this[];
            } else if (to >= end) {
                return [new Interval(start + (to - end), from)] as this[];
            } else {
                return [new Interval(to, from)] as this[];
            }
        }
    }

    multitrim(trims: [from: number, to: number][]): this[] {
        let work: this[] = [this];
        for (const trim of trims) {
            const [from, to] = trim;
            let next: this[] = [];
            while (work.length > 0) {
                const job = work.pop()!;
                next = next.concat(job.trim(from, to));
            }
            work = next;
        }
        return work;
    }
}

export class IntervalWithPoints extends Interval {
    constructor(readonly start: number, readonly end: number, readonly ts: number[], readonly cyclic: boolean = false) {
        super(start, end, cyclic)
    }

    override trim(from: number, to: number): this[] {
        const { ts } = this;
        const is = super.trim(from, to);
        const ips = is.map(i => {
            let ts_: number[];
            if (i.start > i.end) {
                ts_ = [];
                ts_ = ts_.concat(ts.filter(t => t > i.start));
                if (this.end > i.start) ts_.push(this.end);
                ts_ = ts_.concat(ts.filter(t => t < i.end));
            } else {
                ts_ = ts.filter(t => t > i.start && t < i.end);
            }
            return new IntervalWithPoints(i.start, i.end, ts_, i.cyclic);
        })
        return ips as this[];
    }
}