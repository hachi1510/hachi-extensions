import { fetchHTML } from "../utils/html"

const API_URL = new URL(import.meta.env.VITE_AU_API_URL)

export type AUShowType = "TV" | "Movie" | string
export type AUShowStatus = "In Corso" | "Terminato" | "In Uscita" | "Droppato"
export type AUShow = {
  id: number
  title_eng: string
  plot?: string
  date: string // YYYY
  season?: "Primavera" | "Estate" | "Autunno" | "Inverno"
  episodes_length?: number // duration in minutes
  slug: string
  type: AUShowType
  score: string
  dub: number // 0 = no dub, 1 = dub
  imageurl: string
  imageurl_cover?: string
  status?: AUShowStatus
  anilist_id?: number
  mal_id?: number
  genres?: {
    id: number
    name: string
  }[]
  episodes_count?: number
}

export type AUShowEpisode = {
  id: string
  number: string
  anime_id: number
  scws_id: number
}

export async function fetchAUShowsFromArchive(
  page: number = 1,
  options: {
    orderBy?: "popularity" | "views"
    type?: AUShowType
  }
): Promise<AUShow[]> {
  const endpoint = new URL("top-anime", API_URL)
  if (page > 1) {
    endpoint.searchParams.append("page", page.toString())
  }
  if (options.orderBy && options.orderBy === "popularity") {
    endpoint.searchParams.append("popular", "true")
  }
  if (options.orderBy && options.orderBy === "views") {
    endpoint.searchParams.append("order", "most_viewed")
  }
  if (options.type) {
    endpoint.searchParams.append("type", options.type)
  }

  const html = await fetchHTML(endpoint)
  const json = html("top-anime[animes]").attr("animes")

  if (!json) {
    throw new Error("Failed to parse data from archive")
  }

  const data = JSON.parse(json) as { data: AUShow[] }
  return data.data
}

export async function fetchAUShowsByQuery(query: string): Promise<AUShow[]> {
  const endpoint = new URL("archivio", API_URL)
  endpoint.searchParams.append("title", query)

  const html = await fetchHTML(endpoint)
  const json = html("archivio[records]").attr("records")

  if (!json) {
    throw new Error("Failed to parse data from archive")
  }

  const data = JSON.parse(json) as AUShow[]
  return data
}

export async function fetchAUShow(
  id: string
): Promise<AUShow & { related?: AUShow[] }> {
  type AnimeData = AUShow & {
    related?: AUShow[]
  }

  const endpoint = new URL(`anime/${id}`, API_URL)
  const html = await fetchHTML(endpoint)
  const dataBlock = html("video-player[anime]")
  const animeJson = dataBlock.attr("anime")

  if (!animeJson) {
    throw new Error("Failed to parse show data")
  }

  const { related, ...anime } = JSON.parse(animeJson) as AnimeData

  let suggestions = related || []

  // Recommendations
  const recommendedJson = html("div.recommended layout-items[items-json]").attr(
    "items-json"
  )
  if (recommendedJson) {
    const recommended = JSON.parse(recommendedJson) as AUShow[]
    const uniqueMap = new Map<number, AUShow>()
    suggestions.forEach((show) => uniqueMap.set(show.id, show))
    recommended.forEach((show) => uniqueMap.set(show.id, show))
    suggestions = Array.from(uniqueMap.values())
  }

  return {
    ...anime,
    related: suggestions,
    episodes_count: Number(dataBlock.attr("episodes_count")),
  }
}

export async function fetchAUShowEpisodes(
  show_id: number,
  start: number = 1,
  limit: number = 100
): Promise<AUShowEpisode[]> {
  const endpoint = new URL(`info_api/${show_id}/1`, API_URL)
  endpoint.searchParams.append("start_range", start.toString())
  endpoint.searchParams.append("end_range", (start + limit - 1).toString())
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": "it-IT",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch AU show episodes")
  }
  const data = (await response.json()) as {
    episodes: AUShowEpisode[]
  }

  return data.episodes || []
}

export async function fetchAUShowVideo(media_id: number): Promise<string> {
  const endpoint = new URL(`embed-url/${media_id}`, API_URL)
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      Accept: "text/plain",
    },
  })
  if (!response.ok) {
    throw new Error("Failed to fetch AU show video")
  }
  return response.text()
}
