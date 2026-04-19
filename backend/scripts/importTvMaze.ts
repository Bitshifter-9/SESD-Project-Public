import dotenv from "dotenv";
import { ContentType, PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

type TvMazeShow = {
  name?: string;
  summary?: string;
  genres?: string[];
  premiered?: string;
  rating?: { average?: number | null };
};

const TVMAZE_BASE = "https://api.tvmaze.com";
const pagesToImport = Math.max(1, Number(process.env.TVMAZE_IMPORT_PAGES ?? 10));

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function safeYear(rawDate: string | undefined): number {
  if (!rawDate) return new Date().getUTCFullYear();
  const year = Number(rawDate.slice(0, 4));
  if (Number.isNaN(year) || year < 1900 || year > 2100) return new Date().getUTCFullYear();
  return year;
}

async function fetchPage(page: number): Promise<TvMazeShow[]> {
  const response = await fetch(`${TVMAZE_BASE}/shows?page=${page}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TVMaze request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as TvMazeShow[];
}

async function upsertShow(show: TvMazeShow): Promise<"created" | "updated" | "skipped"> {
  const title = show.name?.trim();
  if (!title) return "skipped";

  const releaseYear = safeYear(show.premiered);
  const description = show.summary ? stripHtml(show.summary) : "Imported from TVMaze catalog.";
  const rating = Math.max(0, Math.min(10, Number(show.rating?.average ?? 0)));

  const existing = await prisma.content.findFirst({
    where: {
      title,
      releaseYear,
      type: ContentType.SERIES
    },
    select: { id: true }
  });

  const content = existing
    ? await prisma.content.update({
        where: { id: existing.id },
        data: { description, rating, durationMinutes: 45 }
      })
    : await prisma.content.create({
        data: {
          title,
          description,
          type: ContentType.SERIES,
          releaseYear,
          durationMinutes: 45,
          rating
        }
      });

  for (const genreNameRaw of show.genres ?? []) {
    const genreName = genreNameRaw.trim();
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

async function main() {
  console.log(`[TVMaze] Starting import for ${pagesToImport} page(s)`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let page = 0; page < pagesToImport; page += 1) {
    const shows = await fetchPage(page);
    for (const show of shows) {
      const result = await upsertShow(show);
      if (result === "created") created += 1;
      if (result === "updated") updated += 1;
      if (result === "skipped") skipped += 1;
    }

    console.log(`[TVMaze] page ${page + 1}/${pagesToImport} imported`);
  }

  console.log("[TVMaze] Import complete");
  console.log({ created, updated, skipped, total: created + updated + skipped });
}

main()
  .catch((error) => {
    console.error("[TVMaze] Import failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
