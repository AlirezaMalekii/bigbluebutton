/**
 * SafeMeet class materials persistence (presentations + whiteboard) across BBB sessions.
 */
package org.bigbluebutton.api.service;

import java.io.File;
import java.util.List;

public interface ClassMaterialsService {

  boolean isEnabled();

  /**
   * True when a non-expired materials snapshot exists for the external meeting id (class id).
   */
  boolean hasValidMaterials(String externalMeetingId);

  List<ClassMaterialPresentation> listPresentations(String externalMeetingId);

  /**
   * Locate the original uploaded file for a persisted presentation.
   */
  File findOriginalFile(String externalMeetingId, String presentationId);

  /**
   * Refresh last-accessed timestamp so the 14-day idle retention window restarts.
   */
  void touch(String externalMeetingId);

  /**
   * Remove materials whose lastAccessedAt is older than the configured retention days.
   */
  void purgeExpired();

  final class ClassMaterialPresentation {
    public final String id;
    public final String name;
    public final boolean current;
    public final boolean downloadable;
    public final boolean removable;
    public final boolean defaultPresentation;
    public final String filenameConverted;
    public final int numPages;

    public ClassMaterialPresentation(
        String id,
        String name,
        boolean current,
        boolean downloadable,
        boolean removable,
        boolean defaultPresentation,
        String filenameConverted,
        int numPages
    ) {
      this.id = id;
      this.name = name;
      this.current = current;
      this.downloadable = downloadable;
      this.removable = removable;
      this.defaultPresentation = defaultPresentation;
      this.filenameConverted = filenameConverted;
      this.numPages = numPages;
    }
  }
}
