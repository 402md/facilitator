CREATE TABLE "bazaar_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_url" varchar(2048) NOT NULL,
	"base_url" varchar(512) NOT NULL,
	"description" text,
	"seller_id" uuid NOT NULL,
	"merchant_id" varchar(50) NOT NULL,
	"network" varchar(50) NOT NULL,
	"pay_to" varchar(255) NOT NULL,
	"amount" varchar(50) NOT NULL,
	"scheme" varchar(20) DEFAULT 'exact' NOT NULL,
	"use_count" integer DEFAULT 1 NOT NULL,
	"total_volume" numeric(30, 0) DEFAULT '0' NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar_resources" ADD CONSTRAINT "bazaar_resources_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_bazaar_resource_network" ON "bazaar_resources" USING btree ("resource_url","network");--> statement-breakpoint
CREATE INDEX "idx_bazaar_resources_seller" ON "bazaar_resources" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_bazaar_resources_base_url" ON "bazaar_resources" USING btree ("base_url");--> statement-breakpoint
CREATE INDEX "idx_bazaar_resources_use_count" ON "bazaar_resources" USING btree ("use_count");