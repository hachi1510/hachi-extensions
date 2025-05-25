import { TeeviFeedCollection } from "@teeviapp/core"
import { writeFile, mkdir } from "fs/promises"
import { dirname } from "path"
import { AUShow, AUShowType, fetchAUShowsFromArchive } from "../api/au-api"

async function generateCollections() {
  async function write(data: any, path: string) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify(data, null, 2))
  }

  const collections: TeeviFeedCollection[] = []

  const collectionConfigs: {
    name: string
    options: { orderBy?: "views" | "popularity"; type?: AUShowType }
    dub: boolean
  }[] = [
    {
      name: "Gli anime più visti",
      options: { orderBy: "views" },
      dub: false,
    },
    {
      name: "Gli anime doppiati più visti",
      options: { orderBy: "views" },
      dub: true,
    },
    {
      name: "Anime del momento",
      options: { orderBy: "popularity" },
      dub: false,
    },
    {
      name: "I film anime più apprezzati",
      options: { type: "Movie" },
      dub: false,
    },
    {
      name: "I film anime doppiati più apprezzati",
      options: { type: "Movie" },
      dub: true,
    },
    {
      name: "Le serie anime più amate",
      options: { type: "TV" },
      dub: false,
    },
    {
      name: "Le serie anime doppiate più amate",
      options: { type: "TV" },
      dub: true,
    },
  ]

  for (const { name, options, dub } of collectionConfigs) {
    const showsPage1 = await fetchAUShowsFromArchive(1, options)
    const showsPage2 = await fetchAUShowsFromArchive(2, options)
    const shows = [...showsPage1, ...showsPage2].filter((show) =>
      dub ? show.dub == 1 : show.dub != 1
    )
    collections.push(makeCollection(name, shows))
    await delayBetweenRequests()
  }

  write(collections, "assets/au_feed_cache_collections.json")
}

async function delayBetweenRequests() {
  const delay = Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000 // Random delay
  console.log(`Waiting ${delay / 1000} seconds...`)
  await new Promise((resolve) => setTimeout(resolve, delay))
}

function makeCollection(name: string, shows: AUShow[]): TeeviFeedCollection {
  console.log(`Generating collection: ${name} (${shows.length} shows)`)
  return {
    name: name,
    id: `au-${name.toLowerCase().replace(/\s/g, "-")}`,
    shows: shows.map((show) => ({
      kind: show.type == "Movie" ? "movie" : "series",
      id: `${show.id}-${show.slug}`,
      title: show.title_eng,
      posterURL: show.imageurl,
      year: Number(show.date),
    })),
  }
}

generateCollections()
