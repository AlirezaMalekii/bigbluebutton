/**
 * BigBlueButton open source conferencing system - http://www.bigbluebutton.org/
 *
 * SafeMeet recording asset API service implementation.
 */
package org.bigbluebutton.api.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.bigbluebutton.api.service.RecordingAssetService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class RecordingAssetServiceImpl implements RecordingAssetService {
    private static final Logger log = LoggerFactory.getLogger(RecordingAssetServiceImpl.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private boolean enabled = false;
    private String assetsDir = "/var/bigbluebutton/recording/safemeet-assets";
    private String publishedDir = "/var/bigbluebutton/published";
    private String defaultServerUrl = "http://localhost";
    private String securitySalt = "";
    private org.bigbluebutton.api.ParamsProcessorUtil paramsProcessorUtil;

    public void setParamsProcessorUtil(org.bigbluebutton.api.ParamsProcessorUtil paramsProcessorUtil) {
        this.paramsProcessorUtil = paramsProcessorUtil;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public void setAssetsDir(String assetsDir) {
        this.assetsDir = assetsDir;
    }

    public void setPublishedDir(String publishedDir) {
        this.publishedDir = publishedDir;
    }

    public void setDefaultServerUrl(String defaultServerUrl) {
        this.defaultServerUrl = defaultServerUrl;
    }

    public void setSecuritySalt(String securitySalt) {
        this.securitySalt = securitySalt;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public boolean isRecordingPublished(String recordId) {
        if (recordId == null || recordId.isEmpty()) {
            return false;
        }

        for (String format : getPlaybackFormats()) {
            File publishedRecording = new File(publishedDir + File.separatorChar + format + File.separatorChar + recordId);
            if (publishedRecording.exists() && publishedRecording.isDirectory()) {
                return true;
            }
        }

        return false;
    }

    @Override
    public String getRecordingAssetsJson(String recordId, String checksumQueryWithoutChecksum, String apiCall) {
        Map<String, Object> manifest = readManifest(recordId);
        if (manifest == null) {
            return buildErrorJson("notFound", "Recording asset manifest was not found for " + recordId);
        }

        enrichManifestUrls(manifest, recordId, "getRecordingAssetFile");
        return buildSuccessJson(manifest);
    }

    @Override
    public String getRecordingEventsJson(String recordId, String checksumQueryWithoutChecksum, String apiCall) {
        File eventsFile = new File(assetsDir + File.separatorChar + recordId + ".events.json");
        if (!eventsFile.exists()) {
            return buildErrorJson("notFound", "Recording events were not found for " + recordId);
        }

        try {
            Map<String, Object> events = MAPPER.readValue(eventsFile, new TypeReference<Map<String, Object>>() {});
            return buildSuccessJson(events);
        } catch (IOException e) {
            log.error("Failed to read recording events for {}", recordId, e);
            return buildErrorJson("internalError", "Failed to read recording events");
        }
    }

    @Override
    public File resolvePublishedAssetFile(String recordId, String assetId) throws IOException {
        Map<String, Object> manifest = readManifest(recordId);
        if (manifest == null) {
            throw new IOException("Manifest not found");
        }

        AssetLocation location = findAssetLocation(manifest, assetId);
        if (location == null || location.relativePath == null) {
            throw new IOException("Asset not found in manifest");
        }

        for (String format : getPlaybackFormats()) {
            File candidate = new File(
                publishedDir + File.separatorChar + format + File.separatorChar + recordId + File.separatorChar + location.relativePath
            );
            if (!candidate.exists()) {
                continue;
            }

            if (isPathWithinPublishedRoot(candidate, format, recordId)) {
                return candidate.getCanonicalFile();
            }
        }

        throw new IOException("Asset file not found on disk");
    }

    @Override
    public Map<String, Object> getManifestMetadata(String recordId) {
        Map<String, Object> manifest = readManifest(recordId);
        if (manifest == null) {
            return null;
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("recordId", manifest.get("recordId"));
        metadata.put("meetingId", manifest.get("meetingId"));
        metadata.put("internalMeetingId", manifest.get("internalMeetingId"));
        metadata.put("name", manifest.get("name"));
        metadata.put("startTime", manifest.get("startTime"));
        metadata.put("endTime", manifest.get("endTime"));
        metadata.put("published", manifest.get("published"));
        metadata.put("publishedAt", manifest.get("publishedAt"));
        metadata.put("participants", manifest.get("participants"));
        metadata.put("duration", manifest.get("duration"));
        metadata.put("playbackUrl", manifest.get("playbackUrl"));
        metadata.put("recordingFormat", manifest.get("recordingFormat"));
        metadata.put("processingStatus", manifest.get("processingStatus"));
        metadata.put("publishStatus", manifest.get("publishStatus"));
        metadata.put("formats", manifest.get("formats"));
        metadata.put("indexedAt", manifest.get("indexedAt"));
        metadata.put("ai", manifest.get("ai"));
        return metadata;
    }

    private Map<String, Object> readManifest(String recordId) {
        File manifestFile = new File(assetsDir + File.separatorChar + recordId + ".json");
        if (!manifestFile.exists()) {
            return null;
        }

        try {
            return MAPPER.readValue(manifestFile, new TypeReference<Map<String, Object>>() {});
        } catch (IOException e) {
            log.error("Failed to read manifest for {}", recordId, e);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private void enrichManifestUrls(Map<String, Object> manifest, String recordId, String apiCall) {
        Object assetsObj = manifest.get("assets");
        if (!(assetsObj instanceof Map)) {
            return;
        }

        Map<String, Object> assets = (Map<String, Object>) assetsObj;
        for (Map.Entry<String, Object> entry : assets.entrySet()) {
            enrichAssetNode(entry.getValue(), recordId, apiCall);
        }
    }

    @SuppressWarnings("unchecked")
    private void enrichAssetNode(Object node, String recordId, String apiCall) {
        if (!(node instanceof Map)) {
            return;
        }

        Map<String, Object> asset = (Map<String, Object>) node;
        Object assetId = asset.get("assetId");
        if (assetId != null && Boolean.TRUE.equals(asset.get("exists"))) {
            asset.put("url", buildAssetDownloadUrl(recordId, assetId.toString(), apiCall));
        }

        Object items = asset.get("items");
        if (items instanceof List) {
            for (Object item : (List<?>) items) {
                enrichAssetNode(item, recordId, apiCall);
            }
        }
    }

    private String buildAssetDownloadUrl(String recordId, String assetId, String apiCall) {
        String query = "recordID=" + urlEncode(recordId) + "&asset=" + urlEncode(assetId);
        String checksum;
        if (paramsProcessorUtil != null) {
            checksum = paramsProcessorUtil.buildChecksum(apiCall, query);
        } else {
            checksum = org.apache.commons.codec.digest.DigestUtils.sha1Hex(apiCall + query + securitySalt);
        }
        String base = trimTrailingSlash(defaultServerUrl);
        return base + "/bigbluebutton/api/" + apiCall + "?" + query + "&checksum=" + checksum;
    }

    @SuppressWarnings("unchecked")
    private AssetLocation findAssetLocation(Map<String, Object> manifest, String assetId) {
        Object assetsObj = manifest.get("assets");
        if (!(assetsObj instanceof Map)) {
            return null;
        }

        Map<String, Object> assets = (Map<String, Object>) assetsObj;
        for (Object groupObj : assets.values()) {
            AssetLocation found = findInGroup(groupObj, assetId);
            if (found != null) {
                return found;
            }
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private AssetLocation findInGroup(Object groupObj, String assetId) {
        if (!(groupObj instanceof Map)) {
            return null;
        }

        Map<String, Object> group = (Map<String, Object>) groupObj;
        Object groupAssetId = group.get("assetId");
        if (groupAssetId != null && assetId.equals(groupAssetId.toString())) {
            return new AssetLocation(group.get("relativePath"));
        }

        Object items = group.get("items");
        if (items instanceof List) {
            for (Object item : (List<?>) items) {
                if (item instanceof Map) {
                    Map<String, Object> itemMap = (Map<String, Object>) item;
                    Object itemAssetId = itemMap.get("assetId");
                    if (itemAssetId != null && assetId.equals(itemAssetId.toString())) {
                        return new AssetLocation(itemMap.get("relativePath"));
                    }
                }
            }
        }

        return null;
    }

    private boolean isPathWithinPublishedRoot(File candidate, String format, String recordId) throws IOException {
        Path root = Paths.get(publishedDir, format, recordId).toRealPath();
        Path resolved = candidate.toPath().toRealPath();
        return resolved.startsWith(root);
    }

    private String[] getPlaybackFormats() {
        File published = new File(publishedDir);
        if (!published.exists()) {
            return new String[] { "presentation", "video", "screenshare", "podcast", "slides" };
        }

        File[] dirs = published.listFiles(File::isDirectory);
        if (dirs == null || dirs.length == 0) {
            return new String[] { "presentation", "video", "screenshare", "podcast", "slides" };
        }

        List<String> formats = new ArrayList<>();
        for (File dir : dirs) {
            formats.add(dir.getName());
        }
        return formats.toArray(new String[0]);
    }

    private String buildSuccessJson(Object data) {
        try {
            ObjectNode root = MAPPER.createObjectNode();
            ObjectNode response = root.putObject("response");
            response.put("returncode", "SUCCESS");
            response.set("data", MAPPER.valueToTree(data));
            return MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (IOException e) {
            return "{\"response\":{\"returncode\":\"FAILED\",\"messageKey\":\"internalError\",\"message\":\"Failed to serialize response\"}}";
        }
    }

    private String buildErrorJson(String key, String message) {
        try {
            ObjectNode root = MAPPER.createObjectNode();
            ObjectNode response = root.putObject("response");
            response.put("returncode", "FAILED");
            response.put("messageKey", key);
            response.put("message", message);
            return MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (IOException e) {
            return "{\"response\":{\"returncode\":\"FAILED\",\"messageKey\":\"internalError\",\"message\":\"Failed to serialize error\"}}";
        }
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String trimTrailingSlash(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static final class AssetLocation {
        private final String relativePath;

        private AssetLocation(Object relativePath) {
            this.relativePath = relativePath == null ? null : relativePath.toString();
        }
    }
}
