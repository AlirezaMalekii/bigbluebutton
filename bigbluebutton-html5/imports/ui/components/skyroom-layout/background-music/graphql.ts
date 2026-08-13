import { gql } from '@apollo/client';

export const SKYROOM_BACKGROUND_MUSIC_PLUGIN = 'skyroom-layout';
export const SKYROOM_BACKGROUND_MUSIC_CHANNEL = 'background-music';
export const SKYROOM_BACKGROUND_MUSIC_SUBCHANNEL = 'global';
export const SKYROOM_BACKGROUND_MUSIC_RECORD_EVENT = 'background-music-state-v1';

export const SKYROOM_BACKGROUND_MUSIC_SUBSCRIPTION = gql`
  subscription SkyroomBackgroundMusicSubscription {
    pluginDataChannelEntry_public(
      where: {
        pluginName: { _eq: "skyroom-layout" },
        channelName: { _eq: "background-music" },
        subChannelName: { _eq: "global" }
      },
      order_by: { updatedAt: desc },
      limit: 1
    ) {
      updatedAt
      channelName
      subChannelName
      entryId
      payloadJson
      pluginName
    }
  }
`;

export const SKYROOM_BACKGROUND_MUSIC_PUSH = gql`
  mutation SkyroomBackgroundMusicPush(
    $pluginName: String!,
    $subChannelName: String!,
    $channelName: String!,
    $payloadJson: json!,
    $toRoles: [String]!,
    $toUserIds: [String]!,
  ) {
    pluginDataChannelPushEntry(
      pluginName: $pluginName,
      channelName: $channelName,
      subChannelName: $subChannelName,
      payloadJson: $payloadJson,
      toRoles: $toRoles,
      toUserIds: $toUserIds,
    )
  }
`;

export const SKYROOM_BACKGROUND_MUSIC_REPLACE = gql`
  mutation SkyroomBackgroundMusicReplace(
    $pluginName: String!,
    $subChannelName: String!,
    $channelName: String!,
    $payloadJson: json!,
    $entryId: String!,
  ) {
    pluginDataChannelReplaceEntry(
      entryId: $entryId,
      pluginName: $pluginName,
      channelName: $channelName,
      subChannelName: $subChannelName,
      payloadJson: $payloadJson,
    )
  }
`;

export const SKYROOM_BACKGROUND_MUSIC_PERSIST = gql`
  mutation SkyroomBackgroundMusicPersist(
    $pluginName: String!,
    $eventName: String!,
    $payloadJson: json!,
  ) {
    pluginPersistEvent(
      pluginName: $pluginName,
      eventName: $eventName,
      payloadJson: $payloadJson,
    )
  }
`;
