import React from 'react';
import Styled from './styles';

interface ChatMessageTextContentProps {
  text: string;
  dataTest?: string | null;
}

const stripHtml = (html: string): string => (
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
);

const EMOJI_ONLY_PATTERN = new RegExp(
  '^(?:\\p{Extended_Pictographic}|\\p{Emoji_Modifier}'
    + '|[\\u{1F1E6}-\\u{1F1FF}]|\\u200D|\\uFE0E|\\uFE0F|\\s)+$',
  'u',
);

const isEmojiOnlyMessage = (html: string): boolean => {
  const content = stripHtml(html);
  if (!content) return false;

  return EMOJI_ONLY_PATTERN.test(content);
};

const ChatMessageTextContent: React.FC<ChatMessageTextContentProps> = ({
  text,
  dataTest = 'messageContent',
}) => {
  const emojiOnly = isEmojiOnlyMessage(text);
  const isRtlDocument = typeof document !== 'undefined'
    && document.documentElement?.dir === 'rtl';

  return (
    <Styled.ChatMessage
      className={emojiOnly ? 'chat-message-emoji-only' : undefined}
      dir={emojiOnly && isRtlDocument ? 'rtl' : 'auto'}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: text }}
      data-test={dataTest}
    />
  );
};
export default ChatMessageTextContent;
