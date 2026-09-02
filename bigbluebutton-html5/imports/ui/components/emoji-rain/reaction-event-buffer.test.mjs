import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadBuffer = async () => {
  const sourceUrl = new URL('./reaction-event-buffer.js', import.meta.url);
  const source = await readFile(sourceUrl, 'utf8');
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(moduleUrl);
};

const reaction = (eventId, userId, emoji, timestamp) => ({
  eventId,
  userId,
  reaction: emoji,
  creationDate: new Date(timestamp),
});

const run = async () => {
  const {
    keepLatestReactionPerUser,
    replaceActiveReactionsByUser,
  } = await loadBuffer();

  const firstHeart = reaction('heart-1', 'user-1', '❤️', 1000);
  const secondHeart = reaction('heart-2', 'user-1', '❤️', 2000);
  const thumbsUp = reaction('like-1', 'user-1', '👍', 3000);
  const otherUser = reaction('heart-3', 'user-2', '❤️', 2500);

  assert.deepEqual(
    keepLatestReactionPerUser([firstHeart, secondHeart]),
    [secondHeart],
  );
  assert.deepEqual(
    keepLatestReactionPerUser([firstHeart, secondHeart, thumbsUp, otherUser]),
    [otherUser, thumbsUp],
  );
  assert.deepEqual(
    replaceActiveReactionsByUser([firstHeart, otherUser], [secondHeart], 10),
    [otherUser, secondHeart],
  );
  assert.deepEqual(
    replaceActiveReactionsByUser([secondHeart, otherUser], [thumbsUp], 10),
    [otherUser, thumbsUp],
  );
};

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
