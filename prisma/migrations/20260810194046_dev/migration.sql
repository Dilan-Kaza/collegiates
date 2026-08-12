-- CreateEnum
CREATE TYPE "gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "skill_level" AS ENUM ('B', 'I', 'A');

-- CreateEnum
CREATE TYPE "event_category" AS ENUM ('E', 'I', 'G');

-- CreateEnum
CREATE TYPE "student_type" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "user_type" AS ENUM ('C', 'O', 'A');

-- CreateEnum
CREATE TYPE "weapon_type" AS ENUM ('B', 'S', 'L', 'O');

-- CreateTable
CREATE TABLE "colleges" (
    "college_id" UUID NOT NULL,
    "college_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "colleges_pkey" PRIMARY KEY ("college_id")
);

-- CreateTable
CREATE TABLE "events" (
    "event_code" VARCHAR(50) NOT NULL,
    "event_name" VARCHAR(255),
    "event_level" "skill_level",
    "event_category" "event_category",
    "gender_category" "gender",
    "is_nandu" BOOLEAN,
    "is_cq_nq" BOOLEAN,
    "weapon_type" "weapon_type",

    CONSTRAINT "events_pkey" PRIMARY KEY ("event_code")
);

-- CreateTable
CREATE TABLE "users" (
    "password" VARCHAR(128) NOT NULL,
    "first_name" VARCHAR(150) NOT NULL DEFAULT '',
    "last_name" VARCHAR(150) NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "date_joined" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "user_type" "user_type" NOT NULL DEFAULT 'C',
    "token_version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "competitor_profile" (
    "user_id" UUID NOT NULL,
    "gender" "gender",
    "skill_level" "skill_level",
    "school_id" UUID,
    "student_type" "student_type",
    "is_competing" BOOLEAN NOT NULL DEFAULT false,
    "amt_paid" INTEGER NOT NULL DEFAULT 0,
    "proof_of_reg" BOOLEAN NOT NULL DEFAULT false,
    "last_reg_year" INTEGER,

    CONSTRAINT "competitor_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "college_profile" (
    "user_id" UUID NOT NULL,
    "college_id" UUID,
    "host_years" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "college_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "purpose" VARCHAR(1) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration" (
    "id" BIGSERIAL NOT NULL,
    "competitor_id" UUID NOT NULL,
    "event_code" VARCHAR(50) NOT NULL,
    "comp_year" INTEGER NOT NULL,
    "date_created" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nandu_str" TEXT,

    CONSTRAINT "registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groupset" (
    "groupset_id" UUID NOT NULL,
    "comp_year" INTEGER NOT NULL,
    "school_id" UUID NOT NULL,
    "team_name" VARCHAR(255) NOT NULL,
    "date_created" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groupset_pkey" PRIMARY KEY ("groupset_id")
);

-- CreateTable
CREATE TABLE "groupset_members" (
    "id" UUID NOT NULL,
    "groupset_id" UUID NOT NULL,
    "member" UUID NOT NULL,
    "date_joined" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leader" BOOLEAN NOT NULL,

    CONSTRAINT "groupset_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog" (
    "blog_id" UUID NOT NULL,
    "date_created" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author" VARCHAR(255) NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "blog_content" TEXT NOT NULL,

    CONSTRAINT "blog_pkey" PRIMARY KEY ("blog_id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "reg_year" INTEGER NOT NULL,
    "early_reg_start" TIMESTAMPTZ(6),
    "early_reg_cost_base" INTEGER,
    "early_reg_cost_event" INTEGER,
    "reg_start" TIMESTAMPTZ(6) NOT NULL,
    "reg_end" TIMESTAMPTZ(6) NOT NULL,
    "reg_cost_base" INTEGER NOT NULL,
    "reg_cost_event" INTEGER NOT NULL,
    "due_date" DATE,
    "comp_date" DATE,
    "contact_email" VARCHAR(254) NOT NULL,
    "scoring_url" VARCHAR(500),
    "order_public" BOOLEAN NOT NULL DEFAULT false,
    "order_updated_at" TIMESTAMPTZ(6),
    "host_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_order" (
    "id" UUID NOT NULL,
    "comp_year" INTEGER NOT NULL,
    "event_id_id" VARCHAR(50),
    "break_length" INTEGER NOT NULL,
    "name" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "ring_id" UUID,

    CONSTRAINT "event_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collegiates_app_competitororder" (
    "id" BIGSERIAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "event_order_id" UUID NOT NULL,
    "competitor_id" UUID NOT NULL,

    CONSTRAINT "collegiates_app_competitororder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ring" (
    "id" UUID NOT NULL,
    "ring_number" INTEGER NOT NULL,
    "settings_id" UUID NOT NULL,

    CONSTRAINT "ring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "colleges_college_name_key" ON "colleges"("college_name");

-- CreateIndex
CREATE UNIQUE INDEX "events_event_name_key" ON "events"("event_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_purpose_idx" ON "verification_tokens"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "registration_competitor_id_comp_year_event_code_key" ON "registration"("competitor_id", "comp_year", "event_code");

-- CreateIndex
CREATE UNIQUE INDEX "groupset_members_groupset_id_member_key" ON "groupset_members"("groupset_id", "member");

-- CreateIndex
CREATE INDEX "event_order_ring_id_idx" ON "event_order"("ring_id");

-- CreateIndex
CREATE UNIQUE INDEX "ring_settings_id_ring_number_key" ON "ring"("settings_id", "ring_number");

-- AddForeignKey
ALTER TABLE "competitor_profile" ADD CONSTRAINT "competitor_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_profile" ADD CONSTRAINT "competitor_profile_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "colleges"("college_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "college_profile" ADD CONSTRAINT "college_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "college_profile" ADD CONSTRAINT "college_profile_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("college_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration" ADD CONSTRAINT "registration_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitor_profile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration" ADD CONSTRAINT "registration_event_code_fkey" FOREIGN KEY ("event_code") REFERENCES "events"("event_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupset" ADD CONSTRAINT "groupset_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "colleges"("college_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupset_members" ADD CONSTRAINT "groupset_members_groupset_id_fkey" FOREIGN KEY ("groupset_id") REFERENCES "groupset"("groupset_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupset_members" ADD CONSTRAINT "groupset_members_member_fkey" FOREIGN KEY ("member") REFERENCES "competitor_profile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_order" ADD CONSTRAINT "event_order_event_id_id_fkey" FOREIGN KEY ("event_id_id") REFERENCES "events"("event_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_order" ADD CONSTRAINT "event_order_ring_id_fkey" FOREIGN KEY ("ring_id") REFERENCES "ring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collegiates_app_competitororder" ADD CONSTRAINT "collegiates_app_competitororder_event_order_id_fkey" FOREIGN KEY ("event_order_id") REFERENCES "event_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collegiates_app_competitororder" ADD CONSTRAINT "collegiates_app_competitororder_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitor_profile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ring" ADD CONSTRAINT "ring_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
