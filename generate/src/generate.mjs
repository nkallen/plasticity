#!/usr/bin/env node

'use strict';

import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import api from '../api.mjs';
import beautify from 'js-beautify';
import os from 'os';
import fse from 'fs-extra';
import util from './util.mjs';
import Parse from './parser.mjs';
import _ from 'underscore';
import cp from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse a description of the API.

const declarations = Parse(api);

// Load some templates.

const templates = {
    binding: util.readLocalFile('templates/binding.gyp'),
    index: util.readLocalFile('templates/index.cc'),
    class_header: util.readLocalFile('templates/class_header.h'),
    class_content: util.readLocalFile('templates/class_content.cc'),
    module_header: util.readLocalFile('templates/module_header.h'),
    module_content: util.readLocalFile('templates/module_content.cc'),
    type_declaration: util.readLocalFile('templates/c3d.d.ts'),
}
for (const k in templates) {
    templates[k] = ejs.compile(templates[k], {
        views: [path.join(__dirname, "../templates/partials")]
    });
}

// We generate the code first into /tmp, then sync everything back to our project
// in lib/c3d

const tempDirPath = path.join(os.tmpdir(), 'c3d');
const tempSrcDirPath = path.join(tempDirPath, 'src');
const tempIncludeDirPath = path.join(tempDirPath, 'include');

const finalSrcDirPath = path.join(__dirname, '../../lib/c3d/src');
const finalIncludeDirPath = path.join(__dirname, '../../lib/c3d/include');

// While most things are automatically generated, some things are done by hand.

await fse.copy(path.resolve(__dirname, '../manual/include'), tempIncludeDirPath);
await fse.copy(path.resolve(__dirname, '../manual/src'), tempSrcDirPath);

// First start with 'binding' and 'index'. They describe how to build the project,
// cf node-gyp documentation for details.

util.writeLocalFile('../binding.gyp', beautify(templates.binding({ classes: declarations })), 'binding.gyp');
util.writeLocalFile('../lib/c3d/index.cc', beautify(templates.index({ classes: declarations })), 'index.cc');

util.writeLocalFile('../lib/c3d/c3d.d.ts', beautify(templates.type_declaration({ classes: declarations })), "c3d.d.ts");

// Auto-generate the c++ files from the api description

for (const klass of declarations) {
    if (klass.ignore) continue;

    util.writeFile(
        path.join(tempIncludeDirPath, klass.cppClassName + '.h'),
        templates[klass.templatePrefix + '_header']({ klass: klass }),
        klass.cppClassName + '.h');

    util.writeFile(
        path.join(tempSrcDirPath, klass.cppClassName + '.cc'),
        templates[klass.templatePrefix + '_content']({ klass: klass }),
        klass.cppClassName + '.cc');
}

// Pretty-print the c++ just so we can debug more easily (optional)

const astyle = (process.platform == 'darwin' || process.platform == 'linux') ? cp.execSync('command -v astyle') : cp.execSync('where astyle');
if (astyle) {
    cp.execSync(
        'astyle --options=".astylerc" ' + tempSrcDirPath + '/*.cc ' +
        tempIncludeDirPath + '/*.h');

    cp.execSync(
        'rm ' + tempSrcDirPath + '/*.cc.orig ' + tempIncludeDirPath +
        '/*.h.orig');
}

// Sync from /tmp into lib/c3d

await util.syncDirs(tempSrcDirPath, finalSrcDirPath);
await util.syncDirs(tempIncludeDirPath, finalIncludeDirPath);

// await fse.remove(tempDirPath);
