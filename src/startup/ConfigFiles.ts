import fs from 'fs';
import fse from 'fs-extra';
import json5 from 'json5';
import os from 'os';
import path from 'path';
import { assertUnreachable } from '../util/Util';
import defaultKeymap from "./default-keymap";
import defaultSettings from './default-settings';
import defaultTheme from './default-theme';

export type Theme = typeof import('./default-theme');
export type Settings = typeof import('./default-settings');
export type Mode = 'default' | 'blender' | 'maya' | 'moi' | '3dsmax' | 'touchpad';

export class ConfigFiles {
    static readonly homePath = path.join(os.homedir(), '.plasticity');
    static readonly userKeymapPath = path.join(this.homePath, 'keymap.json');
    static readonly userThemePath = path.join(this.homePath, 'theme.json');
    static readonly userSettingsPath = path.join(this.homePath, 'settings.json');

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

    static loadSettings() {
        if (fs.existsSync(this.userSettingsPath)) {
            try {
                const parsed = json5.parse(fs.readFileSync(this.userSettingsPath).toString());
                merge(defaultSettings, parsed);
            } catch (e) {
                console.error(e);
            }
        }

        return defaultSettings;
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
                        break;
                    case 'moi':
                        parsed['orbit-controls'] = {
                            "mouse2": "orbit:rotate",
                            "mouse1": "orbit:pan",
                            "shift-mouse2": "orbit:pan",
                            "alt-mouse2": "orbit:dolly",
                        }
                        break;
                    case '3dsmax':
                        parsed['orbit-controls'] = {
                            "mouse1": "orbit:pan",
                            "alt-mouse1": "orbit:rotate",
                            "ctrl-alt-mouse1": "orbit:dolly",
                        }
                        break;
                    case 'touchpad':
                        parsed['orbit-controls'] = {
                            "pinch": "orbit:dolly",
                            "gesture": "orbit:pan",
                        }
                        break;
                    default: assertUnreachable(mode);
                }
                fs.writeFileSync(ConfigFiles.userKeymapPath, json5.stringify(parsed, null, 4));
            } catch (e) {
                console.error(e);
            }
        }
    }
}

function merge(canon: Record<string, any>, custom: Record<string, any>) {
    for (const [k, v] of Object.entries(canon)) {
        if (custom[k] === undefined) continue;
        if (typeof v === 'object') {
            merge(canon[k], custom[k]);
        } else {
            canon[k] = custom[k];
        }
    }
}