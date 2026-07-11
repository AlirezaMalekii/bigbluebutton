import React from 'react';

function isRtlLocale(intl) {
  const locale = intl?.locale || '';
  const lang = locale.split(/[-_]/)[0];
  return lang === 'fa' || lang === 'ar';
}

function getDateParts(intl, value) {
  const formatter = new Intl.DateTimeFormat(intl.locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return Object.fromEntries(
    formatter.formatToParts(new Date(value))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
}

function formatTime(intl, value) {
  return intl.formatTime(new Date(value), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Date only, e.g. «۲۰ تیر ۱۴۰۵» for fa-IR.
 */
export function formatLearningDashboardDate(intl, value) {
  if (!value || value <= 0) return '';

  if (isRtlLocale(intl)) {
    const { day, month, year } = getDateParts(intl, value);
    return `${day} ${month} ${year}`;
  }

  return intl.formatDate(new Date(value), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Time then date, e.g. «۱۴:۳۳ ۲۰ تیر ۱۴۰۵» for fa-IR.
 */
export function formatLearningDashboardDateTime(intl, value) {
  if (!value || value <= 0) return '';

  if (isRtlLocale(intl)) {
    const { day, month, year } = getDateParts(intl, value);
    return `${formatTime(intl, value)} ${day} ${month} ${year}`;
  }

  return intl.formatDate(new Date(value), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Wraps fa/ar datetime in dir=ltr so RTL page layout does not reorder parts.
 */
export function LearningDashboardDateTime({ intl, value }) {
  const text = formatLearningDashboardDateTime(intl, value);
  if (!text) return null;

  if (isRtlLocale(intl)) {
    return <span dir="ltr">{text}</span>;
  }

  return text;
}

/**
 * Wraps fa/ar date in dir=ltr so RTL page layout does not reorder parts.
 */
export function LearningDashboardDate({ intl, value }) {
  const text = formatLearningDashboardDate(intl, value);
  if (!text) return null;

  if (isRtlLocale(intl)) {
    return <span dir="ltr">{text}</span>;
  }

  return text;
}
