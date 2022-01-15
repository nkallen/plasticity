import fs from 'fs';
import json5 from 'json5';
import path from 'path';
// TODO: once we have top-level await, import inside load-theme to avoid mutating global.
import theme from './default-theme';

export type Theme = typeof import('./default-theme')

export function loadTheme() {
    const userTheme = path.join(process.env.PLASTICITY_HOME!, 'theme.json');
    if (fs.existsSync(userTheme)) {
        try {
            const parsed = json5.parse(fs.readFileSync(userTheme).toString());
            const colorInfo = parsed.colors;

            const style = document.documentElement.style;
            const simpleColors = ['viewport', 'dialog', 'matcap', 'grid'];
            for (const colorName of simpleColors) {
                const color = colorInfo[colorName];
                if (color === undefined) continue;
                style.setProperty(`--${colorName}`, color);
                theme.colors[colorName as 'viewport'] = color;
            };
            for (const colorName of ['neutral', 'accent', 'supporting', 'red', 'green', 'blue', 'yellow']) {
                const colorInfo = parsed.colors[colorName];
                if (colorInfo === undefined) continue;
                for (const shadeName of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
                    const shadeInfo = colorInfo[shadeName];
                    if (shadeInfo === undefined) continue;
                    style.setProperty(`--${colorName}-${shadeName}`, shadeInfo);
                    theme.colors[colorName as 'neutral'][shadeName as '50'] = shadeInfo;
                }
            };
        } catch (e) {
            console.error(e);
        }
    }
    return theme;
}