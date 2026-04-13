import { PrismaClient, BillingCycle, ContentType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existingPlans = await prisma.plan.count();
  if (existingPlans === 0) {
    await prisma.plan.createMany({
      data: [
        { name: "Starter", price: 199, maxDevices: 1, billingCycle: BillingCycle.MONTHLY },
        { name: "Family", price: 499, maxDevices: 4, billingCycle: BillingCycle.MONTHLY },
        { name: "Premium", price: 999, maxDevices: 8, billingCycle: BillingCycle.YEARLY }
      ]
    });
  }

  const genres = ["Drama", "Sci-Fi", "Action", "Comedy", "Documentary", "Thriller"];
  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { name: genre },
      update: {},
      create: { name: genre }
    });
  }

  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@streamcore.local" },
    update: {},
    create: { email: "admin@streamcore.local", passwordHash: adminPassword, role: UserRole.ADMIN }
  });

  const starterPlan = await prisma.plan.findFirstOrThrow({ where: { name: "Family" } });
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      planId: starterPlan.id,
      state: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  const baseContent = [
    { title: "Orbit 9", description: "A grounded near-future mission drama.", type: ContentType.MOVIE, releaseYear: 2024, durationMinutes: 122, rating: 8.1, genres: ["Drama", "Sci-Fi"] },
    { title: "Faultline", description: "Investigative thriller inside a media company.", type: ContentType.SERIES, releaseYear: 2025, durationMinutes: 45, rating: 8.7, genres: ["Thriller", "Drama"] },
    { title: "Open Waterline", description: "Documentary on deep sea internet cables.", type: ContentType.DOCUMENTARY as ContentType, releaseYear: 2023, durationMinutes: 96, rating: 7.9, genres: ["Documentary"] }
  ];

  for (const item of baseContent) {
    const content = await prisma.content.upsert({
      where: { id: `${item.title.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `${item.title.toLowerCase().replace(/\s+/g, "-")}`,
        title: item.title,
        description: item.description,
        type: item.type,
        releaseYear: item.releaseYear,
        durationMinutes: item.durationMinutes,
        rating: item.rating
      }
    });

    for (const genreName of item.genres) {
      const genre = await prisma.genre.findUniqueOrThrow({ where: { name: genreName } });
      await prisma.contentGenre.upsert({
        where: { contentId_genreId: { contentId: content.id, genreId: genre.id } },
        update: {},
        create: { contentId: content.id, genreId: genre.id }
      });
    }
  }

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
