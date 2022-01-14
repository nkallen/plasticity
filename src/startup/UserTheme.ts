import fs from 'fs';
import json5 from 'json5';
import path from 'path';

export function loadTheme() {
    const userTheme = path.join(process.env.PLASTICITY_HOME!, 'theme.json');
    if (fs.existsSync(userTheme)) {
        try {
            const parsed = json5.parse(fs.readFileSync(userTheme).toString());
            const colorInfo = parsed.colors;

            const style = document.documentElement.style;
            for (const colorName of ['viewport', 'dialog', 'matcap', 'grid']) {
                const color = colorInfo[colorName];
                console.log(colorName, color);
                if (color === undefined) continue;
                style.setProperty(`--${colorName}`, color);
            };
            for (const colorName of ['neutral', 'accent', 'supporting', 'red', 'green', 'blue', 'yellow']) {
                const colorInfo = parsed.colors[colorName];
                if (colorInfo === undefined) continue;
                for (const shadeName of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
                    const shadeInfo = colorInfo[shadeName];
                    if (shadeInfo === undefined) continue;
                    style.setProperty(`--${colorName}-${shadeName}`, shadeInfo);
                }
            };
        } catch (e) {
            console.error(e);
        }
    }
}