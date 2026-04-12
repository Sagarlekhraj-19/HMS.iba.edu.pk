const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { erp: "31331" },
    update: {},
    create: {
      fullName: "Admin",
      erp: "31331",
      email: "admin@hms.iba.edu.pk",
      password: await bcrypt.hash("qwertyuiop12", 10),
      role: "ADMIN",
    },
  });

  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  console.log("Admin seeded:", adminUser.erp);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
