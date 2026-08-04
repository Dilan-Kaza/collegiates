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
    "event_level" VARCHAR(1),
    "event_category" VARCHAR(1),
    "gender_category" VARCHAR(1),
    "is_nandu" BOOLEAN,

    CONSTRAINT "events_pkey" PRIMARY KEY ("event_code")
);

-- CreateTable
CREATE TABLE "users" (
    "password" VARCHAR(128) NOT NULL,
    "last_login" TIMESTAMPTZ(6),
    "is_superuser" BOOLEAN NOT NULL DEFAULT false,
    "first_name" VARCHAR(150) NOT NULL DEFAULT '',
    "last_name" VARCHAR(150) NOT NULL DEFAULT '',
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "date_joined" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "user_type" VARCHAR(1) NOT NULL DEFAULT 'C',
    "skill_level" VARCHAR(1),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "competitor_profile" (
    "user_id" UUID NOT NULL,
    "gender" VARCHAR(1),
    "school_id" UUID,
    "student_type" VARCHAR(1),
    "is_competing" BOOLEAN NOT NULL DEFAULT false,
    "has_paid" BOOLEAN NOT NULL DEFAULT false,
    "proof_of_reg" BOOLEAN NOT NULL DEFAULT false,
    "last_reg_year" INTEGER,

    CONSTRAINT "competitor_profile_pkey" PRIMARY KEY ("user_id")
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
    "early_reg_cost_first" INTEGER,
    "early_reg_cost_extra" INTEGER,
    "reg_start" TIMESTAMPTZ(6) NOT NULL,
    "reg_end" TIMESTAMPTZ(6) NOT NULL,
    "reg_cost_first" INTEGER NOT NULL,
    "reg_cost_extra" INTEGER NOT NULL,
    "comp_date" DATE,
    "contact_email" VARCHAR(254) NOT NULL,
    "order_public" BOOLEAN NOT NULL DEFAULT false,
    "school_id" UUID NOT NULL,
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
CREATE TABLE "order" (
    "comp_year" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pkey" PRIMARY KEY ("comp_year")
);

-- CreateTable
CREATE TABLE "order_ring1" (
    "id" BIGSERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "eventorder_id" UUID NOT NULL,

    CONSTRAINT "order_ring1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_ring2" (
    "id" BIGSERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "eventorder_id" UUID NOT NULL,

    CONSTRAINT "order_ring2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_ring3" (
    "id" BIGSERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "eventorder_id" UUID NOT NULL,

    CONSTRAINT "order_ring3_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "order_ring1_order_id_eventorder_id_key" ON "order_ring1"("order_id", "eventorder_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_ring2_order_id_eventorder_id_key" ON "order_ring2"("order_id", "eventorder_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_ring3_order_id_eventorder_id_key" ON "order_ring3"("order_id", "eventorder_id");

-- AddForeignKey
ALTER TABLE "competitor_profile" ADD CONSTRAINT "competitor_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_profile" ADD CONSTRAINT "competitor_profile_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "colleges"("college_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration" ADD CONSTRAINT "registration_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration" ADD CONSTRAINT "registration_event_code_fkey" FOREIGN KEY ("event_code") REFERENCES "events"("event_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupset" ADD CONSTRAINT "groupset_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "colleges"("college_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupset_members" ADD CONSTRAINT "groupset_members_groupset_id_fkey" FOREIGN KEY ("groupset_id") REFERENCES "groupset"("groupset_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupset_members" ADD CONSTRAINT "groupset_members_member_fkey" FOREIGN KEY ("member") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "colleges"("college_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_order" ADD CONSTRAINT "event_order_event_id_id_fkey" FOREIGN KEY ("event_id_id") REFERENCES "events"("event_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collegiates_app_competitororder" ADD CONSTRAINT "collegiates_app_competitororder_event_order_id_fkey" FOREIGN KEY ("event_order_id") REFERENCES "event_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collegiates_app_competitororder" ADD CONSTRAINT "collegiates_app_competitororder_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ring1" ADD CONSTRAINT "order_ring1_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("comp_year") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ring1" ADD CONSTRAINT "order_ring1_eventorder_id_fkey" FOREIGN KEY ("eventorder_id") REFERENCES "event_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ring2" ADD CONSTRAINT "order_ring2_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("comp_year") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ring2" ADD CONSTRAINT "order_ring2_eventorder_id_fkey" FOREIGN KEY ("eventorder_id") REFERENCES "event_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ring3" ADD CONSTRAINT "order_ring3_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("comp_year") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ring3" ADD CONSTRAINT "order_ring3_eventorder_id_fkey" FOREIGN KEY ("eventorder_id") REFERENCES "event_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
