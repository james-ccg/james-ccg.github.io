/* =====================================================================
   subaru.exe - Return by Death.

   A short run of rooms. Each has three doors and one of them kills you. Dying
   rewinds you to the start of the run with nothing lost but time - except you
   remember, and the door that killed you stays marked. That is the whole
   mechanic of the show reduced to something playable in a 250px window: you
   do not get stronger, you just already know.

   The fatal doors are rolled once per run and kept, so a retry is a retry of
   the same run rather than a fresh shuffle - otherwise memory would be worth
   nothing and the game would be pure chance.
   ===================================================================== */
(function () {
	'use strict';

	var root = document.getElementById('rbdGame');
	if (!root) return;

	var ROOMS = [
		{ name: 'the alley', doors: ['left', 'ahead', 'right'] },
		{ name: 'the loot house', doors: ['stairs', 'cellar', 'window'] },
		{ name: 'the mansion hall', doors: ['east wing', 'library', 'kitchen'] },
		{ name: 'the forest track', doors: ['follow', 'wait', 'run'] },
		{ name: 'the sanctuary', doors: ['speak', 'kneel', 'leave'] },
	];
	var KEY = 'jccg:rbd';

	var state = load();

	function load() {
		var d = { fatal: null, room: 0, deaths: 0, known: [], won: false };
		try {
			var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
			d = Object.assign(d, raw);
		} catch (e) {
			/* private mode - the run just will not survive a reload */
		}
		if (!Array.isArray(d.fatal) || d.fatal.length !== ROOMS.length) newRun(d);
		if (!Array.isArray(d.known) || d.known.length !== ROOMS.length) {
			d.known = ROOMS.map(function () { return []; });
		}
		return d;
	}

	function newRun(d) {
		d.fatal = ROOMS.map(function (r) {
			return Math.floor(Math.random() * r.doors.length);
		});
		d.known = ROOMS.map(function () { return []; });
		d.room = 0;
		d.deaths = 0;
		d.won = false;
	}

	function save() {
		try {
			localStorage.setItem(KEY, JSON.stringify(state));
		} catch (e) {
			/* nothing to do - the run stays in memory for this session */
		}
	}

	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text != null) n.textContent = text;
		return n;
	}

	function render(message, tone) {
		root.innerHTML = '';

		var status = el('div', 'rbd-status');
		status.appendChild(el('span', null, 'room ' + Math.min(state.room + 1, ROOMS.length) + '/' + ROOMS.length));
		status.appendChild(el('span', null, 'deaths ' + state.deaths));
		root.appendChild(status);

		if (state.won) {
			root.appendChild(el('p', 'rbd-msg rbd-win', 'You made it out. ' + state.deaths + ' deaths.'));
			var again = el('button', null, 'new run');
			again.type = 'button';
			again.addEventListener('click', function () {
				newRun(state);
				save();
				render('A new loop. You remember nothing.');
			});
			root.appendChild(again);
			return;
		}

		var room = ROOMS[state.room];
		root.appendChild(el('p', 'rbd-room', room.name));

		var list = el('div', 'rbd-doors');
		room.doors.forEach(function (door, i) {
			var b = el('button', null, door);
			b.type = 'button';
			if (state.known[state.room].indexOf(i) > -1) {
				b.classList.add('rbd-dead');
				b.title = 'This one killed you.';
			}
			b.addEventListener('click', function () {
				choose(i);
			});
			list.appendChild(b);
		});
		root.appendChild(list);

		if (message) {
			root.appendChild(el('p', 'rbd-msg' + (tone ? ' ' + tone : ''), message));
		}
	}

	function choose(i) {
		if (state.fatal[state.room] === i) {
			if (state.known[state.room].indexOf(i) < 0) state.known[state.room].push(i);
			state.deaths += 1;
			state.room = 0;
			save();
			render('You died. Back to the start - but you remember.', 'rbd-bad');
			return;
		}
		state.room += 1;
		if (state.room >= ROOMS.length) {
			state.won = true;
			save();
			render();
			return;
		}
		save();
		render('Still alive.');
	}

	render(state.deaths ? 'You have been here before.' : 'Pick a way through.');
})();
