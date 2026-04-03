const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddUserDepartmentRole1743660000000 {
  name = 'AddUserDepartmentRole1743660000000';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE \`User\` ADD COLUMN \`Department\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`User\` ADD COLUMN \`Role\` varchar(255)`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE \`User\` DROP COLUMN \`Role\``);
    await queryRunner.query(`ALTER TABLE \`User\` DROP COLUMN \`Department\``);
  }
};
