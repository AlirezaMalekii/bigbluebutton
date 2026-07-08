import React, { useEffect, useRef } from 'react';
import EmojiRain from './component';
import StageReactionOverlay from './stage-reaction-overlay';
import { getEmojisToRain } from './queries';
import { normalizeReactionStream, reactionStreamVar } from './reaction-stream';
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

  const reactions = normalizeReactionStream(emojisArray);

  useEffect(() => {
    reactionStreamVar(reactions);
  }, [reactions]);

  return (
    <>
      <EmojiRain reactions={reactions} />
      <StageReactionOverlay reactions={reactions} />
    </>
  );
};

export default EmojiRainContainer;
