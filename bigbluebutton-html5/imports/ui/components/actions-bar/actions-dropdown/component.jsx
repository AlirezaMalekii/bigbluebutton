/* eslint-disable react/prop-types */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { defineMessages } from 'react-intl';
import BBBMenu from '/imports/ui/components/common/menu/component';
import LayoutModalContainer from '/imports/ui/components/layout/modal/container';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import { ActionButtonDropdownItemType } from 'bigbluebutton-html-plugin-sdk/dist/cjs/extensible-areas/action-button-dropdown-item/enums';
import Styled from './styles';
import { colorPrimary } from '/imports/ui/stylesheets/styled-components/palette';
import { uniqueId } from '/imports/utils/string-utils';
import VideoPreviewContainer from '/imports/ui/components/video-preview/container';
import PollContainer from '/imports/ui/components/poll/container';
import TimerActivationModal from '/imports/ui/components/timer/activation-modal/component';
import { screenshareHasEnded } from '/imports/ui/components/screenshare/service';
import Session from '/imports/ui/services/storage/in-memory';
import { notify } from '/imports/ui/services/notification';
import { ModalRegistration } from '/imports/ui/core/singletons/modalController';
import { SKYROOM_OPEN_POLL_RESULTS_EVENT } from '/imports/ui/components/skyroom-layout/active-poll-summary/openPollResultsModal';

const propTypes = {
  hasActivePoll: PropTypes.bool,
  amIPresenter: PropTypes.bool,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  amIModerator: PropTypes.bool,
  shortcuts: PropTypes.string,
  handleTakePresenter: PropTypes.func.isRequired,
  isTimerActive: PropTypes.bool.isRequired,
  isTimerEnabled: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isTimerFeatureEnabled: PropTypes.bool.isRequired,
  isCameraAsContentEnabled: PropTypes.bool.isRequired,
  actionButtonDropdownItems: PropTypes.arrayOf(
    PropTypes.shape({
      allowed: PropTypes.bool,
      key: PropTypes.string,
    }),
  ).isRequired,
  isPresentationManagementDisabled: PropTypes.bool,
  isBreakout: PropTypes.bool,
};

const defaultProps = {
  hasActivePoll: false,
  shortcuts: '',
  isPresentationManagementDisabled: false,
  amIPresenter: false,
  amIModerator: false,
  isBreakout: false,
};

const intlMessages = defineMessages({
  actionsLabel: {
    id: 'app.actionsBar.actionsDropdown.actionsLabel',
    description: 'Actions button label',
  },
  activateTimerStopwatchLabel: {
    id: 'app.actionsBar.actionsDropdown.activateTimerStopwatchLabel',
    description: 'Activate timer/stopwatch label',
  },
  deactivateTimerStopwatchLabel: {
    id: 'app.actionsBar.actionsDropdown.deactivateTimerStopwatchLabel',
    description: 'Deactivate timer/stopwatch label',
  },
  presentationLabel: {
    id: 'app.actionsBar.actionsDropdown.presentationLabel',
    description: 'Upload a presentation option label',
  },
  presentationDesc: {
    id: 'app.actionsBar.actionsDropdown.presentationDesc',
    description: 'adds context to upload presentation option',
  },
  desktopShareDesc: {
    id: 'app.actionsBar.actionsDropdown.desktopShareDesc',
    description: 'adds context to desktop share option',
  },
  stopDesktopShareDesc: {
    id: 'app.actionsBar.actionsDropdown.stopDesktopShareDesc',
    description: 'adds context to stop desktop share option',
  },
  pollBtnLabel: {
    id: 'app.actionsBar.actionsDropdown.pollBtnLabel',
    description: 'poll menu toggle button label',
  },
  pollQuizBtnLabel: {
    id: 'app.actionsBar.actionsDropdown.pollQuizBtnLabel',
    description: 'poll/quiz menu toggle button label',
  },
  viewPollResultsLabel: {
    id: 'app.actionsBar.actionsDropdown.viewPollResultsLabel',
    description: 'label when a poll is active — opens live results',
  },
  viewQuizResultsLabel: {
    id: 'app.actionsBar.actionsDropdown.viewQuizResultsLabel',
    description: 'label when a quiz is active — opens live results',
  },
  pollBtnDesc: {
    id: 'app.actionsBar.actionsDropdown.pollBtnDesc',
    description: 'poll menu toggle button description',
  },
  pollPaneTitle: {
    id: 'app.poll.pollPaneTitle',
    description: 'poll modal title',
  },
  quizPaneTitle: {
    id: 'app.poll.quiz',
    description: 'quiz modal title',
  },
  pollCloseHint: {
    id: 'app.poll.modal.closeHint',
    description: 'hint shown when clicking outside poll modal',
  },
  timerPaneTitle: {
    id: 'app.timer.activationModal.title',
    description: 'timer activation modal title',
  },
  takePresenter: {
    id: 'app.actionsBar.actionsDropdown.takePresenter',
    description: 'Label for take presenter role option',
  },
  takePresenterDesc: {
    id: 'app.actionsBar.actionsDropdown.takePresenterDesc',
    description: 'Description of take presenter role option',
  },
  layoutModal: {
    id: 'app.actionsBar.actionsDropdown.layoutModal',
    description: 'Label for layouts selection button',
  },
  shareCameraAsContent: {
    id: 'app.actionsBar.actionsDropdown.shareCameraAsContent',
    description: 'Label for share camera as content',
  },
  unshareCameraAsContent: {
    id: 'app.actionsBar.actionsDropdown.unshareCameraAsContent',
    description: 'Label for unshare camera as content',
  },
});

