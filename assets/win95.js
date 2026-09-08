/* =====================================================================
   A small window manager for the retro pages.

   98.css is CSS only - it styles a .window and a .title-bar but nothing
   moves. This adds the behaviour: drag by the title bar, focus on click,
   minimise to the taskbar, close, and a clock.

   Progressive enhancement throughout. Every window is real content in the
   document, so with JS off the pages read top to bottom as ordinary
   sections; this only makes them movable.
   ===================================================================== */
(function () {
	'use strict';

	var desk = document.querySelector('[data-desktop]');
	if (!desk) return;

	var tasks = document.querySelector('[data-tasklist]');
	var hint = document.querySelector('[data-desk-hint]');
	var z = 10;

	/* Closing every window used to leave a large empty teal rectangle with no
	   way back except knowing the taskbar buttons still worked. Show a way out
	   whenever nothing is open. */
	function syncEmpty() {
		if (!hint) return;
		var open = Array.prototype.some.call(
			desk.querySelectorAll('.window'),
			function (w) { return !w.hidden; }
		);
		hint.hidden = open;
	}

	function openAll() {
		desk.querySelectorAll('.window').forEach(function (w) {
			w.hidden = false;
		});
		if (tasks) {
			tasks.querySelectorAll('button').forEach(function (b) {
				b.setAttribute('aria-pressed', 'false');
			});
		}
		var first = desk.querySelector('.window');
		if (first) focus(first);
		syncEmpty();
	}

	/* Windows are real content in normal flow, so the page reads without JS.
	   Taking them out has to happen in two passes: the moment the first one
	   goes absolute it leaves the flow and every window below it shifts up, so
	   measuring and positioning in a single loop stacks them all in the corner.
	   Measure every box first, then place. */
	function layout(wins) {
		var deskBox = desk.getBoundingClientRect();
		var pad = 12;
		// The screen is 16:9. Not "at least" - taking the max of the packed
		// height and the ratio meant a tall pack simply won and the desktop
		// came out 1.2:1. The box is fixed first and the windows are fitted
		// into it.
		var targetH = Math.round((deskBox.width * 9) / 16);
		desk.style.height = targetH + 'px';

		var boxes = wins.map(function (w) {
			var b = w.getBoundingClientRect();
			return { w: b.width, h: b.height };
		});

		function pack(gap) {
			var x = gap, y = gap, rowH = 0, out = [];
			boxes.forEach(function (b) {
				if (x > gap && x + b.w > deskBox.width - gap) {
					x = gap;
					y += rowH + gap;
					rowH = 0;
				}
				out.push({ x: x, y: y });
				x += b.w + gap;
				rowH = Math.max(rowH, b.h);
			});
			return out;
		}

		function lowest(placed) {
			return placed.reduce(function (m, p, i) {
				return Math.max(m, p.y + boxes[i].h);
			}, 0);
		}

		// Shelf-pack, tightening the gap before giving up on it.
		var placed = null;
		for (var gap = pad; gap >= 4; gap -= 4) {
			var attempt = pack(gap);
			if (lowest(attempt) <= targetH) {
				placed = attempt;
				break;
			}
			placed = attempt;
		}

		// Still too tall: cascade instead. Overlapping windows always fit,
		// and a desktop is allowed to look like one.
		if (lowest(placed) > targetH) {
			placed = boxes.map(function (b, i) {
				var perCol = Math.max(1, Math.floor((targetH - pad) / 34));
				var col = Math.floor(i / perCol);
				var row = i % perCol;
				return {
					x: Math.min(deskBox.width - 60, pad + col * 150 + row * 22),
					y: Math.min(targetH - 30, pad + row * 34)
				};
			});
		}

		wins.forEach(function (w, i) {
			w.style.width = boxes[i].w + 'px';
			w.style.left = Math.round(placed[i].x) + 'px';
			w.style.top = Math.round(placed[i].y) + 'px';
			w.style.position = 'absolute';
		});
	}

	function focus(win) {
		win.style.zIndex = ++z;
		desk.querySelectorAll('.window').forEach(function (w) {
			w.querySelector('.title-bar').classList.toggle('inactive', w !== win);
		});
		if (tasks) {
			tasks.querySelectorAll('button').forEach(function (b) {
				b.setAttribute('aria-pressed', b.dataset.for === win.id ? 'true' : 'false');
			});
		}
	}

	function drag(win, handle) {
		var startX, startY, originX, originY, dragging = false;

		function down(e) {
			// Let the title-bar buttons work; only the bar itself drags.
			if (e.target.closest('.title-bar-controls')) return;
			var p = e.touches ? e.touches[0] : e;
			dragging = true;
			startX = p.clientX;
			startY = p.clientY;
			originX = parseFloat(win.style.left) || 0;
			originY = parseFloat(win.style.top) || 0;
			focus(win);
			document.body.classList.add('is-dragging');
			e.preventDefault();
		}

		function move(e) {
			if (!dragging) return;
			var p = e.touches ? e.touches[0] : e;
			// Clamp so a window can never be dragged fully out of reach - the
			// title bar always stays grabbable.
			var maxX = desk.clientWidth - 40;
			var maxY = desk.clientHeight - 24;
			win.style.left = Math.min(maxX, Math.max(-win.offsetWidth + 60, originX + p.clientX - startX)) + 'px';
			win.style.top = Math.min(maxY, Math.max(0, originY + p.clientY - startY)) + 'px';
		}

		function up() {
			dragging = false;
			document.body.classList.remove('is-dragging');
		}

		handle.addEventListener('mousedown', down);
		handle.addEventListener('touchstart', down, { passive: false });
		window.addEventListener('mousemove', move);
		window.addEventListener('touchmove', move, { passive: false });
		window.addEventListener('mouseup', up);
		window.addEventListener('touchend', up);
	}

	function taskButton(win, label) {
		if (!tasks) return null;
		var b = document.createElement('button');
		b.type = 'button';
		b.dataset.for = win.id;
		b.textContent = label;
		b.addEventListener('click', function () {
			if (win.hidden) {
				win.hidden = false;
				focus(win);
			} else if (b.getAttribute('aria-pressed') === 'true') {
				win.hidden = true;
				b.setAttribute('aria-pressed', 'false');
			} else {
				focus(win);
			}
			syncEmpty();
		});
		tasks.appendChild(b);
		return b;
	}

	var wins = Array.prototype.slice.call(desk.querySelectorAll('.window'));
	layout(wins);

	wins.forEach(function (win, i) {
		if (!win.id) win.id = 'win' + i;
		var bar = win.querySelector('.title-bar');
		var label = (win.querySelector('.title-bar-text') || {}).textContent || 'Window';

		win.style.zIndex = ++z;
		win.addEventListener('mousedown', function () {
			focus(win);
		});
		if (bar) drag(win, bar);

		taskButton(win, label);

		var close = win.querySelector('[aria-label="Close"]');
		if (close) {
			close.addEventListener('click', function () {
				win.hidden = true;
				if (tasks) {
					var b = tasks.querySelector('[data-for="' + win.id + '"]');
					if (b) b.setAttribute('aria-pressed', 'false');
				}
				syncEmpty();
			});
		}
		var min = win.querySelector('[aria-label="Minimize"]');
		if (min) {
			min.addEventListener('click', function () {
				win.hidden = true;
				if (tasks) {
					var b = tasks.querySelector('[data-for="' + win.id + '"]');
					if (b) b.setAttribute('aria-pressed', 'false');
				}
				syncEmpty();
			});
		}

		if (i === 0) focus(win);
	});

	// Double-clicking bare desktop reopens everything, the way a real one
	// would let you get your windows back.
	desk.addEventListener('dblclick', function (e) {
		if (e.target === desk) openAll();
	});
	var restore = document.querySelector('[data-restore]');
	if (restore) restore.addEventListener('click', openAll);
	syncEmpty();

	var clock = document.querySelector('[data-clock]');
	if (clock) {
		var tick = function () {
			clock.textContent = new Date().toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
			});
		};
		tick();
		setInterval(tick, 15000);
	}
})();
