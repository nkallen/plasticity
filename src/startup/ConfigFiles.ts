import fs from 'fs';
import json5 from 'json5';
import path from 'path';
import defaultKeymap from "./default-keymap";
import defaultTheme from './default-theme';
import os from 'os';
import fse from 'fs-extra';

export type Theme = typeof import('./default-theme')
export type Mode = 'default' | 'blender' | 'maya' | 'moi';

export class ConfigFiles {
    static readonly homePath = path.join(os.homedir(), '.plasticity');
    static readonly userKeymapPath = path.join(this.homePath, 'keymap.json');
    static readonly userThemePath = path.join(this.homePath, 'theme.json');

    static create() {
        if (!fs.existsSync(this.homePath)) {
            fse.copySync(path.join(__dirname, 'dot-plasticity'), this.homePath);
        }
    }

    static loadKeymap(into: AtomKeymap.KeymapManager) {
        into.add('/default', defaultKeymap);
        if (fs.existsSync(ConfigFiles.userKeymapPath)) {
            try {
                const parsed = json5.parse(fs.readFileSync(ConfigFiles.userKeymapPath).toString());
                into.add('/user', parsed, 100);
            } catch (e) {
                console.error(e);
            }
        }
    }

    static loadTheme() {
        if (fs.existsSync(this.userThemePath)) {
            try {
                const parsed = json5.parse(fs.readFileSync(this.userThemePath).toString());
                const colorInfo = parsed.colors;

                const style = document.documentElement.style;
                const simpleColors = ['viewport', 'dialog', 'matcap', 'grid'];
                for (const colorName of simpleColors) {
                    const color = colorInfo[colorName];
                    if (color === undefined) continue;
                    style.setProperty(`--${colorName}`, color);
                    defaultTheme.colors[colorName as 'viewport'] = color;
                };
                for (const colorName of ['neutral', 'accent', 'supporting', 'red', 'green', 'blue', 'yellow']) {
                    const colorInfo = parsed.colors[colorName];
                    if (colorInfo === undefined) continue;
                    for (const shadeName of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
                        const shadeInfo = colorInfo[shadeName];
                        if (shadeInfo === undefined) continue;
                        style.setProperty(`--${colorName}-${shadeName}`, shadeInfo);
                        defaultTheme.colors[colorName as 'neutral'][shadeName as '50'] = shadeInfo;
                    }
                };
            } catch (e) {
                console.error(e);
            }
        }
        return defaultTheme;
    }

    static updateOrbitControls(mode: Mode) {
        if (fs.existsSync(ConfigFiles.userKeymapPath)) {
            try {
                const parsed = json5.parse(fs.readFileSync(ConfigFiles.userKeymapPath).toString());
                switch (mode) {
                    case 'default':
                        parsed['orbit-controls'] = {
                            "mouse1": "orbit:rotate",
                            "mouse2": "orbit:pan",
                        }
                        break;
                    case 'blender':
                        parsed['orbit-controls'] = {
                            "mouse1": "orbit:rotate",
                            "shift-mouse1": "orbit:pan",
                            "ctrl-mouse1": "orbit:dolly",
                        }
                        break;
                    case 'maya':
                        parsed['orbit-controls'] = {
                            "alt-mouse0": "orbit:rotate",
                            "alt-mouse1": "orbit:pan",
                            "alt-mouse2": "orbit:dolly"
                        }
                    case 'moi':
                        parsed['orbit-controls'] = {
                            "mouse2": "orbit:rotate",
                            "mouse1": "orbit:pan",
                            "shift-mouse2": "orbit:pan",
                            "alt-mouse2": "orbit:dolly",
                        }
                }
                fs.writeFileSync(ConfigFiles.userKeymapPath, json5.stringify(parsed, null, 4));
            } catch (e) {
                console.error(e);
            }
        }
    }
}