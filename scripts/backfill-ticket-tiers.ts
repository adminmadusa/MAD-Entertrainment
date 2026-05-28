import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Locate and load the environment file robustly
let envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), "apps/server/.env");
}
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not defined in environment variables.");
  process.exit(1);
}

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection could not be established.");
  }

  console.log(
    "Running migration to backfill 'isFree: false' for ticket tiers...",
  );

  const result = await db.collection("events").updateMany(
    { "ticketTiers.isFree": { $exists: false } },
    {
      $set: {
        "ticketTiers.$[tier].isFree": false,
      },
    },
    {
      arrayFilters: [{ "tier.isFree": { $exists: false } }],
    },
  );

  console.log("Migration completed!");
  console.log(`Matched documents: ${result.matchedCount}`);
  console.log(`Modified documents: ${result.modifiedCount}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
