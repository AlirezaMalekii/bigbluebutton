function isRtlLocale(intl) {
  const locale = intl?.locale || '';
  const lang = locale.split(/[-_]/)[0];
  return lang === 'fa' || lang === 'ar';
}

/**
 * Date only, e.g. «۲۰ تیر ۱۴۰۵» for fa-IR.
 */
export function formatLearningDashboardDate(intl, value) {
  if (!value || value <= 0) return '';

  return intl.formatDate(new Date(value), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Time then date in one visual block, e.g. «۱۳:۵۱ ۲۰ تیر ۱۴۰۵» for fa-IR.
 * Uses LTR isolate so RTL page layout does not reorder day vs. time.
 */
export function formatLearningDashboardDateTime(intl, value) {
  if (!value || value <= 0) return '';

  const dateValue = new Date(value);

  if (isRtlLocale(intl)) {
    const time = intl.formatTime(dateValue, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const datePart = intl.formatDate(dateValue, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `\u2066${time} ${datePart}\u2069`;
  }

  return intl.formatDate(dateValue, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
