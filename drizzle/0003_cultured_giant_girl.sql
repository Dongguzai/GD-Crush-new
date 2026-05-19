CREATE TABLE "reality_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"source_type" text DEFAULT 'chat_message' NOT NULL,
	"source_message_id" uuid,
	"event_type" text DEFAULT 'chat_observation' NOT NULL,
	"event_text" text NOT NULL,
	"occurred_at_text" text,
	"extraction_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reality_events" ADD CONSTRAINT "reality_events_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reality_events" ADD CONSTRAINT "reality_events_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;