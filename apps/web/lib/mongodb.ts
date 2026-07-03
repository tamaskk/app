import mongoose from "mongoose";

// Read the URI lazily (inside connectToDatabase), NOT at module load. A
// top-level throw here fired during `next build` whenever MONGODB_URI wasn't
// in the build environment (e.g. Turborepo's strict env mode strips undeclared
// vars), because every API route imports this module. The build doesn't need a
// live DB, so importing must be side-effect-free — only an actual connection
// attempt requires the secret.

// Cache the connection across hot reloads in development to avoid
// opening a new connection on every change (and exhausting the pool).
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  mongoose?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.mongoose ?? {
  conn: null,
  promise: null,
};

globalForMongoose.mongoose = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Add it to apps/web/.env.local",
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
