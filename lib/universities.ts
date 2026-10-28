// University pick-list; codes are validated server-side, so keep them in sync with the SQL.
export const UNIVERSITIES: { code: string; name: string }[] = [
  { code: 'qu', name: 'جامعة قطر' },
  { code: 'hbku', name: 'جامعة حمد بن خليفة' },
  { code: 'tamuq', name: 'جامعة تكساس إيه آند إم في قطر' },
  { code: 'cmuq', name: 'جامعة كارنيجي ميلون في قطر' },
  { code: 'gu-q', name: 'جامعة جورجتاون في قطر' },
  { code: 'nu-q', name: 'جامعة نورثويسترن في قطر' },
  { code: 'wcm-q', name: 'وايل كورنيل للطب في قطر' },
  { code: 'vcuarts-q', name: 'جامعة فرجينيا كومنولث في قطر' },
  { code: 'udst', name: 'جامعة الدوحة للعلوم والتكنولوجيا' },
  { code: 'dohainstitute', name: 'معهد الدوحة للدراسات العليا' },
  { code: 'lusail', name: 'جامعة لوسيل' },
  { code: 'other', name: 'أخرى' },
];

export function universityName(code: string | null | undefined): string {
  if (!code) return '';
  return UNIVERSITIES.find((u) => u.code === code)?.name ?? code;
}
