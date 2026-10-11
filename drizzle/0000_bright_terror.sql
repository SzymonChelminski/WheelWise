CREATE TABLE "cars" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"variant" text NOT NULL,
	"body_type" text NOT NULL,
	"segment" text NOT NULL,
	"fuel_type" text NOT NULL,
	"transmission" text NOT NULL,
	"power_kw" integer NOT NULL,
	"engine_cc" integer,
	"brand_tier" text NOT NULL,
	"value_retention" text NOT NULL,
	"price_eur" integer NOT NULL,
	"list_price_pln" integer NOT NULL,
	"price_observed_at" date NOT NULL,
	"price_source_url" text NOT NULL,
	"fuel_l100" numeric,
	"electric_kwh100" numeric,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cars_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"key" text PRIMARY KEY NOT NULL,
	"price_pln" numeric NOT NULL,
	"observed_at" date NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'failed' NOT NULL,
	"summary" jsonb
);
