import React from 'react';
import Styled from './styles';
import { User, VideoItem } from '/imports/ui/components/video-provider/types';

interface UserStatusProps {
  user: Partial<User>;
  stream: VideoItem;
  voiceUser: {
    muted: boolean;
    listenOnly: boolean;
    joined: boolean;
    deafened: boolean;
  };
}

const UserStatus: React.FC<UserStatusProps> = (props) => {
  const { voiceUser, user, stream } = props;
  const data = { ...user, ...stream };

  const listenOnly = voiceUser?.listenOnly;
  const muted = voiceUser?.muted;
  const deafened = voiceUser?.deafened;
  const voiceUserJoined = voiceUser?.joined && !deafened;
  const emoji = data?.reactionEmoji;
  const away = data?.away;

  return (
    <Styled.StatusRow data-test="webcamUserStatus" dir="ltr">
      {away && <Styled.Away data-test="webcamAway">⏰</Styled.Away>}
      {(emoji && emoji !== 'none' && !away) && (
        <Styled.Reaction data-test="webcamReaction">{emoji}</Styled.Reaction>
      )}

      {voiceUserJoined && (
        <>
          {(muted && !listenOnly) && <Styled.Muted iconName="unmute_filled" />}
          {listenOnly && <Styled.Voice iconName="listen" />}
          {!muted && <Styled.Voice iconName="unmute" />}
        </>
      )}
    </Styled.StatusRow>
  );
};

export default UserStatus;
