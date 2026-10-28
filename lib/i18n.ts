// `t` is the merged Arabic string table ({ common, game, social }); `fmt` fills {x} placeholders.
import { t } from '@/i18n/ar';

export { t };
export { categoryLabel } from '@/i18n/ar';

export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Friendly Arabic message for an ApiError code (falls back to the generic message). */
export function errorMessage(code: string | undefined): string {
  const errors = t.common.errors as Record<string, string>;
  return (code && errors[code]) || errors.unknown;
}
