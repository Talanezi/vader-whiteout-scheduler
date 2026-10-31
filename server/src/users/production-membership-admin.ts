import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import Dbconfig from '../dbconfig/dbconfig.entity';
import {
  membershipKey,
  validTeamAssignment,
  MembershipIdentity,
} from './production-membership';

/** Administrative operation: callable only by code with Scheduler database credentials. */
export async function manageProductionMembership(
  db: DataSource,
  input: {
    action: 'verify' | 'revoke';
    email: string;
    department?: string;
    role?: string;
    actor: string;
    evidence: string;
  },
) {
  if (
    !['verify', 'revoke'].includes(input.action) ||
    !input.email?.trim() ||
    !input.actor?.trim() ||
    !input.evidence?.trim()
  )
    throw new Error(
      'Action, account email, operator identity and independent membership evidence are required.',
    );
  if (
    input.action === 'verify' &&
    !validTeamAssignment(input.department || '', input.role || '')
  )
    throw new Error('Use an exact Scheduler department/role assignment.');
  return db.transaction(async (manager) => {
    const escape = (name: string) =>
      db.driver.escape(db.namingStrategy.columnName(name, '', []));
    const users = await manager
      .createQueryBuilder()
      .select(escape('ID'), 'ID')
      .addSelect(escape('Email'), 'Email')
      .addSelect(escape('Department'), 'Department')
      .addSelect(escape('Role'), 'Role')
      .from(db.namingStrategy.tableName('User', undefined), 'account')
      .where(`LOWER(${escape('Email')}) = :email`, {
        email: input.email.trim().toLowerCase(),
      })
      .getRawMany<MembershipIdentity>();
    if (users.length !== 1)
      throw new Error(
        'Exactly one existing Scheduler account must match the email.',
      );
    const user = users[0];
    user.ID = Number(user.ID);
    if (!Number.isSafeInteger(user.ID) || user.ID <= 0) throw new Error('Invalid Scheduler account identity.');
    if (
      input.action === 'verify' &&
      (user.Department !== input.department || user.Role !== input.role)
    )
      throw new Error(
        'The verified assignment must match the account profile. Correct the identity before verifying it.',
      );
    const repo = manager.getRepository(Dbconfig);
    const key = membershipKey(user.ID),
      previous = await repo.findOneBy({ Key: key });
    const record = {
      version: 1,
      status: input.action === 'verify' ? 'verified' : 'revoked',
      userID: user.ID,
      email: user.Email.toLowerCase(),
      department: user.Department,
      role: user.Role,
      verifiedAt: new Date().toISOString(),
      verifiedBy: input.actor.trim(),
      evidence: input.evidence.trim(),
    };
    await repo.save({
      Key: `production-team-audit:v1:${randomUUID()}`,
      Value: JSON.stringify({ previous: previous?.Value || null, record }),
    });
    await repo.save({ Key: key, Value: JSON.stringify(record) });
    return { userID: user.ID, status: record.status };
  });
}
