import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export const prisma = new PrismaClient({ adapter });

export const connectDB = async (): Promise<void> => {
  await prisma.$connect();
  console.log("PostgreSQL Connected");
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
};
