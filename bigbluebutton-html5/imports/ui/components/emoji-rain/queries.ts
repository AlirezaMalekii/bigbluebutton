import { gql } from '@apollo/client';

export const getEmojisToRain = gql`
subscription getEmojisToRain ($initialCursor: timestamptz) {
  user_reaction_stream(batch_size: 10, cursor: {initial_value: {createdAt: $initialCursor}}) {
    createdAt
    reactionEmoji
    userId
    user {
      name
    }
  }
}
`;

export const getUserReactionsForStage = gql`
subscription getUserReactionsForStage {
  user(
    where: {
      bot: {_eq: false},
      loggedOut: {_eq: false},
      disconnected: {_eq: false}
    }
  ) {
    userId
    name
    reactionEmoji
  }
}
`;

export default {
  getEmojisToRain,
  getUserReactionsForStage,
};
