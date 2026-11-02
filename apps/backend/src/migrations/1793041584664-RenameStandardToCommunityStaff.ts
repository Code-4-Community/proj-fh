import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameStandardToCommunityStaff1793041584664 implements MigrationInterface {
  name = 'RenameStandardToCommunityStaff1793041584664';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "status" = 'COMMUNITY_STAFF' WHERE "status" = 'STANDARD'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "status" = 'STANDARD' WHERE "status" = 'COMMUNITY_STAFF'`,
    );
  }
}