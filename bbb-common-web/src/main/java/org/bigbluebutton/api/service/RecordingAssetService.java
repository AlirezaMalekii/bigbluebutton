/**
 * BigBlueButton open source conferencing system - http://www.bigbluebutton.org/
 *
 * SafeMeet recording asset API service.
 */
package org.bigbluebutton.api.service;

import java.io.File;
import java.io.IOException;
import java.util.Map;

public interface RecordingAssetService {
    boolean isEnabled();

    boolean isRecordingPublished(String recordId);

    String getRecordingAssetsJson(String recordId, String checksumQueryWithoutChecksum, String apiCall);

    String getRecordingEventsJson(String recordId, String checksumQueryWithoutChecksum, String apiCall);

    File resolvePublishedAssetFile(String recordId, String assetId) throws IOException;

    Map<String, Object> getManifestMetadata(String recordId);
}
