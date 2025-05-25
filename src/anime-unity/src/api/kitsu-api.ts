const API_URL = new URL(import.meta.env.VITE_KITSU_API_URL)

const KITSU_API_HEADERS: HeadersInit = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
}

export type KitsuImage = {
  original: string
  tiny: string
  small: string
  medium: string
  large: string
}

export type KitsuShow = {
  posterImage?: KitsuImage
  coverImage?: KitsuImage
}

export async function fetchKitsuShow(
  id: { kitsu: number } | { mal: number }
): Promise<KitsuShow> {
  let endpoint: URL
  if ("kitsu" in id) {
    endpoint = new URL(`anime/${id.kitsu}`, API_URL)
  } else if ("mal" in id) {
    const mappingEndpoint = new URL("mappings", API_URL)
    mappingEndpoint.searchParams.append(
      "filter[externalSite]",
      "myanimelist/anime"
    )
    mappingEndpoint.searchParams.append("filter[externalId]", id.mal.toString())
    const mappingResponse = await fetch(mappingEndpoint.toString(), {
      headers: KITSU_API_HEADERS,
    })
    if (!mappingResponse.ok) {
      throw new Error("Failed to fetch mapping data from Kitsu API")
    }
    const mappingData = (await mappingResponse.json()) as {
      data: {
        relationships: {
          item: {
            links: {
              self: string
              related: string
            }
          }
        }
      }[]
    }
    if (mappingData.data.length === 0) {
      throw new Error("No mapping found for the given MAL ID")
    }
    endpoint = new URL(mappingData.data[0].relationships.item.links.related)
  } else {
    throw new Error("Invalid ID type")
  }

  const response = await fetch(endpoint.toString(), {
    headers: KITSU_API_HEADERS,
  })

  if (!response.ok) {
    throw new Error("Failed to fetch show data from Kitsu API")
  }
  const data = (await response.json()) as {
    data: {
      attributes: KitsuShow
    }
  }
  return data.data.attributes
}
