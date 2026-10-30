import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient, cleanupAll, newAccountUser, newUser, ok, playAll, purgeFixtures, puzzleAt, rpc, svc, type FixturePuzzle, type TestUser,
} from './helpers';

let t: FixturePuzzle;
let adminId: string;
let admin: TestUser;

beforeAll(async () => {
  await purgeFixtures();
  t = await puzzleAt(0);
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.invalid`;
  const password = `pw-${Math.random().toString(36).slice(2)}-X1`;
  const { data: created, error: cErr } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (cErr || !created.user) throw cErr ?? new Error('createUser failed');
  adminId = created.user.id;
  const { error: aErr } = await svc.from('admins').insert({ email });
  if (aErr) throw aErr;
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  admin = { id: adminId, client };
});
afterAll(async () => {
  await svc.auth.admin.deleteUser(adminId);
  await cleanupAll();
});

describe('admin dashboard: account conversion', () => {
  it('is admin-only', async () => {
    const u = await newAccountUser();
    expect((await rpc(u, 'admin_dashboard')).error?.message).toBe('forbidden');
  });

  it('counts new accounts and guests who played', async () => {
    const before = await ok(admin, 'admin_dashboard');
    expect(before.kpis).toEqual(expect.objectContaining({
      accounts_new_today: expect.any(Number), accounts_new_7d: expect.any(Number), guests_played: expect.any(Number),
      players_played: expect.any(Number), players_with_email: expect.any(Number),
    }));
    expect(before.activity).toHaveLength(14);
    expect(before.activity.at(-1)).toEqual(expect.objectContaining({ new_accounts: expect.any(Number) }));

    const guest = await newUser();
    await playAll(guest, t, 2);
    const acct = await newAccountUser();
    await playAll(acct, t, 2);
    await newAccountUser(); // account that never played

    const after = await ok(admin, 'admin_dashboard');
    expect(after.kpis.players_played - before.kpis.players_played).toBe(2);
    expect(after.kpis.guests_played - before.kpis.guests_played).toBe(1);
    expect(after.kpis.accounts_new_today - before.kpis.accounts_new_today).toBe(2);
    expect(after.kpis.accounts_new_7d - before.kpis.accounts_new_7d).toBe(2);
    expect(after.activity.at(-1).new_accounts - before.activity.at(-1).new_accounts).toBe(2);
    expect(after.activity.at(-1).day).toBe(after.today);

    // A guest linking an email becomes an account: guests_played drops back.
    const { error } = await svc.auth.admin.updateUserById(guest.id, { email: `link-${Date.now()}@test.invalid`, email_confirm: true });
    expect(error).toBeNull();
    const linked = await ok(admin, 'admin_dashboard');
    expect(linked.kpis.guests_played).toBe(before.kpis.guests_played);
  });
});
