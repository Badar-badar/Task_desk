import crypto from "crypto";
import path from "path";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "../config/r2";

const BUCKET = process.env.R2_BUCKET as string;

export async function uploadFile(file: Express.Multer.File, folder: string) {
  const key = `${folder}/${crypto.randomUUID()}${path.extname(file.originalname)}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return {
    key,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

export async function getFileUrl(key: string) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: 3600,
  });
}

export async function deleteFile(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}