import { PlasticityJSON } from "./PlasticityDocument";

export class Chunkifier {
    constructor(
        private readonly magic: string,
        private readonly version: number,
        private readonly json: PlasticityJSON,
        private readonly c3d: Buffer,
    ) {
    }

    serialize(): Buffer {
        const { magic, version, json, c3d } = this;
        const string = Buffer.from(JSON.stringify(json), 'utf-8');
        const header = Buffer.alloc(10 + 4 + 4);
        const length = header.length + 4 + 4 + string.length + 4 + 4 + c3d.length;
        let offset = 0;
        header.write(magic, 'ascii'); offset += 10;
        header.writeUint32LE(version, offset); offset += 4;
        header.writeUint32LE(length, offset); offset += 4;

        const jsonChunk = Buffer.alloc(4 + 4 + string.length);
        JSON: {
            let offset = 0;
            jsonChunk.writeUint32LE(string.length, offset); offset += 4;
            jsonChunk.writeUint32LE(0x4e4f534a /* JSON */, offset); offset += 4;
            string.copy(jsonChunk, offset);
        }
        const c3dChunk = Buffer.alloc(4 + 4 + c3d.length);
        c3d: {
            let offset = 0;
            c3dChunk.writeUint32LE(c3d.length, offset); offset += 4;
            c3dChunk.writeUint32LE(0x004e4942 /* BIN */, offset); offset += 4;
            c3d.copy(c3dChunk, offset);
        }
        return Buffer.concat([header, jsonChunk, c3dChunk]);
    }

    static load(from: Buffer): { json: PlasticityJSON; c3d: Buffer; } {
        let offset = 0;
        const magic = from.toString('utf-8', offset, 10); offset += 10;
        if (magic !== 'plasticity') throw new Error('invalid file header');
        const version = from.readUint32LE(offset); offset += 4;
        if (version != 1) throw new Error('invalid version');
        const length = from.readUint32LE(offset); offset += 4;
        if (from.length != length) throw new Error(`invalid buffer length: got ${from.length} but expected ${length}`);
        let json: PlasticityJSON;
        JSON: {
            const length = from.readUint32LE(offset); offset += 4;
            const magic = from.readUint32LE(offset); offset += 4;
            if (magic !== 0x4e4f534a) throw new Error('invalid magic number');
            const string = from.toString('utf-8', offset, offset + length); offset += length;
            json = JSON.parse(string) as PlasticityJSON;
        }
        let c3d: Buffer;
        c3d: {
            const length = from.readUint32LE(offset); offset += 4;
            const magic = from.readUint32LE(offset); offset += 4;
            if (magic !== 0x004e4942) throw new Error('invalid magic number');
            c3d = from.slice(offset, length); offset += length;
        }
        return { json, c3d };
    }
}


export interface BufferJSON {

}

export interface BufferViewJSON {

}

export interface HasBuffers {
    buffers: BufferJSON[];
    bufferViews: BufferJSON[];
}