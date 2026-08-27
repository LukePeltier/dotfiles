---
name: trafilatura
description: Extract clean article text, metadata, and structured content from web pages using the Trafilatura command-line tool or Python API. Use after finding a URL, especially when page HTML contains navigation, advertisements, comments, or other boilerplate.
---

# Trafilatura

Trafilatura extracts the main text and metadata from web pages. It is useful after finding a source with the `searxng-search` skill, when the search-result snippet is not enough to answer the question.

## Installation and availability

Check the command before using it:

```bash
command -v trafilatura && trafilatura --version
```

If it is unavailable and `uv` is installed, install the CLI as a user tool:

```bash
uv tool install trafilatura
```

Use the `trafilatura` executable directly. It may run from an isolated uv environment, so importing it with an unrelated system `python3` may fail even when the CLI works.

## Extract one URL

For normal research, prefer Markdown without comments and tables:

```bash
trafilatura -u 'https://example.com/article' \
  --markdown \
  --no-comments \
  --no-tables
```

Plain text is the default:

```bash
trafilatura -u 'https://example.com/article'
```

Include metadata when title, author, date, or canonical URL matters:

```bash
trafilatura -u 'https://example.com/article' \
  --json \
  --with-metadata \
  --no-comments \
  --no-tables
```

Useful extraction adjustments:

```bash
--precision   # less boilerplate, possibly less content
--recall      # more content, possibly more boilerplate
--formatting  # preserve formatting such as emphasis
--links       # include links and targets
--images      # include image sources
--target-language en
--fast         # skip fallback detection for speed
```

Start with the default or precision-oriented extraction. Retry with `--recall` if important content is missing.

## Pipe already-downloaded HTML

Separate downloading from extraction when a custom downloader is needed:

```bash
curl -fsSL 'https://example.com/article' | trafilatura --markdown --no-comments --no-tables
```

or:

```bash
wget -qO- 'https://example.com/article' | trafilatura --markdown --no-comments --no-tables
```

Piping is useful when the page requires a different user agent, proxy, or download mechanism. Do not put untrusted shell text into a command without safely quoting the URL.

## Extract from local files

For one local HTML file:

```bash
trafilatura < article.html --markdown --no-comments --no-tables
```

For a directory of downloaded HTML files:

```bash
trafilatura --input-dir html/ --output-dir extracted/ --markdown
```

For a URL list, one URL per line:

```bash
trafilatura --input-file urls.txt --output-dir extracted/ --markdown
```

Use batch processing sparingly and respect each site's robots.txt, rate limits, and terms. Avoid crawling a whole site unless the user explicitly requests it.

## Python API

Use the Python API when extraction needs to be composed with other code:

```python
from trafilatura import extract
from trafilatura.downloads import fetch_url

url = "https://example.com/article"
downloaded = fetch_url(url)

if downloaded is None:
    raise RuntimeError(f"Could not download {url}")

text = extract(
    downloaded,
    url=url,
    output_format="markdown",
    include_comments=False,
    include_tables=False,
)
print(text or "No extractable article text found")
```

For structured metadata:

```python
record = extract(
    downloaded,
    url=url,
    output_format="json",
    with_metadata=True,
    include_comments=False,
    include_tables=False,
)
```

For lower-level control, `bare_extraction(...).as_dict()` returns a document object as a dictionary. `baseline()` is a useful faster fallback, while `html2txt()` maximizes recall but may include substantial noise.

## Troubleshooting

- If the output is empty or incomplete, retry with `--recall` or pipe HTML downloaded by `curl`/`wget`.
- JavaScript-rendered pages require browser automation or another way to obtain the rendered HTML before passing it to Trafilatura.
- Paywalls, login pages, bot blocks, and unavailable pages are not bypassed by Trafilatura. Do not attempt to circumvent access controls.
- For an archived copy, use `--archived` only when the user wants archive retrieval; it may be slow.
- Trafilatura is optimized for articles, blog posts, and other prose. Link directories, galleries, catalogs, and application pages may extract poorly.

## Research workflow

1. Find candidate URLs with SearXNG.
2. Extract the most relevant page with Trafilatura.
3. Prefer the extracted page over a search snippet, but verify important claims against the source and preserve the source URL.
4. If extraction fails, report that clearly and try a reasonable alternate source rather than presenting search snippets as full page content.
5. Keep extracted output bounded; do not paste an entire long page into context when only a section is needed.
