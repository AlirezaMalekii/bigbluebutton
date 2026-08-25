import { gql } from '@apollo/client';

/** Real-time participant search for Skyroom column layout */
export const SKYROOM_USER_SEARCH_SUBSCRIPTION = gql`
  subscription SkyroomUserSearch($search: String!, $limit: Int!) {
    user(
      where: {
        _and: [
          { bot: { _eq: false } },
          { name: { _ilike: $search } }
        ]
      },
      limit: $limit,
      order_by: [
        { raiseHand: desc },
        { raiseHandTime: asc_nulls_last },
        { presenter: desc },
        { role: asc },
        { isDialIn: desc },
        { whiteboardWriteAccess: desc },
        { nameSortable: asc },
        { registeredAt: asc },
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
      raiseHandTime
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

export default SKYROOM_USER_SEARCH_SUBSCRIPTION;
