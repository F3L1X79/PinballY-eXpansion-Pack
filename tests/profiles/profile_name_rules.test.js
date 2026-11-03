// ============================================================
// The rules of a new Profile's name, on the pure function: what is refused
// and why, what is not, and the trailing hyphen dropped before the checks.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { NAME_REFUSAL, nameRefusal, withoutTrailingHyphen } from "../../common/profiles/profile_name_rules.js";

const refusalOf = (name, listedNames = ["guest", "Alice"]) => nameRefusal(name, { listedNames, guestNameShown: "Gast" });

test("Guest's name is refused in any letter case, as a folder and as shown in the language", () => {
    for (const name of ["guest", "GUEST", "Guest", "Gast", "gast", "GAST"]) assert.equal(refusalOf(name), NAME_REFUSAL.GUEST, name);
});

test("the names Windows reserves for devices are refused in any letter case", () => {
    for (const name of ["CON", "con", "Prn", "aux", "NuL"]) assert.equal(refusalOf(name), NAME_REFUSAL.RESERVED, name);
});

test("a listed Profile's name is refused in any letter case", () => {
    for (const name of ["Alice", "alice", "ALICE"]) assert.equal(refusalOf(name), NAME_REFUSAL.TAKEN, name);
});

test("an empty name is refused, a hyphen alone being empty once dropped", () => {
    assert.equal(refusalOf(""), NAME_REFUSAL.EMPTY);
    assert.equal(refusalOf("-"), NAME_REFUSAL.EMPTY);
});

test("nothing else is refused", () => {
    assert.equal(refusalOf("Felix", ["guest", "Félix"]), null, "another spelling is another Profile");
    assert.equal(refusalOf("Max", ["guest"]), null, "a folder set aside as _Max is not listed, nor a removed Profile");
    assert.equal(refusalOf("Consuelo"), null, "only the whole name counts");
    assert.equal(refusalOf("Jean-Luc"), null);
});

test("a trailing hyphen is dropped before the checks", () => {
    assert.equal(withoutTrailingHyphen("Max-"), "Max");
    assert.equal(withoutTrailingHyphen("Jean-Luc"), "Jean-Luc");
    assert.equal(refusalOf("Alice-"), NAME_REFUSAL.TAKEN);
    assert.equal(refusalOf("con-"), NAME_REFUSAL.RESERVED);
});
