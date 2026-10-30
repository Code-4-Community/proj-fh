import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTagActiveAndSortOrder1793600000000 implements MigrationInterface {
  name = 'RemoveTagActiveAndSortOrder1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tags" DROP COLUMN "sort_order"`);
    await queryRunner.query(`ALTER TABLE "tags" DROP COLUMN "is_active"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tags" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ADD "sort_order" integer NOT NULL DEFAULT '0'`,
    );
  }
}
