import {
  DetectModerationLabelsCommand,
  RekognitionClient,
} from "@aws-sdk/client-rekognition";

/**
 * Automated image moderation (invariant 5): EVERY uploaded media is
 * checked BEFORE delivery. Two interchangeable providers:
 *
 * - Sightengine (simplest signup, no card): SIGHTENGINE_API_USER +
 *   SIGHTENGINE_API_SECRET
 * - AWS Rekognition: AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION
 *
 * When neither is configured, media stays disabled entirely — never
 * delivered unchecked.
 */

export interface ModerationVerdict {
  allowed: boolean;
  reason?: string;
}

type Provider = (bytes: Uint8Array) => Promise<ModerationVerdict>;

// ---- AWS Rekognition ----

const awsRegion = process.env.AWS_REGION;
const hasAwsCreds =
  !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
const rekognition: RekognitionClient | null =
  awsRegion && hasAwsCreds ? new RekognitionClient({ region: awsRegion }) : null;

/** Reject when Rekognition flags content at or above this confidence. */
const REKOGNITION_REJECT_CONFIDENCE = 75;

const moderateWithRekognition: Provider = async (bytes) => {
  const result = await rekognition!.send(
    new DetectModerationLabelsCommand({
      Image: { Bytes: bytes },
      MinConfidence: 60,
    }),
  );
  const flagged = (result.ModerationLabels ?? []).find(
    (label) => (label.Confidence ?? 0) >= REKOGNITION_REJECT_CONFIDENCE,
  );
  if (flagged) {
    return { allowed: false, reason: flagged.ParentName || flagged.Name || "flagged" };
  }
  return { allowed: true };
};

// ---- Sightengine ----

const seUser = process.env.SIGHTENGINE_API_USER;
const seSecret = process.env.SIGHTENGINE_API_SECRET;

interface SightengineResponse {
  status: string;
  nudity?: {
    sexual_activity?: number;
    sexual_display?: number;
    erotica?: number;
  };
  gore?: { prob?: number };
}

const moderateWithSightengine: Provider = async (bytes) => {
  const form = new FormData();
  form.append("api_user", seUser!);
  form.append("api_secret", seSecret!);
  form.append("models", "nudity-2.1,gore-2.0");
  form.append("media", new Blob([Buffer.from(bytes)]), "image.jpg");

  const resp = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: form,
  });
  const data = (await resp.json()) as SightengineResponse;
  if (data.status !== "success") {
    // Fail CLOSED: if moderation can't run, the image does not go through.
    return { allowed: false, reason: "moderation_error" };
  }
  const nudity = data.nudity ?? {};
  if (
    (nudity.sexual_activity ?? 0) >= 0.5 ||
    (nudity.sexual_display ?? 0) >= 0.5 ||
    (nudity.erotica ?? 0) >= 0.6
  ) {
    return { allowed: false, reason: "nudity" };
  }
  if ((data.gore?.prob ?? 0) >= 0.6) {
    return { allowed: false, reason: "gore" };
  }
  return { allowed: true };
};

// ---- provider selection ----

const provider: Provider | null = rekognition
  ? moderateWithRekognition
  : seUser && seSecret
    ? moderateWithSightengine
    : null;

if (rekognition) console.log("image moderation configured (rekognition)");
else if (provider) console.log("image moderation configured (sightengine)");

export const moderationEnabled = provider !== null;

export async function moderateImage(bytes: Uint8Array): Promise<ModerationVerdict> {
  if (!provider) return { allowed: false, reason: "moderation_unconfigured" };
  return provider(bytes);
}
