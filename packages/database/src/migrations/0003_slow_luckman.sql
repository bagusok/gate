CREATE TABLE "plan_services" (
	"plan_id" varchar(50) NOT NULL,
	"service_id" varchar(50) NOT NULL,
	"daily_limit" integer,
	"monthly_limit" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_services_plan_id_service_id_pk" PRIMARY KEY("plan_id","service_id")
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "req_per_second" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "req_per_minute" integer;--> statement-breakpoint
ALTER TABLE "plan_services" ADD CONSTRAINT "plan_services_plan_id_plans_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("plan_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_services" ADD CONSTRAINT "plan_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;