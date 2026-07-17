import { gql } from '@apollo/client';

export interface GetGuestLobbyInfo {
  user_current: Array<{
    guestStatusDetails: {
      guestLobbyMessage: string | null;
      positionInWaitingQueue: number;
      isAllowed: boolean;
    };
    meeting: {
      usersPolicies: {
        guestLobbyMessage: string | null;
      } | null;
    } | null;
  }>;
}

export const getGuestLobbyInfo = gql`
subscription getGuestLobbyInfo {
    user_current {
      guestStatusDetails {
        guestLobbyMessage
        positionInWaitingQueue
        isAllowed
      }
      meeting {
        usersPolicies {
          guestLobbyMessage
        }
      }
    }
  }
`;
export const userJoinMutation = gql`
mutation UserJoin($authToken: String!, $clientType: String!, $clientIsMobile: Boolean!) {
  userJoinMeeting(
    authToken: $authToken,
    clientType: $clientType,
    clientIsMobile: $clientIsMobile,
  )
}
`;
export default {
  userJoinMutation,
};
