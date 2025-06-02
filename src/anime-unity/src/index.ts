import type {
  TeeviFeedCollection,
  TeeviFeedExtension,
  TeeviMetadataExtension,
  TeeviShow,
  TeeviShowEntry,
  TeeviShowEpisode,
  TeeviShowSeason,
  TeeviShowStatus,
  TeeviVideoAsset,
  TeeviVideoExtension,
} from "@teeviapp/core"
import { fetchVixcloudPlaylist } from "./utils/vixcloud"
import {
  AUShow,
  AUShowStatus,
  fetchAUShow,
  fetchAUShowEpisodes,
  fetchAUShowsByQuery,
  fetchAUShowVideo,
} from "./api/au-api"
import { fetchJikanShow, fetchJikanShowEpisodes } from "./api/jikan-api"
import { fetchAnilistShow, fetchAnilistShowEpisodes } from "./api/anilist-api"
import collections from "../assets/au_feed_cache_collections.json"
import trendingShows from "../assets/au_feed_cache_trending_shows.json"
import { fetchKitsuShow } from "./api/kitsu-api"

// Constants
const EPISODES_PER_SEASON = 100

/**
 * Maps AnimeUnity status to Teevi status
 */
function mapStatus(auStatus?: AUShowStatus): TeeviShowStatus | undefined {
  if (!auStatus) return undefined

  const status = auStatus.toLowerCase()
  switch (status) {
    case "in corso":
      return "airing"
    case "terminato":
      return "ended"
    case "in uscita":
      return "upcoming"
    case "droppato":
      return "canceled"
    default:
      return undefined
  }
}

/**
 * Maps AUShow to TeeviShowEntry
 */
function mapShowToEntry(auShow: AUShow): TeeviShowEntry {
  return {
    kind: auShow.type == "Movie" ? "movie" : "series",
    id: `${auShow.id}-${auShow.slug}`,
    title: auShow.title_eng,
    posterURL: auShow.imageurl,
    year: Number(auShow.date),
    language: parseShowLanguage(auShow.title_eng),
  }
}

/**
 * Creates a date string in yyyy-mm-dd format from year and season
 */
function createDateFromSeason(year: number, season?: string): string {
  const seasonToMonth: Record<string, number> = {
    Inverno: 0, // January
    Primavera: 3, // April
    Estate: 6, // July
    Autunno: 9, // October
  }

  const month = season ? seasonToMonth[season] ?? 0 : 0
  const date = new Date(year, month, 1)
  return date.toISOString().split("T")[0]
}

/**
 * Helper function to parse show rating from different data types
 */
function parseShowRating(score: string | number | undefined): number {
  if (typeof score === "undefined") return 0

  const parsedScore = typeof score === "string" ? parseFloat(score) : score

  return isNaN(parsedScore) ? 0 : parsedScore
}

/**
 * Parses language information from show title
 * Checks if title contains "ITA" to determine if it's in Italian
 * Returns ISO 639-1 two-character language code
 */
function parseShowLanguage(title: string): string {
  return title.toUpperCase().includes("ITA") ? "it" : "ja"
}

/**
 * Creates seasons array based on episode count
 */
function createSeasons(episodesCount: number = 0): TeeviShowSeason[] {
  const numberOfGroups = Math.ceil(episodesCount / EPISODES_PER_SEASON)

  return Array.from({ length: numberOfGroups }, (_, idx) => {
    const start = idx * EPISODES_PER_SEASON + 1
    const rawEnd = (idx + 1) * EPISODES_PER_SEASON
    const end = Math.min(rawEnd, episodesCount)

    return {
      number: idx,
      name: `${start}-${end}`,
    }
  })
}

/**
 * Helper function to fetch combined episode info (titles, filler flag and thumbnails)
 */
async function fetchEpisodeMetadata(options: {
  malId?: number
  anilistId?: number
  season: number
}): Promise<{
  titles: Record<number, string>
  thumbnails: Record<number, string>
  fillers: Record<number, boolean>
}> {
  const { malId, anilistId, season } = options

  const titles: Record<number, string> = {}
  const thumbnails: Record<number, string> = {}
  const fillers: Record<number, boolean> = {}

  // Fetch episode titles and filler information from MyAnimeList if ID is available
  if (malId) {
    try {
      const malEpisodes = await fetchJikanShowEpisodes(
        malId,
        season ? season + 1 : 1
      )
      malEpisodes.forEach((ep) => {
        titles[ep.mal_id] = ep.title || `Episode ${ep.mal_id}`
        // Add filler information if available
        if (ep.filler !== undefined) {
          fillers[ep.mal_id] = ep.filler
        }
      })
    } catch (error) {
      console.error(`Failed to fetch episode data from Jikan: ${error}`)
    }
  }

  // Fetch episode thumbnails from AniList if ID is available
  if (anilistId) {
    try {
      const aniEpisodes = await fetchAnilistShowEpisodes(anilistId)
      aniEpisodes.forEach((ep) => {
        if (ep.number && ep.thumbnail) {
          thumbnails[ep.number] = ep.thumbnail
        }
      })
    } catch (error) {
      console.error(`Failed to fetch episode thumbnails from Anilist: ${error}`)
    }
  }

  return { titles, thumbnails, fillers }
}

