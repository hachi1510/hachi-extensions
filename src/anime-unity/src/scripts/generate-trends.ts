import { TeeviShow } from "@teeviapp/core"
import { writeFile, mkdir } from "fs/promises"
import { dirname } from "path"

const trendingShows: TeeviShow[] = [
  {
    title: "Il castello errante di Howl",
    kind: "movie",
    id: "336-il-castello-errante-di-howl-ita",
    posterURL:
      "https://image.tmdb.org/t/p/original/fXKg3wkHfWoZEiJUZYxcrdPNWKi.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/tjMiLkVfOmbx3kUtKSmkLimiw8x.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/cOcqGC1mgPoRYvaUxPMACEKOKjz.png",
    overview: "Cosa farà Sophie e cosa capiterà tra lei e Howl?",
    releaseDate: "2005-06-10",
    genres: ["Fantasy"],
    duration: 0,
  },
  {
    title: "Nana",
    kind: "series",
    id: "4821-nana",
    posterURL:
      "https://image.tmdb.org/t/p/original/eWqk7Hih3t2t1ZhiDbHFMZVJCrF.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/q3EV3IdRCdREZXIKLHAhoZufteg.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/u7OPSU24Ib5G8iYCswMYPrMUwp2.png",
    overview:
      "Due ventenni accomunate dal nome e dalla decisione di trasferirsi a Tokyo",
    releaseDate: "2006-04-05",
    genres: ["Drama"],
    duration: 0,
  },
  {
    title: "Jujutsu Kaisen",
    kind: "series",
    id: "2791-jujutsu-kaisen",
    posterURL:
      "https://image.tmdb.org/t/p/original/g1p1Vx6FgUEY6fDRnOCncQ9V21o.jpg",
    backdropURL:
      "https://image.tmdb.org/t/p/original/prJcvQ5uRuqo2Um1loBbqoKoyBS.jpg",
    logoURL:
      "https://image.tmdb.org/t/p/original/n0xjdQWNVVUCXyIEJjpUDqWDcw.png",
    overview: "A boy fights... for 'the right death'",
    releaseDate: "2020-10-03",
    genres: ["Shounen"],
    duration: 0,
  },
]

async function generateTrends() {
  async function write(data: any, path: string) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify(data, null, 2))
  }

  const trending: TeeviShow[] = trendingShows.map((show) => {
    var show = show
    show.logoURL = show.logoURL?.replace("original", "w500")
    show.posterURL = show.posterURL?.replace("original", "w780")
    show.backdropURL = show.backdropURL?.replace("original", "w1280")
    return show
  })

  write(trending, "assets/au_feed_cache_trending_shows.json")
}

generateTrends()
