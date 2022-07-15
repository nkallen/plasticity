import { ChangeEvent } from "src/components/creators/NumberScrubber";
import * as visual from '../../VisualModel';
import * as c3d from '../../kernel/kernel';

export declare global {
    export namespace preact.createElement.JSX {
        export interface IntrinsicElements {
            'plasticity-tooltip': { 'command'?: string; 'placement'?: 'top' | 'bottom' | 'left' | 'right', 'children'?: JSX.Element | JSX.Element[] | string };
            'plasticity-number-scrubber': { 'name': string, 'value': number, 'precision'?: number, 'onscrub': (e: ChangeEvent) => void, 'onchange': (e: ChangeEvent) => void, 'onfinish': (e: ChangeEvent) => void, min?: number, max?: number, disabled?: number, default?: number, enabled?: boolean }
            [tag: string]: any
        }
    }
}
