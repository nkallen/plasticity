#!/usr/bin/env node

'use strict';

import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import api from '../api.js';
import beautify from 'js-beautify';
import os from 'os';
import fse from 'fs-extra';
import util from './util.js';
import { ClassDeclaration } from './parser.js';
import _ from 'underscore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse a description of the API.

const classes = [];
for (const klass in api.classes) {
    classes.push(new ClassDeclaration(klass, api.classes[klass]));
}

// Load some templates.

const templates = {
    binding: util.readLocalFile('templates/binding.gyp'),
    index: util.readLocalFile('templates/index.cc'),
    class_header: util.readLocalFile('templates/class_header.h'),
    class_content: util.readLocalFile('templates/class_content.cc'),
}
for (const k in templates) {
    templates[k] = ejs.compile(templates[k], {
        views: [path.join(__dirname, "../templates/partials")]
    });
}

// We generate the code first into /tmp, then sync everything back to our project
// in lib/c3d

const tempDirPath = path.join(os.tmpdir(), 'ispace');
const tempSrcDirPath = path.join(tempDirPath, 'src');
const tempIncludeDirPath = path.join(tempDirPath, 'include');

const finalSrcDirPath = path.join(__dirname, '../../lib/c3d/src');
const finalIncludeDirPath = path.join(__dirname, '../../lib/c3d/include');

// While most things are automatically generated, some things are done by hand.

await fse.copy(path.resolve(__dirname, '../manual/include'), tempIncludeDirPath);
await fse.copy(path.resolve(__dirname, '../manual/src'), tempSrcDirPath);

// First start with 'binding' and 'index'. They describe how to build the project,
// cf node-gyp documentation for details.

util.writeLocalFile('../binding.gyp', beautify(templates.binding({ classes: classes })), 'binding.gyp');
util.writeLocalFile('../lib/c3d/index.cc', beautify(templates.index({ classes: classes })), 'index.cc');

// Auto-generate the c++ files from the api description

try {
    for (const klass of classes) {
        util.writeFile(
            path.join(tempIncludeDirPath, klass.cppClassName + '.h'),
            templates.class_header({ klass: klass }),
            klass.cppClassName + '.h');

        util.writeFile(
            path.join(tempSrcDirPath, klass.cppClassName + '.cc'),
            templates.class_content({ klass: klass }),
            klass.cppClassName + '.cc');
    }
} catch (e) {
    console.log(e);
    throw e;
}

// Sync from /tmp into lib/c3d

await util.syncDirs(tempSrcDirPath, finalSrcDirPath);
await util.syncDirs(tempIncludeDirPath, finalIncludeDirPath);

await fse.remove(tempDirPath);
