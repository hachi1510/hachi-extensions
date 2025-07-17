import {
  fetchShowsFromArchive,
  findImageURL,
  SCArchiveRequest,
  SCGenres,
} from "../api/sc-api"
import {
  TeeviFeedCategory,
  TeeviFeedCollection,
  TeeviShowEntry,
} from "@teeviapp/core"
import { writeFile, mkdir } from "fs/promises"
import { dirname } from "path"

type CollectionRequest = {
  name: string
  type?: SCArchiveRequest["type"]
  genres?: SCArchiveRequest["genres"]
  year?: SCArchiveRequest["year"]
  service?: SCArchiveRequest["service"]
  minimumViews?: SCArchiveRequest["minimumViews"]
  sorting?: SCArchiveRequest["sorting"]
  maximumElements?: number
  category?: TeeviFeedCategory
  //maximumPagesToFetch?: SCArchiveRequest["maximumPagesToFetch"]
}

const requests: CollectionRequest[] = [
  {
    genres: [SCGenres.action],
    name: "Azione",
  },
  {
    genres: [SCGenres.crime],
    name: "Crimine",
  },
  {
    genres: [SCGenres.documentary],
    name: "Documentari",
  },
  {
    genres: [SCGenres.drama],
    name: "Dramma",
  },
  {
    genres: [SCGenres.family],
    name: "Famiglia",
  },
  {
    genres: [SCGenres.fantasy],
    name: "Fantasy",
  },
  {
    genres: [SCGenres.war],
    name: "Guerra",
  },
  {
    genres: [SCGenres.horror],
    name: "Horror",
  },
  {
    genres: [SCGenres.korean_drama],
    name: "Drammi Coreani",
  },
  {
    genres: [SCGenres.mystery],
    name: "Mistero",
  },
  {
    genres: [SCGenres.science_fiction],
    name: "Fantascienza",
  },
  {
    genres: [SCGenres.thriller],
    name: "Thriller",
  },
  {
    genres: [SCGenres.animation],
    name: "Animazione",
  },
  {
    genres: [SCGenres.comedy],
    name: "Commedia",
  },
  {
    genres: [SCGenres.action_adventure],
    name: "Azione e Avventura",
  },
  {
    genres: [SCGenres.musical],
    name: "Musical",
  },
  {
    genres: [SCGenres.romantic],
    name: "Romantico",
  },
  {
    genres: [SCGenres.animation, SCGenres.comedy],
    type: "tv",
    name: "Animazione esilarante",
    minimumViews: "75k",
  },
  {
    type: "tv",
    service: "netflix",
    name: "Novità Netflix",
    sorting: "release_date",
    minimumViews: "25k",
    maximumElements: 20,
    category: "new",
    //maximumPagesToFetch: 1,
  },
  {
    type: "tv",
    service: "disney",
    name: "Novità Disney+",
    sorting: "release_date",
    minimumViews: "25k",
    maximumElements: 20,
    category: "new",
    //maximumPagesToFetch: 1,
  },
  {
    type: "tv",
    service: "prime",
    name: "Novità Prime Video",
    sorting: "release_date",
    minimumViews: "25k",
    maximumElements: 20,
    category: "new",
    //maximumPagesToFetch: 1,
  },
  {
    type: "tv",
    service: "apple",
    name: "Novità Apple TV+",
    sorting: "release_date",
    minimumViews: "25k",
    maximumElements: 20,
    category: "new",
    //maximumPagesToFetch: 1,
  },
  {
    type: "tv",
    service: "now",
    name: "Novità Now TV",
    sorting: "release_date",
    minimumViews: "25k",
    maximumElements: 20,
    category: "new",
    //maximumPagesToFetch: 1,
  },
  {
    type: "movie",
    year: 1990,
    name: "I migliori film degli anni 90",
  },
  {
    type: "movie",
    year: 1980,
    name: "I migliori film degli anni 80",
  },
  {
    type: "movie",
    year: 1970,
    name: "I migliori film degli anni 70",
  },
  {
    type: "movie",
    year: 1960,
    name: "I migliori film degli anni 60",
  },
  {
    type: "tv",
    service: "apple",
    name: "Apple Originals",
  },
  {
    type: "tv",
    minimumViews: "1M",
    name: "Serie da record",
    category: "hot",
  },
  {
    type: "movie",
    minimumViews: "500k",
    name: "Film da record",
    category: "hot",
  },
]

async function generateCollections() {
  async function write(data: any, path: string) {
    await mkdir(dirname(path), { recursive: true })
    if (typeof data !== "string") {
      data = JSON.stringify(data, null, 2)
    }

    await writeFile(path, data)
  }

  const collections = []
  for (const request of requests) {
    const collection = await fetchCollection(request)
    collections.push(collection)
    console.log(
      `Fetched collection: ${request.type} ${request.name} (shows count: ${collection.shows.length})`
    )
    const delay = Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000 // Random delay
    console.log(`Waiting ${delay / 1000} seconds...`)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  write(collections, "assets/sc_feed_cache_collections.json")
}

async function fetchCollection(
  request: CollectionRequest
): Promise<TeeviFeedCollection> {
  const { minimumViews, sorting, maximumElements, ...rest } = request
  const maximumPagesToFetch = maximumElements
    ? Math.ceil(maximumElements / 60)
    : 2
  let shows = await fetchShowsFromArchive({
    ...rest,
    sorting: sorting ?? "score",
    maximumPagesToFetch: maximumPagesToFetch,
    minimumViews: minimumViews ?? "50k",
  })

  if (maximumElements && shows.length > maximumElements) {
    shows = shows.splice(0, maximumElements)
  }

  const collection = {
    name: request.name,
    id: `sc-${request.type}-${request.name.toLowerCase().replace(/\s/g, "-")}`,
    category: request.category,
    shows: shows.map((show) => {
      return {
        kind: show.type == "movie" ? "movie" : "series",
        id: `${show.id}-${show.slug}`,
        title: show.name,
        posterURL: findImageURL(show.images, "poster"),
        year: new Date(show.last_air_date).getFullYear(),
      } satisfies TeeviShowEntry
    }),
  }
  return collection
}

generateCollections()
