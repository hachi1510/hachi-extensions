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
  }
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

async function fetchEpisodes(
  id: string,
  season: number
): Promise<TeeviShowEpisode[]> {
  const numericId = Number(id.split("-")[0])
  const show = await fetchAUShow(id)

  // Calculate episode range for the requested season
  const startEpisode = season * EPISODES_PER_SEASON + 1

  const seasonEpisodes = await fetchAUShowEpisodes(
    numericId,
    startEpisode,
    EPISODES_PER_SEASON
  )

  if (seasonEpisodes.length === 0) {
    return []
  }

  // Fetch additional episode metadata
  const [titleByNumbers, thumbnailByNumbers] = await Promise.all([
    fetchEpisodeTitles(show.mal_id, season),
    fetchEpisodeThumbnails(show.anilist_id),
  ])

  return seasonEpisodes.map((episode) => {
    const number = Number(episode.number)
    return {
      id: `${id}/${episode.id}`,
      number: number,
      title: titleByNumbers[number],
      thumbnailURL: thumbnailByNumbers[number],
    }
  })
}

/**
 * Helper function to fetch episode titles from MyAnimeList
 */
async function fetchEpisodeTitles(
  malId?: number,
  season?: number
): Promise<Record<number, string>> {
  if (!malId) return {}

  try {
    const malEpisodes = await fetchJikanShowEpisodes(
      malId,
      season ? season + 1 : 1
    )
    return malEpisodes.reduce<Record<number, string>>((dict, ep) => {
      dict[ep.mal_id] = ep.title
      return dict
    }, {})
  } catch (error) {
    console.error(`Failed to fetch episode titles from Jikan: ${error}`)
    return {}
  }
}

/**
 * Helper function to fetch episode thumbnails from AniList
 */
async function fetchEpisodeThumbnails(
  anilistId?: number
): Promise<Record<number, string | undefined>> {
  if (!anilistId) return {}

  try {
    const aniEpisodes = await fetchAnilistShowEpisodes(anilistId)
    return aniEpisodes.reduce<Record<number, string | undefined>>(
      (dict, ep) => {
        dict[ep.number] = ep.thumbnail
        return dict
      },
      {}
    )
  } catch (error) {
    console.error(`Failed to fetch episode thumbnails from Anilist: ${error}`)
    return {}
  }
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
  const episodes = await fetchAUShowEpisodes(showId, 1, 1)

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
