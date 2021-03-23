#!/usr/bin/env node

'use strict';

import path from 'path';
import ejs from 'ejs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import api from '../api.js';
import beautify from 'js-beautify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const str = fs.readFileSync(path.join(__dirname, "../templates/binding.gyp")).toString();
const template = ejs.compile(str, {});

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

console.log(beautify(template({classes: classes})));