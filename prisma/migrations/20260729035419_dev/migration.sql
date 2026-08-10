-- DropForeignKey
ALTER TABLE "collegiates_app_competitororder" DROP CONSTRAINT "collegiates_app_competitororder_competitor_id_fkey";

-- DropForeignKey
ALTER TABLE "groupset_members" DROP CONSTRAINT "groupset_members_member_fkey";

-- DropForeignKey
ALTER TABLE "registration" DROP CONSTRAINT "registration_competitor_id_fkey";

-- AddForeignKey
ALTER TABLE "registration" ADD CONSTRAINT "registration_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitor_profile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupset_members" ADD CONSTRAINT "groupset_members_member_fkey" FOREIGN KEY ("member") REFERENCES "competitor_profile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collegiates_app_competitororder" ADD CONSTRAINT "collegiates_app_competitororder_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitor_profile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
