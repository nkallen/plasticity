import * as THREE from "three";

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
export function clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: GLbitfield, interval_ms: number) {
    return new Promise<void>((resolve, reject) => {
        function test() {
            const res = gl.clientWaitSync(sync, flags, 0);
            if (res == gl.WAIT_FAILED) {
                reject();
                return;
            }
            if (res == gl.TIMEOUT_EXPIRED) {
                setTimeout(test, interval_ms);
                return;
            }
            resolve();
        }
        test();
    });
}

async function getBufferSubDataAsync(
    gl: WebGL2RenderingContext, target: GLenum, buffer: WebGLBuffer, srcByteOffset: GLintptr, dstBuffer: ArrayBufferView, dstOffset?: number, length?: number) {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (sync === null) return Promise.reject("SYNC_GPU_COMMANDS_COMPLETE failed");

    gl.flush();

    await clientWaitAsync(gl, sync, 0, 10);
    gl.deleteSync(sync);

    gl.bindBuffer(target, buffer);
    gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length);
    gl.bindBuffer(target, null);

    return dstBuffer;
}

export async function readPixelsAsync(gl: WebGL2RenderingContext, x: number, y: number, w: number, h: number, format: GLenum, type: GLenum, dest: ArrayBufferView) {
    const buf = gl.createBuffer();
    if (buf === null) return Promise.reject("could not create buffer");

    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, dest.byteLength, gl.STREAM_READ);
    gl.readPixels(x, y, w, h, format, type, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

    await getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dest);

    gl.deleteBuffer(buf);
    return dest;
}

export async function readRenderTargetPixelsAsync(renderer: THREE.WebGLRenderer, renderTarget: THREE.WebGLRenderTarget, x: number, y: number, w: number, h: number, dest: ArrayBufferView) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const framebuffer = renderer.properties.get(renderTarget).__webglFramebuffer;
    try {
        renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        return readPixelsAsync(gl, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, dest);
    } finally {
        // restore framebuffer of current render target if necessary
        const currentRenderTarget = renderer.getRenderTarget();
        const framebuffer = (currentRenderTarget !== null) ? renderer.properties.get(currentRenderTarget).__webglFramebuffer : null;
        renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    }
}

// NOTE: Not yet used; to be used in GPUPicker to reduce latency
export function preparePBO(renderer: THREE.WebGLRenderer, renderTarget: THREE.WebGLRenderTarget, pbo: WebGLBuffer, x: number, y: number, w: number, h: number) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const framebuffer = renderer.properties.get(renderTarget).__webglFramebuffer;
    try {
        renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, 4 * (w - x) * (h - y), gl.STREAM_READ);
        gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync === null) throw new Error("SYNC_GPU_COMMANDS_COMPLETE failed");

        gl.flush();

        return clientWaitAsync(gl, sync, 0, 10).then(() => {
            return sync;
        });
    } finally {
        // restore framebuffer of current render target if necessary
        const currentRenderTarget = renderer.getRenderTarget();
        const framebuffer = (currentRenderTarget !== null) ? renderer.properties.get(currentRenderTarget).__webglFramebuffer : null;
        renderer.state.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    }
}
