#!/usr/bin/env node
/* Publishes the Steam status from this machine.

     node tools/publish-steam-status.mjs            once
     node tools/publish-steam-status.mjs --watch    every 10 minutes
     node tools/publish-steam-status.mjs --watch=3m every 3 minutes

   It writes steam-status.json on the `status` branch, which the homepage
   reads from raw.githubusercontent.com - Steam itself allows no
   cross-origin read, which is the whole reason this exists.

   What it costs: one request to steamcommunity.com per check (about 30 KB)
   and, when the reading changed, four small GitHub API calls. Nothing is
   downloaded, no server runs, and nothing listens on a port.

   It must not disturb a game. Publishing used to be `git push`, and on
   Windows that starts git.exe, then git-remote-https.exe, then - because
   credential.helper is "manager" - git-credential-manager.exe, which is a
   .NET desktop application. Something with a window starting every few
   minutes pulls a fullscreen game out of focus, as if Alt+Tab had been
   pressed. So the push is now done over plain HTTPS with the GitHub API:
   blob, tree, commit, ref - the same four steps git would take, with no
   program started at all. Only when no token can be found does it fall
   back to git, and then with the credential helper switched off so that
   nothing with a window is started even then.

   The branch stays a single commit: each commit is made with no parent and
   the ref is moved with force, so the file never accumulates history.

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
const SLUG = 'james-ccg/james-ccg.github.io';
const API = `https://api.github.com/repos/${SLUG}`;
const RAW = `https://raw.githubusercontent.com/${SLUG}/status/steam-status.json`;
const BRANCH = 'status';
const AUTHOR = { name: 'James Riley', email: '7ahadbek@gmail.com' };
const UA = 'james-ccg.github.io status (+https://james-ccg.github.io/)';

const arg = process.argv.find((a) => a.startsWith('--watch'));
const every = arg && arg.includes('=') ? arg.split('=')[1] : '10m';
const everyMs = (/m$/.test(every) ? parseFloat(every) * 60000 : parseFloat(every) * 1000) || 600000;

// The first round of a run always publishes, even when nothing looks
// changed. Closing the window pushes a goodbye and then writes the local
// cache, and Windows allows only a few seconds for both - so the push can
// land while the cache write does not. Comparing against that stale cache
// would leave "stopped" on the branch while this is running again.
let published = false;

const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const say = (...m) => console.log(`[${stamp()}]`, ...m);

// Read once, kept in memory, written nowhere. `gh` is started a single time
// at startup - never on a round - so it cannot interrupt anything later.
let token, tokenRead = false;
function githubToken() {
	if (tokenRead) return token;
	tokenRead = true;
	token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
	if (!token) {
		try {
			token = execFileSync('gh', ['auth', 'token'], {
				encoding: 'utf8',
				windowsHide: true,
				stdio: ['ignore', 'pipe', 'ignore'],
			}).trim() || null;
		} catch {
			token = null;
		}
	}
	return token;
}

async function api(route, method, body) {
	const res = await fetch(API + route, {
		method,
		headers: {
			Authorization: `Bearer ${githubToken()}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json',
			'User-Agent': UA,
		},
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`GitHub answered ${res.status} to ${method} ${route}`);
	return res.json();
}

async function pushByApi(json) {
	const who = { ...AUTHOR, date: new Date().toISOString() };
	const blob = await api('/git/blobs', 'POST', {
		content: Buffer.from(json).toString('base64'),
		encoding: 'base64',
	});
	const tree = await api('/git/trees', 'POST', {
		tree: [{ path: 'steam-status.json', mode: '100644', type: 'blob', sha: blob.sha }],
	});
	const commit = await api('/git/commits', 'POST', {
		message: 'steam status',
		tree: tree.sha,
		parents: [],
		author: who,
		committer: who,
	});
	await api(`/git/refs/heads/${BRANCH}`, 'PATCH', { sha: commit.sha, force: true });
}

// Only when there is no token. "credential.helper=" empties the helper for
// this one command, so the desktop credential manager is never started; git
// uses what is already stored, or fails without asking anybody.
function pushByGit(json) {
	const git = (args, opts = {}) =>
		execFileSync('git', args, {
			cwd: REPO,
			encoding: 'utf8',
			windowsHide: true,
			...opts,
			env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...opts.env },
		}).trim();
	const blob = git(['hash-object', '-w', '--stdin'], { input: json });
	const tree = git(['mktree'], { input: `100644 blob ${blob}\tsteam-status.json\n` });
	const commit = git(['commit-tree', tree, '-m', 'steam status'], {
		env: {
			GIT_AUTHOR_NAME: AUTHOR.name,
			GIT_AUTHOR_EMAIL: AUTHOR.email,
			GIT_COMMITTER_NAME: AUTHOR.name,
			GIT_COMMITTER_EMAIL: AUTHOR.email,
		},
	});
	git(['-c', 'credential.helper=', 'push', '--force', '--quiet', 'origin', `${commit}:refs/heads/${BRANCH}`]);
}

async function publish(status) {
	const json = JSON.stringify(status, null, '\t') + '\n';
	if (githubToken()) await pushByApi(json);
	else pushByGit(json);
	fs.writeFileSync(CACHE, json);
}

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

async function once() {
	let previous = readCache();
	let known = !!previous;
	if (!previous) {
		// First run on this machine: start from whatever is already published,
		// so a known "last online" is not thrown away.
		try {
			const r = await fetch(`${RAW}?t=${Date.now()}`, { headers: { 'User-Agent': UA } });
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
	if (published && shown(status) === shown(previous)) {
		// Remember it locally so the next round needs no network but Steam.
		fs.writeFileSync(CACHE, JSON.stringify(status, null, '\t') + '\n');
		say(`${label} - unchanged`);
		return;
	}
	await publish(status);
	published = true;
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
	if (!last || last.stopped || last.state === 'offline') process.exit(0);
	publish({ ...last, stopped: true })
		.then(() => say('stopped - the page will count from here'))
		.catch((e) => say('stopped, but the last push failed:', e.message))
		.finally(() => process.exit(0));
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
	say(githubToken() ? 'publishing over HTTPS - no other programs are started' : 'no token found - falling back to git');
	await tick();
	setInterval(tick, everyMs);
} else {
	await tick();
}
