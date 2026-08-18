import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useQuery } from '@apollo/client';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import { GET_WELCOME_MESSAGE, WelcomeMsgsResponse } from '/imports/ui/components/session-details/queries';
import { stripHtml } from '/imports/ui/components/session-details/utils';

const intlMessages = defineMessages({
  title: {
    id: 'app.skyroom.meetingDetails.title',
    description: 'Meeting details modal title',
    defaultMessage: 'جزییات جلسه',
  },
  meetingNameLabel: {
    id: 'app.skyroom.meetingDetails.meetingNameLabel',
    description: 'Label for meeting name in meeting details modal',
    defaultMessage: 'نام جلسه:',
  },
  descriptionLabel: {
    id: 'app.skyroom.meetingDetails.descriptionLabel',
    description: 'Label for meeting description in meeting details modal',
    defaultMessage: 'توضیحات:',
  },
  dismissLabel: {
    id: 'app.sessionDetails.dismissLabel',
    description: 'Dismiss button label',
  },
  dismissDesc: {
    id: 'app.sessionDetails.dismissDesc',
    description: 'adds descriptive context to dismissLabel',
  },
});

type SkyroomMeetingDetailsModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  priority: string;
};

const SkyroomMeetingDetailsModal: React.FC<SkyroomMeetingDetailsModalProps> = ({
  isOpen,
  onRequestClose,
  priority,
}) => {
  const intl = useIntl();

  const { data: meeting, loading: meetingLoading } = useMeeting((m) => ({
    name: m.name,
  }));

  const { data: currentUserData } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
  }));

  const {
    data: welcomeData,
    loading: welcomeLoading,
  } = useQuery<WelcomeMsgsResponse>(GET_WELCOME_MESSAGE);

  if (meetingLoading || welcomeLoading || !meeting) return null;

  const welcomeMessage = welcomeData?.user_welcomeMsgs?.[0]?.welcomeMsg ?? '';
  const welcomeMsgForModerators = welcomeData?.user_welcomeMsgs?.[0]?.welcomeMsgForModerators ?? '';
  const isModerator = Boolean(currentUserData?.isModerator);

  const welcomePlain = stripHtml(welcomeMessage);
  const modWelcomePlain = stripHtml(welcomeMsgForModerators);
  const descriptionHtml = (isModerator && modWelcomePlain.length > 0)
    ? welcomeMsgForModerators
    : welcomeMessage;
  const hasDescription = (isModerator && modWelcomePlain.length > 0)
    ? modWelcomePlain.length > 0
    : welcomePlain.length > 0;

  return (
    <ModalSimple
      title={intl.formatMessage(intlMessages.title)}
      dismiss={{
        label: intl.formatMessage(intlMessages.dismissLabel),
        description: intl.formatMessage(intlMessages.dismissDesc),
      }}
      data-test="skyroomMeetingDetailsModal"
      modalIsOpen={isOpen}
      onRequestClose={onRequestClose}
      priority={priority}
    >
      <div className="skyroom-about-body" data-test="skyroomMeetingDetailsBody">
        <p className="skyroom-meeting-details-name">
          <strong>{intl.formatMessage(intlMessages.meetingNameLabel)}</strong>
          {' '}
          {meeting.name}
        </p>
        {hasDescription ? (
          <div className="skyroom-meeting-details-description">
            <p className="skyroom-meeting-details-description-label">
              <strong>{intl.formatMessage(intlMessages.descriptionLabel)}</strong>
            </p>
            <div
              className="skyroom-meeting-details-description-body"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        ) : null}
      </div>
    </ModalSimple>
  );
};

export default SkyroomMeetingDetailsModal;
