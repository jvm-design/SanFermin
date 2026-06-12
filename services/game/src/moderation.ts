import {
  DetectModerationLabelsCommand,
  RekognitionClient,
} from "@aws-sdk/client-rekognition";

/**
 * Automated image moderation (invariant 5): EVERY uploaded media is
 * checked BEFORE delivery. AWS Rekognition, enabled by the standard AWS
 * env vars (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION). When
 * unconfigured, media stays disabled entirely — never delivered unchecked.
 */
const region = process.env.AWS_REGION;
const hasAwsCreds =
  !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;

const rekognition: RekognitionClient | null =
  region && hasAwsCreds ? new RekognitionClient({ region }) : null;

if (rekognition) console.log("image moderation configured (rekognition)");

export const moderationEnabled = rekognition !== null;

/** Reject when Rekognition flags content at or above this confidence. */
const REJECT_CONFIDENCE = 75;

export interface ModerationVerdict {
  allowed: boolean;
  reason?: string;
}

export async function moderateImage(bytes: Uint8Array): Promise<ModerationVerdict> {
  if (!rekognition) return { allowed: false, reason: "moderation_unconfigured" };
  const result = await rekognition.send(
    new DetectModerationLabelsCommand({
      Image: { Bytes: bytes },
      MinConfidence: 60,
    }),
  );
  const flagged = (result.ModerationLabels ?? []).find(
    (label) => (label.Confidence ?? 0) >= REJECT_CONFIDENCE,
  );
  if (flagged) {
    return { allowed: false, reason: flagged.ParentName || flagged.Name || "flagged" };
  }
  return { allowed: true };
}
