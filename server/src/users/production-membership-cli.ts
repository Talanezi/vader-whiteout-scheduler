import 'reflect-metadata';
import { DataSource } from 'typeorm';
import ConfigService from '../config/config.service';
import { createDataSourceOptions } from '../database-options-factory';
import Dbconfig from '../dbconfig/dbconfig.entity';
import { manageProductionMembership } from './production-membership-admin';

async function main() {
  const [action, ...args] = process.argv.slice(2),
    values: Record<string, string> = {};
  const allowed = [
    '--email',
    '--department',
    '--role',
    '--actor',
    '--evidence',
  ];
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.includes(args[i]) || !args[i + 1] || values[args[i].slice(2)])
      throw new Error('Invalid or repeated argument.');
    values[args[i].slice(2)] = args[i + 1];
  }
  if (action !== 'verify' && action !== 'revoke')
    throw new Error('Use verify or revoke.');
  const config = new ConfigService();
  const options = createDataSourceOptions(config.get.bind(config), true);
  // No web server, signup, schema synchronization, migrations or email delivery.
  const db = new DataSource({
    ...options,
    logging: false,
    synchronize: false,
    migrationsRun: false,
    migrations: [],
    entities: [Dbconfig],
  });
  await db.initialize();
  try {
    console.log(
      await manageProductionMembership(db, {
        action,
        email: values.email,
        department: values.department,
        role: values.role,
        actor: values.actor,
        evidence: values.evidence,
      }),
    );
  } finally {
    await db.destroy();
  }
}
main().catch(() => {
  console.error(
    'Membership operation failed. Check arguments, account assignment and database configuration.',
  );
  process.exitCode = 1;
});
