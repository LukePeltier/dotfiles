---
name: searxng-search
description: Search the web through Luke's self-hosted SearXNG instance. Use when current information, external documentation, research, or web search is needed; prefer this over public search services.
---

# SearXNG Search

Use the self-hosted SearXNG JSON API at:

```text
https://searxng.shire-chicken.ts.net/search
```

## Make a search

Use `bash` and `curl`. Always use `--get` and `--data-urlencode` so queries are encoded safely, and request JSON explicitly:

```bash
curl -fsSL --get 'https://searxng.shire-chicken.ts.net/search' \
  --data-urlencode 'q=YOUR QUERY' \
  --data 'format=json'
```

Useful optional parameters:

```bash
--data 'categories=general'       # general, news, it, science, videos, etc.
--data 'engines=google,bing'       # restrict engines when needed
--data 'language=en-US'            # response language
--data 'safesearch=1'              # 0=off, 1=moderate, 2=strict
--data 'time_range=day'            # day, month, year
--data 'pageno=2'                  # pagination starts at 1
```

For example:

```bash
curl -fsSL --get 'https://searxng.shire-chicken.ts.net/search' \
  --data-urlencode 'q=TypeScript AbortSignal fetch' \
  --data 'format=json' \
  --data 'categories=it' \
  --data 'language=en-US'
```

## Process results

The JSON response contains a `results` array. Prefer these fields:

- `title`
- `url`
- `content` (the search-result snippet)
- `publishedDate`
- `engine`
- `category`

Use `jq` when available to inspect or reduce output:

```bash
... | jq '.results[] | {title, url, content, publishedDate, engine}'
```

Do not dump an unbounded response into the conversation. Start with a small number of relevant results, and truncate long snippets. Include the result URLs in the answer so the user can inspect the sources.

## Search behavior

1. Translate the user's request into a focused search query rather than copying a long conversational prompt.
2. Use `categories`, `engines`, and `time_range` only when they improve the search.
3. Run a second, narrower search if the first results are ambiguous or poor.
4. Treat result snippets as discovery material, not proof. Open or fetch authoritative source pages when the task requires details that are not present in the snippets.
5. Tell the user when a claim is based only on a search snippet or when no useful results were returned.
6. Never send secrets, private source code, or unnecessary personal data in a query.

The endpoint is for searching; it does not guarantee that result pages are available or authoritative.