async function fetchShowsByQuery(query: string): Promise<TeeviShowEntry[]> {
  const shows = await fetchAUShowsByQuery(query)
  return shows.map((show) => mapShowToEntry(show))
}

async function fetchShow(id: string): Promise<TeeviShow> {
  const show = await fetchAUShow(id)
  const isSeries = show.type !== "Movie"

  // Initialize with basic data
  let posterURL = show.imageurl
  let backdropURL = show.imageurl_cover
  let overview = show.plot || ""
  let rating = parseShowRating(show.score)

  // Enhance data with MyAnimeList information if available
  if (show.mal_id) {
    try {
      const malShow = await fetchJikanShow(show.mal_id)
      posterURL = malShow.images?.jpg?.large_image_url || posterURL
      rating = malShow.score || rating
    } catch (error) {
      console.error(`Failed to fetch data from Jikan: ${error}`)
    }
  }

  // Enhance data with AniList information if available
  if (show.anilist_id) {
    try {
      const aniShow = await fetchAnilistShow(show.anilist_id)
      backdropURL = aniShow.bannerImage || backdropURL
    } catch (error) {
      console.error(`Failed to fetch data from Anilist: ${error}`)
    }
  }

  // Enhance data with Kitsu information if available
  if (show.mal_id) {
    try {
      const kitsuShow = await fetchKitsuShow({ mal: show.mal_id })
      backdropURL = kitsuShow.coverImage?.original || backdropURL
    } catch (error) {
      console.error(`Failed to fetch data from Kitsu: ${error}`)
    }
  }

  // Divide episodes into seasons
  const seasons = isSeries ? createSeasons(show.episodes_count) : undefined

  return {
    id,
    kind: isSeries ? "series" : "movie",
    title: show.title_eng,
    overview: overview,
    genres: show.genres?.map((g) => g.name) || [],
    duration: (show.episodes_length || 0) * 60,
    releaseDate: createDateFromSeason(Number(show.date), show.season),
    seasons: seasons,
    posterURL: posterURL,
    backdropURL: backdropURL,
    rating: rating,
    status: mapStatus(show.status),
    relatedShows: show.related?.map((relatedShow) =>
      mapShowToEntry(relatedShow)
    ),
    language: parseShowLanguage(show.title_eng),
  }
}

async function fetchEpisodes(
  id: string,
  season: number
): Promise<TeeviShowEpisode[]> {
  const numericId = Number(id.split("-")[0])
  if (isNaN(numericId)) {
    throw new Error("Invalid show ID format")
  }

  const show = await fetchAUShow(id)

  const seasonEpisodes = await fetchAUShowEpisodes({
    show_id: numericId,
    start: season * EPISODES_PER_SEASON + 1,
    limit: EPISODES_PER_SEASON,
  })

  if (seasonEpisodes.length === 0) {
    return []
  }

  // Fetch additional episode metadata
  const { titles, thumbnails, fillers } = await fetchEpisodeMetadata({
    malId: show.mal_id,
    anilistId: show.anilist_id,
    season: season,
  })

  return seasonEpisodes.map((episode) => {
    // Parse episode number - handle both single numbers and ranges (e.g. "135-136")
    const number = episode.number.includes("-")
      ? Number(episode.number.split("-")[0]) // Take first number from range
      : Number(episode.number)
    return {
      id: `${id}/${episode.id}`,
      number: number,
      title: titles[number],
      thumbnailURL: thumbnails[number],
      isFiller: fillers[number] || false,
    }
  })
}

async function fetchVideoAssets(id: string): Promise<TeeviVideoAsset[]> {
  // Extract media ID from the composite ID
  const mediaId = await extractMediaId(id)

  if (!mediaId) {
    throw new Error("AU Media ID not found")
  }

  const videoURL = await fetchAUShowVideo(mediaId)
  const asset = await fetchVixcloudPlaylist(new URL(videoURL))
  return [asset]
}

/**
 * Helper function to extract media ID from composite ID
 */
async function extractMediaId(id: string): Promise<number | undefined> {
  const parts = id.split("/")

  // Episode ID format: "showId-slug/episodeId"
  if (parts.length > 1) {
    return Number(parts[1])
  }

  // Movie ID format: "showId-slug"
  const showId = Number(parts[0].split("-")[0])
  const episodes = await fetchAUShowEpisodes({
    show_id: showId,
    start: 1,
    limit: 1,
  })

  if (episodes.length > 0) {
    return Number(episodes[0].id)
  }

  return undefined
}

async function fetchFeedCollections(): Promise<TeeviFeedCollection[]> {
  return collections as TeeviFeedCollection[]
}

async function fetchTrendingShows(): Promise<TeeviShow[]> {
  return trendingShows as TeeviShow[]
}

export default {
  fetchShowsByQuery,
  fetchShow,
  fetchEpisodes,
  fetchVideoAssets,
  fetchFeedCollections,
  fetchTrendingShows,
} satisfies TeeviMetadataExtension & TeeviVideoExtension & TeeviFeedExtension
