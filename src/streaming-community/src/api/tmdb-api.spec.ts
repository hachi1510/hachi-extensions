import { describe, it, expect, test } from "vitest"
import { fetchShow } from "./tmdb-api"

describe("fetchShow", () => {
  it("should return a movie", async () => {
    const show = await fetchShow({ kind: "movie", id: 1061474 })
    expect(show).toHaveProperty("title", "Superman")
    expect(show.poster).toBeTruthy()
    expect(show.backdrop).toBeTruthy()
    expect(show.logo).toBeTruthy()
  })

  it("should return a series", async () => {
    const show = await fetchShow({ kind: "tv", id: 93405 })
    expect(show).toHaveProperty("title", "Squid Game")
    expect(show.poster).toBeTruthy()
    expect(show.backdrop).toBeTruthy()
    expect(show.logo).toBeTruthy()
  })
})
