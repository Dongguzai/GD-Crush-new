CREATE TABLE "reality_inferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"event_id" uuid,
	"inference_type" text DEFAULT 'relationship_state' NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"confidence" numeric DEFAULT '0.5' NOT NULL,
	"evidence_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reality_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crush_id" uuid NOT NULL,
	"event_id" uuid,
	"signal_type" text DEFAULT 'interaction' NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"polarity" text DEFAULT 'neutral' NOT NULL,
	"confidence" numeric DEFAULT '0.5' NOT NULL,
	"evidence_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reality_inferences" ADD CONSTRAINT "reality_inferences_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reality_inferences" ADD CONSTRAINT "reality_inferences_event_id_reality_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reality_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reality_signals" ADD CONSTRAINT "reality_signals_crush_id_crush_profiles_id_fk" FOREIGN KEY ("crush_id") REFERENCES "public"."crush_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reality_signals" ADD CONSTRAINT "reality_signals_event_id_reality_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reality_events"("id") ON DELETE cascade ON UPDATE no action;