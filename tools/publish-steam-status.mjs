#!/usr/bin/env node
/* Publishes the Steam status from this machine, for when the GitHub job
   cannot run.

     node tools/publish-steam-status.mjs            once
     node tools/publish-steam-status.mjs --watch    every 10 minutes
     node tools/publish-steam-status.mjs --watch=5m every 5 minutes

   Same reading and same destination as .github/workflows/steam-status.yml -
   steam-status.json on the `status` branch - so whichever runs, the page sees
   the same file. Either can run; the last one to publish wins.

   What it costs: one request to steamcommunity.com per check (about 30 KB),
   and a push only when the status actually changed. Nothing is downloaded,
   no server runs, and nothing listens on a port.

   The push is built with git plumbing rather than a checkout, so the branch
   stays a single commit and this repository's working tree is never touched -
   you can keep working while it runs. */
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
// moves every run and nobody sees it.
const shown = (s) => s && `${s.state}|${s.game || ''}|${s.lastOnline || ''}`;

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

const arg = process.argv.find((a) => a.startsWith('--watch'));
const every = arg && arg.includes('=') ? arg.split('=')[1] : '10m';
const ms = /m$/.test(every) ? parseFloat(every) * 60000 : parseFloat(every) * 1000 || 600000;

async function tick() {
	try {
		await once();
	} catch (e) {
		// A dropped connection or a Steam hiccup must not end the watch.
		say('skipped:', e.message);
	}
}

if (arg) {
	say(`watching every ${Math.round(ms / 60000)} min - close this window to stop`);
	await tick();
	setInterval(tick, ms);
} else {
	await tick();
}
