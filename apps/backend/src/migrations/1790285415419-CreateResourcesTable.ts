import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateResourcesTable1790285415419 implements MigrationInterface {
    name = 'CreateResourcesTable1790285415419'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."resources_county_enum" RENAME TO "resources_county_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."resources_county_enum" AS ENUM('Suffolk', 'Middlesex', 'Norfolk', 'Essex', 'Worcester', 'Plymouth', 'Hampden', 'Hampshire', 'Berkshire', 'Barnstable', 'Bristol', 'Dukes', 'Nantucket', 'Franklin')`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "county" TYPE "public"."resources_county_enum" USING "county"::"text"::"public"."resources_county_enum"`);
        await queryRunner.query(`DROP TYPE "public"."resources_county_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."resources_county_enum_old" AS ENUM('Suffolk', 'Middlesex', 'Norfolk', 'Essex', 'Worcester', 'Plymouth', 'Hampden', 'Hampshire', 'Berkshire', 'Barnstable', 'Bristol', 'Dukes', 'Nantucket')`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "county" TYPE "public"."resources_county_enum_old" USING "county"::"text"::"public"."resources_county_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."resources_county_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."resources_county_enum_old" RENAME TO "resources_county_enum"`);
    }

}
