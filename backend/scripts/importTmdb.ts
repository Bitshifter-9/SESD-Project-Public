import dotenv from "dotenv";
import { ContentType, PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

type DiscoverItem = {
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
};

type DiscoverResponse = {
  results: DiscoverItem[];
  page: number;
  total_pages: number;
};

type GenreListResponse = {
  genres: Array<{ id: number; name: string }>;
};

const TMDB_BASE = "https://api.themoviedb.org/3";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const tmdbApiKey = required("TMDB_API_KEY");
const pagesToImport = Math.max(1, Number(process.env.TMDB_IMPORT_PAGES ?? 3));

async function tmdbGet<T>(path: string, query: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({ api_key: tmdbApiKey, language: "en-US", ...query });
  const url = `${TMDB_BASE}${path}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`TMDB request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

function safeYear(rawDate: string | undefined): number {
  if (!rawDate) return new Date().getUTCFullYear();
  const year = Number(rawDate.slice(0, 4));
  if (Number.isNaN(year) || year < 1900 || year > 2100) return new Date().getUTCFullYear();
  return year;
}

async function loadGenreMap(): Promise<Map<number, string>> {
  const map = new Map<number, string>();

  const [movieGenres, tvGenres] = await Promise.all([
    tmdbGet<GenreListResponse>("/genre/movie/list", {}),
    tmdbGet<GenreListResponse>("/genre/tv/list", {})
  ]);

  for (const genre of [...movieGenres.genres, ...tvGenres.genres]) {
    if (!map.has(genre.id)) {
      map.set(genre.id, genre.name);
    }
  }

  return map;
}

async function upsertContentWithGenres(
  item: DiscoverItem,
  kind: "movie" | "tv",
  genreMap: Map<number, string>
): Promise<"created" | "updated" | "skipped"> {
  const title = (kind === "movie" ? item.title : item.name)?.trim();
  if (!title) {
    return "skipped";
  }

  const releaseYear = safeYear(kind === "movie" ? item.release_date : item.first_air_date);
  const description = item.overview?.trim() || `Imported from TMDB ${kind.toUpperCase()} catalog.`;
  const rating = Math.max(0, Math.min(10, Number(item.vote_average ?? 0)));
  const type = kind === "movie" ? ContentType.MOVIE : ContentType.SERIES;
  const durationMinutes = kind === "movie" ? 110 : 45;

  const existing = await prisma.content.findFirst({
    where: {
      title,
      releaseYear,
      type
    },
    select: { id: true }
  });

  const content = existing
    ? await prisma.content.update({
        where: { id: existing.id },
        data: { description, rating, durationMinutes }
      })
    : await prisma.content.create({
        data: { title, description, rating, releaseYear, durationMinutes, type }
      });

  const genreIds = item.genre_ids ?? [];
  for (const tmdbGenreId of genreIds) {
    const genreName = genreMap.get(tmdbGenreId);
    if (!genreName) continue;

    const genre = await prisma.genre.upsert({
      where: { name: genreName },
      update: {},
      create: { name: genreName }
    });

    await prisma.contentGenre.upsert({
      where: {
        contentId_genreId: {
          contentId: content.id,
          genreId: genre.id
        }
      },
      update: {},
      create: {
        contentId: content.id,
        genreId: genre.id
      }
    });
  }

  return existing ? "updated" : "created";
}

async function importType(kind: "movie" | "tv", genreMap: Map<number, string>) {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let page = 1; page <= pagesToImport; page += 1) {
    const payload = await tmdbGet<DiscoverResponse>(`/discover/${kind}`, {
      include_adult: "false",
      include_video: "false",
      sort_by: "popularity.desc",
      page: String(page)
    });

    for (const item of payload.results) {
      const result = await upsertContentWithGenres(item, kind, genreMap);
      if (result === "created") created += 1;
      if (result === "updated") updated += 1;
      if (result === "skipped") skipped += 1;
    }

    console.log(`[TMDB] ${kind} page ${page}/${pagesToImport} imported`);
  }

  return { created, updated, skipped };
}

async function main() {
  console.log(`[TMDB] Starting catalog import with ${pagesToImport} page(s) each for movie and tv`);
  const genreMap = await loadGenreMap();

  const movieSummary = await importType("movie", genreMap);
  const tvSummary = await importType("tv", genreMap);

  console.log("[TMDB] Import complete");
  console.log({
    movies: movieSummary,
    series: tvSummary,
    totalCreated: movieSummary.created + tvSummary.created,
    totalUpdated: movieSummary.updated + tvSummary.updated,
    totalSkipped: movieSummary.skipped + tvSummary.skipped
  });
}

main()
  .catch((error) => {
    console.error("[TMDB] Import failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
