import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResourcesTagsScores1793500000000 implements MigrationInterface {
  name = 'CreateResourcesTagsScores1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the legacy tags/resources tables (no data to preserve) and their enums
    await queryRunner.query(`DROP TABLE "resources"`);
    await queryRunner.query(`DROP TYPE "public"."resources_county_enum"`);
    await queryRunner.query(`DROP TYPE "public"."resources_category_enum"`);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TYPE "public"."tags_category_enum"`);

    await queryRunner.query(
      `CREATE TYPE "public"."tag_group" AS ENUM('population', 'intake_process', 'required_documentation', 'contact_method', 'red_flag', 'food_assistance_type', 'food_type', 'pricing', 'frequency', 'estimated_wait_time', 'housing_service_type', 'accessibility', 'cultural_competency', 'program_observation')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tag_category" AS ENUM('food_access', 'housing', 'other', 'common')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."category" AS ENUM('food_access', 'housing', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."county" AS ENUM('Suffolk', 'Middlesex', 'Norfolk', 'Essex', 'Worcester', 'Plymouth', 'Hampden', 'Hampshire', 'Berkshire', 'Barnstable', 'Bristol', 'Dukes', 'Nantucket', 'Franklin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."public_field" AS ENUM('website', 'phone', 'email', 'address')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."response_time" AS ENUM('same_day', '1_3_days', '1_week_plus', 'no_response')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."yes_no_maybe" AS ENUM('yes', 'no', 'maybe')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."review_status" AS ENUM('pending_review', 'approved_published', 'rejected', 'archived', 'sent_back_for_review', 'needs_changes')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."recommendation" AS ENUM('strongly_recommend', 'recommend_minor_concerns', 'recommend_with_caution', 'not_recommended', 'needs_review')`,
    );

    await queryRunner.query(
      `CREATE TABLE "scores" ("score_id" SERIAL NOT NULL, "overall_rating" smallint NOT NULL, CONSTRAINT "CHK_scores_overall_rating" CHECK ("overall_rating" BETWEEN 1 AND 5), CONSTRAINT "PK_scores_score_id" PRIMARY KEY ("score_id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "tags" ("tag_id" SERIAL NOT NULL, "category" "public"."tag_category" NOT NULL, "group" "public"."tag_group" NOT NULL, "label" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "allows_free_text" boolean NOT NULL DEFAULT false, "is_custom" boolean NOT NULL DEFAULT false, "other_text" text, CONSTRAINT "UQ_tags_group_slug" UNIQUE ("group", "slug"), CONSTRAINT "CHK_tags_other_text" CHECK (("other_text" IS NOT NULL) = "is_custom"), CONSTRAINT "PK_tags_tag_id" PRIMARY KEY ("tag_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tags_category" ON "tags" ("category")`,
    );

    await queryRunner.query(
      `CREATE TABLE "resources" ("resource_id" SERIAL NOT NULL, "score_id" integer NOT NULL, "organization_name" character varying(255) NOT NULL, "program_name" character varying(255) NOT NULL, "category" "public"."category" NOT NULL, "address" character varying(255), "county" "public"."county" NOT NULL, "zip_code" character varying(10) NOT NULL, "phone" character varying(20), "email" character varying(255), "website" character varying(255), "public_fields" "public"."public_field" array NOT NULL DEFAULT '{}', "eligibility" text, "review_status" "public"."review_status" NOT NULL DEFAULT 'pending_review', "last_verified_date" date NOT NULL, "completed_by" character varying(255) NOT NULL, "outreach_date" date NOT NULL, "staff_contact_name" character varying(255) NOT NULL, "staff_contact_role" character varying(255) NOT NULL, "responsiveness" smallint NOT NULL, "response_time" "public"."response_time" NOT NULL, "interaction_notes" text NOT NULL, "accessibility_notes" text NOT NULL, "program_notes" text, "red_flag_concerns" text NOT NULL, "can_refer_directly" boolean NOT NULL, "has_referral_contact" boolean NOT NULL, "referral_contact" character varying(255), "provides_followup" boolean NOT NULL, "referral_realistic" "public"."yes_no_maybe" NOT NULL, "referral_notes" text NOT NULL, "recommendation" "public"."recommendation" NOT NULL, "strengths" text NOT NULL, "followup_needed" text NOT NULL, "needs_changes_notes" text, "submission_rejection_notes" text, "tags" integer array NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_resources_responsiveness" CHECK ("responsiveness" BETWEEN 1 AND 5), CONSTRAINT "PK_resources_resource_id" PRIMARY KEY ("resource_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_resources_category" ON "resources" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_resources_county" ON "resources" ("county")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_resources_zip_code" ON "resources" ("zip_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_resources_zip_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_resources_county"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_resources_category"`);
    await queryRunner.query(`DROP TABLE "resources"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tags_category"`);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TABLE "scores"`);
    await queryRunner.query(`DROP TYPE "public"."recommendation"`);
    await queryRunner.query(`DROP TYPE "public"."review_status"`);
    await queryRunner.query(`DROP TYPE "public"."yes_no_maybe"`);
    await queryRunner.query(`DROP TYPE "public"."response_time"`);
    await queryRunner.query(`DROP TYPE "public"."public_field"`);
    await queryRunner.query(`DROP TYPE "public"."county"`);
    await queryRunner.query(`DROP TYPE "public"."category"`);
    await queryRunner.query(`DROP TYPE "public"."tag_category"`);
    await queryRunner.query(`DROP TYPE "public"."tag_group"`);

    // Recreate the legacy structure (data and tag seeds are not restored)
    await queryRunner.query(
      `CREATE TYPE "public"."tags_category_enum" AS ENUM('food_service_type', 'food_type', 'nutrition_program', 'access_requirement', 'housing_service_type', 'population_focus', 'price', 'eligibility_scope', 'accepts_ebt', 'transportation', 'language', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tags" ("tag_id" integer NOT NULL, "category" "public"."tags_category_enum" NOT NULL, "label" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, CONSTRAINT "PK_06a35221325edeb80ad2ec1ff85" PRIMARY KEY ("tag_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."resources_category_enum" AS ENUM('food_access', 'housing', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."resources_county_enum" AS ENUM('Suffolk', 'Middlesex', 'Norfolk', 'Essex', 'Worcester', 'Plymouth', 'Hampden', 'Hampshire', 'Berkshire', 'Barnstable', 'Bristol', 'Dukes', 'Nantucket', 'Franklin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "resources" ("resource_id" SERIAL NOT NULL, "score_id" integer NOT NULL, "name" character varying(255) NOT NULL, "category" "public"."resources_category_enum" array NOT NULL, "description" text, "address" character varying(255), "county" "public"."resources_county_enum" NOT NULL, "zip_code" character varying(10) NOT NULL, "phone" character varying(20), "email" character varying(255), "website" character varying(255), "eligibility" text, "last_verified_date" date NOT NULL, "vetting_status" character varying(255) NOT NULL, "reviewer_notes" text, "tags" integer array NOT NULL DEFAULT '{}', CONSTRAINT "PK_b9fa5542581d6107e9bf2f49ac0" PRIMARY KEY ("resource_id"))`,
    );
  }
}
