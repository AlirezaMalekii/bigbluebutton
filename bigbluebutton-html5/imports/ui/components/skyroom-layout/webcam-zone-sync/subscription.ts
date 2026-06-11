import { gql } from '@apollo/client';

const SKYROOM_WEBCAM_ZONE_DATA_SUBSCRIPTION = gql`
  subscription SkyroomWebcamZoneDataSubscription {
    pluginDataChannelEntry_public(order_by: { updatedAt: desc }) {
      createdAt
      updatedAt
      channelName
      subChannelName
      entryId
      payloadJson
      createdBy
      pluginName
    }
  }
`;

export default SKYROOM_WEBCAM_ZONE_DATA_SUBSCRIPTION;
