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

package org.bigbluebutton.presentation.imp;

import org.bigbluebutton.presentation.SlidesGenerationProgressNotifier;
import org.bigbluebutton.presentation.TextFileCreator;
import org.bigbluebutton.presentation.ThumbnailCreator;
import org.bigbluebutton.presentation.UploadedPresentation;
import org.bigbluebutton.presentation.SvgImageCreator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MediaSlidesGenerationService {
    private static Logger log = LoggerFactory.getLogger(MediaSlidesGenerationService.class);

    private SlidesGenerationProgressNotifier notifier;
    private SvgImageCreator svgImageCreator;
    private ThumbnailCreator thumbnailCreator;
    private TextFileCreator textFileCreator;

    public void generateSlides(UploadedPresentation pres) {
        log.info("Generating placeholder slide for media presentation {}", pres.getName());
        createTextFiles(pres, 1);
        createThumbnails(pres, 1);
        createSvgImages(pres, 1);
    }

    public void createBlanks(UploadedPresentation pres) {
        textFileCreator.createBlank(pres, 1);
        thumbnailCreator.createBlank(pres, 1);
        svgImageCreator.createBlank(pres, 1);
    }

    private void createTextFiles(UploadedPresentation pres, int page) {
        notifier.sendCreatingTextFilesUpdateMessage(pres);
        textFileCreator.createTextFile(pres, page, false);
    }

    private void createThumbnails(UploadedPresentation pres, int page) {
        notifier.sendCreatingThumbnailsUpdateMessage(pres);
        thumbnailCreator.createBlank(pres, page);
    }

    private void createSvgImages(UploadedPresentation pres, int page) {
        notifier.sendCreatingSvgImagesUpdateMessage(pres);
        svgImageCreator.createBlank(pres, page);
    }

    public void setThumbnailCreator(ThumbnailCreator thumbnailCreator) {
        this.thumbnailCreator = thumbnailCreator;
    }

    public void setTextFileCreator(TextFileCreator textFileCreator) {
        this.textFileCreator = textFileCreator;
    }

    public void setSvgImageCreator(SvgImageCreator svgImageCreator) {
        this.svgImageCreator = svgImageCreator;
    }

    public void setSlidesGenerationProgressNotifier(SlidesGenerationProgressNotifier notifier) {
        this.notifier = notifier;
    }
}
