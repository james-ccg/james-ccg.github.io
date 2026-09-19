#!/usr/bin/env node
/* Publishes the Steam status from this machine.

     node tools/publish-steam-status.mjs            once
     node tools/publish-steam-status.mjs --watch    every 10 minutes
     node tools/publish-steam-status.mjs --watch=5m every 5 minutes

   It writes steam-status.json on the `status` branch, which the homepage
   reads from raw.githubusercontent.com - Steam itself allows no
   cross-origin read, which is the whole reason this exists.

   What it costs: one request to steamcommunity.com per check (about 30 KB),
   and a push only when the status actually changed. Nothing is downloaded,
   no server runs, and nothing listens on a port.

   The push is built with git plumbing rather than a checkout, so the branch
   stays a single commit and this repository's working tree is never touched -
   you can keep working while it runs.

   Two fields exist for the page rather than for Steam:

     everyMs   how often this watcher refreshes the file. The page believes
               an "online" reading for about two and a half rounds and then
               starts counting up from it, so a PC that switches off never
               leaves the card claiming "online".
     stopped   written on the way out when this window is closed. The page
               stops believing the reading at once instead of waiting out
               everyMs, and counts from the last moment Steam was seen. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fetchStatus } from './steam-status.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(REPO, 'tools', '.steam-status-cache.json');
const RAW = 'https://raw.githubusercontent.com/james-ccg/james-ccg.github.io/status/steam-status.json';
const BRANCH = 'status';
const AUTHOR = { name: 'James Riley', email: '7ahadbek@gmail.com' };

const arg = process.argv.find((a) => a.startsWith('--watch'));
const every = arg && arg.includes('=') ? arg.split('=')[1] : '10m';
const everyMs = (/m$/.test(every) ? parseFloat(every) * 60000 : parseFloat(every) * 1000) || 600000;

const git = (args, opts = {}) =>
	execFileSync('git', args, { cwd: REPO, encoding: 'utf8', ...opts }).trim();

const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const say = (...m) => console.log(`[${stamp()}]`, ...m);

function readCache() {
	try {
		return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
	} catch {
		return null;
	}
}

// What the page would show. Only a change here is worth a push - "checkedAt"
// moves every run and nobody sees it. "stopped" counts: clearing it again is
// how a restarted watcher tells the page the reading is live once more.
const shown = (s) => s && `${s.state}|${s.game || ''}|${s.lastOnline || ''}|${s.stopped ? 'stopped' : ''}`;

function publish(status) {
	const json = JSON.stringify(status, null, '\t') + '\n';
	const blob = git(['hash-object', '-w', '--stdin'], { input: json });
	const tree = git(['mktree'], { input: `100644 blob ${blob}\tsteam-status.json\n` });
	const commit = git(['commit-tree', tree, '-m', 'steam status'], {
		env: {
			...process.env,
			GIT_AUTHOR_NAME: AUTHOR.name,
			GIT_AUTHOR_EMAIL: AUTHOR.email,
			GIT_COMMITTER_NAME: AUTHOR.name,
			GIT_COMMITTER_EMAIL: AUTHOR.email,
		},
	});
	git(['push', '--force', '--quiet', 'origin', `${commit}:refs/heads/${BRANCH}`]);
	fs.writeFileSync(CACHE, json);
}

async function once() {
	let previous = readCache();
	let known = !!previous;
	if (!previous) {
		// First run on this machine: start from whatever is already published,
		// so a known "last online" is not thrown away.
		try {
			const r = await fetch(`${RAW}?t=${Date.now()}`);
			if (r.ok) {
				previous = await r.json();
				known = true;
			} else if (r.status === 404) {
				known = true; // nothing published yet - genuinely no history
			}
		} catch {
			/* the network is down; we simply do not know the history yet */
		}
	}
	const status = await fetchStatus(previous);
	if (arg) status.everyMs = everyMs;
	// Without the history, an offline reading carries no "last online" - and
	// publishing it would overwrite a good time with nothing. Wait for a round
	// where the previous status can actually be read.
	if (!known && status.state === 'offline') {
		say('offline - holding, cannot read the last published status yet');
		return;
	}
	const label = status.state === 'in-game' ? `in game: ${status.game}` : status.state;
	if (shown(status) === shown(previous)) {
		// Remember it locally so the next round needs no network but Steam.
		fs.writeFileSync(CACHE, JSON.stringify(status, null, '\t') + '\n');
		say(`${label} - unchanged`);
		return;
	}
	publish(status);
	say(`${label} - published`);
}

// Closing the window (or shutting the PC down while it is open) is the normal
// way this stops, and it is worth one last push: the page then counts from
// this moment instead of waiting out everyMs first. A power cut publishes
// nothing, of course - that is what everyMs is for.
let stopping = false;
function stop() {
	if (stopping) return;
	stopping = true;
	const last = readCache();
	if (last && !last.stopped && last.state !== 'offline') {
		try {
			publish({ ...last, stopped: true });
			say('stopped - the page will count from here');
		} catch (e) {
			say('stopped, but the last push failed:', e.message);
		}
	}
	process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(signal, stop);

async function tick() {
	try {
		await once();
	} catch (e) {
		// A dropped connection or a Steam hiccup must not end the watch.
		say('skipped:', e.message);
	}
}

if (arg) {
	say(`watching every ${Math.round(everyMs / 60000)} min - close this window to stop`);
	await tick();
	setInterval(tick, everyMs);
} else {
	await tick();
}
