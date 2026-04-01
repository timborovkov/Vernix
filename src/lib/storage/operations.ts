import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, getS3Bucket } from "./client";

export async function ensureBucket(): Promise<void> {
  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: getS3Bucket() }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: getS3Bucket() }));
    } catch {
      // Another request may have created it concurrently — verify it exists
      await client.send(new HeadBucketCommand({ Bucket: getS3Bucket() }));
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
      Bucket: getS3Bucket(),
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
      Bucket: getS3Bucket(),
      Key: key,
    })
  );
}

export async function listObjects(
  prefix: string,
  maxKeys = 1000
): Promise<string[]> {
  const client = getS3Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: getS3Bucket(),
        Prefix: prefix,
        MaxKeys: Math.min(1000, maxKeys - keys.length),
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of result.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken && keys.length < maxKeys);

  return keys;
}

export async function getDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: getS3Bucket(), Key: key }),
    { expiresIn }
  );
}
