import { describe, it, expect, test } from "vitest"
import extension from "../src/index"

test("fetchShowsByQuery", async () => {
  const shows = await extension.fetchShowsByQuery("rick and morty")
  expect(shows.length).toBeGreaterThan(0)
  expect(shows.find((show) => show.id === "115-rick-and-morty")).toBeTruthy()
})

describe("fetchShow", () => {
  it("should return a movie", async () => {
    const show = await extension.fetchShow("835-jurassic-park")
    expect(show).toHaveProperty("id", "835-jurassic-park")
    expect(show).toHaveProperty("title", "Jurassic Park")
    expect(show).toHaveProperty("kind", "movie")
    expect(show.relatedShows).toBeTruthy()
    expect(show.seasons).toBeFalsy()
  })

  it("should return a series", async () => {
    const show = await extension.fetchShow("147-mr-robot")
    expect(show).toHaveProperty("id", "147-mr-robot")
    expect(show).toHaveProperty("title", "Mr. Robot")
    expect(show).toHaveProperty("kind", "series")
    expect(show.relatedShows).toBeTruthy()
    expect(show.seasons).toBeTruthy()
  })
})

test("fetchEpisodes", async () => {
  const episodes = await extension.fetchEpisodes("147-mr-robot", 1)
  expect(episodes.length).toBeGreaterThan(0)
  expect(episodes[0]).toHaveProperty("id")
  expect(episodes[0]).toHaveProperty("number")
  expect(episodes[0]).toHaveProperty("overview")
  expect(episodes[0]).toHaveProperty("title")
})

test("fetchVideoAssets", async () => {
  const videoAssets = await extension.fetchVideoAssets("835")
  expect(videoAssets).toHaveLength(1)
  expect(videoAssets[0].url).toContain("vixcloud.co")
})
