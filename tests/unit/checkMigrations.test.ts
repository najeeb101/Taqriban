import { describe, expect, it } from 'vitest';
import { checkMigrations } from '../../scripts/check-migrations';

const base = {
  '20261030000001_a.sql': 'h1',
  '20261030000002_b.sql': 'h2',
};

describe('checkMigrations', () => {
  it('passes when nothing changed', () => {
    expect(checkMigrations(base, { ...base }).ok).toBe(true);
  });

  it('passes when only newer migrations are added', () => {
    const r = checkMigrations(base, { ...base, '20261030000003_c.sql': 'h3', '20261031000001_d.sql': 'h4' });
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it('fails when a base migration is modified', () => {
    const r = checkMigrations(base, { ...base, '20261030000002_b.sql': 'changed' });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('20261030000002_b.sql');
    expect(r.errors[0]).toContain('modified');
    expect(r.errors[0]).toContain('add a new migration instead');
  });

  it('fails when a base migration is deleted', () => {
    const r = checkMigrations(base, { '20261030000001_a.sql': 'h1' });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('deleted or renamed');
  });

  it('fails when a base migration is renamed', () => {
    const r = checkMigrations(base, { '20261030000001_a.sql': 'h1', '20261030000009_b_renamed.sql': 'h2' });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('20261030000002_b.sql') && e.includes('deleted or renamed'))).toBe(true);
  });

  it('fails when a new migration is not later than the newest at the base', () => {
    const r = checkMigrations(base, { ...base, '20261029000009_old.sql': 'x' });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('not later than');
  });

  it('fails when a new migration reuses the newest timestamp', () => {
    const r = checkMigrations(base, { ...base, '20261030000002_other.sql': 'x' });
    expect(r.ok).toBe(false);
  });

  it('reports every problem', () => {
    const r = checkMigrations(base, { '20261030000001_a.sql': 'zzz', '20260101000001_early.sql': 'x' });
    expect(r.errors).toHaveLength(3);
  });

  it('accepts anything when the base has no migrations', () => {
    expect(checkMigrations({}, { '20261030000001_a.sql': 'h' }).ok).toBe(true);
  });
});
