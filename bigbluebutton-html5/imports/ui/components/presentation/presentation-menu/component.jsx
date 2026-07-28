/* eslint-disable react/prop-types, no-console */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import { toPng, toSvg } from 'html-to-image';
import { toast } from 'react-toastify';
import { UI_DATA_GETTER_SUBSCRIBED } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-data/getters/consts';
import * as PluginSdk from 'bigbluebutton-html-plugin-sdk';
import logger from '/imports/startup/client/logger';
import {
  PresentationDropdownItemType,
} from 'bigbluebutton-html-plugin-sdk/dist/cjs/extensible-areas/presentation-dropdown-item/enums';
import ConfirmationModal from '/imports/ui/components/common/modal/confirmation/component';
import Styled from './styles';
import Icon from '/imports/ui/components/common/icon/component';
import TooltipContainer from '/imports/ui/components/common/tooltip/container';
import deviceInfo from '/imports/utils/deviceInfo';
import browserInfo from '/imports/utils/browserInfo';
import { useModalRegistration } from '/imports/ui/core/singletons/modalController';
import { togglePresentationFullscreen } from '../presentation-fullscreen';

const intlMessages = defineMessages({
  downloading: {
    id: 'app.presentation.options.downloading',
    description: 'Downloading label',
    defaultMessage: 'Downloading...',
  },
  downloaded: {
    id: 'app.presentation.options.downloaded',
    description: 'Downloaded label',
    defaultMessage: 'Current presentation was downloaded',
  },
  downloadFailed: {
    id: 'app.presentation.options.downloadFailed',
    description: 'Downloaded failed label',
    defaultMessage: 'Could not download current presentation',
  },
  fullscreenLabel: {
    id: 'app.presentation.options.fullscreen',
    description: 'Fullscreen label',
    defaultMessage: 'Fullscreen',
  },
  exitFullscreenLabel: {
    id: 'app.presentation.options.exitFullscreen',
    description: 'Exit fullscreen label',
    defaultMessage: 'Exit fullscreen',
  },
  minimizePresentationLabel: {
    id: 'app.presentation.options.minimize',
    description: 'Minimize presentation label',
    defaultMessage: 'Minimize',
  },
  optionsLabel: {
    id: 'app.navBar.optionsDropdown.optionsLabel',
    description: 'Options button label',
    defaultMessage: 'Options',
  },
  snapshotLabel: {
    id: 'app.presentation.options.snapshot',
    description: 'Snapshot of current slide label',
    defaultMessage: 'Snapshot of current slide',
  },
  whiteboardLabel: {
    id: 'app.shortcut-help.whiteboard',
    description: 'used for aria whiteboard options button label',
    defaultMessage: 'Whiteboard',
  },
  hideToolsDesc: {
    id: 'app.presentation.presentationToolbar.hideToolsDesc',
    description: 'Hide toolbar label',
  },
  showToolsDesc: {
    id: 'app.presentation.presentationToolbar.showToolsDesc',
    description: 'Show toolbar label',
  },
  clearAnnotationsTitle: {
    id: 'app.presentation.modal.clearAnnotationsTitle',
    description: 'Title of clear annotations modal',
  },
  clearAnnotationsDescription: {
    id: 'app.presentation.modal.modClearAnnotationsDesc',
    description: 'Description of clear annotations modal for presenter and moderator',
  },
  viewerClearAnnotationsDescription: {
    id: 'app.presentation.modal.viewerClearAnnotationsDesc',
    description: 'Description of clear annotations modal for viewers',
  },
  clearAnnotationsCancelLabel: {
    id: 'app.presentation.modal.clearAnnotationsCancelLabel',
    description: 'Label for the cancel button',
  },
  clearAnnotationsConfirmLabel: {
    id: 'app.presentation.modal.clearAnnotationsConfirmLabel',
    description: 'Label for the confirm button',
  },
});

const propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  allowSnapshotOfCurrentSlide: PropTypes.bool,
  elementName: PropTypes.string,
  elementId: PropTypes.string,
  fullscreenRef: PropTypes.instanceOf(Element),
  isFullscreen: PropTypes.bool,
  isIphone: PropTypes.bool,
  currentElement: PropTypes.string,
  layoutContextDispatch: PropTypes.func.isRequired,
  meetingName: PropTypes.string,
  tldrawAPI: PropTypes.shape({
    getSvg: PropTypes.func.isRequired,
    getCurrentPageShapes: PropTypes.func.isRequired,
  }),
  presentationDropdownItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
  })).isRequired,
};

