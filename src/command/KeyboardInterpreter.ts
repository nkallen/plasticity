
export class KeyboardInterpreter {
    private _state = "";
    private caret = 0;
    get state() { return this._state; }

    interpret(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft') {
            this.caret = Math.max(0, this.caret - 1);
        } else if (event.key === 'ArrowRight') {
            this.caret = Math.min(this._state.length, this.caret + 1);
        } else if (/^[0-9.\-]$/.test(event.key)) {
            const state = this._state;
            const before = state.slice(0, this.caret);
            const after = state.slice(this.caret, state.length);
            this._state = `${before}${event.key}${after}`
            this.caret++;
        } else {
            switch (event.key) {
                case 'Backspace':
                    this._state = this._state.slice(0, this._state.length - 1);
            }
        }
    }
}

export class TextCalculator {
    static calculate(text: string): number | undefined {
        if (text === "") return undefined;

        const trailingMinus = /^([0-9.]+)-$/.exec(text);
        if (trailingMinus) {
            const number = this.calculate(trailingMinus[1]);
            if (number === undefined) return undefined;
            return number * -1;
        };

        const numbered = Number(text);
        if (Number.isNaN(numbered)) return undefined;
        else return numbered;
    }
}