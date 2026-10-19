// @ts-check
/// <reference lib="es2023" />

// Builds every platform binary, publishes the npm packages and tags the commit.
// Usage: pnpm release [version] [--dry-run]   (without a version, bumps the latest v* tag)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.join(import.meta.dirname, '..');
const npmDir = path.join(repoRoot, 'npm');

const targets = [
  { goos: 'windows', goarch: 'amd64' },
  { goos: 'windows', goarch: 'arm64' },
  { goos: 'linux', goarch: 'amd64' },
  { goos: 'linux', goarch: 'arm64' },
  { goos: 'darwin', goarch: 'amd64' },
  { goos: 'darwin', goarch: 'arm64' },
];

const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const versionArg = args.find(arg => arg !== '--dry-run');

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ env?: NodeJS.ProcessEnv, cwd?: string, capture?: boolean }} [options]
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    // npm and pnpm are .cmd scripts on Windows, which only run through a shell; the others mustn't, so arguments keep their spaces
    shell: process.platform === 'win32' && (command === 'npm' || command === 'pnpm'),
  });
  return { ok: result.status === 0, stdout: (result.stdout ?? '').trim() };
}

/** @param {string} message */
function fail(message) {
  console.error(`release: ${message}`);
  process.exit(1);
}

/** @param {string} version */
function bump(version) {
  const prerelease = /^(.*-[0-9A-Za-z-]+\.)(\d+)$/.exec(version);
  if (prerelease) {
    return `${prerelease[1]}${Number(prerelease[2]) + 1}`;
  }
  const release = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (release) {
    return `${release[1]}.${release[2]}.${Number(release[3]) + 1}`;
  }
  return fail(`can't bump ${version}; pass the version to release instead`);
}

/**
 * @param {string} name
 * @param {string} version
 */
function isPublished(name, version) {
  const { ok, stdout } = run('npm', ['view', `${name}@${version}`, 'version'], { capture: true });
  return ok && stdout === version;
}

function chooseVersion() {
  const override = versionArg;
  if (override !== undefined) {
    if (!versionPattern.test(override)) {
      fail(`${override} isn't a version like 7.1.0 or 7.1.0-dev.1`);
    }
    return override;
  }
  const latestTag = run('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*'], { capture: true });
  if (!latestTag.ok) {
    fail('no v* tag to bump yet; pass the first version, e.g. pnpm release 7.1.0-dev.1');
  }
  return bump(latestTag.stdout.slice(1));
}

if (run('git', ['status', '--porcelain'], { capture: true }).stdout !== '') {
  fail('the working tree has uncommitted changes; commit or stash them first');
}

const version = chooseVersion();
const tag = `v${version}`;

if (run('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`], { capture: true }).ok) {
  fail(`tag ${tag} already exists`);
}
if (!run('npm', ['whoami'], { capture: true }).ok) {
  fail('not logged in to npm; run npm login first');
}

console.log(`release: building ${tag}`);
for (const { goos, goarch } of targets) {
  const output = path.join('build', `tsgolint-${goos}-${goarch}`, 'tsgolint');
  console.log(`release: go build ${goos}/${goarch}`);
  const built = run('go', ['build', '-ldflags=-s -w', '-trimpath', '-o', output, './cmd/tsgolint'], {
    env: {
      GOOS: goos,
      GOARCH: goarch,
      CGO_ENABLED: '0',
      GOCACHE: process.env.GOCACHE ?? path.join(repoRoot, '.gocache'),
    },
  });
  if (!built.ok) {
    fail(`go build failed for ${goos}/${goarch}`);
  }
}

if (!run('node', ['tools/gen-npm-packages.mjs'], { env: { TSGOLINT_VERSION: version } }).ok) {
  fail('generating the npm packages failed');
}

// Core goes last, so it never names a platform package that isn't published yet.
const packageDirs = fs.readdirSync(npmDir).filter(name => name !== 'core').concat('core');
for (const dir of packageDirs) {
  const packageDir = path.join(npmDir, dir);
  const { name } = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  if (isPublished(name, version)) {
    console.log(`release: ${name}@${version} is already published, skipping`);
    continue;
  }
  console.log(`release: publishing ${name}@${version}${dryRun ? ' (dry run)' : ''}`);
  const publishArgs = ['publish', '--access', 'public', '--no-git-checks', '--tag', 'latest', ...(dryRun ? ['--dry-run'] : [])];
  // pnpm, not npm: its executableFiles setting marks the Unix binaries executable even when packed on Windows
  if (!run('pnpm', publishArgs, { cwd: packageDir }).ok) {
    fail(`publishing ${name}@${version} failed; rerun the same command to continue`);
  }
}

if (dryRun) {
  console.log(`release: dry run of ${tag} finished; nothing was published or tagged`);
  process.exit(0);
}
if (!run('git', ['tag', '-a', tag, '-m', tag]).ok) {
  fail(`published ${version}, but tagging ${tag} failed`);
}
console.log(`release: published and tagged ${tag}. Push the tag with: git push origin ${tag}`);
