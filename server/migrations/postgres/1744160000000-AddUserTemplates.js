module.exports = class AddUserTemplates1744160000000 {
  name = 'AddUserTemplates1744160000000'

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "user_template" (
        "ID" SERIAL NOT NULL,
        "Name" character varying(120) NOT NULL,
        "SlotsJSON" text NOT NULL,
        "UserID" integer NOT NULL,
        "CreatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "UpdatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_template_ID" PRIMARY KEY ("ID")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "user_template"
      ADD CONSTRAINT "FK_user_template_user"
      FOREIGN KEY ("UserID") REFERENCES "user"("ID")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "user_template"
      DROP CONSTRAINT "FK_user_template_user"
    `);
    await queryRunner.query(`DROP TABLE "user_template"`);
  }
}
