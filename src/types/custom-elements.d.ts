import { ChangeEvent } from "src/components/creators/NumberScrubber";
import * as visual from '../../VisualModel';
import c3d from '../../../build/Release/c3d.node';

export declare global {
    export namespace preact.createElement.JSX {
        export interface IntrinsicElements {
            'plasticity-tooltip': { 'command'?: string; 'placement'?: 'top' | 'bottom' | 'left' | 'right', 'children': JSX.Element | JSX.Element[] | string };
            'ispace-number-scrubber': { 'name': string, 'value': number, 'onscrub': (e: ChangeEvent) => void, 'onchange': (e: ChangeEvent) => void, 'onfinish': (e: Event) => void, min?: number, max?: number, disabled?: number, default?: number, enabled?: boolean }
            [tag: string]: any
        }
    }
}
