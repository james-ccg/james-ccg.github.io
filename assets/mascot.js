/* =====================================================================
   Puck - the site mascot layer.

   Adds a corner sprite that idles, blinks, waves and falls asleep, plus an
   idle screensaver and an optional unseen hand. Everything here is opt-out
   and remembered, everything respects prefers-reduced-motion, and none of it
   is load-bearing: with JS off, or with the toys switched off, the pages are
   unchanged.
   ===================================================================== */
(function () {
	'use strict';

	var ROOT = document.currentScript
		? document.currentScript.src.replace(/assets\/mascot\.js.*$/, '')
		: './';
	var POSES = ['idle', 'blink', 'wave', 'sleep'];
	var KEY = 'jccg:toys';
	var SLEEP_AFTER = 45000;
	var SAVER_AFTER = 150000;

	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function prefs() {
		var d = { sprite: true, cursor: false, saver: true };
		try {
			return Object.assign(d, JSON.parse(localStorage.getItem(KEY) || '{}'));
		} catch (e) {
			return d;
		}
	}

	function savePrefs(p) {
		try {
			localStorage.setItem(KEY, JSON.stringify(p));
		} catch (e) {
			/* private mode - the toys just reset next visit */
		}
	}

	var state = prefs();

	/* ---------- sprite ---------------------------------------------- */
	var el, img, bubble, sleepTimer, blinkTimer;

	function setPose(name) {
		if (img) img.src = ROOT + 'assets/mascot/' + name + '.png';
	}

	function say(text, ms) {
		if (!bubble) return;
		bubble.textContent = text;
		bubble.hidden = false;
		clearTimeout(say._t);
		say._t = setTimeout(function () {
			bubble.hidden = true;
		}, ms || 2600);
	}

	var LINES = [
		'hi!',
		'built in a browser tab',
		'try the cropper',
		'zzz...',
		'i am puck',
		'nothing is uploaded',
	];

	function buildSprite() {
		el = document.createElement('div');
		el.className = 'byte';
		el.innerHTML =
			'<div class="byte-bubble" hidden></div>' +
			'<img class="byte-img" width="96" height="96" alt="Puck, the site mascot" />' +
			'<button class="byte-hide" type="button" title="Hide Puck" aria-label="Hide Puck">x</button>';
		document.body.appendChild(el);
		img = el.querySelector('.byte-img');
		bubble = el.querySelector('.byte-bubble');
		setPose('idle');

		el.addEventListener('mouseenter', function () {
			setPose('wave');
		});
		el.addEventListener('mouseleave', function () {
			setPose('idle');
		});
		el.addEventListener('click', function (e) {
			if (e.target.classList.contains('byte-hide')) return;
			el.classList.remove('byte-hop');
			void el.offsetWidth; // restart the animation
			el.classList.add('byte-hop');
			say(LINES[Math.floor(Math.random() * LINES.length)]);
		});
		el.querySelector('.byte-hide').addEventListener('click', function () {
			state.sprite = false;
			savePrefs(state);
			el.remove();
			el = null;
		});

		if (!reduced) {
			blinkTimer = setInterval(function () {
				if (!img || img.src.indexOf('idle') < 0) return;
				setPose('blink');
				setTimeout(function () {
					if (img && img.src.indexOf('blink') > -1) setPose('idle');
				}, 140);
			}, 5200);
		}
	}

	/* ---------- idle: sprite sleeps, then the screensaver ------------ */
	var saver;

	function buildSaver() {
		saver = document.createElement('div');
		saver.className = 'saver';
		saver.innerHTML =
			'<canvas class="saver-canvas"></canvas>' +
			'<div class="saver-tag">puck is asleep &mdash; move to wake</div>';
		document.body.appendChild(saver);

		var canvas = saver.querySelector('.saver-canvas');
		var ctx = canvas.getContext('2d');
		var stars = [];
		var raf;

		function size() {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}

		function seed() {
			stars = [];
			var n = Math.round((canvas.width * canvas.height) / 9000);
			for (var i = 0; i < n; i++) {
				stars.push({
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					z: 1 + Math.random() * 2,
				});
			}
		}

		function frame() {
			ctx.fillStyle = '#0b0c11';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			for (var i = 0; i < stars.length; i++) {
				var s = stars[i];
				s.y += s.z * 0.35;
				if (s.y > canvas.height) {
					s.y = -2;
					s.x = Math.random() * canvas.width;
				}
				ctx.fillStyle = s.z > 2.2 ? '#ffb454' : '#3b3f56';
				ctx.fillRect(Math.round(s.x), Math.round(s.y), s.z | 0, s.z | 0);
			}
			raf = requestAnimationFrame(frame);
		}

		saver.show = function () {
			size();
			seed();
			saver.classList.add('on');
			if (!reduced) frame();
		};
		saver.hide = function () {
			saver.classList.remove('on');
			cancelAnimationFrame(raf);
		};
		window.addEventListener('resize', function () {
			if (saver.classList.contains('on')) {
				size();
				seed();
			}
		});
	}

	function wake() {
		if (el && img && img.src.indexOf('sleep') > -1) setPose('idle');
		if (saver && saver.classList.contains('on')) saver.hide();
		clearTimeout(sleepTimer);
		clearTimeout(wake._saver);
		sleepTimer = setTimeout(function () {
			if (el) setPose('sleep');
		}, SLEEP_AFTER);
		if (state.saver && saver) {
			wake._saver = setTimeout(saver.show, SAVER_AFTER);
		}
	}

	/* ---------- unseen hand ----------------------------------------- */
	/* Puck's paw, drawn on a 12-grid and served at 24px. The hotspot sits
	   at the top-left toe rather than the centre, so the thing you click is
	   where the pointer looks like it is. */
	/* Puck's paw. Four toe beans over a main pad - the shape a paw print
	   actually makes; squared-off toes read as a blob at 24px. The dark
	   edge is the same 1px outline pass the sprite uses, so the cursor
	   stays visible over both light and dark pages. Hotspot is the top-left
	   toe, so what you click is where the pointer looks like it is. */
	/* Subaru's Invisible Providence - the Unseen Hand. Hotspot on the top
	   claw tip, so what you click is what it points at. */
	var CURSORS = {
		crosshair: 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M11%202%20H13%20V11%20H22%20V13%20H13%20V22%20H11%20V13%20H2%20V11%20H11%20Z%27%20fill%3D%27%238b4fc9%27%20stroke%3D%27%23150a24%27%20stroke-width%3D%272.6%27%20stroke-linejoin%3D%27round%27%20paint-order%3D%27stroke%27%2F%3E%3C%2Fsvg%3E") 11 11, auto',
		default: 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M3.5%202.2%20L3.5%2019.6%20L8.0%2015.4%20L10.9%2021.8%20L13.9%2020.4%20L11.1%2014.2%20L16.9%2014.0%20Z%27%20fill%3D%27%238b4fc9%27%20stroke%3D%27%23150a24%27%20stroke-width%3D%272.6%27%20stroke-linejoin%3D%27round%27%20paint-order%3D%27stroke%27%2F%3E%3Cpath%20d%3D%27M5.1%205.0%20L5.1%2015.6%27%20stroke%3D%27%23c79bf0%27%20stroke-width%3D%271.3%27%20stroke-linecap%3D%27round%27%20fill%3D%27none%27%2F%3E%3C%2Fsvg%3E") 3 2, auto',
		'ew-resize': 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M1.4%2012%20L6.5%208%20V10.6%20H17.5%20V8%20L22.6%2012%20L17.5%2016%20V13.4%20H6.5%20V16%20Z%27%20fill%3D%27%238b4fc9%27%20stroke%3D%27%23150a24%27%20stroke-width%3D%272.6%27%20stroke-linejoin%3D%27round%27%20paint-order%3D%27stroke%27%2F%3E%3C%2Fsvg%3E") 11 11, auto',
		grab: 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cg%20fill%3D%27%23150a24%27%3E%3Crect%20x%3D%275.80%27%20y%3D%272.40%27%20width%3D%276.40%27%20height%3D%2712.20%27%20rx%3D%273.20%27%2F%3E%3Crect%20x%3D%279.20%27%20y%3D%271.20%27%20width%3D%276.40%27%20height%3D%2713.40%27%20rx%3D%273.20%27%2F%3E%3Crect%20x%3D%2712.60%27%20y%3D%272.40%27%20width%3D%276.40%27%20height%3D%2712.20%27%20rx%3D%273.20%27%2F%3E%3Crect%20x%3D%273.00%27%20y%3D%277.40%27%20width%3D%276.20%27%20height%3D%279.20%27%20rx%3D%273.10%27%2F%3E%3Crect%20x%3D%274.00%27%20y%3D%278.80%27%20width%3D%2716.20%27%20height%3D%2713.80%27%20rx%3D%275.40%27%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%27%238b4fc9%27%3E%3Crect%20x%3D%277.40%27%20y%3D%274.00%27%20width%3D%273.20%27%20height%3D%279.00%27%20rx%3D%271.60%27%2F%3E%3Crect%20x%3D%2710.80%27%20y%3D%272.80%27%20width%3D%273.20%27%20height%3D%2710.20%27%20rx%3D%271.60%27%2F%3E%3Crect%20x%3D%2714.20%27%20y%3D%274.00%27%20width%3D%273.20%27%20height%3D%279.00%27%20rx%3D%271.60%27%2F%3E%3Crect%20x%3D%274.60%27%20y%3D%279.00%27%20width%3D%273.00%27%20height%3D%276.00%27%20rx%3D%271.50%27%2F%3E%3Crect%20x%3D%275.60%27%20y%3D%2710.40%27%20width%3D%2713.00%27%20height%3D%2710.60%27%20rx%3D%273.80%27%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") 11 6, auto',
		move: 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M12%201.4%20L15.6%206%20H13.1%20V11%20H18.1%20V8.5%20L22.6%2012%20L18.1%2015.5%20V13%20H13.1%20V18%20H15.6%20L12%2022.6%20L8.4%2018%20H10.9%20V13%20H5.9%20V15.5%20L1.4%2012%20L5.9%208.5%20V11%20H10.9%20V6%20H8.4%20Z%27%20fill%3D%27%238b4fc9%27%20stroke%3D%27%23150a24%27%20stroke-width%3D%272.6%27%20stroke-linejoin%3D%27round%27%20paint-order%3D%27stroke%27%2F%3E%3C%2Fsvg%3E") 11 11, auto',
		'not-allowed': 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M12%202.6%20A9.4%209.4%200%201%201%2011.99%202.6%20Z%20M12%205.8%20A6.2%206.2%200%201%200%2012.01%205.8%20Z%20M6.6%2016.6%20L16.6%206.6%20L18.2%208.2%20L8.2%2018.2%20Z%27%20fill%3D%27%238b4fc9%27%20fill-rule%3D%27evenodd%27%20stroke%3D%27%23150a24%27%20stroke-width%3D%272.6%27%20stroke-linejoin%3D%27round%27%20paint-order%3D%27stroke%27%2F%3E%3C%2Fsvg%3E") 11 11, auto',
		'ns-resize': 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M12%201.4%20L16%206.5%20H13.4%20V17.5%20H16%20L12%2022.6%20L8%2017.5%20H10.6%20V6.5%20H8%20Z%27%20fill%3D%27%238b4fc9%27%20stroke%3D%27%23150a24%27%20stroke-width%3D%272.6%27%20stroke-linejoin%3D%27round%27%20paint-order%3D%27stroke%27%2F%3E%3C%2Fsvg%3E") 11 11, auto',
		pointer: 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cg%20fill%3D%27%23150a24%27%3E%3Crect%20x%3D%275.60%27%20y%3D%270.20%27%20width%3D%276.70%27%20height%3D%2716.00%27%20rx%3D%273.35%27%2F%3E%3Crect%20x%3D%279.70%27%20y%3D%276.80%27%20width%3D%276.40%27%20height%3D%279.40%27%20rx%3D%273.20%27%2F%3E%3Crect%20x%3D%2712.60%27%20y%3D%277.80%27%20width%3D%276.30%27%20height%3D%278.40%27%20rx%3D%273.15%27%2F%3E%3Crect%20x%3D%2715.30%27%20y%3D%279.00%27%20width%3D%276.10%27%20height%3D%277.40%27%20rx%3D%273.05%27%2F%3E%3Crect%20x%3D%272.70%27%20y%3D%2711.40%27%20width%3D%276.50%27%20height%3D%278.80%27%20rx%3D%273.25%27%2F%3E%3Crect%20x%3D%274.40%27%20y%3D%2710.40%27%20width%3D%2716.60%27%20height%3D%2713.00%27%20rx%3D%275.00%27%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%27%238b4fc9%27%3E%3Crect%20x%3D%277.20%27%20y%3D%271.80%27%20width%3D%273.50%27%20height%3D%2712.80%27%20rx%3D%271.75%27%2F%3E%3Crect%20x%3D%2711.30%27%20y%3D%278.40%27%20width%3D%273.20%27%20height%3D%276.20%27%20rx%3D%271.60%27%2F%3E%3Crect%20x%3D%2714.20%27%20y%3D%279.40%27%20width%3D%273.10%27%20height%3D%275.20%27%20rx%3D%271.55%27%2F%3E%3Crect%20x%3D%2716.90%27%20y%3D%2710.60%27%20width%3D%272.90%27%20height%3D%274.20%27%20rx%3D%271.45%27%2F%3E%3Crect%20x%3D%274.30%27%20y%3D%2713.00%27%20width%3D%273.30%27%20height%3D%275.60%27%20rx%3D%271.65%27%2F%3E%3Crect%20x%3D%276.00%27%20y%3D%2712.00%27%20width%3D%2713.40%27%20height%3D%279.80%27%20rx%3D%273.40%27%2F%3E%3C%2Fg%3E%3Crect%20x%3D%2711.1%27%20y%3D%279.0%27%20width%3D%270.9%27%20height%3D%274.6%27%20rx%3D%270.45%27%20fill%3D%27%23150a24%27%2F%3E%3Crect%20x%3D%2714.0%27%20y%3D%2710.0%27%20width%3D%270.9%27%20height%3D%273.8%27%20rx%3D%270.45%27%20fill%3D%27%23150a24%27%2F%3E%3Crect%20x%3D%2716.7%27%20y%3D%2711.2%27%20width%3D%270.9%27%20height%3D%273.0%27%20rx%3D%270.45%27%20fill%3D%27%23150a24%27%2F%3E%3Crect%20x%3D%278.0%27%20y%3D%272.8%27%20width%3D%271.4%27%20height%3D%279.4%27%20rx%3D%270.7%27%20fill%3D%27%23c79bf0%27%2F%3E%3C%2Fsvg%3E") 8 2, auto',
		text: 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M8.5%203%20H15.5%20V5%20H13%20V19%20H15.5%20V21%20H8.5%20V19%20H11%20V5%20H8.5%20Z%27%20fill%3D%27%238b4fc9%27%20stroke%3D%27%23150a24%27%20stroke-width%3D%272.6%27%20stroke-linejoin%3D%27round%27%20paint-order%3D%27stroke%27%2F%3E%3C%2Fsvg%3E") 11 11, auto',
		wait: 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2722%27%20height%3D%2722%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M5.5%202.5%20H18.5%20V5%20L13.4%2012%20L18.5%2019%20V21.5%20H5.5%20V19%20L10.6%2012%20L5.5%205%20Z%27%20fill%3D%27%238b4fc9%27%20stroke%3D%27%23150a24%27%20stroke-width%3D%272.6%27%20stroke-linejoin%3D%27round%27%20paint-order%3D%27stroke%27%2F%3E%3C%2Fsvg%3E") 11 11, auto',
	};

	/* The pack is applied as one stylesheet rather than an inline style on
	   <html>. A cursor set is about every role - links, text fields, the
	   draggable title bars, disabled buttons - and only a rule per selector
	   can reach those. Removing the element restores the system cursors
	   exactly, with nothing left behind on elements.

	   Every rule is !important, which is the right call exactly once: this is
	   a global override the visitor switched on, and it has to beat whatever
	   the page already said. It had to - `.btn:disabled { cursor: default }`
	   in arcade.css scores (0,2,0) against this sheet's `html :disabled` at
	   (0,1,1), so the gacha button kept the plain arrow during its cooldown
	   instead of showing not-allowed. Raising specificity selector by selector
	   would mean guessing every page rule that might ever compete. */
	var cursorSheet = null;

	function cursorCss() {
		var c = CURSORS;
		return [
			'html, html *{cursor:' + c.default + ' !important}',
			'html a,html button,html select,html summary,html label,html [role="button"],',
			'html .b88,html .modeBtn,html .btn,html .formatBtn{cursor:' + c.pointer + ' !important}',
			'html input[type="text"],html input[type="email"],html input[type="url"],',
			'html input[type="number"],html textarea{cursor:' + c.text + ' !important}',
			'html .title-bar{cursor:' + c.move + ' !important}',
			'html .title-bar:active{cursor:' + c.grab + ' !important}',
			'html :disabled,html [aria-disabled="true"]{cursor:' + c['not-allowed'] + ' !important}',
			'html progress,html .meter{cursor:' + c.wait + ' !important}',
			'html .work-shot,html .shrine-gallery a{cursor:' + c.crosshair + ' !important}',
			'html [data-desktop]{cursor:' + c.default + ' !important}',
		].join(' ');
	}

	function applyCursor() {
		if (state.cursor && !cursorSheet) {
			cursorSheet = document.createElement('style');
			cursorSheet.id = 'jccg-cursors';
			cursorSheet.textContent = cursorCss();
			document.head.appendChild(cursorSheet);
		} else if (!state.cursor && cursorSheet) {
			cursorSheet.remove();
			cursorSheet = null;
		}
	}

	/* ---------- the toy switches ------------------------------------- */
	function buildControls() {
		var box = document.querySelector('[data-toys]');
		if (!box) return;
		box.innerHTML =
			'<label><input type="checkbox" data-toy="sprite" /> corner mascot</label>' +
			'<label><input type="checkbox" data-toy="cursor" /> unseen hand cursors</label>' +
			'<label><input type="checkbox" data-toy="saver" /> idle screensaver</label>';

		box.querySelectorAll('input[data-toy]').forEach(function (input) {
			input.checked = !!state[input.dataset.toy];
			input.addEventListener('change', function () {
				state[input.dataset.toy] = input.checked;
				savePrefs(state);
				if (input.dataset.toy === 'cursor') applyCursor();
				if (input.dataset.toy === 'sprite') {
					if (input.checked && !el) {
						buildSprite();
						wake();
					} else if (!input.checked && el) {
						el.remove();
						el = null;
					}
				}
				if (input.dataset.toy === 'saver' && !input.checked && saver) saver.hide();
			});
		});

	}

	/* ---------- go ---------------------------------------------------- */
	if (state.sprite) buildSprite();
	buildSaver();
	buildControls();
	applyCursor();
	['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(function (ev) {
		window.addEventListener(ev, wake, { passive: true });
	});
	wake();
})();
