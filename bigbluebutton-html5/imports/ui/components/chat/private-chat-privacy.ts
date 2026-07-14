import { useIsSharing } from '/imports/ui/components/screenshare/service';

const getPublicChatIds = (): { publicId: string; publicGroupId: string } => {
  const chatConfig = window.meetingClientSettings.public.chat;
  return {
    publicId: chatConfig.public_id,
    publicGroupId: chatConfig.public_group_id,
  };
};

export const isPrivateChatId = (chatId: string): boolean => {
  const { publicId, publicGroupId } = getPublicChatIds();
  return chatId !== publicId && chatId !== publicGroupId;
};

export const useShouldSuppressPrivateChatAlerts = (): boolean => useIsSharing();
