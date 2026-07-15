export const normalizeLobbyMessage = (message: string | null | undefined): string | null => {
  if (!message) return null;
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * The guest subscription exposes a coalesced lobby message where the user's private
 * message takes precedence over the meeting-wide broadcast. Reconstruct both so
 * waiting guests can see public and private messages together.
 */
export const resolveGuestLobbyMessages = (
  coalescedMessage: string | null | undefined,
  publicMessage: string | null | undefined,
) => {
  const coalesced = normalizeLobbyMessage(coalescedMessage);
  const broadcast = normalizeLobbyMessage(publicMessage);

  if (!coalesced && !broadcast) {
    return { privateMessage: null, publicMessage: null };
  }

  if (!broadcast) {
    return { privateMessage: coalesced, publicMessage: null };
  }

  if (!coalesced) {
    return { privateMessage: null, publicMessage: broadcast };
  }

  if (coalesced === broadcast) {
    return { privateMessage: null, publicMessage: broadcast };
  }

  return { privateMessage: coalesced, publicMessage: broadcast };
};
