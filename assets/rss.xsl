<?xml version="1.0" encoding="UTF-8"?>
<!--
	A feed is still a real page when a person opens it in a browser. Without a
	stylesheet Chrome shows the raw document tree under "This XML file does not
	appear to have any style information associated with it", which is what a
	visitor clicking "RSS" was getting. This transform renders the same feed as
	a readable page; feed readers ignore it entirely and parse the XML.
-->
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:atom="http://www.w3.org/2005/Atom">
	<xsl:output method="html" encoding="UTF-8" indent="yes" />

	<xsl:template match="/rss/channel">
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title><xsl:value-of select="title" /></title>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="crossorigin" />
				<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen&amp;family=IBM+Plex+Sans:wght@400;600&amp;family=IBM+Plex+Mono:wght@400&amp;display=swap" />
				<link rel="stylesheet" href="/assets/style.css" />
				<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
				<style>
					.feed-note {
						font-family: var(--font-mono);
						font-size: 12.5px;
						color: var(--text-faint);
						border: 2px solid var(--border-soft);
						border-radius: var(--radius);
						padding: 12px 14px;
						margin-bottom: 26px;
					}
					.feed-item { padding: 18px 0; border-top: 2px solid var(--border-soft); }
					.feed-item:first-of-type { border-top: 0; }
					.feed-item h3 {
						font-family: var(--font-body);
						font-size: 18px;
						font-weight: 600;
						margin: 0 0 4px;
						line-height: 1.3;
					}
					.feed-date {
						font-family: var(--font-mono);
						font-size: 11.5px;
						color: var(--text-faint);
						display: block;
						margin-bottom: 8px;
					}
					.feed-item p { color: var(--text-dim); margin: 0 0 8px; max-width: 68ch; }
				</style>
			</head>
			<body>
				<header class="site">
					<nav class="nav shell" aria-label="Main">
						<a class="brand" href="/">james<span>-ccg</span></a>
						<div class="nav-links">
							<a href="/#about">about</a>
							<a href="/#projects">work</a>
							<a href="/#contact">elsewhere</a>
						</div>
					</nav>
				</header>

				<main class="shell">
					<section class="sec">
						<div class="sec-head">
							<span class="marker">&gt;</span>
							<h2>updates</h2>
						</div>
						<p class="sec-lede"><xsl:value-of select="description" /></p>

						<p class="feed-note">
							This is an RSS feed. Paste
							<xsl:text> </xsl:text>
							<b><xsl:value-of select="atom:link/@href" /></b>
							<xsl:text> </xsl:text>
							into a feed reader to follow it, or just read it here.
						</p>

						<xsl:for-each select="item">
							<article class="feed-item">
								<h3>
									<a href="{link}"><xsl:value-of select="title" /></a>
								</h3>
								<span class="feed-date"><xsl:value-of select="pubDate" /></span>
								<p><xsl:value-of select="description" /></p>
							</article>
						</xsl:for-each>
					</section>
				</main>

				<footer class="site">
					<div class="shell foot-grid">
						<span><a href="/">&#8592; back to the site</a></span>
					</div>
				</footer>
			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
