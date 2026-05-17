CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crush_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"relationship_origin" text,
	"real_relationship_stage" text DEFAULT '普通朋友' NOT NULL,
	"interaction_temperature" text DEFAULT 'neutral' NOT NULL,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"user_goal" text,
	"user_anxiety" text,
	"personality_summary" text,
	"communication_style" text,
	"ai_confidence" numeric,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crush_traits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"trait_type" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"source" text DEFAULT 'user' NOT NULL,
	"confidence" numeric,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_metrics" (
	"crush_id" uuid PRIMARY KEY NOT NULL,
	"virtual_intimacy" integer DEFAULT 0 NOT NULL,
	"communication_confidence" integer DEFAULT 35 NOT NULL,
	"relationship_understanding" integer DEFAULT 20 NOT NULL,
	"emotional_stability" integer DEFAULT 40 NOT NULL,
	"real_action_count" integer DEFAULT 0 NOT NULL,
	"memory_fragments" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"auto_play_companion_voice" boolean DEFAULT true NOT NULL,
	"voice_speed" text DEFAULT 'normal' NOT NULL,
	"voice_emotion_level" text DEFAULT 'natural' NOT NULL,
	"voice_age_style" text DEFAULT 'young' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"age_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crush_profiles" ADD CONSTRAINT "crush_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crush_traits" ADD CONSTRAINT "crush_traits_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_metrics" ADD CONSTRAINT "growth_metrics_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;