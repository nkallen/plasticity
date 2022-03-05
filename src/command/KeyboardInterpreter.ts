
export class KeyboardInterpreter {
    private _state = "";
    private caret = 0;
    get state() { return this._state; }

    interpret(event: KeyboardEvent) {
        if (/^[0-9.\-]$/.test(event.key)) {
            this._state += event.key;
            this.caret++;
        } else {
            switch (event.key) {
                case 'Backspace':
                    this._state = this._state.slice(0, this._state.length - 1);
            }
        }
    }
}
