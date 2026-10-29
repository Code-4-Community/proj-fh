import { MigrationInterface, QueryRunner } from 'typeorm';

export class add_tag_entity1789479716330 implements MigrationInterface {
  name = 'add_tag_entity1789479716330';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tags_category_enum" AS ENUM('food_service_type', 'food_type', 'nutrition_program', 'access_requirement', 'housing_service_type', 'population_focus', 'price', 'eligibility_scope', 'accepts_ebt', 'transportation', 'language', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tags" ("tag_id" integer NOT NULL, "category" "public"."tags_category_enum" NOT NULL, "label" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, CONSTRAINT "PK_06a35221325edeb80ad2ec1ff85" PRIMARY KEY ("tag_id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TYPE "public"."tags_category_enum"`);
  }
}
