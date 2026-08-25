/**
 * Lowers every raised hand via the existing per-user mutation path
 * (same as stock Raised Hands panel / user actions).
 */
export const lowerAllRaisedHands = (
  setRaiseHand: (options: {
    variables: { userId: string; raiseHand: boolean };
  }) => unknown,
  userIds: string[],
): void => {
  userIds.forEach((userId) => {
    setRaiseHand({
      variables: {
        userId,
        raiseHand: false,
      },
    });
  });
};

export default lowerAllRaisedHands;
