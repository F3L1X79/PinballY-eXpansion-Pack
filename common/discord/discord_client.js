// ============================================================
// Discord's IPC client, given the PinballY host (docs/adr/0022): opens the
// first of \\?\pipe\discord-ipc-0 to -9, shakes hands, then reads every
// waiting frame on each tick of a host interval, answering PING with PONG.
// The latest activity asked is sent once READY is read, then at each change.
// - Never a read before the bytes are waiting, never a wait for the pipe: PinballY's UI thread.
// - A CLOSE frame, an evt "ERROR" reply or a failed call ends the connection for good.
// - The READY's user object is API Data: never kept nor logged.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";

const PIPE_NAME_PREFIX = "\\\\?\\pipe\\discord-ipc-";
const PIPE_COUNT = 10;
const OPCODE = Object.freeze({ HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 });
// Two little-endian 32-bit integers: the opcode, then the payload's byte count.
const HEADER_SIZE = 8;
const RPC_VERSION = 1;
const POLL_MS = 250;

// UTF-8 through the URI functions, one %XX per byte: ChakraCore's
// TextEncoder is not documented in PinballY.
const utf8Bytes = text => Uint8Array.from(encodeURIComponent(text).match(/%[0-9A-F]{2}|[^%]/g),
    part => (part.length === 3 ? parseInt(part.slice(1), 16) : part.charCodeAt(0)));
const utf8Text = bytes => decodeURIComponent(Array.from(bytes, byte => `%${byte.toString(16).padStart(2, "0")}`).join(""));

// A frame in a single byte array: the pipe breaks on a header written apart.
function frameOf(opcode, payloadBytes) {
    const frame = new Uint8Array(HEADER_SIZE + payloadBytes.length);
    const view = new DataView(frame.buffer);
    view.setUint32(0, opcode, true);
    view.setUint32(4, payloadBytes.length, true);
    frame.set(payloadBytes, HEADER_SIZE);
    return frame;
}

// scriptName: whose name a failed tick is logged under; onLost(reason):
// once, when an open connection ends.
export function createDiscordClient(host, { scriptName, applicationId, onLost }) {
    let pipe = null;
    let poll = null;
    let isReady = false;
    // The frame header read, while its payload is not all waiting yet.
    let header = null;
    // The latest activity asked: undefined for none yet, null for a clear.
    let activity;
    let nextNonce = 1;

    function lose(reason) {
        host.clearInterval(poll);
        pipe.close();
        pipe = null;
        onLost(reason);
    }

    // false when the pipe is gone, the connection then lost.
    function write(opcode, payloadBytes) {
        if (pipe.write(frameOf(opcode, payloadBytes))) return true;
        lose("the pipe could not be written to");
        return false;
    }

    function sendActivity() {
        const args = activity ? { pid: host.getProcessId(), activity } : { pid: host.getProcessId() };
        write(OPCODE.FRAME, utf8Bytes(JSON.stringify({ cmd: "SET_ACTIVITY", args, nonce: String(nextNonce++) })));
    }

    function handleFrame(opcode, payloadBytes) {
        if (opcode === OPCODE.PING) {
            write(OPCODE.PONG, payloadBytes);
            return;
        }
        // Logged as it came, its code and message: never parsed, so a
        // malformed one still ends the connection as a plain line.
        if (opcode === OPCODE.CLOSE) {
            lose(`Discord closed the connection (${utf8Text(payloadBytes)})`);
            return;
        }
        if (opcode !== OPCODE.FRAME) return;
        const { cmd, evt, data } = JSON.parse(utf8Text(payloadBytes));
        if (evt === "ERROR") {
            lose(`Discord refused ${cmd} (${data.code}: ${data.message})`);
            return;
        }
        if (cmd === "DISPATCH" && evt === "READY" && !isReady) {
            isReady = true;
            if (activity !== undefined) sendActivity();
        }
    }

    // Every whole frame waiting, in order.
    function drain() {
        while (pipe) {
            const waiting = pipe.bytesWaiting();
            if (waiting === null) {
                lose("the pipe is gone");
                return;
            }
            const needed = header ? header.length : HEADER_SIZE;
            if (waiting < needed) return;
            const bytes = needed > 0 ? pipe.read(needed) : new Uint8Array(0);
            if (!bytes) {
                lose("the pipe could not be read");
                return;
            }
            if (header) {
                const { opcode } = header;
                header = null;
                handleFrame(opcode, bytes);
            } else {
                const view = new DataView(bytes.buffer);
                header = { opcode: view.getUint32(0, true), length: view.getUint32(4, true) };
            }
        }
    }

    // A frame the pack cannot read would fail again at every tick: the
    // connection ends, and the error is logged once.
    function drainOrLose() {
        try {
            drain();
        } catch (error) {
            if (pipe) lose(`a frame could not be read (${error.message})`);
            throw error;
        }
    }

    return {
        // Opens the first Discord pipe that opens, shakes hands and starts
        // reading; false when none opens.
        connect() {
            for (let number = 0; number < PIPE_COUNT && !pipe; number++) pipe = host.openPipe(`${PIPE_NAME_PREFIX}${number}`);
            if (!pipe) return false;
            // A handshake that fails is Discord not found: no connection to lose yet.
            if (!pipe.write(frameOf(OPCODE.HANDSHAKE, utf8Bytes(JSON.stringify({ v: RPC_VERSION, client_id: applicationId }))))) {
                pipe.close();
                pipe = null;
                return false;
            }
            poll = host.setInterval(safeHandler(scriptName, drainOrLose), POLL_MS);
            return true;
        },
        // Sent now when READY was read, else once it is; null clears it.
        setActivity(newActivity) {
            activity = newActivity;
            if (pipe && isReady) sendActivity();
        },
    };
}
