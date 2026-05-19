-- M5.2: Add emotionTag and importanceLevel to memories
ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "emotion_tag" text DEFAULT 'warm' NOT NULL;
ALTER TABLE "memories" ADD COLUMN IF NOT EXISTS "importance_level" integer DEFAULT 1 NOT NULL;