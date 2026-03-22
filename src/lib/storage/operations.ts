import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, S3_BUCKET } from "./client";

export async function ensureBucket(): Promise<void> {
  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    } catch {
      // Another request may have created it concurrently — verify it exists
      await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    }
  }
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
}

export async function getDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn }
  );
}
