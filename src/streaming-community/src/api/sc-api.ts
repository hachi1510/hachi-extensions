import { fetchHTML } from "../utils/html"

const API_URL = new URL(import.meta.env.VITE_SC_API_URL)

export type SCImage = {
  filename: string
  type: "poster" | "cover" | "cover_mobile" | "background" | "logo"
}

export const SCGenres = {
  drama: 1,
  crime: 2,
  action: 4,
  thriller: 5,
  mystery: 6,
  horror: 7,
  fantasy: 8,
  war: 9,
  science_fiction: 10,
  adventure: 11,
  comedy: 12,
  action_adventure: 13,
  musical: 14,
  romantic: 15,
  family: 16,
  animation: 19,
  documentary: 24,
  korean_drama: 26,
}

export type SCShowType = "movie" | "tv"

export type SCShowEntry = {
  name: string
  id: number
  slug: string
  type: SCShowType
  last_air_date: string // YYYY-MM-DD
  images: SCImage[]
}

export type SCShow = {
  name: string
  plot: string
  type: SCShowType
  release_date: string
  status?: string
  seasons_count: number // Number of seasons, or 0 if the type is 'movie'
  seasons?: {
    number: number
    name?: string
  }[]
  genres: { name: string }[]
  runtime?: number // minutes
  score?: number | string
  images: SCImage[]
  imdb_id?: string
  related?: SCShowEntry[]
}

export type SCEpisode = {
  id: number
  number: number
  name?: string
  plot?: string
  duration?: number
  images: SCImage[]
}

export type SCArchiveRequest = {
  sorting: "score" | "views" | "release_date"
  type?: SCShowType
  genres?: number[]
  year?: number
  minimumViews?: "25k" | "50k" | "75k" | "100k" | "250k" | "500k" | "1M"
  service?: "apple" | "disney" | "netflix" | "prime" | "now"
  maximumPagesToFetch?: number
}

export function findImageURL(
  images: SCImage[],
  type: SCImage["type"]
): string | undefined {
  const filename = images.find((img) => img.type === type)?.filename
  if (filename) {
    const cdnURL = new URL(`https://cdn.${API_URL.hostname}`)
    const imageURL = new URL(`/images/${filename}`, cdnURL)
    return imageURL.toString()
  }
}

export async function fetchShowsFromArchive(
  request: SCArchiveRequest
): Promise<SCShowEntry[]> {
  type JSONData = {
    titles: SCShowEntry[]
  }

  function createEndpoint(request: SCArchiveRequest, page: number): URL {
    const endpoint = new URL(`api/archive`, API_URL)
    endpoint.searchParams.append("lang", "it")
    if (request.sorting !== "release_date") {
      endpoint.searchParams.append("sort", request.sorting)
    }
    if (request.type) {
      endpoint.searchParams.append("type", request.type)
    }
    if (request.genres && request.genres.length > 0) {
      for (const genre of request.genres) {
        endpoint.searchParams.append("genre[]", genre.toString())
      }
    }
    if (request.year) {
      endpoint.searchParams.append("year", request.year.toString())
    }
    if (request.minimumViews) {
      // Convert string view values to their numeric representation
      const viewsMap: Record<
        NonNullable<SCArchiveRequest["minimumViews"]>,
        string
      > = {
        "25k": "10000",
        "50k": "50000",
        "75k": "75000",
        "100k": "100000",
        "250k": "250000",
        "500k": "500000",
        "1M": "1000000",
      }
      endpoint.searchParams.append("views", viewsMap[request.minimumViews])
    }
    if (request.service) {
      endpoint.searchParams.append("service", request.service)
    }
    if (page > 0) {
      endpoint.searchParams.append("offset", (page * 60).toString())
    }
    return endpoint
  }

  const maximumPagesToFetch = request.maximumPagesToFetch ?? 1
  let pageToFetch = 0
  let shows: SCShowEntry[] = []

  while (pageToFetch < maximumPagesToFetch) {
    const endpoint = createEndpoint(request, pageToFetch)

    const response = await fetch(endpoint.toString(), {
      headers: {
        Accept: "application/json",
        Referer: new URL(
          `it/archivio?${endpoint.searchParams}`,
          API_URL
        ).toString(),
        host: API_URL.hostname,
      },
    })
    if (!response.ok) {
      throw new Error(
        `Failed to fetch shows from archive: ${response.status} ${response.statusText}`
      )
    }

    const data: JSONData = await response.json()
    shows.push(...data.titles)
    pageToFetch++

    if (data.titles.length < 60) {
      break
    }
  }

  // Remove duplicate shows by id
  const seen = new Set()
  const uniqueShows = shows.filter((show) => {
    if (seen.has(show.id)) {
      return false
    } else {
      seen.add(show.id)
      return true
    }
  })

  return uniqueShows
}

export async function fetchShowsByQuery(query: string): Promise<SCShowEntry[]> {
  const endpoint = new URL("api/search", API_URL)
  endpoint.searchParams.append("q", query)
  endpoint.searchParams.append("lang", "it")

  const response = await fetch(endpoint.toString(), { method: "GET" })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch shows by query: ${response.status} ${response.statusText}`
    )
  }

  const json: { data: SCShowEntry[] } = await response.json()
  return json.data
}

export async function fetchShow(id: string): Promise<SCShow> {
  type JSONData = {
    props: {
      title: Omit<SCShow, "related">
      sliders: {
        name: string
        titles: SCShowEntry[]
      }[]
    }
  }

  const endpoint = new URL(`it/titles/${id}`, API_URL)
  const html = await fetchHTML(endpoint)

  const json = html("#app").attr("data-page")
  if (!json) {
    throw new Error("Failed to parse show data")
  }

  const data = JSON.parse(json) as JSONData
  const show = data.props.title
  const related = data.props.sliders.find((s) => s.name === "related")?.titles

  return { ...show, related } satisfies SCShow
}

export async function fetchEpisodes(
  id: string,
  season: number
): Promise<SCEpisode[]> {
  type JSONData = {
    props: {
      loadedSeason: {
        episodes: SCEpisode[]
      }
    }
  }

  const endpoint = new URL(`it/titles/${id}/season-${season}`, API_URL)
  const html = await fetchHTML(endpoint)

  const json = html("#app").attr("data-page")
  if (!json) {
    throw new Error("Failed to parse episodes")
  }

  const data = JSON.parse(json) as JSONData
  return data.props.loadedSeason.episodes
}

export async function fetchVideoURL(id: string): Promise<string> {
  const endpoint = new URL(`it/iframe/${id}`, API_URL)
  const html = await fetchHTML(endpoint)

  const iframeURL = html("iframe").attr("src")
  if (!iframeURL) {
    throw new Error("Failed to find video request URL")
  }

  return iframeURL
}
