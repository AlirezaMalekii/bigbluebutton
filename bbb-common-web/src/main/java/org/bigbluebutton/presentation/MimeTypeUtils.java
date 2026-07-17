package org.bigbluebutton.presentation;

import org.bigbluebutton.api.domain.Extension;

import java.util.*;

import static org.bigbluebutton.presentation.FileTypeConstants.*;

public class MimeTypeUtils {
    private  static final String XLS = "application/vnd.ms-excel";
    private  static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private  static final String DOC = "application/msword";
    private  static final String DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private  static final String PPT = "application/vnd.ms-powerpoint";
    private  static final String PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    private  static final String TIKA_MSOFFICE = "application/x-tika-msoffice";
    private  static final String TIKA_MSOFFICE_X = "application/x-tika-ooxml";
    private  static final String ODT = "application/vnd.oasis.opendocument.text";
    private  static final String RTF = "application/rtf";
    private  static final String TXT = "text/plain";
    private  static final String ODS = "application/vnd.oasis.opendocument.spreadsheet";
    private  static final String ODG = "application/vnd.oasis.opendocument.graphics";
    private  static final String ODP = "application/vnd.oasis.opendocument.presentation";
    private  static final String PDF = "application/pdf";
    private  static final String JPEG = "image/jpeg";
    private  static final String PNG = "image/png";
    private  static final String SVG = "image/svg+xml";
    private  static final String WEBP = "image/webp";
    private  static final String MP4 = "video/mp4";
    private  static final String QUICKTIME = "video/quicktime";
    private  static final String WEBM = "video/webm";
    private  static final String MPEG = "audio/mpeg";
    private  static final String OGG = "audio/ogg";
    private  static final String WAV = "audio/wav";
    private  static final String M4A = "audio/mp4";
    private  static final String AUDIO_WEBM = "audio/webm";
    private  static final String AUDIO_AAC = "audio/aac";

    // If the following mime-types are changed, please, make sure to also change:
    // bigbluebutton-html5/private/config/settings.yml: L827
    // docs/docs/development/api.md: L1222
    private static final HashMap<String, List<String>> EXTENSIONS_MIME = new HashMap<String, List<String>>(16) {
        {
            put(FileTypeConstants.DOC, Arrays.asList(DOC, DOCX, TIKA_MSOFFICE, TIKA_MSOFFICE_X));
            put(FileTypeConstants.XLS, Arrays.asList(XLS, XLSX, TIKA_MSOFFICE, TIKA_MSOFFICE_X));
            put(FileTypeConstants.PPT, Arrays.asList(PPT, PPTX, TIKA_MSOFFICE, TIKA_MSOFFICE_X));
            put(FileTypeConstants.DOCX, Arrays.asList(DOC, DOCX, TIKA_MSOFFICE, TIKA_MSOFFICE_X));
            put(FileTypeConstants.PPTX, Arrays.asList(PPT, PPTX, TIKA_MSOFFICE, TIKA_MSOFFICE_X));
            put(FileTypeConstants.XLSX, Arrays.asList(XLS, XLSX, TIKA_MSOFFICE, TIKA_MSOFFICE_X));
            put(FileTypeConstants.ODT, Arrays.asList(ODT));
            put(FileTypeConstants.ODG, Arrays.asList(ODG));
            put(FileTypeConstants.RTF, Arrays.asList(RTF));
            put(FileTypeConstants.TXT, Arrays.asList(TXT));
            put(FileTypeConstants.ODS, Arrays.asList(ODS));
            put(FileTypeConstants.ODP, Arrays.asList(ODP));
            put(FileTypeConstants.PDF, Arrays.asList(PDF));
            put(FileTypeConstants.JPG, Arrays.asList(JPEG));
            put(FileTypeConstants.JPEG, Arrays.asList(JPEG));
            put(FileTypeConstants.PNG, Arrays.asList(PNG));
            put(FileTypeConstants.SVG, Arrays.asList(SVG));
            put(FileTypeConstants.WEBP, Arrays.asList(WEBP));
            put(FileTypeConstants.MP4, Arrays.asList(
                    MP4, QUICKTIME, "video/x-m4v", "video/3gpp", "video/3gpp2",
                    "application/mp4", M4A, "audio/x-m4a", "audio/m4a"
            ));
            put(FileTypeConstants.MOV, Arrays.asList(
                    QUICKTIME, MP4, "video/x-m4v", "video/3gpp", "video/3gpp2"
            ));
            put(FileTypeConstants.WEBM, Arrays.asList(WEBM, AUDIO_WEBM));
            put(FileTypeConstants.MP3, Arrays.asList(
                    MPEG, "audio/mp3", "audio/x-mpeg-3", "audio/x-mpeg"
            ));
            put(FileTypeConstants.OGG, Arrays.asList(OGG, "video/ogg", "application/ogg"));
            put(FileTypeConstants.WAV, Arrays.asList(
                    WAV, "audio/x-wav", "audio/wave", "audio/vnd.wave"
            ));
            put(FileTypeConstants.M4A, Arrays.asList(
                    M4A, "audio/x-m4a", "audio/m4a", MP4, QUICKTIME, "video/mp4",
                    "video/3gpp", "video/3gpp2", "application/mp4"
            ));
            put(FileTypeConstants.AAC, Arrays.asList(
                    M4A, AUDIO_AAC, "audio/x-aac", MP4, QUICKTIME, "video/mp4",
                    "video/3gpp", "video/3gpp2", "application/mp4"
            ));
        }
    };

    public String getExtensionBasedOnMimeType(String mimeType) {
        return EXTENSIONS_MIME.entrySet()
                .stream()
                .filter(entry -> entry.getValue().contains(mimeType))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }
    
    public Boolean extensionMatchMimeType(String mimeType, String finalExtension) {
        finalExtension = finalExtension.toLowerCase();

        if (EXTENSIONS_MIME.containsKey(finalExtension)) {
            for (String validMimeType : EXTENSIONS_MIME.get(finalExtension)) {
                if (validMimeType.equalsIgnoreCase(mimeType)) {
                    return true;
                }
            }
        }
    
        return false;
    }

    public List<String> getValidMimeTypes() {
        List<String> validMimeTypes = Arrays.asList(XLS, XLSX,
                DOC, DOCX, PPT, PPTX, ODT, RTF, TXT, ODS, ODP, ODG,
                PDF, JPEG, PNG, TIKA_MSOFFICE, TIKA_MSOFFICE_X,
                WEBP, SVG, MP4, QUICKTIME, "video/x-m4v", "video/3gpp", "video/3gpp2",
                "application/mp4", WEBM, AUDIO_WEBM,
                MPEG, "audio/mp3", "audio/x-mpeg-3", "audio/x-mpeg",
                OGG, "video/ogg", "application/ogg",
                WAV, "audio/x-wav", "audio/wave", "audio/vnd.wave",
                M4A, "audio/x-m4a", "audio/m4a", AUDIO_AAC, "audio/x-aac"
        );
        return validMimeTypes;
    }
}
