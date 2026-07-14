import { gql, useSubscription } from '@apollo/client';
import { User } from '/imports/ui/Types/user';

export const USER_BY_IDS_SUBSCRIPTION = gql`
  subscription UserByIdsSubscription($userIds: [String!]!) {
    user(
      where: { userId: { _in: $userIds } }
      order_by: [
        { nameSortable: asc }
        { userId: asc }
      ]
    ) {
      isDialIn
      userId
      meetingId
      extId
      name
      isModerator
      role
      color
      avatar
      away
      raiseHand
      reactionEmoji
      presenter
      pinned
      locked
      authed
      mobile
      bot
      guest
      clientType
      disconnected
      loggedOut
      voice {
        joined
        deafened
        listenOnly
        voiceUserId
        listenOnlyInputDevice
      }
      cameras {
        streamId
      }
      whiteboardWriteAccess
      lastBreakoutRoom {
        isDefaultName
        sequence
        shortName
        isUserCurrentlyInRoom
      }
      userLockSettings {
        disablePublicChat
      }
    }
  }
`;

export const useUsersByIds = (
  userIds: string[],
): { data: User[]; loading: boolean } => {
  const { data, loading } = useSubscription<{ user: User[] }>(USER_BY_IDS_SUBSCRIPTION, {
    variables: { userIds },
    skip: userIds.length === 0,
  });

  return {
    data: data?.user ?? [],
    loading: userIds.length > 0 ? loading : false,
  };
};

export default USER_BY_IDS_SUBSCRIPTION;
