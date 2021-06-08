import { ChangeEvent } from "src/components/modifiers/NumberScrubber";
import * as visual from '../../VisualModel';

export declare global {
    export namespace preact.createElement.JSX {
        export interface IntrinsicElements {
            'ispace-tooltip': { 'command': string; 'children': JSX.Element | JSX.Element[] | string };
            'ispace-number-scrubber': { 'name': string, 'value': number, 'onchange': (e: ChangeEvent) => void, 'onfinish': (e: Event) => void }
            'ispace-creator': { 'parameters': any, 'index': number, item: visual.Item };
        }
    }
}
