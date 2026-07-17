/**
* BigBlueButton open source conferencing system - http://www.bigbluebutton.org/
* 
* Copyright (c) 2012 BigBlueButton Inc. and by respective authors (see below).
*
* This program is free software; you can redistribute it and/or modify it under the
* terms of the GNU Lesser General Public License as published by the Free Software
* Foundation; either version 3.0 of the License, or (at your option) any later
* version.
* 
* BigBlueButton is distributed in the hope that it will be useful, but WITHOUT ANY
* WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
* PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public License along
* with BigBlueButton; if not, see <http://www.gnu.org/licenses/>.
*
*/

package org.bigbluebutton.presentation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static org.bigbluebutton.presentation.FileTypeConstants.*;

import org.apache.tika.Tika;
import java.io.File;
import java.io.InputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Collections;

@SuppressWarnings("serial")
public final class SupportedFileTypes {

	private static Logger log = LoggerFactory.getLogger(SupportedFileTypes.class);
	private static MimeTypeUtils mimeTypeUtils = new MimeTypeUtils();
		
	private static final List<String> OFFICE_FILE_LIST = Collections.unmodifiableList(new ArrayList<String>(11) {		
		{			
			// Add all Offile file types
			add(XLS); add(XLSX);	add(DOC); add(DOCX); add(PPT); add(PPTX);				
			add(ODT); add(RTF); add(TXT); add(ODS); add(ODP); add(ODG);
		}
	});
	
	private static final List<String> IMAGE_FILE_LIST = Collections.unmodifiableList(new ArrayList<String>(3) {		
		{	
			// Add all image file types
			add(JPEG); add(JPG); add(PNG); add(WEBP); add(SVG);
		}
	});

	private static final List<String> MEDIA_FILE_LIST = Collections.unmodifiableList(new ArrayList<String>(8) {
		{
			add(MP4); add(MOV); add(WEBM); add(MP3); add(OGG); add(WAV); add(M4A); add(AAC);
		}
	});
	
	/*
	 * Returns if the Office file is supported.
	 */
	public static boolean isOfficeFile(String fileExtension) {
		return OFFICE_FILE_LIST.contains(fileExtension.toLowerCase());
	}
	
	public static boolean isPdfFile(String fileExtension) {
		return "pdf".equalsIgnoreCase(fileExtension);
	}
	
	/*
	 * Returns if the image file is supported
	 */
	public static boolean isImageFile(String fileExtension) {
		return IMAGE_FILE_LIST.contains(fileExtension.toLowerCase());
	}

	public static boolean isMediaFile(String fileExtension) {
		return MEDIA_FILE_LIST.contains(fileExtension.toLowerCase());
	}

	public static String detectMimeType(File pres) {
		if (pres == null) {
			log.error("Presentation is null");
			return "";
		}
	
		if (!pres.isFile()) {
			log.error("Presentation is not a file");
			return "";
		}
	
		try (InputStream presStream = new FileInputStream(pres)) {
			return (new Tika()).detect(presStream);
		} catch (IOException e) {
			log.error("Error while executing detectMimeType: {}", e);
		}

		return "";
	}

	public static String detectFileExtensionBasedOnMimeType(File pres) {
		String mimeType = detectMimeType(pres);
		return mimeTypeUtils.getExtensionBasedOnMimeType(mimeType);
	}

	private static String sanitizeMimeType(String mimeType) {
		if (mimeType == null || mimeType.isEmpty()) {
			return "";
		}

		int semicolonIndex = mimeType.indexOf(';');
		String sanitized = semicolonIndex >= 0
				? mimeType.substring(0, semicolonIndex)
				: mimeType;

		return sanitized.trim().toLowerCase();
	}

	private static String canonicalMimeForMediaExtension(String extension) {
		if (extension == null) {
			return "";
		}

		String ext = extension.toLowerCase();
		if (MP4.equals(ext)) return "video/mp4";
		if (MOV.equals(ext)) return "video/quicktime";
		if (WEBM.equals(ext)) return "video/webm";
		if (MP3.equals(ext)) return "audio/mpeg";
		if (M4A.equals(ext) || AAC.equals(ext)) return "audio/mp4";
		if (OGG.equals(ext)) return "audio/ogg";
		if (WAV.equals(ext)) return "audio/wav";
		return "";
	}