const PresentationMenu = (props) => {
  const {
    intl,
    elementName = '',
    elementId = '',
    fullscreenRef = null,
    isFullscreen = false,
    isIphone = false,
    currentElement = '',
    layoutContextDispatch,
    tldrawAPI = null,
    meetingName = '',
    isToolbarVisible,
    setIsToolbarVisible,
    allowSnapshotOfCurrentSlide = false,
    presentationDropdownItems,
    slideNum,
    currentUser,
    whiteboardId,
    persistShape,
    hasWBAccess,
  } = props;

  const [state, setState] = useState({
    hasError: false,
    loading: false,
  });

  const extractSlideContentToImage = async () => {
    const { isIos } = deviceInfo;
    const { isSafari } = browserInfo;
    const backgroundShape = tldrawAPI.getCurrentPageShapes().find((s) => s.id === `shape:BG-${slideNum}`);
    const shapes = tldrawAPI.getCurrentPageShapes();
    const pollShape = shapes.find((shape) => shape.type === 'poll');
    const svgElem = await tldrawAPI.getSvg(
      shapes
        .filter((shape) => shape.type !== 'poll')
        .map((shape) => shape.id),
    );
    svgElem.setAttribute('width', backgroundShape.props.w);
    svgElem.setAttribute('height', backgroundShape.props.h);
    svgElem.setAttribute('viewBox', `1 1 ${backgroundShape.props.w} ${backgroundShape.props.h}`);
    if (pollShape) {
      const pollShapeElement = document.getElementById(pollShape.id);
      const pollShapeSvg = await toSvg(pollShapeElement);
      const pollShapeImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      pollShapeImage.setAttribute('href', pollShapeSvg);
      pollShapeImage.setAttribute('width', pollShape.props.w);
      pollShapeImage.setAttribute('height', pollShape.props.h);
      pollShapeImage.setAttribute('x', pollShape.x);
      pollShapeImage.setAttribute('y', pollShape.y);
      svgElem.appendChild(pollShapeImage);
    }

    if (isIos || isSafari) {
      const svgString = new XMLSerializer().serializeToString(svgElem);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });

      return URL.createObjectURL(blob);
    }
    const width = svgElem?.width?.baseVal?.value ?? window.screen.width;
    const height = svgElem?.height?.baseVal?.value ?? window.screen.height;

    return toPng(svgElem, {
      width,
      height,
      backgroundColor: '#FFF',
      skipFonts: true,
    });
  };

  useEffect(() => {
    const updateUiDataHookPCurrentWhiteboardSVGWithAnnotationsForPlugin = async () => {
      try {
        const data = await extractSlideContentToImage();
        window.dispatchEvent(new CustomEvent(
          PluginSdk.PresentationWhiteboardUiDataNames.CURRENT_PAGE_SNAPSHOT, {
            detail: {
              base64Png: data,
            },
          },
        ));
      } catch (e) {
        logger.error({
          logCode: 'plugin_ui_data_getter_error',
          extraInfo: {
            uiDataGetter:
              PluginSdk.PresentationWhiteboardUiDataNames.CURRENT_PAGE_SNAPSHOT,
          },
        }, `UI data getter failed to fetch [${PluginSdk.PresentationWhiteboardUiDataNames.CURRENT_PAGE_SNAPSHOT}]: ${e}`);
      }
    };

    window.addEventListener(
      `${UI_DATA_GETTER_SUBSCRIBED}-${PluginSdk.PresentationWhiteboardUiDataNames.CURRENT_PAGE_SNAPSHOT}`,
      updateUiDataHookPCurrentWhiteboardSVGWithAnnotationsForPlugin,
    );
    return () => {
      window.removeEventListener(
        `${UI_DATA_GETTER_SUBSCRIBED}-${PluginSdk.PresentationWhiteboardUiDataNames.CURRENT_PAGE_SNAPSHOT}`,
        updateUiDataHookPCurrentWhiteboardSVGWithAnnotationsForPlugin,
      );
    };
  }, [tldrawAPI, slideNum]);
  const toastId = useRef('presentation-menu-toast');

  const {
    isOpen: isClearModalOpen,
    open: openIsClearModal,
    close: closeIsClearModal,
  } = useModalRegistration({
    id: 'clearAnnotationsModal',
    priority: 'low',
  });

  const setIsClearModalOpen = (open) => {
    if (open) {
      openIsClearModal();
    } else {
      closeIsClearModal();
    }
  };

  const formattedLabel = (fullscreen) => (fullscreen
    ? intl.formatMessage(intlMessages.exitFullscreenLabel)
    : intl.formatMessage(intlMessages.fullscreenLabel)
  );

  const formattedVisibilityLabel = (visible) => (visible
    ? intl.formatMessage(intlMessages.hideToolsDesc)
    : intl.formatMessage(intlMessages.showToolsDesc)
  );

  const extractShapes = (savedState) => {
    let data;

    // Check if savedState is a string (JSON) or an object
    if (typeof savedState === 'string') {
      try {
        data = JSON.parse(savedState);
      } catch (e) {
        console.error('Error parsing JSON:', e);
        return {};
      }
    } else if (typeof savedState === 'object' && savedState !== null) {
      data = savedState;
    } else {
      console.error('Invalid savedState type:', typeof savedState);
      return {};
    }

    // Check if 'records' key exists and extract shapes into an object keyed by shape ID
    if (data && data.records) {
      return data.records.reduce((acc, record) => {
        if (record.typeName === 'shape') {
          acc[record.id] = record;
        }
        return acc;
      }, {});
    }

    return {};
  };

  const handleFileInput = (event) => {
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        const dataObj = extractShapes(JSON.parse(fileContent));
        const dataArray = Object.values(dataObj);
        dataArray.forEach((originalShape) => {
          const shape = {
            ...originalShape,
            parentId: `page:${slideNum}`,
            meta: {
              ...originalShape.meta,
              createdBy: currentUser.userId,
            },
          };
          persistShape(shape, whiteboardId, currentUser.isModerator);
        });
      };
      reader.readAsText(file);

      // Reset the file input
      fileInput.value = '';
    }
  };

  // const handleFileClick = () => {
  //   const fileInput = document.getElementById('hiddenFileInput');
  //   if (fileInput) {
  //     fileInput.click();
  //   } else {
  //     console.error('File input not found');
  //   }
  // };

  function renderToastContent() {
    const { loading, hasError } = state;

    let icon = loading ? 'blank' : 'check';
    if (hasError) icon = 'circle_close';

    return (
      <Styled.Line>
        <Styled.ToastText>
          <span>
            {loading && !hasError && intl.formatMessage(intlMessages.downloading)}
            {!loading && !hasError && intl.formatMessage(intlMessages.downloaded)}
            {!loading && hasError && intl.formatMessage(intlMessages.downloadFailed)}
          </span>
        </Styled.ToastText>
        <Styled.StatusIcon>
          <Styled.ToastIcon
            done={!loading && !hasError}
            error={hasError}
            loading={loading}
            iconName={icon}
          />
        </Styled.StatusIcon>
      </Styled.Line>
    );
  }

  function getAvailableOptions() {
    // if any item is changed, please verify the function handleMouseLeave in whiteboard/hooks.js
    // to make sure the menu is closed when clicking on the options
    const actionItems = [];
    let visibilityItem = null;

    const showVisibilityOption = currentUser?.presenter || hasWBAccess;

    if (showVisibilityOption) {
      visibilityItem = {
        key: 'list-item-toolvisibility',
        dataTest: 'toolVisibility',
        isVisibilityToggle: true,
        label: formattedVisibilityLabel(isToolbarVisible),
        icon: isToolbarVisible ? 'close' : 'pen_tool',
        onClick: () => {
          setIsToolbarVisible(!isToolbarVisible);
        },
      };
    }

    // Presenters use the dock fullscreen chip; viewers use the top-left overlay button.
    if (!isIphone && currentUser?.presenter) {
      actionItems.push({
        key: 'list-item-fullscreen',
        dataTest: 'presentationFullscreen',
        label: formattedLabel(isFullscreen),
        icon: isFullscreen ? 'exit_fullscreen' : 'fullscreen',
        onClick: () => {
          togglePresentationFullscreen({
            fullscreenRef,
            elementId,
            currentElement,
            layoutContextDispatch,
          });
        },
      });
    }

    const { isIos } = deviceInfo;
    const { isSafari } = browserInfo;

    if (allowSnapshotOfCurrentSlide) {
      actionItems.push(
        {
          key: 'list-item-screenshot',
          label: intl.formatMessage(intlMessages.snapshotLabel),
          dataTest: 'presentationSnapshot',
          icon: 'video',
          onClick: async () => {
            setState({
              loading: true,
              hasError: false,
            });

            toast(renderToastContent(), {
              hideProgressBar: true,
              autoClose: false,
              newestOnTop: true,
              closeOnClick: true,
              toastId: toastId.current,
            });
            try {
              const data = await extractSlideContentToImage();
              const fileName = (isIos || isSafari)
                ? `${elementName}_${meetingName}_${new Date().toISOString()}.svg`
                : `${elementName}_${meetingName}_${new Date().toISOString()}.png`;
              const anchor = document.createElement('a');
              anchor.href = data;
              anchor.setAttribute(
                'download',
                fileName,
              );
              anchor.click();

              setState({
                loading: false,
                hasError: false,
              });
            } catch (e) {
              setState({
                loading: false,
                hasError: true,
              });

              logger.warn({
                logCode: 'presentation_snapshot_error',
                extraInfo: e,
              });
            }
          },
        },
      );
    }

    if (showVisibilityOption) {
      actionItems.push(
        {
          key: 'list-item-clear-annotations',
          dataTest: 'clearAnnotations',
          label: intl.formatMessage(intlMessages.clearAnnotationsTitle),
          icon: 'delete',
          onClick: () => {
            setIsClearModalOpen(true);
          },
        },
      );
    }

    // if (props.amIPresenter) {
    //   actionItems.push({
    //     key: 'list-item-load-shapes',
    //     dataTest: 'loadShapes',
    //     label: 'Load .tldr Data',
    //     icon: 'pen_tool',
    //     onClick: handleFileClick,
    //   });
    // }

    presentationDropdownItems.forEach((item, index) => {
      switch (item.type) {
        case PresentationDropdownItemType.OPTION:
          actionItems.push({
            key: `${item.id}-${index}`,
            label: item.label,
            icon: item.icon,
            onClick: item.onClick,
            dataTest: item.dataTest,
          });
          break;
        case PresentationDropdownItemType.SEPARATOR:
          actionItems.push({
            key: `${item.id}-${index}`,
            isSeparator: true,
            dataTest: item.dataTest,
          });
          break;
        default:
          break;
      }
    });

    return { visibilityItem, actionItems };
  }

  useEffect(() => {
    if (toast.isActive(toastId.current)) {
      toast.update(toastId.current, {
        render: renderToastContent(),
        hideProgressBar: state.loading,
        autoClose: state.loading ? false : 3000,
        newestOnTop: true,
        closeOnClick: true,
      });
    }
  });

  const { visibilityItem, actionItems } = getAvailableOptions();
  const hasAnyOption = visibilityItem || actionItems.length > 0;

  const renderToolbarButton = (item) => {
    if (item.isSeparator) return null;
    const isDanger = item.dataTest === 'clearAnnotations';
    const isActive = item.isVisibilityToggle && !isToolbarVisible;
    return (
      <TooltipContainer key={item.key} title={item.label}>
        <Styled.ActionButton
          type="button"
          className={`skyroom-wb-action-btn${isDanger ? ' skyroom-wb-action-btn--danger' : ''}${isActive ? ' skyroom-wb-action-btn--active' : ''}`}
          aria-label={item.label}
          aria-pressed={item.isVisibilityToggle ? !isToolbarVisible : undefined}
          data-test={item.dataTest}
          onClick={item.onClick}
        >
          <Icon iconName={item.icon} />
        </Styled.ActionButton>
      </TooltipContainer>
    );
  };

  if (!hasAnyOption) {
    const undoCtrls = document.getElementById('TD-Styles')?.nextSibling;
    if (undoCtrls?.style) {
      undoCtrls.style = 'padding:0px';
    }
    const styleTool = document.getElementById('TD-Styles')?.parentNode;
    if (styleTool?.style) {
      styleTool.style = 'right:0px';
    }
    return null;
  }

  return (
    <>
      <Styled.ToolbarDock
        id="WhiteboardOptionButton"
        data-skyroom-wb-toolbar="true"
      >
        {visibilityItem && renderToolbarButton(visibilityItem)}
        {isToolbarVisible && actionItems.map((item) => renderToolbarButton(item))}
        <input
          type="file"
          id="hiddenFileInput"
          className="skyroom-hidden-file-input"
          hidden
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
      </Styled.ToolbarDock>

      <ConfirmationModal
        intl={intl}
        isOpen={isClearModalOpen}
        onRequestClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          tldrawAPI?.deleteShapes(tldrawAPI?.getCurrentPageShapes().map((shape) => {
            if (currentUser?.presenter
              || currentUser.isModerator
              || (shape?.meta?.createdBy === currentUser?.userId)
            ) {
              return shape?.id;
            }
            return '';
          })?.filter((s) => s?.length > 0));
          setIsClearModalOpen(false);
        }}
        priority="0"
        title={intl.formatMessage(intlMessages.clearAnnotationsTitle)}
        description={(currentUser?.presenter || currentUser.isModerator)
          ? intl.formatMessage(intlMessages.clearAnnotationsDescription)
          : intl.formatMessage(intlMessages.viewerClearAnnotationsDescription)}
        confirmButtonLabel={intl.formatMessage(intlMessages.clearAnnotationsConfirmLabel)}
        cancelButtonLabel={intl.formatMessage(intlMessages.clearAnnotationsCancelLabel)}
        setIsOpen={setIsClearModalOpen}
      />
    </>
  );
};

PresentationMenu.propTypes = propTypes;

export default injectIntl(PresentationMenu);
