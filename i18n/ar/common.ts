// Shared Arabic strings: brand, navigation, generic UI, errors, settings labels.
// Plain object literal; placeholders use {name} and are filled with fmt() from lib/i18n.
export const common = {
  appName: 'تقريباً',
  title: 'تقريباً: لعبة التقدير اليومية',
  tagline: 'ثلاثة أسئلة مستحيلة. تخمينة واحدة لكل سؤال. الأقرب يفوز.',
  description: 'لعبة يومية لتقدير الأرقام: ثلاثة أسئلة مستحيلة، تخمينة واحدة لكل سؤال، والأقرب يفوز.',

  nav: {
    today: 'اليوم',
    archive: 'الأرشيف',
    leaderboard: 'المتصدرون',
    groups: 'مجموعاتي',
    profile: 'ملفي',
    submit: 'اقترح سؤالاً',
    feedback: 'رأيك يهمنا',
    settings: 'الإعدادات',
    menu: 'القائمة',
    closeMenu: 'إغلاق القائمة',
    mainNav: 'التنقل الرئيسي',
    skipToContent: 'انتقل إلى المحتوى',
    home: 'الصفحة الرئيسية',
  },

  actions: {
    close: 'إغلاق',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ',
    retry: 'أعد المحاولة',
    back: 'رجوع',
    next: 'التالي',
    copy: 'انسخ',
    copied: 'تم النسخ',
    share: 'شارك',
    download: 'تنزيل',
    send: 'إرسال',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    done: 'تم',
  },

  status: {
    loading: 'جارٍ التحميل…',
    saving: 'جارٍ الحفظ…',
    saved: 'تم الحفظ',
    empty: 'لا يوجد شيء هنا بعد',
    streakDays: 'سلسلة {n} يوم',
    streakLabel: 'سلسلة أيام اللعب المتتالية',
  },

  errors: {
    title: 'حدث خطأ',
    generic: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    network: 'تعذّر الاتصال بالإنترنت. تحقّق من الاتصال وحاول مرة أخرى.',
    unknown: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    not_authenticated: 'تعذّر التعرّف عليك. أعد تحميل الصفحة وحاول مرة أخرى.',
    invalid_guess: 'أدخل رقماً أكبر من صفر',
    unknown_question: 'لم نجد هذا السؤال.',
    puzzle_not_live: 'هذا اللغز غير متاح بعد.',
    not_completed: 'أكمل أسئلة اللغز أولاً لتشاهد هذا.',
    not_member: 'أنت لست عضواً في هذه المجموعة.',
    not_owner: 'هذا الإجراء متاح لمالك المجموعة فقط.',
    invalid_name: 'هذا الاسم غير مقبول. اختر اسماً من ٢ إلى ٢٤ حرفاً بدون ألفاظ غير لائقة.',
    invalid_input: 'تحقّق من المدخلات وحاول مرة أخرى.',
    invalid_code: 'رمز غير صحيح. تأكد من الرمز وحاول مرة أخرى.',
    rate_limited: 'محاولات كثيرة في وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.',
    not_found: 'لم نعثر على ما تبحث عنه.',
    forbidden: 'هذه الصفحة للمشرفين فقط.',
    account_required: 'أنشئ حساباً ببريدك الإلكتروني لتستخدم هذه الميزة.',
    notFoundPage: 'الصفحة غير موجودة',
    backHome: 'العودة إلى الصفحة الرئيسية',
  },

  theme: {
    label: 'المظهر',
    auto: 'تلقائي',
    light: 'فاتح',
    dark: 'داكن',
  },

  digits: {
    label: 'شكل الأرقام',
    latn: 'غربية (123)',
    arab: 'عربية (١٢٣)',
  },

  motion: {
    reduce: 'تقليل الحركة',
  },

  a11y: {
    toastRegion: 'إشعارات',
    dismiss: 'إخفاء',
    loading: 'جارٍ التحميل',
  },
};
