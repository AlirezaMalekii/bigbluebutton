import React from 'react';
import { useUnreadPrivateChatsBySenderSync } from '/imports/ui/core/hooks/useUnreadPrivateChatsBySender';

const UnreadPrivateChatsSync: React.FC = () => {
  useUnreadPrivateChatsBySenderSync();
  return null;
};

export default UnreadPrivateChatsSync;
