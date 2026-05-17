CREATE TABLE "ai_profile_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"facts_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inferred_traits_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"boundaries_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_stage" text DEFAULT '普通朋友' NOT NULL,
	"interaction_temperature" text DEFAULT 'neutral' NOT NULL,
	"confidence" numeric DEFAULT '0.5' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"session_type" text NOT NULL,
	"title" text,
	"scenario_type" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"title" text NOT NULL,
	"excerpt" text,
	"image_url" text,
	"reward_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"audio_url" text,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"material_type" text NOT NULL,
	"sanitized_text" text,
	"storage_url" text,
	"retention_status" text DEFAULT 'retained_summary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "practice_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"session_id" uuid,
	"practice_type" text NOT NULL,
	"scenario_type" text NOT NULL,
	"send_context" text,
	"user_line" text,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"simulated_reply" text,
	"coach_analysis_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suggested_line" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_update_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"suggestion_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" numeric DEFAULT '0.5' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "real_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"practice_run_id" uuid,
	"title" text NOT NULL,
	"suggested_message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"feedback_text" text,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visual_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"asset_type" text NOT NULL,
	"expression" text,
	"theme" text NOT NULL,
	"visual_tags_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"storage_url" text NOT NULL,
	"prompt_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"voice_style" text DEFAULT 'gentle' NOT NULL,
	"speed" text DEFAULT 'normal' NOT NULL,
	"emotion_level" text DEFAULT 'natural' NOT NULL,
	"age_style" text DEFAULT 'young' NOT NULL,
	"provider_voice_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_profile_drafts" ADD CONSTRAINT "ai_profile_drafts_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_materials" ADD CONSTRAINT "onboarding_materials_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_runs" ADD CONSTRAINT "practice_runs_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_runs" ADD CONSTRAINT "practice_runs_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_update_suggestions" ADD CONSTRAINT "profile_update_suggestions_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "real_actions" ADD CONSTRAINT "real_actions_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "real_actions" ADD CONSTRAINT "real_actions_practice_run_id_practice_runs_id_fk" FOREIGN KEY ("practice_run_id") REFERENCES "public"."practice_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_assets" ADD CONSTRAINT "visual_assets_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;