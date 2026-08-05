import React from 'react';
import { date as config } from 'config';
import storage from 'utils/data/storage';
import formatJalaliDate from 'utils/jalali';

const RecordingDate = () => {
  if (!config.enabled) return null;

  const start = Number(storage.metadata.start);
  if (!Number.isFinite(start)) return null;

  return (
    <time className="recording-date" dateTime={new Date(start).toISOString()}>
      {formatJalaliDate(start)}
    </time>
  );
};

export default RecordingDate;
