const getVisibleMessages = (messages = [], currentIndex = -1) => (
  messages.slice(0, Math.max(currentIndex + 1, 0))
);

export { getVisibleMessages };