const handlePresentationClick = () => Session.setItem('showUploadPresentationView', true);

class ActionsDropdown extends PureComponent {
  constructor(props) {
    super(props);

    this.presentationItemId = uniqueId('action-item-');
    this.pollId = uniqueId('action-item-');
    this.takePresenterId = uniqueId('action-item-');
    this.timerId = uniqueId('action-item-');
    this.selectUserRandId = uniqueId('action-item-');

    this.handleTimerClick = this.handleTimerClick.bind(this);
    this.makePresentationItems = this.makePresentationItems.bind(this);
    this.handlePollActionClick = this.handlePollActionClick.bind(this);
    this.handlePollModalOutsideClick = this.handlePollModalOutsideClick.bind(this);
    this.handleSkyroomOpenPollResults = this.handleSkyroomOpenPollResults.bind(this);
    this.handlePollPaneTitleChange = this.handlePollPaneTitleChange.bind(this);

    this.state = {
      pollModalIsQuiz: false,
    };
  }

  componentDidMount() {
    window.addEventListener(SKYROOM_OPEN_POLL_RESULTS_EVENT, this.handleSkyroomOpenPollResults);
  }

  componentWillUnmount() {
    window.removeEventListener(SKYROOM_OPEN_POLL_RESULTS_EVENT, this.handleSkyroomOpenPollResults);
  }

  handleSkyroomOpenPollResults() {
    Session.setItem('forcePollOpen', true);
    Session.setItem('pollInitiated', true);
    this.setPollModalIsOpen(true);
  }

  handleTimerClick() {
    const { isTimerActive, deactivateTimer } = this.props;
    if (!isTimerActive) {
      this.setTimerModalIsOpen(true);
    } else {
      deactivateTimer();
    }
  }

  handlePollActionClick() {
    const { hasActivePoll } = this.props;
    Session.setItem('forcePollOpen', true);
    if (hasActivePoll) {
      Session.setItem('pollInitiated', true);
    }
    this.setPollModalIsOpen(true);
  }

  handlePollPaneTitleChange(isQuiz) {
    this.setState({ pollModalIsQuiz: isQuiz });
  }

  handlePollModalOutsideClick() {
    const { intl } = this.props;
    notify(intl.formatMessage(intlMessages.pollCloseHint), 'warning', 'close');
  }