	private static String normalizeMimeTypeForExtension(String mimeType, String fileExtension) {
		if (fileExtension == null) {
			return mimeType;
		}

		String extension = fileExtension.toLowerCase();
		String normalizedMimeType = sanitizeMimeType(mimeType);

		// ISO BMFF / QuickTime family is frequently mis-detected across containers.
		// Prefer the declared extension for known media uploads.
		if (MP4.equalsIgnoreCase(extension)) {
			if (normalizedMimeType.isEmpty()
					|| "application/octet-stream".equals(normalizedMimeType)
					|| "application/mp4".equals(normalizedMimeType)
					|| "video/quicktime".equals(normalizedMimeType)
					|| "video/x-m4v".equals(normalizedMimeType)
					|| "video/3gpp".equals(normalizedMimeType)
					|| "video/3gpp2".equals(normalizedMimeType)
					|| "video/mp4".equals(normalizedMimeType)
					|| normalizedMimeType.startsWith("video/")) {
				return "video/mp4";
			}
			if (normalizedMimeType.startsWith("audio/")) {
				return "audio/mp4";
			}
			return normalizedMimeType;
		}

		if (M4A.equalsIgnoreCase(extension) || AAC.equalsIgnoreCase(extension)) {
			if (normalizedMimeType.isEmpty()
					|| "application/octet-stream".equals(normalizedMimeType)
					|| "video/mp4".equals(normalizedMimeType)
					|| "video/quicktime".equals(normalizedMimeType)
					|| "video/3gpp".equals(normalizedMimeType)
					|| "video/3gpp2".equals(normalizedMimeType)
					|| "audio/x-m4a".equals(normalizedMimeType)
					|| "audio/m4a".equals(normalizedMimeType)
					|| "audio/aac".equals(normalizedMimeType)
					|| "audio/x-aac".equals(normalizedMimeType)
					|| "audio/mp4".equals(normalizedMimeType)
					|| normalizedMimeType.startsWith("audio/")
					|| normalizedMimeType.startsWith("video/")) {
				return "audio/mp4";
			}
			return normalizedMimeType;
		}

		if (MP3.equalsIgnoreCase(extension)) {
			if ("audio/mp3".equals(normalizedMimeType)
					|| "audio/x-mpeg-3".equals(normalizedMimeType)
					|| "audio/x-mpeg".equals(normalizedMimeType)) {
				return "audio/mpeg";
			}
			return normalizedMimeType;
		}

		if (WAV.equalsIgnoreCase(extension)) {
			if ("audio/x-wav".equals(normalizedMimeType)
					|| "audio/wave".equals(normalizedMimeType)
					|| "audio/vnd.wave".equals(normalizedMimeType)) {
				return "audio/wav";
			}
			return normalizedMimeType;
		}

		if (OGG.equalsIgnoreCase(extension) && "application/ogg".equals(normalizedMimeType)) {
			return "audio/ogg";
		}

		if (WEBM.equalsIgnoreCase(extension) && "audio/webm".equals(normalizedMimeType)) {
			return "audio/webm";
		}

		if (MOV.equalsIgnoreCase(extension)) {
			if (normalizedMimeType.isEmpty()
					|| "application/octet-stream".equals(normalizedMimeType)
					|| "video/mp4".equals(normalizedMimeType)
					|| "video/x-m4v".equals(normalizedMimeType)
					|| "video/3gpp".equals(normalizedMimeType)
					|| "video/3gpp2".equals(normalizedMimeType)
					|| "video/quicktime".equals(normalizedMimeType)
					|| normalizedMimeType.startsWith("video/")) {
				return "video/quicktime";
			}
			return normalizedMimeType;
		}

		return normalizedMimeType;
	}

	public static Boolean isPresentationMimeTypeValid(File pres, String fileExtension) {
		String detectedMimeType = detectMimeType(pres);
		String mimeType = normalizeMimeTypeForExtension(detectedMimeType, fileExtension);

		if (mimeType == null || mimeType.equals("")) {
			if (isMediaFile(fileExtension)) {
				mimeType = canonicalMimeForMediaExtension(fileExtension);
				log.warn("Falling back to canonical mime [{}] for media extension [{}] (detected=[{}])",
						mimeType, fileExtension, detectedMimeType);
			} else {
				log.error("Not able to detect mimeType.");
				return false;
			}
		}

		if (!mimeTypeUtils.getValidMimeTypes().contains(mimeType)) {
			if (isMediaFile(fileExtension)) {
				String canonical = canonicalMimeForMediaExtension(fileExtension);
				if (!canonical.isEmpty() && mimeTypeUtils.getValidMimeTypes().contains(canonical)
						&& mimeTypeUtils.extensionMatchMimeType(canonical, fileExtension)) {
					log.warn("Accepting media upload via canonical mime [{}] for extension [{}] (normalized=[{}], detected=[{}])",
							canonical, fileExtension, mimeType, detectedMimeType);
					return true;
				}
			}
			log.error("MimeType is not valid for this meeting, [{}]", mimeType);
			return false;
		}

		if (!mimeTypeUtils.extensionMatchMimeType(mimeType, fileExtension)) {
			log.error("File with extension [{}] doesn't match with mimeType [{}].", fileExtension, mimeType);
			return false;
		}

		return true;
	}
}
