import fs from 'fs';
import json5 from 'json5';
import path from 'path';
import defaultKeymap from "./default-keymap";
import { editor } from '../renderer';

export function loadKeymap() {
    editor.keymaps.add('/default', defaultKeymap);
    const userKeymap = path.join(process.env.PLASTICITY_HOME!, 'keymap.json');
    if (fs.existsSync(userKeymap)) {
        try {
            const parsed = json5.parse(fs.readFileSync(userKeymap).toString());
            editor.keymaps.add('/user', parsed, 100);
        } catch (e) {
            console.error(e);
        }
    }
}