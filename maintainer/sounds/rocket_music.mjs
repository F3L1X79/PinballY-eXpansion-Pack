// ============================================================
// Renders the Rocket's music, an original Amiga-style 4-channel chiptune
// loop, to assets/sounds/easter_eggs/rocket_music.wav (stereo 16-bit WAV).
// Usage: node maintainer/sounds/rocket_music.mjs
// - Every tail (release, echo) wraps around the loop, so it loops seamlessly.
// ============================================================

import { writeFileSync } from "node:fs";

const OUTPUT = new URL("../../assets/sounds/easter_eggs/rocket_music.wav", import.meta.url);

const RATE = 44100;
const BPM = 140;
const STEP = 60 / BPM / 4; // one 16th note, in seconds
const BARS = 16;
const STEPS = BARS * 16;
const LENGTH = Math.round(STEPS * STEP * RATE);

const left = new Float64Array(LENGTH);
const right = new Float64Array(LENGTH);

// Deterministic noise, so every render is identical.
let seed = 12345;
const noise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x3fffffff - 1;
};

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiOf = name => {
    const match = /^([A-G])(#|b)?(\d)$/.exec(name);
    const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
    return 12 * (Number(match[3]) + 1) + NAMES[match[1]] + accidental;
};
const freqOf = midi => 440 * Math.pow(2, (midi - 69) / 12);

// Adds a sample at a loop position, wrapped, with a pan from 0 (left) to 1 (right).
function add(index, value, pan) {
    const i = ((index % LENGTH) + LENGTH) % LENGTH;
    left[i] += value * (1 - pan);
    right[i] += value * pan;
}

// --- Lead: 25% pulse with delayed vibrato and an echo; "note:16ths", "-" a rest ---
const MELODY = [
    "G5:2 E5:2 G5:2 C6:4 B5:2 A5:2 G5:2",
    "A5:2 E5:2 A5:2 C6:2 B5:4 A5:4",
    "F5:2 A5:2 C6:2 F6:4 E6:2 D6:2 C6:2",
    "D6:6 B5:2 G5:4 -:4",
    "G5:2 E5:2 G5:2 C6:4 D6:2 E6:2 G6:2",
    "E6:4 D6:2 C6:2 A5:4 C6:4",
    "D6:2 F6:2 E6:2 D6:2 B5:2 D6:2 G5:4",
    "C6:8 -:2 G5:2 A5:2 B5:2",
    "C6:4 A5:2 C6:2 F6:4 C6:4",
    "D6:4 B5:2 D6:2 G6:4 D6:4",
    "E6:2 D6:2 B5:2 G5:2 B5:2 D6:2 E6:4",
    "C6:2 B5:2 A5:2 E5:2 A5:4 -:4",
    "A5:2 C6:2 F6:2 A6:2 G6:2 F6:2 E6:2 C6:2",
    "D6:2 G6:2 B6:4 A6:2 G6:2 F6:2 D6:2",
    "F6:4 E6:2 D6:2 A5:4 D6:4",
    "B5:2 D6:2 F6:2 G6:6 -:4",
];

function pulse(phase, width) {
    return (phase % 1) < width ? 1 : -1;
}

function renderLead() {
    let step = 0;
    for (const bar of MELODY) {
        for (const token of bar.split(" ")) {
            const [name, length] = token.split(":");
            const steps = Number(length);
            if (name !== "-") {
                const start = Math.round(step * STEP * RATE);
                const hold = steps * STEP * 0.92;
                const total = hold + 0.06;
                const freq = freqOf(midiOf(name) - 12);
                let phase = 0;
                for (let n = 0; n < total * RATE; n++) {
                    const t = n / RATE;
                    const vibrato = t > 0.15 ? 1 + 0.006 * Math.sin(2 * Math.PI * 6 * t) : 1;
                    phase += (freq * vibrato) / RATE;
                    const attack = Math.min(1, t / 0.004);
                    const decay = 0.65 + 0.35 * Math.exp(-t / 0.08);
                    const release = t > hold ? Math.max(0, 1 - (t - hold) / 0.06) : 1;
                    const value = pulse(phase, 0.25) * attack * decay * release * 0.16;
                    add(start + n, value, 0.35);
                    // Echo, three 16ths later, on the other side.
                    add(start + n + Math.round(3 * STEP * RATE), value * 0.3, 0.75);
                }
            }
            step += steps;
        }
    }
}

// --- Chords per half bar: bass roots and arpeggio notes ---
const CHORDS = [
    ["C", "C"], ["Am", "Am"], ["F", "F"], ["G", "G"],
    ["C", "C"], ["Am", "Am"], ["Dm", "G"], ["C", "C"],
    ["F", "F"], ["G", "G"], ["Em", "Em"], ["Am", "Am"],
    ["F", "F"], ["G", "G"], ["Dm", "Dm"], ["G7", "G7"],
];
const CHORD_NOTES = {
    C: ["C4", "E4", "G4"], Am: ["A3", "C4", "E4"], F: ["F3", "A3", "C4"], G: ["G3", "B3", "D4"],
    Dm: ["D4", "F4", "A4"], Em: ["E3", "G3", "B3"], G7: ["G3", "B3", "F4"],
};
const chordAt = step => CHORDS[Math.floor(step / 16)][step % 16 < 8 ? 0 : 1];

// --- Bass: triangle-ish, bouncing between the root and its octave ---
function renderBass() {
    const pattern = [0, 12, 7, 12];
    for (let step = 0; step < STEPS; step += 2) {
        const root = midiOf(CHORD_NOTES[chordAt(step)][0]) - 12;
        const freq = freqOf(root + pattern[(step / 2) % 4]);
        const start = Math.round(step * STEP * RATE);
        const total = 2 * STEP * 0.85;
        let phase = 0;
        for (let n = 0; n < total * RATE; n++) {
            const t = n / RATE;
            phase += freq / RATE;
            const p = phase % 1;
            const tri = 4 * Math.abs(p - 0.5) - 1;
            const square = p < 0.5 ? 1 : -1;
            const env = Math.min(1, t / 0.003) * Math.exp(-t / 0.18) * Math.min(1, (total - t) / 0.01);
            add(start + n, (0.7 * tri + 0.3 * square) * env * 0.28, 0.5);
        }
    }
}

// --- Arpeggio stabs on the off-beats, cycling notes every 1/50 s as Amiga trackers did ---
function renderArpeggios() {
    for (let step = 2; step < STEPS; step += 4) {
        const notes = CHORD_NOTES[chordAt(step)].map(midiOf);
        const start = Math.round(step * STEP * RATE);
        const total = 2 * STEP * 0.9;
        let phase = 0;
        for (let n = 0; n < total * RATE; n++) {
            const t = n / RATE;
            const freq = freqOf(notes[Math.floor(t * 50) % notes.length]);
            phase += freq / RATE;
            const env = Math.min(1, t / 0.003) * Math.exp(-t / 0.12);
            add(start + n, pulse(phase, 0.5) * env * 0.07, 0.7);
        }
    }
}

// --- Drums: kick, snare, hi-hat ---
function kick(start) {
    let phase = 0;
    for (let n = 0; n < 0.15 * RATE; n++) {
        const t = n / RATE;
        phase += (45 + 110 * Math.exp(-t / 0.03)) / RATE;
        add(start + n, Math.sin(2 * Math.PI * phase) * Math.exp(-t / 0.06) * 0.5, 0.5);
    }
}
function snare(start) {
    for (let n = 0; n < 0.16 * RATE; n++) {
        const t = n / RATE;
        const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.03);
        add(start + n, (noise() * Math.exp(-t / 0.05) * 0.8 + tone * 0.5) * 0.25, 0.45);
    }
}
function hat(start, open) {
    let previous = 0;
    for (let n = 0; n < (open ? 0.09 : 0.03) * RATE; n++) {
        const t = n / RATE;
        const value = noise();
        add(start + n, (value - previous) * Math.exp(-t / (open ? 0.03 : 0.01)) * 0.06, 0.6);
        previous = value;
    }
}
function renderDrums() {
    for (let step = 0; step < STEPS; step++) {
        const start = Math.round(step * STEP * RATE);
        const inBar = step % 16;
        if (inBar === 0 || inBar === 6 || inBar === 8 || (inBar === 14 && step % 64 === 62)) kick(start);
        if (inBar === 4 || inBar === 12) snare(start);
        if (step % 64 === 63 || step % 64 === 61) snare(start);
        if (step % 2 === 0) hat(start, inBar % 4 === 2);
    }
}

renderLead();
renderBass();
renderArpeggios();
renderDrums();

// Gentle one-pole low-pass (the Amiga's output filter), run twice around the loop to settle.
function lowPass(buffer, cutoff) {
    const a = 1 - Math.exp(-2 * Math.PI * cutoff / RATE);
    let y = 0;
    for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < LENGTH; i++) {
            y += a * (buffer[i] - y);
            if (pass === 1) buffer[i] = y;
        }
    }
}
lowPass(left, 7000);
lowPass(right, 7000);

let peak = 0;
for (let i = 0; i < LENGTH; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const gain = 0.89 / peak;

const data = Buffer.alloc(LENGTH * 4);
for (let i = 0; i < LENGTH; i++) {
    data.writeInt16LE(Math.round(Math.tanh(left[i] * gain * 1.1) * 32000), i * 4);
    data.writeInt16LE(Math.round(Math.tanh(right[i] * gain * 1.1) * 32000), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
writeFileSync(OUTPUT, Buffer.concat([header, data]));
console.log(`rocket_music.wav: ${(LENGTH / RATE).toFixed(1)} s`);