  getAvailableActions() {
    const {
      intl,
      amIPresenter,
      handleTakePresenter,
      isPollingEnabled,
      isTimerActive,
      isTimerEnabled,
      amIModerator,
      hasCameraAsContent,
      actionButtonDropdownItems,
      isCameraAsContentEnabled,
      isTimerFeatureEnabled,
      presentations,
      isPresentationEnabled,
      isPresentationManagementDisabled,
      isQuizEnabled,
      isBreakout,
      hasActivePoll,
    } = this.props;

    const {
      pollBtnLabel,
      presentationLabel,
      takePresenter,
      pollQuizBtnLabel,
      viewPollResultsLabel,
      viewQuizResultsLabel,
    } = intlMessages;

    const { formatMessage } = intl;

    const actions = [];

    if (amIPresenter && !isPresentationManagementDisabled && isPresentationEnabled) {
      if (presentations && presentations.length > 1) {
        actions.push({
          key: 'separator-01',
          isSeparator: true,
        });
      }
      actions.push({
        icon: 'upload',
        dataTest: 'managePresentations',
        label: formatMessage(presentationLabel),
        key: this.presentationItemId,
        onClick: handlePresentationClick,
      });
    }

    if (amIPresenter && isPollingEnabled) {
      let pollActionLabel = isQuizEnabled
        ? formatMessage(pollQuizBtnLabel)
        : formatMessage(pollBtnLabel);
      if (hasActivePoll) {
        pollActionLabel = isQuizEnabled
          ? formatMessage(viewQuizResultsLabel)
          : formatMessage(viewPollResultsLabel);
      }
      actions.push({
        icon: 'polling',
        dataTest: hasActivePoll ? 'viewPollResults' : 'polling',
        label: pollActionLabel,
        key: this.pollId,
        onClick: this.handlePollActionClick,
      });
    }

    if (!amIPresenter && (amIModerator || isBreakout)) {
      actions.push({
        icon: 'presentation',
        label: formatMessage(takePresenter),
        key: this.takePresenterId,
        onClick: () => handleTakePresenter(),
      });
    }

    if (amIModerator && isTimerEnabled && isTimerFeatureEnabled) {
      actions.push({
        icon: 'time',
        label: isTimerActive
          ? intl.formatMessage(intlMessages.deactivateTimerStopwatchLabel)
          : intl.formatMessage(intlMessages.activateTimerStopwatchLabel),
        key: this.timerId,
        onClick: () => this.handleTimerClick(),
        dataTest: 'timerStopWatchFeature',
      });
    }

    if (isCameraAsContentEnabled && amIPresenter) {
      actions.push({
        icon: hasCameraAsContent ? 'video_off' : 'video',
        label: hasCameraAsContent
          ? intl.formatMessage(intlMessages.unshareCameraAsContent)
          : intl.formatMessage(intlMessages.shareCameraAsContent),
        key: 'camera as content',
        onClick: hasCameraAsContent
          ? screenshareHasEnded
          : () => {
            screenshareHasEnded();
            this.setCameraAsContentModalIsOpen(true);
          },
        dataTest: 'shareCameraAsContent',
      });
    }

    actionButtonDropdownItems.forEach((actionButtonItem) => {
      switch (actionButtonItem.type) {
        case ActionButtonDropdownItemType.OPTION:
          actions.push({
            icon: actionButtonItem.icon,
            label: actionButtonItem.label,
            key: actionButtonItem.id,
            onClick: actionButtonItem.onClick,
            allowed: actionButtonItem.allowed,
            dataTest: actionButtonItem.dataTest,
          });
          break;
        case ActionButtonDropdownItemType.SEPARATOR:
          actions.push({
            key: actionButtonItem.id,
            allowed: actionButtonItem.allowed,
            isSeparator: true,
            dataTest: actionButtonItem.dataTest,
          });
          break;
        default:
          break;
      }
    });

    return actions;
  }

