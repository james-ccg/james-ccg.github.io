/* =====================================================================
   Byte - the site mascot layer.

   Adds a corner sprite that idles, blinks, waves and falls asleep, plus an
   idle screensaver and an optional pixel cursor. Everything here is opt-out
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
		if (img) img.src = ROOT + 'assets/mascot/' + name + '.svg';
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
		'i am byte',
		'nothing is uploaded',
	];

	function buildSprite() {
		el = document.createElement('div');
		el.className = 'byte';
		el.innerHTML =
			'<div class="byte-bubble" hidden></div>' +
			'<img class="byte-img" width="16" height="16" alt="Byte, the site mascot" />' +
			'<button class="byte-hide" type="button" title="Hide Byte" aria-label="Hide Byte">x</button>';
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
			'<div class="saver-tag">byte is asleep &mdash; move to wake</div>';
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

	/* ---------- pixel cursor ----------------------------------------- */
	var CURSOR =
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 12 12' shape-rendering='crispEdges'%3E%3Cpath d='M1 0h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1H9v-1H8v1H7v1H6v1H5V9H4V8H3V7H2V6H1V0z' fill='%2314151c'/%3E%3Cpath d='M2 1h1v1h1v1h1v1h1v1h1v1h1v1h1v1H7v1H6v1H5V8H4V7H3V6H2V1z' fill='%23ffb454'/%3E%3C/svg%3E\") 0 0, auto";

	function applyCursor() {
		document.documentElement.style.cursor = state.cursor ? CURSOR : '';
	}

	/* ---------- the toy switches ------------------------------------- */
	function buildControls() {
		var box = document.querySelector('[data-toys]');
		if (!box) return;
		box.innerHTML =
			'<label><input type="checkbox" data-toy="sprite" /> corner mascot</label>' +
			'<label><input type="checkbox" data-toy="cursor" /> pixel cursor</label>' +
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
