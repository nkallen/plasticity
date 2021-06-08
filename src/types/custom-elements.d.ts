import { ChangeEvent } from "src/components/modifiers/NumberScrubber";

export declare global {
    export namespace preact.createElement.JSX {
        export interface IntrinsicElements {
            'ispace-tooltip': { 'command': string; 'children': JSX.Element | JSX.Element[] | string };
            'ispace-number-scrubber': { 'name': string, 'value': number, 'onchange': (e: ChangeEvent) => void, 'onfinish': (e: Event) => void }
        }
    }
}

export declare global {
    export namespace preact.createElement.JSX {
        export interface IntrinsicElements {
            'ispace-creator': any;
        }
    }
}