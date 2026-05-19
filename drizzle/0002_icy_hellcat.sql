CREATE TABLE "practice_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"companion_session_id" uuid,
	"practice_session_id" uuid,
	"practice_run_id" uuid,
	"title" text NOT NULL,
	"scenario_type" text DEFAULT 'conversation' NOT NULL,
	"trigger_source" text DEFAULT 'user_click' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_message_id" uuid,
	"end_message_id" uuid,
	"reality_context_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recap_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suggested_line" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "practice_chapters" ADD CONSTRAINT "practice_chapters_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_chapters" ADD CONSTRAINT "practice_chapters_companion_session_id_chat_sessions_id_fk" FOREIGN KEY ("companion_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_chapters" ADD CONSTRAINT "practice_chapters_practice_session_id_chat_sessions_id_fk" FOREIGN KEY ("practice_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_chapters" ADD CONSTRAINT "practice_chapters_practice_run_id_practice_runs_id_fk" FOREIGN KEY ("practice_run_id") REFERENCES "public"."practice_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_chapters" ADD CONSTRAINT "practice_chapters_start_message_id_messages_id_fk" FOREIGN KEY ("start_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_chapters" ADD CONSTRAINT "practice_chapters_end_message_id_messages_id_fk" FOREIGN KEY ("end_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;