  makePresentationItems() {
    const {
      presentations,
      setPresentation,
      setPresentationFitToWidth,
    } = this.props;

    const presentationItemElements = presentations
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => {
        const customStyles = { color: colorPrimary };

        return (
          {
            customStyles: p.current ? customStyles : null,
            icon: 'file',
            iconRight: p.current ? 'check' : null,
            selected: !!p.current,
            label: p.name,
            description: 'uploaded presentation file',
            key: `uploaded-presentation-${p.presentationId}`,
            onClick: () => {
              setPresentationFitToWidth(false);
              setPresentation(p.presentationId);
            },
          }
        );
      });
    return presentationItemElements;
  }

  render() {
    const {
      intl,
      amIPresenter,
      shortcuts: OPEN_ACTIONS_AK,
      isConnected,
      isDropdownOpen,
      isMobile,
      isRTL,
    } = this.props;

    const availableActions = this.getAvailableActions();
    const availablePresentations = this.makePresentationItems();
    const children = availablePresentations.length > 1 && amIPresenter
      ? availablePresentations.concat(availableActions)
      : availableActions;

    const customStyles = { top: '-1rem' };

    if (availableActions.length === 0 || !isConnected) {
      return null;
    }

    return (
      <>
        <BBBMenu
          customStyles={!isMobile ? customStyles : null}
          overrideMobileStyles
          accessKey={OPEN_ACTIONS_AK}
          trigger={(
            <Styled.HideDropdownButton
              open={isDropdownOpen}
              hideLabel
              aria-label={intl.formatMessage(intlMessages.actionsLabel)}
              data-test="actionsButton"
              label={intl.formatMessage(intlMessages.actionsLabel)}
              icon="plus"
              color="primary"
              size="lg"
              circle
              onClick={() => null}
            />
          )}
          actions={children}
          opts={{
            id: 'actions-dropdown-menu',
            className: 'skyroom-actions-menu',
            keepMounted: true,
            transitionDuration: 0,
            elevation: 8,
            getcontentanchorel: null,
            fullwidth: 'true',
            disableScrollLock: true,
            BackdropProps: {
              invisible: true,
            },
            anchorOrigin: { vertical: 'top', horizontal: isRTL ? 'right' : 'left' },
            transformOrigin: { vertical: 'bottom', horizontal: isRTL ? 'right' : 'left' },
          }}
        />
        {/* Layout Modal */}
        <ModalRegistration id="layoutModal" priority="low">
          {({
            isOpen,
            id,
            open,
            close,
          }) => {
            this.setLayoutModalIsOpen = (value) => {
              if (value) open();
              else close();
            };
            return isOpen && (
              <LayoutModalContainer
                onRequestClose={close}
                priority="low"
                isOpen={isOpen}
                id={id}
                setIsOpen={isOpen ? close : open}
              />
            );
          }}
        </ModalRegistration>

        {/* Poll Modal */}
        <ModalRegistration id="pollModal" priority="low">
          {({
            isOpen,
            id,
            open,
            close,
          }) => {
            const { pollModalIsQuiz } = this.state;
            this.setPollModalIsOpen = (value) => {
              if (value) open();
              else close();
            };
            return isOpen && (
              <ModalSimple
                id={id}
                modalIsOpen={isOpen}
                className="poll-creation-modal"
                data-test="pollCreationModal"
                headerPosition="top"
                shouldCloseOnOverlayClick={false}
                shouldCloseOnEsc={false}
                onOutsideClick={this.handlePollModalOutsideClick}
                onRequestClose={() => {
                  Session.setItem('forcePollOpen', false);
                  this.setState({ pollModalIsQuiz: false });
                  close();
                }}
                title={intl.formatMessage(
                  pollModalIsQuiz
                    ? intlMessages.quizPaneTitle
                    : intlMessages.pollPaneTitle,
                )}
              >
                <Styled.PollModalBody data-test="pollModalBody">
                  <PollContainer
                    isEmbeddedInModal
                    onPaneTitleChange={this.handlePollPaneTitleChange}
                    onRequestClose={() => {
                      Session.setItem('forcePollOpen', false);
                      this.setState({ pollModalIsQuiz: false });
                      close();
                    }}
                  />
                </Styled.PollModalBody>
              </ModalSimple>
            );
          }}
        </ModalRegistration>

        {/* Timer Activation Modal */}
        <ModalRegistration id="timerActivationModal" priority="low">
          {({
            isOpen,
            id,
            open,
            close,
          }) => {
            this.setTimerModalIsOpen = (value) => {
              if (value) open();
              else close();
            };
            return isOpen && (
              <ModalSimple
                id={id}
                modalIsOpen={isOpen}
                className="timer-activation-modal"
                data-test="timerActivationModal"
                headerPosition="top"
                onRequestClose={close}
                title={intl.formatMessage(intlMessages.timerPaneTitle)}
              >
                <Styled.TimerModalBody>
                  <TimerActivationModal
                    onSubmit={(payload) => {
                      const { activateTimer } = this.props;
                      activateTimer(payload);
                      close();
                    }}
                    onRequestClose={close}
                  />
                </Styled.TimerModalBody>
              </ModalSimple>
            );
          }}
        </ModalRegistration>

        {/* Camera as Content Modal */}
        <ModalRegistration id="cameraAsContentModal" priority="low">
          {({
            isOpen,
            id,
            open,
            close,
          }) => {
            this.setCameraAsContentModalIsOpen = (value) => {
              if (value) open();
              else close();
            };
            return isOpen && (
              <VideoPreviewContainer
                cameraAsContent
                amIPresenter
                {...{
                  callbackToClose: close,
                  priority: 'low',
                  setIsOpen: isOpen ? close : open,
                  isOpen,
                  id,
                }}
              />
            );
          }}
        </ModalRegistration>
      </>
    );
  }
}

ActionsDropdown.propTypes = propTypes;
ActionsDropdown.defaultProps = defaultProps;

export default ActionsDropdown;
