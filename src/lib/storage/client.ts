import { S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "@/lib/env";

let client: S3Client | null = null;
let bucket: string | null = null;

export function getS3Client(): S3Client {
  if (!client) {
    const env = getEnv();
    client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY!,
        secretAccessKey: env.S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

export function getS3Bucket(): string {
  if (!bucket) {
    bucket = getEnv().S3_BUCKET;
  }
  return bucket;
}
