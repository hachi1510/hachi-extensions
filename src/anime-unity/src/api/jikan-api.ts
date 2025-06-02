const API_URL = new URL(import.meta.env.VITE_JIKAN_API_URL)

export type JikanShow = {
  mal_id: number
  url: string
  images: {
    jpg: {
      image_url: string
      small_image_url: string
      large_image_url: string
    }
    webp: {
      image_url: string
      small_image_url: string
      large_image_url: string
    }
  }
  title: string
  title_english: string
  title_japanese: string
  aired: {
    from?: string
    to?: string
    prop: {
      from: {
        day?: number
        month?: number
        year?: number
      }
      to: {
        day?: number
        month?: number
        year?: number
      }
    }
  }
  score: number
  synopsis: string
  genres: {
    mal_id: number
    type: string
    name: string
    url: string
  }[]
}

export type JikanShowEpisode = {
  mal_id: number
  title: string
  filler?: boolean
}

export async function fetchJikanShow(id: number): Promise<JikanShow> {
  const endpoint = new URL(`anime/${id}`, API_URL)
  const response = await fetch(endpoint.toString())
  if (!response.ok) {
    throw new Error("Failed to fetch show data from Jikan API")
  }
  const data = (await response.json()) as { data: JikanShow }
  return data.data
}

export async function fetchJikanShowEpisodes(
  id: number,
  page?: number
): Promise<JikanShowEpisode[]> {
  const endpoint = new URL(`anime/${id}/episodes`, API_URL)
  if (page) {
    endpoint.searchParams.append("page", page.toString())
  }

  const response = await fetch(endpoint.toString())
  if (!response.ok) {
    throw new Error("Failed to fetch show episodes from Jikan API")
  }
  const data = (await response.json()) as { data: JikanShowEpisode[] }
  return data.data
}
