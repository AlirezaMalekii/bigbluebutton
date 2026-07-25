/**
 * SafeMeet class materials persistence service.
 *
 * Materials are written by akka-bbb-apps on meeting end and restored by bbb-web on create.
 * Retention is idle-based: lastAccessedAt is refreshed on restore and on each new snapshot.
 */
package org.bigbluebutton.api.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.io.FileUtils;
import org.bigbluebutton.api.service.ClassMaterialsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class ClassMaterialsServiceImpl implements ClassMaterialsService {
  private static final Logger log = LoggerFactory.getLogger(ClassMaterialsServiceImpl.class);
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final String MANIFEST_FILE = "manifest.json";
  private static final String PRESENTATIONS_DIR = "presentations";

  private boolean enabled = true;
  private String materialsDir = "/var/bigbluebutton/safemeet-class-materials";
  private int retentionDays = 14;

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public void setMaterialsDir(String materialsDir) {
    this.materialsDir = materialsDir;
  }

  public void setRetentionDays(int retentionDays) {
    this.retentionDays = retentionDays;
  }

  @Override
  public boolean isEnabled() {
    return enabled;
  }

  @Override
  public boolean hasValidMaterials(String externalMeetingId) {
    if (!enabled || externalMeetingId == null || externalMeetingId.isEmpty()) {
      return false;
    }
    File manifest = manifestFile(externalMeetingId);
    if (!manifest.isFile()) {
      return false;
    }
    try {
      JsonNode root = MAPPER.readTree(manifest);
      long lastAccessed = root.path("lastAccessedAt").asLong(0L);
      if (lastAccessed <= 0L) {
        lastAccessed = root.path("savedAt").asLong(0L);
      }
      if (lastAccessed <= 0L) {
        return false;
      }
      long ageMs = System.currentTimeMillis() - lastAccessed;
      long retentionMs = TimeUnit.DAYS.toMillis(retentionDays);
      if (ageMs > retentionMs) {
        log.info("SafeMeet class materials expired for extId={} ageDays={}",
            externalMeetingId, TimeUnit.MILLISECONDS.toDays(ageMs));
        return false;
      }
      File presentations = new File(classDir(externalMeetingId), PRESENTATIONS_DIR);
      return presentations.isDirectory() && presentations.list() != null && presentations.list().length > 0;
    } catch (IOException e) {
      log.warn("Failed reading class materials manifest for {}: {}", externalMeetingId, e.getMessage());
      return false;
    }
  }

  @Override
  public List<ClassMaterialPresentation> listPresentations(String externalMeetingId) {
    List<ClassMaterialPresentation> result = new ArrayList<>();
    File manifest = manifestFile(externalMeetingId);
    if (!manifest.isFile()) {
      return result;
    }
    try {
      JsonNode root = MAPPER.readTree(manifest);
      JsonNode presentations = root.path("presentations");
      if (!presentations.isArray()) {
        return result;
      }
      for (JsonNode p : presentations) {
        result.add(new ClassMaterialPresentation(
            p.path("id").asText(""),
            p.path("name").asText("presentation"),
            p.path("current").asBoolean(false),
            p.path("downloadable").asBoolean(false),
            p.path("removable").asBoolean(true),
            p.path("default").asBoolean(false),
            p.path("filenameConverted").asText(""),
            p.path("numPages").asInt(0)
        ));
      }
    } catch (IOException e) {
      log.warn("Failed listing class materials for {}: {}", externalMeetingId, e.getMessage());
    }
    return result;
  }

  @Override
  public File findOriginalFile(String externalMeetingId, String presentationId) {
    File presDir = new File(new File(classDir(externalMeetingId), PRESENTATIONS_DIR), presentationId);
    if (!presDir.isDirectory()) {
      return null;
    }

    FilenameFilter filter = (dir, name) -> {
      File f = new File(dir, name);
      if (!f.isFile()) {
        return false;
      }
      String lower = name.toLowerCase();
      if (lower.endsWith(".download") || lower.endsWith(".json") || lower.endsWith(".txt")) {
        return false;
      }
      return name.startsWith(presentationId + ".");
    };

    File[] matches = presDir.listFiles(filter);
    if (matches == null || matches.length == 0) {
      // Fallback: any non-directory file that looks like an upload
      File[] all = presDir.listFiles(File::isFile);
      if (all == null || all.length == 0) {
        return null;
      }
      for (File f : all) {
        String lower = f.getName().toLowerCase();
        if (!lower.endsWith(".json") && !lower.endsWith(".download")) {
          return f;
        }
      }
      return null;
    }

    // Prefer PDF, then common office/image types
    for (File f : matches) {
      if (f.getName().toLowerCase().endsWith(".pdf")) {
        return f;
      }
    }
    return matches[0];
  }

  @Override
  public void touch(String externalMeetingId) {
    File manifest = manifestFile(externalMeetingId);
    if (!manifest.isFile()) {
      return;
    }
    try {
      JsonNode root = MAPPER.readTree(manifest);
      if (!(root instanceof ObjectNode)) {
        return;
      }
      ObjectNode obj = (ObjectNode) root;
      obj.put("lastAccessedAt", System.currentTimeMillis());
      Files.write(manifest.toPath(), MAPPER.writerWithDefaultPrettyPrinter()
          .writeValueAsString(obj).getBytes(StandardCharsets.UTF_8));
    } catch (IOException e) {
      log.warn("Failed touching class materials for {}: {}", externalMeetingId, e.getMessage());
    }
  }

  @Override
  public void purgeExpired() {
    if (!enabled) {
      return;
    }
    File root = new File(materialsDir);
    if (!root.isDirectory()) {
      return;
    }
    File[] classes = root.listFiles(File::isDirectory);
    if (classes == null) {
      return;
    }
    long now = System.currentTimeMillis();
    long retentionMs = TimeUnit.DAYS.toMillis(retentionDays);
    for (File classDir : classes) {
      File manifest = new File(classDir, MANIFEST_FILE);
      long lastAccessed = 0L;
      if (manifest.isFile()) {
        try {
          JsonNode node = MAPPER.readTree(manifest);
          lastAccessed = node.path("lastAccessedAt").asLong(0L);
          if (lastAccessed <= 0L) {
            lastAccessed = node.path("savedAt").asLong(0L);
          }
        } catch (IOException ignored) {
          // fall through to mtime
        }
      }
      if (lastAccessed <= 0L) {
        lastAccessed = classDir.lastModified();
      }
      if (now - lastAccessed > retentionMs) {
        try {
          FileUtils.deleteDirectory(classDir);
          log.info("Purged expired SafeMeet class materials dir={}", classDir.getAbsolutePath());
        } catch (IOException e) {
          log.warn("Failed purging class materials {}: {}", classDir.getAbsolutePath(), e.getMessage());
        }
      }
    }
  }

  public static String sanitizeExternalId(String externalMeetingId) {
    if (externalMeetingId == null) {
      return "";
    }
    return externalMeetingId.replaceAll("[^a-zA-Z0-9._-]", "_");
  }

  private File classDir(String externalMeetingId) {
    return new File(materialsDir, sanitizeExternalId(externalMeetingId));
  }

  private File manifestFile(String externalMeetingId) {
    return new File(classDir(externalMeetingId), MANIFEST_FILE);
  }
}
