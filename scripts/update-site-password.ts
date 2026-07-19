import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const plain = process.env.DEFAULT_SITE_PASSWORD?.trim() || "ChangeMeSite1!";
  const password_hash = await bcrypt.hash(plain, 12);
  const site = await prisma.site.upsert({
    where: { name: "BowlingGreenKY" },
    create: {
      name: "BowlingGreenKY",
      password_hash,
      contact_email: "admin@bowlinggreen.local",
    },
    update: { password_hash },
  });
  console.log(`Updated site password for ${site.name} (id=${site.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
