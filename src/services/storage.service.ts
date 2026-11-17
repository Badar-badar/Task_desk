import crypto from "crypto";
import path from "path";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "../config/r2";

const BUCKET = process.env.R2_BUCKET?.trim();

if (!BUCKET) {
  throw new Error("Missing R2_BUCKET in .env");
}

function logStorageFailure(operation: string, error: unknown, key?: string): void {
  const details = error && typeof error === "object"
    ? error as { name?: string; message?: string; code?: string; $metadata?: { httpStatusCode?: number } }
    : {};
  console.error("R2 storage operation failed", {
    operation,
    key,
    name: details.name,
    code: details.code,
    httpStatusCode: details.$metadata?.httpStatusCode,
    message: details.message,
  });
}

export async function uploadFile(file: Express.Multer.File, folder: string) {
  const key = `${folder}/${crypto.randomUUID()}${path.extname(file.originalname)}`;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );
  } catch (error) {
    logStorageFailure("upload", error, key);
    throw error;
  }

  return {
    key,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

export async function getFileUrl(key: string) {
  try {
    return await getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
      expiresIn: 3600,
    });
  } catch (error) {
    logStorageFailure("sign-download-url", error, key);
    throw error;
  }
}

export async function deleteFile(key: string) {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    logStorageFailure("delete", error, key);
    throw error;
  }
}
