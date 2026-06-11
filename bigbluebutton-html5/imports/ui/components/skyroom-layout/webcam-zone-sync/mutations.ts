import { gql } from '@apollo/client';

export const SKYROOM_WEBCAM_ZONE_PUSH = gql`
  mutation SkyroomWebcamZonePush(
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

export const SKYROOM_WEBCAM_ZONE_REPLACE = gql`
  mutation SkyroomWebcamZoneReplace(
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
