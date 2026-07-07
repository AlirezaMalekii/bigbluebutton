import { gql } from '@apollo/client';

export interface HiddenTabUserReport {
  userId: string;
}

export interface HiddenTabUsersSubscriptionResponse {
  user_connectionStatusReport: HiddenTabUserReport[];
}

export const HIDDEN_TAB_USERS_SUBSCRIPTION = gql`
subscription HiddenTabUsers {
  user_connectionStatusReport(
    where: {
      clientNotResponding: { _eq: false }
      user: { currentlyInMeeting: { _eq: true } }
    }
  ) {
    userId
  }
}`;

export default {
  HIDDEN_TAB_USERS_SUBSCRIPTION,
};
