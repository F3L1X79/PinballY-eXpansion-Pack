// ============================================================
// A fake Discord desktop client behind the fake host's kernel32, as
// docs/adr/0022 and docs/research/discord-rich-presence.md write it down:
// READY after a handshake, every command echoed, PING, CLOSE, an
// evt "ERROR" reply, a pipe that disappears. Never loaded by PinballY.
// - One write is one whole frame: a header length that is not its UTF-8 byte count throws.
// - A read of more bytes than are waiting throws: on the cabinet it would block PinballY.
// ============================================================

import { Buffer } from "node:buffer";

export const OPCODE = Object.freeze({ HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 });
const HEADER_SIZE = 8;
// The signed-in user READY carries: the pack must never keep nor log it.
export const DISCORD_USER = Object.freeze({ id: "80351110224678912", username: "cabinet_owner", global_name: "Cabinet Owner", discriminator: "0" });

// holdReady: READY waits for sendReady() instead of following the handshake.
export function createFakeDiscord({ holdReady = false } = {}) {
    // Bytes waiting for the pack to read, in order.
    let toClient = [];
    // Every frame the pack wrote, in order: { opcode, payload, byteLength }.
    const received = [];
    let isConnected = false;
    let isGone = false;
    let isReadySent = false;
    let errorsNextCommand = false;

    function queue(opcode, payload) {
        const bytes = Buffer.from(JSON.stringify(payload), "utf8");
        const header = Buffer.alloc(HEADER_SIZE);
        header.writeUInt32LE(opcode, 0);
        header.writeUInt32LE(bytes.length, 4);
        toClient.push(...header, ...bytes);
    }

    function sendReady() {
        isReadySent = true;
        queue(OPCODE.FRAME, { cmd: "DISPATCH", evt: "READY", data: { v: 1, config: { api_endpoint: "//discord.com/api" }, user: { ...DISCORD_USER } }, nonce: null });
    }

    // Answers as the research says: READY after a handshake, every command
    // echoed (or refused once errorNextCommand() was called).
    function receive(bytes) {
        const frame = Buffer.from(bytes);
        if (frame.length < HEADER_SIZE) throw new Error(`The fake Discord got a frame of ${frame.length} bytes, shorter than its header.`);
        const opcode = frame.readUInt32LE(0);
        const length = frame.readUInt32LE(4);
        if (length !== frame.length - HEADER_SIZE) {
            throw new Error(`The fake Discord got a frame whose header says ${length} bytes for ${frame.length - HEADER_SIZE}.`);
        }
        const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(frame.subarray(HEADER_SIZE)));
        received.push({ opcode, payload, byteLength: length });
        if (opcode === OPCODE.HANDSHAKE && !holdReady) sendReady();
        if (opcode !== OPCODE.FRAME) return;
        if (errorsNextCommand) {
            errorsNextCommand = false;
            queue(OPCODE.FRAME, { cmd: payload.cmd, evt: "ERROR", data: { code: 4000, message: "Invalid Payload" }, nonce: payload.nonce });
            return;
        }
        queue(OPCODE.FRAME, { cmd: payload.cmd, evt: null, data: payload.args.activity ?? null, nonce: payload.nonce });
    }

    return {
        // The fake host's kernel32 side: false when the pipe is taken or gone.
        connect() {
            if (isConnected || isGone) return false;
            isConnected = true;
            return true;
        },
        // null once the pipe is gone.
        bytesWaiting: () => (isGone ? null : toClient.length),
        read(count) {
            if (isGone) return null;
            if (count > toClient.length) throw new Error(`A read of ${count} bytes with ${toClient.length} waiting would block PinballY.`);
            return Uint8Array.from(toClient.splice(0, count));
        },
        write(bytes) {
            if (isGone) return false;
            receive(bytes);
            return true;
        },
        disconnect() {
            isConnected = false;
            toClient = [];
        },

        isConnected: () => isConnected,
        isReadySent: () => isReadySent,
        // Every frame the pack wrote, in order: { opcode, payload, byteLength }.
        frames: () => received.map(frame => ({ ...frame })),
        // The payloads of the FRAME commands, in order.
        commands: () => received.filter(frame => frame.opcode === OPCODE.FRAME).map(frame => frame.payload),
        sendReady,
        ping(payload) { queue(OPCODE.PING, payload); },
        close(code, message) { queue(OPCODE.CLOSE, { code, message }); },
        // The next command gets an evt "ERROR" reply instead of its echo.
        errorNextCommand() { errorsNextCommand = true; },
        // Discord quits: every call on the pipe fails from now on.
        disappear() { isGone = true; },
    };
}
