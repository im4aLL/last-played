#!/usr/bin/env node
// Stages libVLC shared libraries and plugins into src-tauri/vlc so packaged
// builds are self-contained. Run before `npm run tauri build` on each platform.
//
//   node scripts/stage-vlc.mjs
//   node scripts/stage-vlc.mjs --from "/path/to/VLC" [--target macos|windows|linux]
//
// libVLC is LGPL v2.1+. Keep it dynamically linked, ship these libraries and
// their notices, and allow relinking. See docs/PACKAGING.md.

import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const outputDir = join(repoRoot, "src-tauri", "vlc");

const args = process.argv.slice(2);

function argValue(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function currentTarget() {
  if (process.platform === "darwin") return "macos";
  if (process.platform === "win32") return "windows";
  return "linux";
}

const target = argValue("--target") ?? currentTarget();
const explicitSource = argValue("--from") ?? process.env.LAST_PLAYED_VLC_SOURCE;

// Where VLC keeps its shared libraries and plugins, per platform. Windows keeps
// them beside the executable; macOS and Linux split them into lib/ + plugins/.
const sources = {
  macos: [
    "/Applications/VLC.app/Contents/MacOS",
    "/opt/homebrew/lib", // libvlc via Homebrew (no plugins; playtest only)
    "/usr/local/lib",
  ],
  windows: [
    process.env.ProgramFiles
      ? join(process.env.ProgramFiles, "VideoLAN", "VLC")
      : undefined,
    process.env["ProgramFiles(x86)"]
      ? join(process.env["ProgramFiles(x86)"], "VideoLAN", "VLC")
      : undefined,
  ].filter(Boolean),
  linux: [
    "/usr/lib/x86_64-linux-gnu",
    "/usr/lib/aarch64-linux-gnu",
    "/usr/lib64",
    "/usr/lib",
    "/usr/local/lib",
  ],
};

const libraryPatterns = {
  macos: /^libvlc(core)?(\.\d+)*\.dylib$/,
  windows: /^libvlc(core)?\.dll$/i,
  linux: /^libvlc(core)?\.so(\.\d+)*$/,
};

function listFiles(dir, predicate) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir).filter((name) => predicate(name));
}

function findSource(candidates) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return undefined;
}

function findPlugins(source) {
  const candidates = [join(source, "plugins"), join(source, "vlc", "plugins")];
  return candidates.find((candidate) => existsSync(candidate));
}

function fail(message) {
  console.error(`stage-vlc: ${message}`);
  process.exit(1);
}

const source = explicitSource ?? findSource(sources[target]);
if (!source) {
  fail(
    `no VLC install found for ${target}. Install VLC or pass --from <dir> (set LAST_PLAYED_VLC_SOURCE).`,
  );
}

mkdirSync(outputDir, { recursive: true });
// Clear anything previously staged, but keep the committed placeholder so the
// `bundle.resources` glob always has a match.
for (const entry of readdirSync(outputDir)) {
  if (entry === "README.txt") continue;
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}

const pattern = libraryPatterns[target];
const libraries = listFiles(source, (name) => pattern.test(name));

// Libraries may live in lib/ (macOS/Linux) or next to the executable (Windows).
const libDir = join(source, "lib");
for (const name of listFiles(libDir, (candidate) => pattern.test(candidate))) {
  if (!libraries.includes(name)) libraries.push(name);
}

if (libraries.length === 0) {
  fail(`found ${source} but no libVLC shared libraries in it.`);
}

const destLibDir = target === "windows" ? outputDir : join(outputDir, "lib");
mkdirSync(destLibDir, { recursive: true });
for (const name of libraries) {
  const from = join(source, name);
  const fromLib = join(libDir, name);
  const resolved = existsSync(from) ? from : fromLib;
  const dest = join(destLibDir, name);
  // cpSync treats symlinked files as directories on some Node versions,
  // so copy regular files (including symlinks to files) with copyFileSync.
  if (statSync(resolved).isDirectory()) {
    cpSync(resolved, dest, { recursive: true, dereference: true });
  } else {
    copyFileSync(resolved, dest);
  }
}

const plugins = findPlugins(source);
if (plugins) {
  cpSync(plugins, join(outputDir, "plugins"), {
    recursive: true,
    dereference: true,
  });
  console.log(`stage-vlc: copied plugins from ${plugins}`);
} else {
  console.warn(
    "stage-vlc: no plugins folder found; playback may fail without codec plugins.",
  );
}

console.log(
  `stage-vlc: staged ${libraries.length} libraries for ${target} into src-tauri/vlc`,
);
