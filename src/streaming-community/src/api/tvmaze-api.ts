const API_URL = new URL(import.meta.env.VITE_TV_MAZE_API_URL)

export type TVMazeShow = {
  id: number
  name: string
  rating: {
    average: number
  }
  image: {
    medium: string
    original: string
  }
}

export async function fetchShow(imdbID: string): Promise<TVMazeShow> {
  const endpoint = new URL(`lookup/shows`, API_URL)
  endpoint.searchParams.append("imdb", imdbID)
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to lookup show ID: ${imdbID} ${response.status} ${response.statusText}`
    )
  }
  const show: TVMazeShow = await response.json()

  return show
}
