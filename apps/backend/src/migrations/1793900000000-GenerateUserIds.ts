import { MigrationInterface, QueryRunner } from 'typeorm';

export class GenerateUserIds1793900000000 implements MigrationInterface {
  name = 'GenerateUserIds1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE "users_id_seq" OWNED BY "users"."id"`,
    );
    // Start after the highest existing id so new rows never collide.
    await queryRunner.query(
      `SELECT setval('"users_id_seq"', COALESCE((SELECT MAX("id") FROM "users"), 0) + 1, false)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT nextval('"users_id_seq"')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(`DROP SEQUENCE "users_id_seq"`);
  }
}
