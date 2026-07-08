import React, { useRef } from 'react';
import EmojiRain from './component';
import StageReactionOverlay from './stage-reaction-overlay';
import { getEmojisToRain } from './queries';
import useDeduplicatedSubscription from '../../core/hooks/useDeduplicatedSubscription';

const EmojiRainContainer = () => {
  const nowDate = useRef(new Date().toUTCString());

  const {
    data: emojisToRainData,
  } = useDeduplicatedSubscription(getEmojisToRain, {
    variables: {
      initialCursor: nowDate.current,
    },
  });
  const emojisArray = emojisToRainData?.user_reaction_stream || [];

  const reactions = emojisArray.length === 0 ? []
    : emojisArray.map((reaction) => ({
      reaction: reaction.reactionEmoji,
      creationDate: new Date(reaction.createdAt),
      userId: reaction.userId,
      userName: reaction.user?.name || '',
    }));

  return (
    <>
      <EmojiRain reactions={reactions} />
      <StageReactionOverlay reactions={reactions} />
    </>
  );
};

export default EmojiRainContainer;
