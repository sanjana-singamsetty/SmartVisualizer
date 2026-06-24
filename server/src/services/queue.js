import { Queue } from "bullmq";
import { URL } from "url";

// Parse REDIS_URL so BullMQ gets host/port/password separately
const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const connection = {
  host:     redisUrl.hostname,
  port:     Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  tls:      redisUrl.protocol === "rediss:" ? {} : undefined,
};

export const repoQueue = new Queue("repoAnalysis", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 50 },
  },
});
