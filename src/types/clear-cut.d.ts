declare module 'clear-cut' {
    export function validateSelector(selector: string);
    export function calculateSpecificity(selector: string): number
}