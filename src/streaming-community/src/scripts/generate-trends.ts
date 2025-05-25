import { TeeviShow } from "@teeviapp/core"
import { writeFile, mkdir } from "fs/promises"
import { dirname } from "path"

const trendingShows: TeeviShow[] = [
  // Movie - Flow
  {
    kind: "movie",
    id: "11527-flow",
    title: "Flow",
    posterURL:
      "https://image.tmdb.org/t/p/original/sS71Tn4IFAuiKkpXKqs9w7gaq4x.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/id17sSzMcV2q0wDEFiILj4iP5RX.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/vlFyxv76qifbH2ApYBnrjKxCYSe.png",
    overview: "Condividete la bellezza dello stare insieme",
    releaseDate: "2024-11-22",
    genres: ["Animazione"],
    duration: 0,
  },
  // Movie - Anora
  {
    kind: "movie",
    id: "11473-anora",
    title: "Anora",
    posterURL:
      "https://image.tmdb.org/t/p/original/aqXHtuq9Ns6dqxwNUTkas9PsvdI.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/kEYWal656zP5Q2Tohm91aw6orlT.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/dYVsBFfGLSCAZ9HqwOfkpgWUwTw.png",
    overview: "Love is a hustle",
    releaseDate: "2024-10-18",
    genres: ["Dramma"],
    duration: 0,
  },
  // Movie - Spider-Man - Un nuovo universo
  {
    kind: "movie",
    id: "391-spider-man-un-nuovo-universo",
    title: "Spider-Man - Un nuovo universo",
    posterURL:
      "https://image.tmdb.org/t/p/original/2HmMlcQmPepzRx2xcJLM1yw4D0w.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/8mnXR9rey5uQ08rZAvzojKWbDQS.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/hOSJGmh7FET9PdjlIuVTUUbi51S.png",
    overview: "More than one wears the mask",
    releaseDate: "2018-12-14",
    genres: ["Animation"],
    duration: 0,
  },
  // Movie - Casino Royale
  {
    kind: "movie",
    id: "3441-casino-royale",
    title: "Casino Royale",
    posterURL:
      "https://image.tmdb.org/t/p/original/u5Hk3FSdRtbN59YsqBY3XpYmhhJ.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/6vt7uXxyhMp1sk56UX7eaH1w8g2.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/e0DBt4YpJFiEjghZF5GcQ92Mo5e.png",
    overview: "Everyone has a past. Every legend has a beginning",
    releaseDate: "2006-11-17",
    genres: ["Thriller"],
    duration: 0,
  },
  // Series - Slow Horses
  {
    kind: "series",
    id: "4835-slow-horses",
    title: "Slow Horses",
    posterURL:
      "https://image.tmdb.org/t/p/original/s6n49WngI07RplpzwFW3gHpVxuR.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/qhXdYysiamRu6moMGMZPQ4oVLvd.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/c1Gcf12DFh4cEMShrYAjcu32GX4.png",
    overview: "Non si scappa dalle ombre del passato",
    releaseDate: "2022-04-01",
    genres: ["Crime"],
    duration: 0,
  },
  // Series - Daredevil: Rinascita
  {
    kind: "series",
    id: "11520-daredevil-rinascita",
    title: "Daredevil: Rinascita",
    posterURL:
      "https://image.tmdb.org/t/p/original/qXxqIIr3ip12MTOtRw9XWEHvfj6.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/hrsRczdsAHBLTDzlIqt82bxY0Tt.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/npN4ppBzR1SULVA0aAwHiKzm8VZ.png",
    overview: "La missione di Daredevil non ha mai fine",
    releaseDate: "2025-03-04",
    genres: ["Dramma"],
    duration: 0,
  },
  // Series - Scissione
  {
    kind: "series",
    id: "4937-scissione",
    title: "Scissione",
    posterURL:
      "https://image.tmdb.org/t/p/original/rDFpBfO70Z8UyXDvmXeGy486NLm.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/ixgFmf1X59PUZam2qbAfskx2gQr.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/so5Bn3opFgPUhVwDHffcqmeaZwD.png",
    overview: "There's more to work than life",
    releaseDate: "2022-02-17",
    genres: ["Dramma"],
    duration: 0,
  },
  // Series - Doctor Who
  {
    kind: "series",
    id: "2098-doctor-who",
    title: "Doctor Who",
    posterURL:
      "https://image.tmdb.org/t/p/original/6ecjWh9uUUnsOLzCWIukHVLWnRH.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/9mWQltOeRimE8LSZm3cRcQkqrj2.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/8i8Zsy0IkaHkxNjOdPRowhy85hi.png",
    overview:
      "The Doctor is a Time Lord: a 900 year old alien with 2 hearts, part of a gifted civilization who mastered time travel",
    releaseDate: "2005-03-26",
    genres: ["Sci-Fi & Fantasy"],
    duration: 0,
  },
  // Series - Shōgun
  {
    kind: "series",
    id: "7874-shogun",
    title: "Shōgun",
    posterURL:
      "https://image.tmdb.org/t/p/original/23wScEz9Tr5N1cE58K9FAtN00y4.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/qauHZuVYmpbjw456y3BHcmZy8nO.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/zjKGNDF2Kr6RQvONfiM0t2tm92T.png",
    overview: "An epic saga of war, passion, and power set in Feudal Japan",
    releaseDate: "2024-02-27",
    genres: ["War & Politics"],
    duration: 0,
  },
]

async function generateTrends() {
  async function write(data: any, path: string) {
    await mkdir(dirname(path), { recursive: true })
    if (typeof data !== "string") {
      data = JSON.stringify(data, null, 2)
    }
    await writeFile(path, data)
  }

  const trending: TeeviShow[] = trendingShows.map((show) => {
    var show = show
    show.logoURL = show.logoURL?.replace("original", "w500")
    show.posterURL = show.posterURL?.replace("original", "w780")
    show.backdropURL = show.backdropURL?.replace("original", "w1280")
    return show
  })

  write(trending, "assets/sc_feed_cache_trending_shows.json")
}

generateTrends()
