import type {
  TeeviFeedCollection,
  TeeviFeedExtension,
  TeeviMetadataExtension,
  TeeviShow,
  TeeviShowEntry,
  TeeviShowEpisode,
  TeeviShowStatus,
  TeeviVideoAsset,
  TeeviVideoExtension,
} from "@teeviapp/core"
import { fetchVixcloudPlaylist } from "./utils/vixcloud"
import {
  fetchShowsByQuery as scFetchShowsByQuery,
  findImageURL as scFindImageURL,
  fetchShow as scFetchShow,
  fetchEpisodes as scFetchEpisodes,
  fetchVideoURL as scFetchVideoURL,
  SCShowEntry,
} from "./api/sc-api"
import { fetchShow as imdbFetchShow } from "./api/imdb-api"
import { fetchShow as mazeFetchShow } from "./api/tvmaze-api"
import collections from "../assets/sc_feed_cache_collections.json"
import trendingShows from "../assets/sc_feed_cache_trending_shows.json"

function mapSCShowEntryToTeeviShowEntry(show: SCShowEntry): TeeviShowEntry {
  return {
    kind: show.type == "movie" ? "movie" : "series",
    id: `${show.id}-${show.slug}`,
    title: show.name,
    posterURL: scFindImageURL(show.images, "poster"),
    year: new Date(show.last_air_date).getFullYear(),
    language: "it",
  } satisfies TeeviShowEntry
}

async function fetchShowsByQuery(query: string): Promise<TeeviShowEntry[]> {
  const shows = await scFetchShowsByQuery(query)
  return shows.map((show) => mapSCShowEntryToTeeviShowEntry(show))
}

async function fetchShow(id: string): Promise<TeeviShow> {
  const mapStatus = (scStatus?: string): TeeviShowStatus | undefined => {
    if (!scStatus) return undefined
    const status = scStatus.toLowerCase()
    if (
      [
        "in production",
        "post production",
        "planned",
        "pilot",
        "rumored",
        "announced",
      ].includes(status)
    ) {
      return "upcoming"
    }

    if (status === "returning series") return "airing"
    if (status === "canceled") return "canceled"

    if (status === "released" || status === "ended") return "ended"

    return undefined
  }

  const show = await scFetchShow(id)
  const isSeries = show.type !== "movie"

  let posterURL = scFindImageURL(show.images, "poster")
  let overview = show.plot
  let rating =
    typeof show.score === "string" ? parseFloat(show.score) : show.score

  // Fetch additional data from IMDB or TVMaze
  if (show.imdb_id) {
    try {
      const imdbShow = await imdbFetchShow(show.imdb_id)
      if (imdbShow.image) {
        posterURL = imdbShow.image
      }
      if (imdbShow.aggregateRating?.ratingValue) {
        rating = imdbShow.aggregateRating.ratingValue
      }
    } catch (error) {
      console.error(`Failed to fetch data from IMDB: ${show.imdb_id} ${error}`)
    }
    try {
      if (show.type == "tv") {
        const mazeShow = await mazeFetchShow(show.imdb_id)
        if (mazeShow.image?.original) {
          posterURL = mazeShow.image.original
        }
      }
    } catch (error) {
      console.error(
        `Failed to fetch data from TVMaze: ${show.imdb_id} ${error}`
      )
    }
  }

  const seasons = show.seasons?.map((s) => ({ number: s.number, name: s.name }))

  return {
    id,
    kind: isSeries ? "series" : "movie",
    title: show.name,
    overview: overview,
    genres: show.genres.map((g) => g.name),
    duration: (show.runtime || 0) * 60,
    releaseDate: show.release_date,
    seasons: isSeries ? seasons : undefined,
    posterURL: posterURL,
    backdropURL:
      scFindImageURL(show.images, "background") ||
      scFindImageURL(show.images, "cover_mobile") ||
      scFindImageURL(show.images, "cover"),
    logoURL: scFindImageURL(show.images, "logo"),
    rating: rating,
    status: mapStatus(show.status),
    relatedShows: show.related?.map((relatedShow) =>
      mapSCShowEntryToTeeviShowEntry(relatedShow)
    ),
    language: "it",
  }
}

async function fetchEpisodes(
  id: string,
  season: number
): Promise<TeeviShowEpisode[]> {
  const [numericId] = id.split("-")
  const episodes = await scFetchEpisodes(id, season)

  return episodes.map((episode) => {
    return {
      id: `${numericId}?episode_id=${episode.id}`,
      number: episode.number,
      overview: episode.plot,
      title: episode.name,
      duration: (episode.duration || 0) * 60,
      thumbnailURL: scFindImageURL(episode.images, "cover"),
    } satisfies TeeviShowEpisode
  })
}

async function fetchVideoAssets(id: string): Promise<TeeviVideoAsset[]> {
  const videoURL = await scFetchVideoURL(id)
  const asset = await fetchVixcloudPlaylist(new URL(videoURL))
  return [asset]
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
