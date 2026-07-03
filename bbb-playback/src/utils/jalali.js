const jalaliFormatter = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const formatJalaliDate = (timestampMs) => {
  if (!timestampMs) return '';

  return jalaliFormatter.format(new Date(timestampMs));
};

export default formatJalaliDate;
