import { performance } from 'perf_hooks';

// Bitmaps inspired by Blender:
class Bitmap {
    power = 5;
    mask = 31;

    constructor(total) {
        const numBlocks = (total >> this.power) + 1;
        this.bitmap = new Uint32Array(numBlocks);
    }

    test(index) {
        return (this.bitmap[index >> this.power] && (1 << (index & this.mask))) != 0;
    }

    enable(index) {
        this.bitmap[index >> this.power] |= (1 << (index & this.mask));
    }

    disable(index) {
        this.bitmap[index >> this.power] &= ~(1 << (index & this.mask));
    }

    flip(index) {
        this.bitmap[index >> this.power] ^= (1 << (index & this.mask));
    }
}


const width = 2236;
const height = 1956;

// Giant buffer allocations:
let start;
let iterations = 200;
let buff;
start = performance.now();
for (let i = 0; i < iterations; i++) {
    buff = new Uint8Array(width * height);
}
console.log("Allocate", (performance.now() - start) / iterations);
// 0.5535899889469147

// Fill:
start = performance.now();
for (let i = 0; i < iterations; i++) {
    buff.fill(10);
}
console.log("Fill", (performance.now() - start) / iterations);
// 0.16024360060691833

// Linear write:
start = performance.now();
for (let i = 0; i < iterations; i++) {
    for (let i = 0; i < buff.length; i++) {
        buff[i] = i % 256;
    }
}
console.log("Write", (performance.now() - start) / iterations);
// 5.40160609960556

// Linear read:
let sum = 0;
start = performance.now();
for (let i = 0; i < iterations; i++) {
    for (let i = 0; i < buff.length; i++) {
        sum += buff[i];
    }
}
console.log("Read", (performance.now() - start) / iterations);
// 4.298746429681778

const b = new Bitmap(1024 * 2 * 2);
if (b.test(1) !== false) throw new Error("invalid precondition");
b.enable(1);
if (b.test(1) !== true) throw new Error("invalid precondition");
b.disable(1);
if (b.test(1) !== false) throw new Error("invalid precondition");

start = performance.now();
for (let i = 0; i < iterations; i++) {
    const rand = Math.floor(Math.random() * width);
    for (let i = rand; i < Math.min(width * height, rand + 100000); i++) {
        b.enable(buff[i]);
    }
}
console.log("Fill partial bitset", (performance.now() - start) / iterations);
// 0.2630272948741913

start = performance.now();
for (let i = 0; i < iterations; i++) {
    const rand = Math.floor(Math.random() * width);
    for (let i = rand; i < buff.length; i++) {
        b.enable(buff[i]);
    }
}
console.log("Fill bitset full", (performance.now() - start) / iterations);
// 8.467950174808502

const s = new Set();
start = performance.now();
for (let i = 0; i < iterations; i++) {
    const rand = Math.floor(Math.random() * width);
    for (let i = rand; i < Math.min(width * height, rand + 100000); i++) {
        s.add(buff[i]);
    }
}
console.log("Fill partial set", (performance.now() - start) / iterations);
// 0.933610144853592

start = performance.now();
let ss;
for (let i = 0; i < iterations; i++) {
    ss = new Set(buff);
}
console.log("Constructor set", (performance.now() - start) / iterations);
// 134.64948480010034

start = performance.now();
s.clear();
for (let i = 0; i < iterations; i++) {
    const rand = Math.floor(Math.random() * width);
    for (let i = rand; i < buff.length; i++) {
        s.add(buff[i]);
    }
}
console.log("Fill set full", (performance.now() - start) / iterations);
// 37.46329090952873