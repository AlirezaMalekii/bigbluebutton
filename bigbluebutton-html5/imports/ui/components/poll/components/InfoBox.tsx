import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Styled from '../styles';

const intlMessages = defineMessages({
  pollInfo: {
    id: 'app.poll.info',
    description: 'Information about the poll',
  },
  quizInfo: {
    id: 'app.poll.quiz.info',
    description: 'Information about the quiz',
  },
});

interface InfoBoxContainerProps {
  isQuiz: boolean;
}

const InfoBox: React.FC<InfoBoxContainerProps> = ({
  isQuiz,
}) => {
  const intl = useIntl();
  const message = (() => {
    try {
      return isQuiz
        ? intl.formatMessage(intlMessages.quizInfo)
        : intl.formatMessage(intlMessages.pollInfo);
    } catch (error) {
      return isQuiz
        ? 'حالت آزمون: پاسخ صحیح هر پرسش را انتخاب کنید.'
        : 'حالت نظرسنجی: دیدگاه‌ها را جمع‌آوری و نتایج را بررسی کنید.';
    }
  })();

  return (
    <Styled.InfoBoxContainer isQuiz={isQuiz}>
      <p>{message}</p>
    </Styled.InfoBoxContainer>
  );
};

export default InfoBox;
