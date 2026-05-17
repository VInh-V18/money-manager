import Redis from "ioredis";
import env from "../config/env.js";

let client = null;

if (env.REDIS_URL) {
  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableOfflineQueue: false,
  });
  client.on("error", () => {}); // Suppress unhandled error events
}

export const cache = {
  get: async (key) => {
    if (!client) return null;
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },
  set: async (key, value, ttlSeconds = 300) => {
    if (!client) return;
    try {
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // ignore — Redis down should not break app
    }
  },
  del: async (key) => {
    if (!client) return;
    try {
      await client.del(key);
    } catch {
      // ignore
    }
  },
};
