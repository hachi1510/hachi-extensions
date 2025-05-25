import { fetchHTML } from "../utils/html"

const API_URL = new URL(import.meta.env.VITE_IMDB_API_URL)

export type IMDBShow = {
  image?: string
  description?: string
  aggregateRating?: {
    ratingValue: number
  }
}

export async function fetchShow(showID: string): Promise<IMDBShow> {
  const endpoint = new URL(`title/${showID}`, API_URL)
  const html = await fetchHTML(endpoint)

  const json = html("head script[type='application/ld+json']").html()

  if (!json) {
    throw new Error(`Failed to parse data from IMDB: ${showID}`)
  }

  return JSON.parse(json) as IMDBShow
}
