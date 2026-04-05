CREATE TABLE "mpp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid,
	"buyer_address" varchar(255) NOT NULL,
	"buyer_network" varchar(50) NOT NULL,
	"budget" numeric(30, 0) NOT NULL,
	"spent" numeric(30, 0) DEFAULT '0',
	"voucher_count" numeric DEFAULT '0',
	"status" varchar(20) DEFAULT 'open',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mpp_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"cumulative_amount" numeric(30, 0) NOT NULL,
	"voucher_hash" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "mpp_vouchers_voucher_hash_unique" UNIQUE("voucher_hash")
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" varchar(50) NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"network" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sellers_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(30) NOT NULL,
	"protocol" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"buyer_address" varchar(255) NOT NULL,
	"buyer_network" varchar(50) NOT NULL,
	"seller_address" varchar(255) NOT NULL,
	"seller_network" varchar(50) NOT NULL,
	"seller_id" uuid,
	"gross_amount" numeric(30, 0) NOT NULL,
	"net_amount" numeric(30, 0),
	"platform_fee" numeric(30, 0),
	"gas_allowance" numeric(30, 0) DEFAULT '0',
	"stripe_fee" numeric(30, 0),
	"pull_tx_hash" varchar(255),
	"burn_tx_hash" varchar(255),
	"mint_tx_hash" varchar(255),
	"workflow_id" varchar(255),
	"bridge_provider" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"settled_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "mpp_sessions" ADD CONSTRAINT "mpp_sessions_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpp_vouchers" ADD CONSTRAINT "mpp_vouchers_session_id_mpp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mpp_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mpp_sessions_seller" ON "mpp_sessions" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_mpp_sessions_status" ON "mpp_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_mpp_vouchers_session" ON "mpp_vouchers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_sellers_merchant" ON "sellers" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_seller" ON "transactions" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transactions_created" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_seller_date" ON "transactions" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_workflow" ON "transactions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_buyer" ON "transactions" USING btree ("buyer_address");