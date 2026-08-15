import { Redis } from "@upstash/redis";

/** Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from the environment. */
export const kv = Redis.fromEnv();
