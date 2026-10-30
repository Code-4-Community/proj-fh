import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSentBackForReviewStatus1793800000000 implements MigrationInterface {
  name = 'RemoveSentBackForReviewStatus1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "resources" SET "review_status" = 'needs_changes' WHERE "review_status" = 'sent_back_for_review'`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "review_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."review_status" RENAME TO "review_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."review_status" AS ENUM('pending_review', 'approved_published', 'rejected', 'archived', 'needs_changes')`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "review_status" TYPE "public"."review_status" USING "review_status"::"text"::"public"."review_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "review_status" SET DEFAULT 'pending_review'`,
    );
    await queryRunner.query(`DROP TYPE "public"."review_status_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "review_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."review_status" RENAME TO "review_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."review_status" AS ENUM('pending_review', 'approved_published', 'rejected', 'archived', 'sent_back_for_review', 'needs_changes')`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "review_status" TYPE "public"."review_status" USING "review_status"::"text"::"public"."review_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ALTER COLUMN "review_status" SET DEFAULT 'pending_review'`,
    );
    await queryRunner.query(`DROP TYPE "public"."review_status_old"`);
  }
}
