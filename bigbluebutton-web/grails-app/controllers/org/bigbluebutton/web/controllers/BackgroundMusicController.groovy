/**
 * BigBlueButton open source conferencing system - http://www.bigbluebutton.org/
 *
 * Copyright (c) 2026 BigBlueButton Inc. and by respective authors.
 *
 * This program is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License as published by the Free Software
 * Foundation; either version 3.0 of the License, or (at your option) any later
 * version.
 */
package org.bigbluebutton.web.controllers

import groovy.json.JsonBuilder
import org.apache.commons.io.FilenameUtils
import org.bigbluebutton.api.MeetingService
import org.bigbluebutton.api.Util
import org.bigbluebutton.api.domain.Meeting
import org.bigbluebutton.api.domain.UserSession
import org.bigbluebutton.presentation.SupportedFileTypes
import org.bigbluebutton.web.services.PresentationService

import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.regex.Pattern

/**
 * Stores moderator-uploaded MP3 files beside the meeting's temporary presentation
 * workspace without creating a presentation pod or conversion job.
 */
class BackgroundMusicController {
  MeetingService meetingService
  PresentationService presentationService

  private static final long MAX_UPLOAD_BYTES = 15L * 1024L * 1024L
  private static final int MAX_TRACKS_PER_MEETING = 20
  private static final String STORAGE_ID = 'background-music'
  private static final Pattern TRACK_ID_PATTERN = Pattern.compile('^[a-f0-9]{40}-[0-9]+$')
  private static final Set<String> MP3_MIME_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/x-mpeg-3',
    'audio/x-mpeg',
  ] as Set<String>

  def upload = {
    UserSession userSession = validateSession()
    if (userSession == null) {
      renderJson([code: 'unauthorized'], 401)
      return
    }
    if (!Meeting.ROLE_MODERATOR.equals(userSession.role)) {
      renderJson([code: 'forbidden'], 403)
      return
    }

    String meetingId = userSession.meetingID
    if (!Util.isMeetingIdValidFormat(meetingId)
        || meetingService.getNotEndedMeetingWithId(meetingId) == null) {
      renderJson([code: 'meeting-ended'], 410)
      return
    }

    def file = request.getFile('fileUpload')
    if (file == null || file.empty || file.size <= 0) {
      renderJson([code: 'empty-file'], 422)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      renderJson([code: 'file-too-large'], 413)
      return
    }

    String originalName = FilenameUtils.getName(file.originalFilename ?: '')
      .replaceAll('[\\p{Cntrl}]', '')
      .trim()
    if (!originalName.toLowerCase(Locale.ROOT).endsWith('.mp3')) {
      renderJson([code: 'invalid-format'], 415)
      return
    }

    File storageDir = Util.ensurePresentationDir(
      meetingId,
      presentationService.getPresentationDir(),
      STORAGE_ID,
    )
    if (storageDir == null) {
      log.error('Unable to create background music storage for meeting={}', meetingId)
      renderJson([code: 'storage-failed'], 500)
      return
    }

    File[] existingTracks = storageDir.listFiles({ File candidate ->
      candidate.isFile() && candidate.name.endsWith('.mp3')
    } as FileFilter)
    if ((existingTracks?.length ?: 0) >= MAX_TRACKS_PER_MEETING) {
      renderJson([code: 'upload-limit'], 429)
      return
    }

    String trackId = Util.generatePresentationId(originalName)
    File temporaryFile = new File(storageDir, "${trackId}.upload")
    File trackFile = new File(storageDir, "${trackId}.mp3")

    try {
      file.transferTo(temporaryFile)
      if (temporaryFile.length() <= 0) {
        renderJson([code: 'empty-file'], 422)
        return
      }
      if (temporaryFile.length() > MAX_UPLOAD_BYTES) {
        renderJson([code: 'file-too-large'], 413)
        return
      }

      String detectedMime = SupportedFileTypes.detectMimeType(temporaryFile)
        ?.toLowerCase(Locale.ROOT)
      if (!MP3_MIME_TYPES.contains(detectedMime)) {
        log.warn(
          'Rejected background music upload with invalid MIME. meeting={}, mime={}',
          meetingId,
          detectedMime,
        )
        renderJson([code: 'invalid-mime'], 415)
        return
      }

      try {
        Files.move(
          temporaryFile.toPath(),
          trackFile.toPath(),
          StandardCopyOption.ATOMIC_MOVE,
        )
      } catch (AtomicMoveNotSupportedException ignored) {
        Files.move(
          temporaryFile.toPath(),
          trackFile.toPath(),
          StandardCopyOption.REPLACE_EXISTING,
        )
      }

      renderJson([
        trackId: trackId,
        path: "/bigbluebutton/background-music/${meetingId}/${trackId}",
        name: (originalName.take(120) ?: 'music.mp3'),
      ], 201)
    } catch (IOException error) {
      log.error('Background music upload failed for meeting={}', meetingId, error)
      renderJson([code: 'upload-failed'], 500)
    } finally {
      if (temporaryFile.exists() && !temporaryFile.delete()) {
        log.warn('Unable to remove temporary background music upload for meeting={}', meetingId)
      }
    }
  }

  def stream = {
    UserSession userSession = validateSession()
    if (userSession == null) {
      response.setStatus(401)
      return
    }

    String meetingId = params.meetingId
    String trackId = params.trackId
    if (meetingId != userSession.meetingID) {
      response.setStatus(403)
      return
    }
    if (!Util.isMeetingIdValidFormat(meetingId)
        || trackId == null
        || !TRACK_ID_PATTERN.matcher(trackId).matches()
        || meetingService.getNotEndedMeetingWithId(meetingId) == null) {
      response.setStatus(404)
      return
    }

    File storageDir = Util.getPresentationDir(
      presentationService.getPresentationDir(),
      meetingId,
      STORAGE_ID,
    )
    File trackFile = storageDir == null ? null : new File(storageDir, "${trackId}.mp3")
    if (trackFile == null || !trackFile.isFile()) {
      response.setStatus(404)
      return
    }

    streamFile(trackFile)
  }

  private UserSession validateSession() {
    String sessionToken = params.sessionToken
    if (!sessionToken) return null
    UserSession userSession = meetingService.getUserSessionWithSessionToken(sessionToken)
    Boolean allowRequestsWithoutSession = meetingService.getAllowRequestsWithoutSession(sessionToken)
    if (userSession == null || (!session[sessionToken] && !allowRequestsWithoutSession)) return null
    return userSession
  }

  private void renderJson(Map payload, int status) {
    response.setStatus(status)
    response.addHeader('Cache-Control', 'no-store')
    response.contentType = 'application/json'
    response.characterEncoding = 'UTF-8'
    response.outputStream << new JsonBuilder(payload).toString()
  }

  private void streamFile(File trackFile) {
    long fileLength = trackFile.length()
    response.contentType = 'audio/mpeg'
    response.addHeader('Accept-Ranges', 'bytes')
    response.addHeader('Cache-Control', 'no-store')
    response.addHeader('X-Content-Type-Options', 'nosniff')
    response.addHeader('Content-Disposition', 'inline; filename="background-music.mp3"')

    long start = 0
    long end = fileLength - 1
    String rangeHeader = request.getHeader('Range')
    if (rangeHeader != null) {
      try {
        if (!rangeHeader.startsWith('bytes=') || rangeHeader.contains(',')) {
          sendRangeNotSatisfiable(fileLength)
          return
        }
        String[] rangeParts = rangeHeader.substring(6).split('-', -1)
        if (rangeParts.length != 2 || rangeParts[0].isEmpty()) {
          sendRangeNotSatisfiable(fileLength)
          return
        }
        start = Long.parseLong(rangeParts[0])
        if (!rangeParts[1].isEmpty()) end = Long.parseLong(rangeParts[1])
        if (start < 0 || start >= fileLength || end < start) {
          sendRangeNotSatisfiable(fileLength)
          return
        }
        end = Math.min(end, fileLength - 1)
      } catch (NumberFormatException ignored) {
        sendRangeNotSatisfiable(fileLength)
        return
      }
    }

    long contentLength = end - start + 1
    if (rangeHeader != null) {
      response.setStatus(206)
      response.addHeader('Content-Range', "bytes ${start}-${end}/${fileLength}")
    }
    response.addHeader('Content-Length', String.valueOf(contentLength))

    RandomAccessFile input = null
    try {
      input = new RandomAccessFile(trackFile, 'r')
      input.seek(start)
      byte[] buffer = new byte[8192]
      long remaining = contentLength
      while (remaining > 0) {
        int read = input.read(buffer, 0, (int) Math.min(buffer.length, remaining))
        if (read == -1) break
        response.outputStream.write(buffer, 0, read)
        remaining -= read
      }
      response.outputStream.flush()
    } catch (IOException error) {
      log.debug('Background music stream closed before completion: {}', error.message)
    } finally {
      input?.close()
    }
  }

  private void sendRangeNotSatisfiable(long fileLength) {
    response.setStatus(416)
    response.addHeader('Content-Range', "bytes */${fileLength}")
  }
}
