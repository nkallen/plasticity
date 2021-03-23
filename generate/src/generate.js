#!/usr/bin/env node

'use strict';

import path from 'path';
import ejs from 'ejs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import api from '../api.js';
import beautify from 'js-beautify';
import os from 'os';
import fse from 'fs-extra';
import util from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class Klass {
    constructor(name, desc) {
        this.name = name;
        this.desc = desc;
    }

    get cppClassName() {
        return this.name;
    }
}

const classes = [];
for (const klass in api.classes) {
    classes.push(new Klass(klass, api.classes[klass]));
}

const tempDirPath = path.join(os.tmpdir(), 'ispace');
const tempSrcDirPath = path.join(tempDirPath, 'src');
const tempIncludeDirPath = path.join(tempDirPath, 'include');

const finalSrcDirPath = path.join(__dirname, '../../lib/c3d/src');
const finalIncludeDirPath = path.join(__dirname, '../../lib/c3d/include');

await fse.copy(path.resolve(__dirname, '../manual/include'), tempIncludeDirPath);
await fse.copy(path.resolve(__dirname, '../manual/src'), tempSrcDirPath);

const templates = {
    binding: util.readLocalFile('templates/binding.gyp'),
    index: util.readLocalFile('templates/index.cc'),
}
for (const k in templates) {
    templates[k] = ejs.compile(templates[k], {});
}

util.writeLocalFile('../binding.gyp', beautify(templates.binding({ classes: classes })), 'binding.gyp');
util.writeLocalFile('../lib/c3d/index.cc', beautify(templates.index({ classes: classes })), 'index.cc');

await util.syncDirs(tempSrcDirPath, finalSrcDirPath);
await util.syncDirs(tempIncludeDirPath, finalIncludeDirPath);

console.log(finalSrcDirPath);

await fse.remove(tempDirPath);
