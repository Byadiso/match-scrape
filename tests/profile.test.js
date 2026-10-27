import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  ensureBrowserProfile,
  userStorage,
} from "../src/services/browserProfile.js";

class Storage {
  constructor() {
    this.items = new Map();
  }
  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }
  setItem(key, value) {
    this.items.set(key, String(value));
  }
}
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
globalThis.window = new EventTarget();

test("legacy picks migrate once and original backup is preserved", () => {
  globalThis.localStorage = new Storage();
  localStorage.setItem("football-picks-v1", '[{"id":1}]');
  localStorage.setItem("football-pick-teams-v1", '{"1":57}');
  const profile = ensureBrowserProfile();
  assert.equal(userStorage.getItem("football-picks-v1"), '[{"id":1}]');
  userStorage.setItem("football-picks-v1", "[]");
  assert.equal(ensureBrowserProfile().id, profile.id);
  assert.equal(userStorage.getItem("football-picks-v1"), "[]");
  assert.equal(localStorage.getItem("football-picks-v1"), '[{"id":1}]');
});

test("separate browser storage gets a different identity and empty picks and simulations", () => {
  const first = new Storage();
  globalThis.localStorage = first;
  const id = ensureBrowserProfile().id;
  userStorage.setItem("football-picks-v1", '[{"id":57}]');
  userStorage.setItem("football-simulator-v1", '{"tickets":[1]}');
  globalThis.localStorage = new Storage();
  assert.notEqual(ensureBrowserProfile().id, id);
  assert.equal(userStorage.getItem("football-picks-v1"), null);
  assert.equal(userStorage.getItem("football-simulator-v1"), null);
  globalThis.localStorage = first;
  assert.equal(ensureBrowserProfile().id, id);
  assert.equal(userStorage.getItem("football-picks-v1"), '[{"id":57}]');
});
