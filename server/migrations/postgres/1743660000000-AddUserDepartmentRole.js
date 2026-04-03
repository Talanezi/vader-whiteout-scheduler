const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddUserDepartmentRole1743660000000 {
  name = "AddUserDepartmentRole1743660000000";

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "Department" character varying`);
    await queryRunner.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "Role" character varying`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "Role"`);
    await queryRunner.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "Department"`);
  }
};
