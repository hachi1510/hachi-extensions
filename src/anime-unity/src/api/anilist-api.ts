const API_URL = new URL(import.meta.env.VITE_ANILIST_API_URL)

export type AnilistShow = {
  title: {
    romaji: string
    english?: string
    native?: string
  }
  coverImage?: {
    extraLarge: string
    large: string
    medium: string
  }
  bannerImage?: string
}

export type AnilistShowEpisode = {
  title: string
  number: number
  thumbnail?: string
}

export async function fetchAnilistShow(id: number): Promise<AnilistShow> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          medium
        }
        bannerImage
      }
    }
  `
  const variables = { id: id }

  const response = await fetch(API_URL.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to fetch show data from Anilist API")
  }
  const data = (await response.json()) as {
    data: {
      Media: AnilistShow
    }
  }
  return data.data.Media
}

export async function fetchAnilistShowEpisodes(
  id: number
): Promise<AnilistShowEpisode[]> {
  type StreamingEpisode = {
    title: string
    thumbnail: string
  }

  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
         streamingEpisodes {
          title
          thumbnail
        }
      }
    }
  `
  const variables = { id: id }

  const response = await fetch(API_URL.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to fetch show data from Anilist API")
  }
  const data = (await response.json()) as {
    data: {
      Media: AnilistShow & {
        streamingEpisodes: StreamingEpisode[]
      }
    }
  }

  const episodes: AnilistShowEpisode[] = data.data.Media.streamingEpisodes.map(
    (ep) => {
      const match = ep.title.match(/Episode\s+(\d+)\s*-\s*(.+)/i)
      if (!match) {
        throw new Error(`Invalid episode title format: ${ep.title}`)
      }
      return {
        number: Number(match[1]),
        title: match[2].trim(),
        thumbnail: ep.thumbnail,
      }
    }
  )
  return episodes
}
