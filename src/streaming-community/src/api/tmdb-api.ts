import { fetchHTML } from "../utils/html"

const API_URL = new URL(import.meta.env.VITE_TMDB_API_URL)

export type TMDBShow = {
  title: string
  description: string
  poster?: string
  backdrop?: string
  logo?: string
}

export type TMDBKind = "movie" | "tv"

export async function fetchShow({
  kind,
  id,
}: {
  kind: TMDBKind
  id: number
}): Promise<TMDBShow> {
  try {
    const endpoint = new URL(`${kind}/${id}/images/logos`, API_URL)
    endpoint.searchParams.append("language", "en-US")
    endpoint.searchParams.append("image_language", "en")

    const html = await fetchHTML(endpoint, { referer: "https://google.com" })

    const showData = html.extract({
      logos: [
        {
          selector: "ul.images.logos li a.image",
          value: "href",
        },
      ],
      title: {
        selector: "head meta[property='og:title']",
        value: "content",
      },
      description: {
        selector: "head meta[property='og:description']",
        value: "content",
      },
      images: [
        {
          selector: "head meta[property='og:image']",
          value: "content",
        },
      ],
    })

    const posterURL =
      Array.isArray(showData.images) && showData.images.length > 0
        ? updateResolutionInUrl(
            sanitizeTMDBImageUrl(showData.images[0]),
            "w780"
          )
        : undefined

    const backdropURL =
      Array.isArray(showData.images) && showData.images.length > 1
        ? updateResolutionInUrl(
            sanitizeTMDBImageUrl(showData.images[1]),
            "w1280"
          )
        : undefined

    const firstLogoURL = pickFirstPNG(showData.logos || [])
    const logoURL = firstLogoURL
      ? updateResolutionInUrl(firstLogoURL, "w500")
      : undefined

    return {
      title: showData.title || "",
      description: showData.description || "",
      poster: posterURL,
      backdrop: backdropURL,
      logo: logoURL,
    }
  } catch (error) {
    console.error("Error fetching show data:", error)
    throw new Error("Failed to fetch show data")
  }
}

function pickFirstPNG(imageUrls: string[]): string | undefined {
  for (const url of imageUrls) {
    if (url.toLowerCase().endsWith(".png")) {
      return url
    }
  }
  return undefined
}

function sanitizeTMDBImageUrl(url: string): string {
  return url.startsWith("https://media.themoviedb.org")
    ? url.replace("https://media.themoviedb.org", "https://image.tmdb.org")
    : url
}

function updateResolutionInUrl(url: string, newResolution: string): string {
  const parsed = new URL(url)
  const parts = parsed.pathname.split("/").filter(Boolean)
  if (parts.length < 2) return url
  // Se la resolution corrente (penultimo segmento) è uguale a newResolution, restituisci l'url originale.
  if (parts[parts.length - 2] === newResolution) return url
  // Sostituisci il penultimo segmento con newResolution
  parts[parts.length - 2] = newResolution
  parsed.pathname = `/${parts.join("/")}`
  return parsed.toString()
}
