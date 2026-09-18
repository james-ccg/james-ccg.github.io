#!/usr/bin/env node
/* Reads James's public Steam profile and writes the status file the homepage
   shows on its identity card.

     node tools/steam-status.mjs <previous.json|-> <out.json>

   Why a file, and why not straight from the page: Steam sends no
   Access-Control-Allow-Origin on any of its community endpoints and forbids
   framing them, so a visitor's browser cannot read the status itself. The
   profile's ?xml=1 view needs no API key, though, so a scheduled job can read
   it and publish the result somewhere the page *can* read - see
   .github/workflows/steam-status.yml.

   Output:
     { "state": "online" | "in-game" | "offline",
       "game": string | null,        // only while in game
       "lastOnline": ISO | null,     // now while online; best known when offline
       "checkedAt": ISO }

   "Last online" is kept stable between runs. Steam only says how long ago
   ("Last Online 3 hrs, 12 mins ago", later just "Last Online 4 days ago"), so
   recomputing it every run would drift by the rounding; the time is fixed the
   run it is first seen and carried forward until the state changes. */
import fs from 'node:fs';
import path from 'node:path';

const PROFILE = 'https://steamcommunity.com/id/james_ccg/?xml=1';
const UNIT_MS = { sec: 1000, min: 60000, hr: 3600000, hour: 3600000, day: 86400000 };

const tag = (xml, name) => {
	const m = xml.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
	return m ? m[1].trim() : null;
};

// "Last Online 2 hrs, 49 mins ago" -> milliseconds ago, or null when Steam has
// switched to a calendar date ("Last Online Aug 25") or anything unexpected.
export function parseLastOnline(message, now = Date.now()) {
	if (!message) return null;
	const rel = message.match(/Last Online\s+(.*?)\s+ago/i);
	if (rel) {
		let ms = 0, any = false;
		for (const m of rel[1].matchAll(/(\d+)\s*(sec|min|hr|hour|day)s?/gi)) {
			ms += Number(m[1]) * UNIT_MS[m[2].toLowerCase()];
			any = true;
		}
		return any ? now - ms : null;
	}
	const abs = message.match(/Last Online\s+(.+)$/i);
	if (abs) {
		const text = abs[1].replace('@', ' ').trim();
		const year = new Date(now).getFullYear();
		for (const candidate of [text, `${text} ${year}`]) {
			const t = Date.parse(candidate);
			if (!isNaN(t) && t <= now) return t;
		}
	}
	return null;
}

export function nextStatus(xml, previous, now = Date.now()) {
	const raw = (tag(xml, 'onlineState') || '').toLowerCase();
	const state = raw === 'in-game' ? 'in-game' : raw === 'online' ? 'online' : 'offline';
	const inGame = xml.match(/<inGameInfo>([\s\S]*?)<\/inGameInfo>/);
	const game = state === 'in-game' && inGame ? tag(inGame[1], 'gameName') : null;
	const prev = previous && typeof previous === 'object' ? previous : {};
	const wasOn = prev.state === 'online' || prev.state === 'in-game';

	let lastOnline;
	if (state !== 'offline') {
		lastOnline = now;
	} else if (prev.state === 'offline' && prev.lastOnline) {
		lastOnline = Date.parse(prev.lastOnline);
	} else {
		const parsed = parseLastOnline(tag(xml, 'stateMessage'), now);
		// Seen online on the previous run: the real logoff is between then and
		// now, and Steam's own figure is the best estimate - but never earlier
		// than the moment it was last seen online.
		lastOnline = parsed ?? (wasOn ? Date.parse(prev.checkedAt) : null);
		if (wasOn && lastOnline !== null && prev.checkedAt) lastOnline = Math.max(lastOnline, Date.parse(prev.checkedAt));
	}

	return {
		state,
		game: game || null,
		lastOnline: lastOnline === null || isNaN(lastOnline) ? null : new Date(lastOnline).toISOString(),
		checkedAt: new Date(now).toISOString(),
	};
}

// Read the profile and work out the new status. Shared by this script and
// tools/publish-steam-status.mjs, which runs the same thing from a PC.
export async function fetchStatus(previous, now = Date.now()) {
	const res = await fetch(PROFILE, { headers: { 'User-Agent': 'james-ccg.github.io status (+https://james-ccg.github.io/)' } });
	if (!res.ok) throw new Error(`Steam answered ${res.status}`);
	const xml = await res.text();
	if (!/<onlineState>/.test(xml)) throw new Error('no <onlineState> in the profile XML (private profile, or Steam changed the format)');
	return nextStatus(xml, previous, now);
}

async function main() {
	const [prevPath, outPath] = process.argv.slice(2);
	if (!outPath) {
		console.error('usage: node tools/steam-status.mjs <previous.json|-> <out.json>');
		process.exit(2);
	}
	let previous = null;
	try {
		if (prevPath && prevPath !== '-') previous = JSON.parse(fs.readFileSync(prevPath, 'utf8'));
	} catch {
		previous = null;
	}
	const status = await fetchStatus(previous);
	fs.writeFileSync(outPath, JSON.stringify(status, null, '\t') + '\n');
	console.log(JSON.stringify(status));
}

// basename, not endsWith: "publish-steam-status.mjs" ends with this file's
// name too, and importing it from there used to run this command line.
if (process.argv[1] && path.basename(process.argv[1]) === 'steam-status.mjs') {
	main().catch((e) => {
		console.error(e.message);
		process.exit(1);
	});
}
