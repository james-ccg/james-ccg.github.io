/* =====================================================================
   james-ccg.github.io - behaviour layer
   Plain ES5-ish, no build step, no dependencies. Everything degrades:
   with JS off the page is still a complete, readable document.
   ===================================================================== */
(function () {
	'use strict';

	/* ---------- theme switcher ------------------------------------
	   Three states, and "auto" is a real one: no stamp on <html> means
	   the OS decides via prefers-color-scheme. The stamp only appears
	   once the visitor picks, and then it wins in both directions. */
	var THEMES = ['auto', 'retro', 'light', 'matrix'];
	var STORE_KEY = 'jccg:theme';

	function readStoredTheme() {
		try {
			var v = localStorage.getItem(STORE_KEY);
			return THEMES.indexOf(v) > -1 ? v : 'auto';
		} catch (e) {
			return 'auto';
		}
	}

	function applyTheme(name) {
		var root = document.documentElement;
		if (name === 'auto') {
			root.removeAttribute('data-theme');
		} else if (name === 'retro') {
			// The bare :root block already *is* retro, but an explicit stamp
			// is still needed so a light OS does not win via the media query.
			root.setAttribute('data-theme', 'retro');
		} else {
			root.setAttribute('data-theme', name);
		}
		var buttons = document.querySelectorAll('.theme-switch button');
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].setAttribute(
				'aria-pressed',
				buttons[i].dataset.theme === name ? 'true' : 'false'
			);
		}
		try {
			localStorage.setItem(STORE_KEY, name);
		} catch (e) {
			/* private mode - the choice just will not persist */
		}
	}

	var themeSwitch = document.querySelector('.theme-switch');
	if (themeSwitch) {
		themeSwitch.addEventListener('click', function (event) {
			var btn = event.target.closest('button[data-theme]');
			if (btn) applyTheme(btn.dataset.theme);
		});
	}
	applyTheme(readStoredTheme());

	/* ---------- mobile nav ----------------------------------------- */
	var navToggle = document.getElementById('navToggle');
	var navLinks = document.getElementById('navLinks');
	if (navToggle && navLinks) {
		navToggle.addEventListener('click', function () {
			var open = navLinks.classList.toggle('open');
			navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
		navLinks.addEventListener('click', function (event) {
			if (event.target.tagName === 'A') {
				navLinks.classList.remove('open');
				navToggle.setAttribute('aria-expanded', 'false');
			}
		});
	}

	/* ---------- copy-my-button ------------------------------------- */
	var copyBtn = document.getElementById('copyBadge');
	if (copyBtn) {
		copyBtn.addEventListener('click', function () {
			var ta = document.getElementById('badgeCode');
			var done = function () {
				var original = copyBtn.textContent;
				copyBtn.textContent = 'copied!';
				setTimeout(function () {
					copyBtn.textContent = original;
				}, 1600);
			};
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(ta.value).then(done, function () {
					ta.select();
				});
			} else {
				ta.select();
				try {
					document.execCommand('copy');
					done();
				} catch (e) {
					/* leave it selected for a manual copy */
				}
			}
		});
	}

	/* ---------- last updated --------------------------------------- */
	/* Taken from the repo's own last commit through the public GitHub API,
	   so it is the real thing rather than a date typed into the markup and
	   left to rot.

	   The row ships hidden and is only ever revealed once a real date is in
	   hand. Everything about this call can fail in a way the visitor would
	   otherwise see: unauthenticated GitHub allows 60 requests an hour per
	   address and answers 403 after that, the request can simply be slow,
	   and a reader with the network blocked gets nothing at all. In every
	   one of those cases the right thing on screen is no row, not a
	   placeholder dash sitting where a date belongs. */
	var updatedEl = document.getElementById('updatedAt');
	if (updatedEl) {
		/* The commit date is cached for an hour. Every page view used to ask
		   the API again, and unauthenticated GitHub allows 60 requests an hour
		   per address - a handful of reloads, or several visitors behind one
		   office or campus network, used it up, after which each view logged a
		   403 and the row stayed hidden. A recent answer is as good as a fresh
		   one for "3d ago", and a stale one is still better than none when the
		   API refuses. */
		var CACHE_KEY = 'jccg:updatedAt';
		var CACHE_MS = 3600000;
		var show = function (when) {
			var days = Math.floor((Date.now() - new Date(when)) / 86400000);
			if (isNaN(days)) return;
			updatedEl.textContent =
				days <= 0 ? 'today' : days === 1 ? 'yesterday' : days + 'd ago';
			var row = updatedEl.closest('[data-optional]');
			if (row) row.hidden = false;
		};
		var cached = null;
		try {
			cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
		} catch (e) {
			cached = null;
		}
		if (cached && cached.when && Date.now() - cached.at < CACHE_MS) {
			show(cached.when);
		} else {
			fetch('https://api.github.com/repos/james-ccg/james-ccg.github.io/commits?per_page=1')
				.then(function (r) {
					return r.ok ? r.json() : Promise.reject(r.status);
				})
				.then(function (commits) {
					var when = commits && commits[0] && commits[0].commit.committer.date;
					if (!when) return Promise.reject('no date');
					try {
						localStorage.setItem(CACHE_KEY, JSON.stringify({ when: when, at: Date.now() }));
					} catch (e) {
						/* private mode - just no cache */
					}
					show(when);
				})
				.catch(function () {
					if (cached && cached.when) show(cached.when);
					/* otherwise the row stays hidden */
				});
		}
	}

	/* ---------- Steam status ----------------------------------------
	   Real, from the Steam profile. Steam blocks cross-origin reads, so a
	   scheduled job (.github/workflows/steam-status.yml) reads the profile and
	   publishes steam-status.json on this repo's `status` branch, which
	   raw.githubusercontent.com serves to any origin.

	   The file says when it was checked, and the wording follows its age: a
	   job that has stopped running must not leave the card saying "online"
	   for a week. Past FRESH, an online reading becomes "on Steam 3h ago",
	   which is still true - that is when it was last seen online. Nothing to
	   say (no file yet, network blocked) leaves the line hidden. */
	var statusEl = document.getElementById('steamStatus');
	if (statusEl && window.fetch) {
		var STATUS_URL = 'https://raw.githubusercontent.com/james-ccg/james-ccg.github.io/status/steam-status.json';
		var FRESH = 45 * 60000;
		var ago = function (t) {
			var mins = Math.max(0, Math.round((Date.now() - t) / 60000));
			if (mins < 2) return 'just now';
			if (mins < 60) return mins + 'm ago';
			var hrs = Math.round(mins / 60);
			if (hrs < 24) return hrs + 'h ago';
			var days = Math.round(hrs / 24);
			return days === 1 ? 'yesterday' : days + 'd ago';
		};
		// The CDN caches for five minutes; a five-minute bucket in the query
		// keeps every visitor in the same window on one cached copy.
		fetch(STATUS_URL + '?t=' + Math.floor(Date.now() / 300000))
			.then(function (r) {
				return r.ok ? r.json() : Promise.reject(r.status);
			})
			.then(function (s) {
				var checked = Date.parse(s.checkedAt);
				var last = s.lastOnline ? Date.parse(s.lastOnline) : NaN;
				if (isNaN(checked)) return;
				var on = s.state === 'online' || s.state === 'in-game';
				var fresh = Date.now() - checked < FRESH;
				var text, state, when;
				if (on && fresh) {
					state = s.state;
					text = s.state === 'in-game' && s.game ? 'playing ' + s.game : 'online on Steam';
					when = checked;
				} else if (on) {
					state = 'offline';
					text = 'on Steam ' + ago(checked);
					when = checked;
				} else if (!isNaN(last)) {
					state = 'offline';
					text = 'on Steam ' + ago(last);
					when = last;
				} else {
					state = 'offline';
					text = 'offline on Steam';
					when = checked;
				}
				statusEl.dataset.state = state;
				statusEl.querySelector('.status-text').textContent = text;
				statusEl.title =
					(on && fresh ? 'Checked ' : 'Last seen online ') +
					new Date(when).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
				statusEl.hidden = false;
			})
			.catch(function () {
				/* no status file yet, or offline - the line stays hidden */
			});
	}

	/* ---------- hit counter ----------------------------------------
	   Counts once per device per day. Refreshing does nothing; coming back
	   tomorrow adds one. The window is checked against a stored timestamp
	   rather than a date string so it is a real 24 hours, not "any time
	   after midnight".

	   Note on what this can and cannot be: these pages are static files on
	   GitHub Pages, so there is no server and no request log - nothing here
	   can see an IP address. A device is the finest identity available to a
	   page on its own, which is what localStorage gives us. A genuinely
	   global, IP-deduplicated total needs something server-side (a hosted
	   counter's <img>, or a small serverless endpoint) and would mean every
	   visitor's address reaching a third party. */
	var counter = document.getElementById('hitCounter');
	if (counter) {
		var DAY = 86400000;
		var visits = 0;
		try {
			visits = parseInt(localStorage.getItem('jccg:visits'), 10) || 0;
			var last = parseInt(localStorage.getItem('jccg:lastVisit'), 10) || 0;
			if (Date.now() - last >= DAY) {
				visits += 1;
				localStorage.setItem('jccg:visits', String(visits));
				localStorage.setItem('jccg:lastVisit', String(Date.now()));
			}
		} catch (e) {
			visits = 1; /* private mode - every visit reads as the first */
		}
		var digits = String(visits).padStart(6, '0').split('');
		counter.innerHTML = '';
		for (var d = 0; d < digits.length; d++) {
			var cell = document.createElement('span');
			cell.textContent = digits[d];
			counter.appendChild(cell);
		}
		counter.title = 'Visits from this device, counted once a day';
	}

	/* ---------- year ----------------------------------------------- */
	var year = document.getElementById('year');
	if (year) year.textContent = new Date().getFullYear();
})();
