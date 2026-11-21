import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1700000000000 implements MigrationInterface {
  name = 'InitialMigration1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(200) NOT NULL UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "full_name" varchar(150) NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'EMPLOYEE',
        "team_id" uuid,
        "manager_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_users_role" CHECK ("role" IN ('EMPLOYEE','MANAGER','ADMIN'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL UNIQUE,
        "description" text,
        "manager_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leave_types" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL UNIQUE,
        "description" text,
        "yearly_allowance" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "color" varchar(20) NOT NULL DEFAULT '#4f46e5',
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_leave_types_allowance" CHECK ("yearly_allowance" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leave_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "employee_id" uuid NOT NULL,
        "leave_type_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "working_days" int NOT NULL,
        "reason" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "comment" text,
        "decided_at" timestamptz,
        "decided_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_leave_requests_dates" CHECK ("end_date" >= "start_date"),
        CONSTRAINT "CHK_leave_requests_working_days" CHECK ("working_days" > 0),
        CONSTRAINT "CHK_leave_requests_status" CHECK ("status" IN ('PENDING','APPROVED','REJECTED','CANCELLED'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leave_balances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "leave_type_id" uuid NOT NULL,
        "year" int NOT NULL,
        "allowance_days" int NOT NULL DEFAULT 0,
        "approved_days" int NOT NULL DEFAULT 0,
        "pending_days" int NOT NULL DEFAULT 0,
        "available_days" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_leave_balance_user_type_year" UNIQUE ("user_id", "leave_type_id", "year"),
        CONSTRAINT "CHK_leave_balance_non_negative" CHECK ("allowance_days" >= 0 AND "approved_days" >= 0 AND "pending_days" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "public_holidays" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "date" date NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "approval_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL,
        "action" varchar(20) NOT NULL,
        "actor_id" uuid,
        "comment" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_approval_history_action" CHECK ("action" IN ('SUBMITTED','APPROVED','REJECTED','CANCELLED'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(100) NOT NULL UNIQUE,
        "value" varchar(500) NOT NULL,
        "description" text,
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" varchar(150) NOT NULL,
        "message" text NOT NULL,
        "type" varchar(20) NOT NULL DEFAULT 'INFO',
        "is_read" boolean NOT NULL DEFAULT false,
        "related_request_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_notifications_type" CHECK ("type" IN ('INFO','SUCCESS','WARNING'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    const foreignKeys = [
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL`,
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_manager" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL`,
      `ALTER TABLE "teams" ADD CONSTRAINT "FK_teams_manager" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL`,
      `ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_requests_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      `ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_requests_type" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT`,
      `ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_requests_decided_by" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL`,
      `ALTER TABLE "leave_balances" ADD CONSTRAINT "FK_balances_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      `ALTER TABLE "leave_balances" ADD CONSTRAINT "FK_balances_type" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE`,
      `ALTER TABLE "approval_history" ADD CONSTRAINT "FK_history_request" FOREIGN KEY ("request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE`,
      `ALTER TABLE "approval_history" ADD CONSTRAINT "FK_history_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL`,
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    ];
    for (const statement of foreignKeys) await queryRunner.query(statement);

    const indexes = [
      `CREATE INDEX "IDX_users_role" ON "users" ("role")`,
      `CREATE INDEX "IDX_users_manager" ON "users" ("manager_id")`,
      `CREATE INDEX "IDX_leave_requests_employee_status" ON "leave_requests" ("employee_id", "status")`,
      `CREATE INDEX "IDX_leave_requests_dates" ON "leave_requests" ("start_date", "end_date")`,
      `CREATE INDEX "IDX_leave_requests_status" ON "leave_requests" ("status")`,
      `CREATE INDEX "IDX_leave_balance_user_year" ON "leave_balances" ("user_id", "year")`,
      `CREATE INDEX "IDX_notifications_user_read" ON "notifications" ("user_id", "is_read")`,
    ];
    for (const statement of indexes) await queryRunner.query(statement);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_refresh_token_hash" ON "refresh_tokens" ("token_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'refresh_tokens',
      'notifications',
      'system_settings',
      'approval_history',
      'leave_balances',
      'leave_requests',
      'leave_types',
      'teams',
      'users',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "public_holidays" CASCADE`);
  }
}
