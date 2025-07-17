import type { TeeviVideoAsset } from "@teeviapp/core"
import { fetchHTML } from "./html"

export async function fetchVixcloudPlaylist(
  url: URL
): Promise<TeeviVideoAsset> {
  const id = url.pathname.split("/").filter(Boolean).pop()
  if (!id) throw new Error("Missing ID from vixcloud url")

  const html = await fetchHTML(url)

  // Extract all text from <script> tags
  const scripts = html("script").text()

  // Use regex to find the 'params' block inside the script content
  const paramsMatch = scripts.match(/params\s*:\s*\{([^}]*)\}/)?.[1]
  if (!paramsMatch) throw new Error("Playlist not found")

  //const playlistURL = new URL(`https://vixcloud.co/playlist/${id}`)
  const playlistURL = getPlaylistBaseURL(id, scripts)

  // Use regex to match all key-value pairs in the 'params' block
  const params = paramsMatch.matchAll(/'(\w+)'\s*:\s*'([^']+)'/g)
  for (const [_, key, value] of params) {
    playlistURL.searchParams.append(key, value)
  }

  // Add conditional parameters
  if (url.searchParams.has("b") && url.searchParams.get("b") === "1") {
    playlistURL.searchParams.append("b", "1")
  }

  if (
    url.searchParams.has("canPlayFHD") ||
    /window\.canPlayFHD\s*=\s*true/.test(scripts)
  ) {
    playlistURL.searchParams.append("h", "1")
  }

  const headers: Record<string, string> = {
    Referer: url.toString(),
  }

  if (globalThis.Teevi?.userAgent) {
    headers["User-Agent"] = globalThis.Teevi.userAgent
  }

  return { url: playlistURL.toString(), headers }
}

function getPlaylistBaseURL(id: string, script: string): URL {
  const playlistURL = new URL(`https://vixcloud.co/playlist/${id}`)
  try {
    let activeStream = findActiveStream(script)
    if (activeStream) {
      return new URL(activeStream)
    } else {
      // If no active stream found, return the base playlist URL
      return playlistURL
    }
  } catch {
    return playlistURL
  }
}

function findActiveStream(script: string): string | null {
  // Extract the JSON array assigned to window.streams
  const match = script.match(/window\.streams\s*=\s*(\[[^\]]+\])/)
  if (!match) {
    throw new Error("Streams not found in script")
  }

  try {
    const streams = JSON.parse(match[1])
    const activeStream = streams.find((stream: { active: any }) =>
      Boolean(stream.active)
    )
    return activeStream?.url || null
  } catch (error) {
    throw new Error("Failed to parse streams JSON: " + error)
  }
}
