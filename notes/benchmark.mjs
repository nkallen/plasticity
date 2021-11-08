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
let iterations = 1000;
let buff;
start = performance.now();
for (let i = 0; i < iterations; i++) {
    buff = new Uint8Array(width * height);
}
console.log("Allocate", (performance.now() - start) / iterations);
// 0.6736891102790833

// Fill:
start = performance.now();
for (let i = 0; i < iterations; i++) {
    buff.fill(10);
}
console.log("Fill", (performance.now() - start) / iterations);
// 0.31879846930503847

// Linear write:
start = performance.now();
for (let i = 0; i < iterations; i++) {
    for (let i = 0; i < buff.length; i++) {
        buff[i] = i % 256;
    }
}
console.log("Write", (performance.now() - start) / iterations);
// 10.633516939878463

// Linear read:
let sum = 0;
start = performance.now();
for (let i = 0; i < iterations; i++) {
    for (let i = 0; i < buff.length; i++) {
        sum += buff[i];
    }
}
console.log("Read", (performance.now() - start) / iterations);
// 8.525561339855194

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
console.log("Fill bitset", (performance.now() - start) / iterations);
// 19.20521978020668

const s = new Set();
start = performance.now();
for (let i = 0; i < iterations; i++) {
    const rand = Math.floor(Math.random() * width);
    for (let i = rand; i < Math.min(width * height, rand + 100000); i++) {
        s.add(buff[i]);
    }
}
console.log("Fill Set", (performance.now() - start) / iterations);