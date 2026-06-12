# MODERATION — chat images (Sightengine or AWS Rekognition)

Invariant 5: every uploaded media is checked BEFORE delivery, and media is
pull-based (tap to view, never auto-shown). Until moderation is configured,
the 📷 button stays hidden and the server refuses uploads — media cannot
bypass the check. Two interchangeable providers; configure either.

## Pipeline (already implemented)

1. Sender uploads the image to their own `quarantine/` folder in Supabase
   Storage (the only write their account is allowed; nobody can read it).
2. The game server downloads it and runs moderation (nudity, gore...).
3. Rejected → deleted, sender sees a friendly refusal. Approved → moved to
   `approved/`, a signed URL is created, and the image is posted to the
   Stream channel on the sender's behalf.
4. Recipient sees "📷 Image — tap to view": nothing renders until THEY tap.

## Prerequisite (both options): run the storage migration

Supabase → SQL Editor → New query → paste the whole content of
`supabase/migrations/0002_chat_media.sql` → Run ("Success" expected).

## Option A — Sightengine (recommended: ~5 min, no credit card)

1. **sightengine.com** → Sign up (email + password) → free plan
   (500 images/month, plenty for testing and the beachhead).
2. On the dashboard you'll see your **API user** (a number) and
   **API secret**.
3. Railway → service → **Variables**:
   - `SIGHTENGINE_API_USER` = the API user
   - `SIGHTENGINE_API_SECRET` = the API secret (never in chat/commits)

## Option B — AWS Rekognition (free tier 5 000 images/month, card required)
1. **aws.amazon.com** → Create an AWS account.
2. Sign in to the AWS console → search **IAM** → **Users** → **Create user**
   (name: `tomatina-moderation`, no console access).
3. Permissions → **Attach policies directly** → search and tick
   **AmazonRekognitionFullAccess** → create the user.
4. Open the user → **Security credentials** → **Create access key** →
   "Application running outside AWS" → copy the **Access key ID** and the
   **Secret access key** (shown once!).
5. Railway → Variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
   `AWS_REGION` = `eu-west-1`. (If both providers are configured,
   Rekognition wins.)

## Verifying (either option)

- Railway logs after the redeploy:
  `image moderation configured (sightengine)` (or `rekognition`).
- `https://<railway-domain>/media/status` in a browser → `{"enabled":true}`.
- Send a normal photo: it arrives as "tap to view" on the other phone.
- The server logs `media rejected (<category>)` for flagged images.
