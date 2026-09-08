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
	   left to rot. Falls back to staying hidden if the call fails. */
	var updatedEl = document.getElementById('updatedAt');
	if (updatedEl) {
		fetch('https://api.github.com/repos/james-ccg/james-ccg.github.io/commits?per_page=1')
			.then(function (r) {
				return r.ok ? r.json() : Promise.reject(r.status);
			})
			.then(function (commits) {
				var when = commits && commits[0] && commits[0].commit.committer.date;
				if (!when) return;
				var days = Math.floor((Date.now() - new Date(when)) / 86400000);
				updatedEl.textContent =
					days <= 0 ? 'today' : days === 1 ? 'yesterday' : days + 'd ago';
			})
			.catch(function () {
				var row = updatedEl.closest('[data-optional]');
				if (row) row.hidden = true;
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
