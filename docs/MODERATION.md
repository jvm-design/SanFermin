# MODERATION — chat images (AWS Rekognition)

Invariant 5: every uploaded media is checked BEFORE delivery, and media is
pull-based (tap to view, never auto-shown). Until moderation is configured,
the 📷 button stays hidden and the server refuses uploads — media cannot
bypass the check.

## Pipeline (already implemented)

1. Sender uploads the image to their own `quarantine/` folder in Supabase
   Storage (the only write their account is allowed; nobody can read it).
2. The game server downloads it, runs **AWS Rekognition** moderation
   (nudity, violence, etc., rejection at ≥75% confidence).
3. Rejected → deleted, sender sees a friendly refusal. Approved → moved to
   `approved/`, a signed URL is created, and the image is posted to the
   Stream channel on the sender's behalf.
4. Recipient sees "📷 Image — tap to view": nothing renders until THEY tap.

## Founder setup (~15 min, one time)

### 1. Run the storage migration
Supabase → SQL Editor → New query → paste the whole content of
`supabase/migrations/0002_chat_media.sql` → Run ("Success" expected).

### 2. Create the AWS account & key
1. **aws.amazon.com** → Create an AWS account (credit card required; the
   Rekognition free tier covers 5 000 images/month for 12 months).
2. Sign in to the AWS console → search **IAM** → **Users** → **Create user**
   (name: `tomatina-moderation`, no console access).
3. Permissions → **Attach policies directly** → search and tick
   **AmazonRekognitionFullAccess** → create the user.
4. Open the user → **Security credentials** → **Create access key** →
   "Application running outside AWS" → copy the **Access key ID** and the
   **Secret access key** (shown once!).

### 3. Wire it into Railway (Variables → New, three times)
- `AWS_ACCESS_KEY_ID` = the access key id
- `AWS_SECRET_ACCESS_KEY` = the secret access key (**never in chat/commits**)
- `AWS_REGION` = `eu-west-1`

After the auto-redeploy, the logs must show
`image moderation configured (rekognition)`, and the 📷 button appears in
chats automatically.

## Verifying

- Send a normal photo: it arrives as "tap to view" on the other phone.
- The server logs `media rejected (<category>)` for anything Rekognition
  flags — you can test with any obviously violent/NSFW test image.
- `GET https://<railway-domain>/media/status` → `{"enabled":true}`.
