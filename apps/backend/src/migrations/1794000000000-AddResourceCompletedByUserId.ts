import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResourceCompletedByUserId1794000000000 implements MigrationInterface {
  name = 'AddResourceCompletedByUserId1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resources" ADD "completed_by_user_id" integer`,
    );
    // SET NULL keeps the resource (and its copied completed_by name) when the submitter is removed.
    await queryRunner.query(
      `ALTER TABLE "resources" ADD CONSTRAINT "FK_resources_completed_by_user_id" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_resources_completed_by_user_id" ON "resources" ("completed_by_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_resources_completed_by_user_id"`);
    await queryRunner.query(
      `ALTER TABLE "resources" DROP CONSTRAINT "FK_resources_completed_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" DROP COLUMN "completed_by_user_id"`,
    );
  }
}
