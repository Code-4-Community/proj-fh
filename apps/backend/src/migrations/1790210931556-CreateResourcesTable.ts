import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateResourcesTable1790210931556 implements MigrationInterface {
    name = 'CreateResourcesTable1790210931556'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."resources_category_enum" AS ENUM('food_access', 'housing', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."resources_county_enum" AS ENUM('Suffolk', 'Middlesex', 'Norfolk', 'Essex', 'Worcester', 'Plymouth', 'Hampden', 'Hampshire', 'Berkshire', 'Barnstable', 'Bristol', 'Dukes', 'Nantucket')`);
        await queryRunner.query(`CREATE TABLE "resources" ("resource_id" SERIAL NOT NULL, "score_id" integer NOT NULL, "name" character varying(255) NOT NULL, "category" "public"."resources_category_enum" array NOT NULL, "description" text, "address" character varying(255), "county" "public"."resources_county_enum" NOT NULL, "zip_code" character varying(10) NOT NULL, "phone" character varying(20), "email" character varying(255), "website" character varying(255), "eligibility" text, "last_verified_date" date NOT NULL, "vetting_status" character varying(255) NOT NULL, "reviewer_notes" text, "tags" integer array NOT NULL DEFAULT '{}', CONSTRAINT "PK_b9fa5542581d6107e9bf2f49ac0" PRIMARY KEY ("resource_id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "resources"`);
        await queryRunner.query(`DROP TYPE "public"."resources_county_enum"`);
        await queryRunner.query(`DROP TYPE "public"."resources_category_enum"`);
    }

}
