import { ChangeEvent } from "src/components/modifiers/NumberScrubber";
import * as visual from '../../VisualModel';
import c3d from '../../../build/Release/c3d.node';

export declare global {
    export namespace preact.createElement.JSX {
        export interface IntrinsicElements {
            'ispace-tooltip': { 'command': string; 'children': JSX.Element | JSX.Element[] | string };
            'ispace-number-scrubber': { 'name': string, 'value': number, 'onscrub': (e: ChangeEvent) => void, 'onchange': (e: ChangeEvent) => void, 'onfinish': (e: Event) => void }
            'ispace-creator': { 'creator': c3d.Creator, 'index': number, item: visual.Item };
        }
    }
}
