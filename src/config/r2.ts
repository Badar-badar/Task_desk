import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";

const accountIdOrEndpoint = process.env.R2_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET?.trim();

if (!accountIdOrEndpoint || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error("Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_BUCKET in .env");
}

const endpoint = accountIdOrEndpoint.includes("://")
  ? accountIdOrEndpoint.replace(/\/+$/, "")
  : `https://${accountIdOrEndpoint}.r2.cloudflarestorage.com`;

let endpointUrl: URL;
try {
  endpointUrl = new URL(endpoint);
} catch {
  throw new Error("R2_ACCOUNT_ID must be a Cloudflare account ID or a valid R2 endpoint URL");
}

if (endpointUrl.protocol !== "https:" || !endpointUrl.hostname.endsWith(".r2.cloudflarestorage.com")) {
  throw new Error("R2 endpoint must use https://<account-id>.r2.cloudflarestorage.com");
}

const r2 = new S3Client({
  region: "auto",
  endpoint: endpointUrl.origin,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export default r2;
