import { gql } from '@apollo/client';
import { User } from '/imports/ui/components/video-provider/types';

export interface AudioOnlyUsersResponse {
  user: Array<User & {
    voice: {
      floor: boolean;
      lastFloorTime: string;
      joined: boolean;
      listenOnly: boolean;
      userId: string;
      deafened: boolean;
    };
  }>;
}

export const VIDEO_STREAMS_SUBSCRIPTION = gql`
  subscription VideoStreams {
    user_camera(
      order_by: {
        userId: asc,
      }
    ) {
      meetingId
      streamId
      user {
        name
        userId
        nameSortable
        pinned
        away
        disconnected
        role
        avatar
        color
        presenter
        clientType
        raiseHand
        isModerator
        reactionEmoji
      }
      voice {
        floor
        lastFloorTime
        joined
        listenOnly
        userId
        deafened
      }
    }
  }
`;

// Camera state is materialized on v_user, avoiding a per-row aggregate in the hot query.
export const GRID_USERS_SUBSCRIPTION = gql`
  subscription GridUsers($limit: Int!, $excludedModeratorValues: [Boolean!]) {
    user(
      where: {
        _not: {
          isSharingCamera: { _eq: true },
          isModerator: { _in: $excludedModeratorValues },
        },
      },
      limit: $limit,
      order_by: {
        nameSortable: asc,
        userId: asc,
      },
    ) {
      meetingId
      name
      userId
      nameSortable
      pinned
      away
      disconnected
      role
      avatar
      color
      presenter
      clientType
      raiseHand
      isModerator
      reactionEmoji
      voice {
        joined
        listenOnly
        userId
      }
    }
  }
`;

export const AUDIO_ONLY_USERS_SUBSCRIPTION = gql`
  subscription AudioOnlyUsers($excludedModeratorValues: [Boolean!]) {
    user(
      where: {
        _not: {
          isSharingCamera: { _eq: true },
          isModerator: { _in: $excludedModeratorValues },
        },
        lastFloorTime: { _neq: "0" },
      },
      order_by: {
        lastFloorTime: desc,
        userId: asc,
      },
    ) {
      meetingId
      name
      userId
      nameSortable
      pinned
      away
      disconnected
      role
      avatar
      color
      presenter
      clientType
      raiseHand
      isModerator
      reactionEmoji
      voice {
        floor
        lastFloorTime
        joined
        listenOnly
        userId
        deafened
      }
    }
  }
`;

export default {
  VIDEO_STREAMS_SUBSCRIPTION,
  GRID_USERS_SUBSCRIPTION,
  AUDIO_ONLY_USERS_SUBSCRIPTION,
};
