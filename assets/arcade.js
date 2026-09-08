/* =====================================================================
   Arcade - the pet and the sticker machine.

   Both keep their state in localStorage, so they belong to the visitor's
   browser and nothing leaves it. Both also have to survive a first visit,
   a cleared store and a private window, so every read is defensive and
   every default is playable.
   ===================================================================== */
(function () {
	'use strict';

	var PET_KEY = 'jccg:pet';
	var GACHA_KEY = 'jccg:gacha';
	var DAY = 86400000;

	function load(key, fallback) {
		try {
			return Object.assign({}, fallback, JSON.parse(localStorage.getItem(key) || '{}'));
		} catch (e) {
			return Object.assign({}, fallback);
		}
	}

	function save(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (e) {
			/* private mode - this session still plays, it just will not persist */
		}
	}

	var clamp = function (n) {
		return Math.max(0, Math.min(100, n));
	};

	/* ================================ pet ============================ */
	var sprite = document.getElementById('petSprite');
	if (sprite) {
		var pet = load(PET_KEY, {
			fed: 70,
			happy: 70,
			energy: 80,
			born: Date.now(),
			seen: Date.now(),
		});

		/* Stats decay with real elapsed time rather than on a timer, so
		   closing the tab for a week actually matters and leaving it open
		   does not race ahead. */
		(function decay() {
			var hours = (Date.now() - pet.seen) / 3600000;
			pet.fed = clamp(pet.fed - hours * 3.2);
			pet.happy = clamp(pet.happy - hours * 2.4);
			pet.energy = clamp(pet.energy + hours * 4);
			pet.seen = Date.now();
		})();

		var speech = document.getElementById('petSpeech');
		var bars = {
			fed: document.getElementById('barFed'),
			happy: document.getElementById('barHappy'),
			energy: document.getElementById('barEnergy'),
		};

		function pose() {
			if (pet.energy < 22) return 'sleep';
			if (pet.fed < 25 || pet.happy < 25) return 'blink';
			return 'idle';
		}

		function say(text) {
			speech.textContent = text;
			speech.hidden = false;
			clearTimeout(say._t);
			say._t = setTimeout(function () {
				speech.hidden = true;
			}, 2200);
		}

		function render() {
			Object.keys(bars).forEach(function (k) {
				bars[k].style.width = pet[k].toFixed(0) + '%';
				bars[k].dataset.low = pet[k] < 25 ? 'true' : 'false';
			});
			sprite.src = '../assets/mascot/' + pose() + '.svg';
			var days = Math.floor((Date.now() - pet.born) / DAY);
			document.getElementById('petAge').textContent =
				days === 0 ? 'hatched today' : days === 1 ? '1 day old' : days + ' days old';
			save(PET_KEY, pet);
		}

		function bump(el) {
			el.classList.remove('pet-bounce');
			void el.offsetWidth;
			el.classList.add('pet-bounce');
		}

		document.getElementById('petFeed').addEventListener('click', function () {
			if (pet.fed > 96) return say('too full!');
			pet.fed = clamp(pet.fed + 18);
			pet.energy = clamp(pet.energy - 3);
			bump(sprite);
			say('nom');
			render();
		});

		document.getElementById('petPlay').addEventListener('click', function () {
			if (pet.energy < 15) return say('too sleepy');
			pet.happy = clamp(pet.happy + 16);
			pet.energy = clamp(pet.energy - 12);
			pet.fed = clamp(pet.fed - 5);
			bump(sprite);
			say('!!');
			render();
		});

		document.getElementById('petRest').addEventListener('click', function () {
			pet.energy = clamp(pet.energy + 26);
			pet.happy = clamp(pet.happy - 2);
			say('zzz');
			render();
		});

		sprite.addEventListener('click', function () {
			bump(sprite);
			say(['hi', ':3', 'hello', 'byte'][Math.floor(Math.random() * 4)]);
		});

		render();
		setInterval(function () {
			pet.fed = clamp(pet.fed - 0.05);
			pet.happy = clamp(pet.happy - 0.04);
			pet.seen = Date.now();
			render();
		}, 30000);
	}

	/* =============================== gacha =========================== */
	var rollBtn = document.getElementById('gachaRoll');
	if (rollBtn) {
		/* Weights are relative, not percentages - the roll sums them and picks
		   a point inside the total, so adding a prize never means rebalancing
		   every other number. */
		var PRIZES = [
			{ id: 'star', name: 'star', weight: 20 },
			{ id: 'heart', name: 'heart', weight: 20 },
			{ id: 'coin', name: 'coin', weight: 18 },
			{ id: 'floppy', name: 'floppy', weight: 12 },
			{ id: 'cassette', name: 'cassette', weight: 10 },
			{ id: 'mushroom', name: 'mushroom', weight: 8 },
			{ id: 'key', name: 'key', weight: 5 },
			{ id: 'gem', name: 'gem', weight: 4 },
			{ id: 'ghost', name: 'ghost', weight: 2 },
			{ id: 'crown', name: 'crown', weight: 1 },
		];
		var TOTAL = PRIZES.reduce(function (s, p) {
			return s + p.weight;
		}, 0);

		var store = load(GACHA_KEY, { owned: {}, last: 0 });
		var prizeSvg = document.getElementById('gachaPrize');
		var prizeUse = document.getElementById('gachaUse');
		var empty = document.getElementById('gachaEmpty');
		var msg = document.getElementById('gachaMsg');
		var shelf = document.getElementById('gachaShelf');
		var count = document.getElementById('gachaCount');

		function nextRollIn() {
			return Math.max(0, store.last + DAY - Date.now());
		}

		function humanise(ms) {
			// Round to whole minutes first: rounding the remainder separately
			// lets a value just under the hour print as "23h 60m".
			var mins = Math.ceil(ms / 60000);
			var h = Math.floor(mins / 60);
			return h > 0 ? h + 'h ' + (mins % 60) + 'm' : mins + 'm';
		}

		function renderShelf() {
			shelf.innerHTML = '';
			PRIZES.forEach(function (p) {
				var n = store.owned[p.id] || 0;
				var cell = document.createElement('div');
				cell.className = 'shelf-cell' + (n ? '' : ' locked');
				cell.title = n ? p.name + ' x' + n : 'not found yet';
				cell.innerHTML = n
					? '<svg viewBox="0 0 12 12"><use href="#s-' + p.id + '"/></svg>' +
					  (n > 1 ? '<span class="dupe">' + n + '</span>' : '')
					: '<span class="locked-mark">?</span>';
				shelf.appendChild(cell);
			});
			var found = PRIZES.filter(function (p) {
				return store.owned[p.id];
			}).length;
			count.textContent = found + '/' + PRIZES.length;
		}

		function renderButton() {
			var wait = nextRollIn();
			rollBtn.disabled = wait > 0;
			rollBtn.textContent = wait > 0 ? 'NEXT IN ' + humanise(wait) : 'ROLL';
		}

		rollBtn.addEventListener('click', function () {
			if (nextRollIn() > 0) return;
			var pick = Math.random() * TOTAL;
			var prize = PRIZES[PRIZES.length - 1];
			for (var i = 0; i < PRIZES.length; i++) {
				pick -= PRIZES[i].weight;
				if (pick <= 0) {
					prize = PRIZES[i];
					break;
				}
			}
			var isNew = !store.owned[prize.id];
			store.owned[prize.id] = (store.owned[prize.id] || 0) + 1;
			store.last = Date.now();
			save(GACHA_KEY, store);

			prizeUse.setAttribute('href', '#s-' + prize.id);
			prizeSvg.hidden = false;
			empty.hidden = true;
			prizeSvg.classList.remove('pop');
			void prizeSvg.offsetWidth;
			prizeSvg.classList.add('pop');
			msg.textContent = isNew ? 'NEW! ' + prize.name : prize.name + ' (again)';
			renderShelf();
			renderButton();
		});

		renderShelf();
		renderButton();
		setInterval(renderButton, 60000);
	}
})();
