import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gameVersionsIn, primaryAsset } from "../scripts/release-utils.mjs";

describe("gameVersionsIn", () => {
  const cases = [
    ["v20.0.3 for 26.2", ["26.2"]],
    ["v22.0.0-alpha.2 for 26.4-snapshot-3", ["26.4"]],
    ["Sodium 0.9.3 for Minecraft 26.3", ["26.3"]],
    ["mc26.3-0.9.3-beta.1", ["26.3"]],
    ["v1.0.0-minecraft-1.20.4", ["1.20.4"]],
    // A bare number is the mod's own version, not the game's.
    ["1.4.2", []],
    ["MyMod 2.0 (1.21.1)", []],
  ];
  for (const [text, expected] of cases) {
    test(JSON.stringify(text), () => assert.deepEqual(gameVersionsIn(text), expected));
  }

  test("combines the release name and tag without duplicates", () => {
    assert.deepEqual(gameVersionsIn("Release for 1.21.1", "mc1.21.1-2.0"), ["1.21.1"]);
  });
});

describe("primaryAsset", () => {
  const a = (name) => ({ name });

  test("prefers the main .jar over sources and dev jars", () => {
    assert.equal(primaryAsset([a("mymod-1.0-sources.jar"), a("mymod-1.0-dev.jar"), a("mymod-1.0.jar")]).name, "mymod-1.0.jar");
  });

  test("falls back to .mrpack, then .zip", () => {
    assert.equal(primaryAsset([a("readme.txt"), a("pack.zip"), a("pack.mrpack")]).name, "pack.mrpack");
    assert.equal(primaryAsset([a("readme.txt"), a("pack.zip")]).name, "pack.zip");
  });

  test("picks Bedrock files over a README, whatever order they're in", () => {
    assert.equal(primaryAsset([a("README.txt"), a("My Addon.mcaddon")]).name, "My Addon.mcaddon");
    assert.equal(primaryAsset([a("notes.md"), a("Skyblock.mcworld")]).name, "Skyblock.mcworld");
    assert.equal(primaryAsset([a("changelog.txt"), a("Skins.mcpack")]).name, "Skins.mcpack");
  });

  test("returns null when a release has no files", () => {
    assert.equal(primaryAsset([]), null);
  });
});
