import { load } from "cheerio"

// Generic HTML fetcher using Cheerio
export async function fetchHTML(
  input: RequestInfo | URL,
  options: { referer?: string } = {}
) {
  const response = await fetch(input.toString(), {
    method: "GET",
    headers: {
      Accept: "text/html, application/xhtml+xml",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: options.referer ?? "https://www.google.it/",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch HTML: ${response.status} ${response.statusText}`
    )
  }

  const body = await response.text()
  return load(body)
}
