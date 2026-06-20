/**
 * Skyroom chat "stickers" — a curated set of popular unicode emoji shown in a
 * quick-pick panel beside the composer. Picking one inserts the emoji as plain
 * text (reusing the chat form's handleEmojiSelect), so it renders everywhere and
 * needs no server-side image support.
 */
export const SKYROOM_POPULAR_EMOJI: readonly string[] = [
  '😀', '😂', '😍', '😎', '🤔', '😉',
  '😢', '😡', '😴', '🥳', '😱', '🤩',
  '👍', '👎', '👏', '🙏', '🙌', '💪',
  '❤️', '🔥', '🎉', '💯', '✅', '👌',
];

export default SKYROOM_POPULAR_EMOJI;
