import React from 'react';
import caseInsensitiveReducer from '/imports/utils/caseInsensitiveReducer';
import { defineMessages, useIntl } from 'react-intl';
import Styled from './styles';
import PollResultsChart from '/imports/ui/components/poll/components/PollResultsChart';

interface ChatPollContentProps {
  metadata: string;
}

interface Metadata {
  id: string;
  question: string;
  numRespondents: number;
  numResponders: number;
  questionText: string;
  questionType: string;
  answers: Array<Answers>;
}

interface Answers {
  key: string;
  numVotes: number;
  id: number;
  isCorrectAnswer: boolean;
}

type TranslatedPollAnswer = {
  label: string;
  count: number;
  isCorrectAnswer: boolean;
};

const intlMessages = defineMessages({
  true: {
    id: 'app.poll.t',
    description: 'Poll true option value',
  },
  false: {
    id: 'app.poll.f',
    description: 'Poll false option value',
  },
  yes: {
    id: 'app.poll.y',
    description: 'Poll yes option value',
  },
  no: {
    id: 'app.poll.n',
    description: 'Poll no option value',
  },
  abstention: {
    id: 'app.poll.abstention',
    description: 'Poll Abstention option value',
  },
  vote: {
    id: 'app.chat.content.pollVote',
    description: 'Vote label',
  },
  votes: {
    id: 'app.chat.content.pollVotes',
    description: 'Votes label',
  },
  correctAnswer: {
    id: 'app.poll.quiz.options.correct',
    description: 'Correct answer label for quiz options',
  },
});

function assertAsMetadata(metadata: unknown): asserts metadata is Metadata {
  if (typeof metadata !== 'object' || metadata === null) {
    throw new Error('metadata is not an object');
  }
  if (typeof (metadata as Metadata).id !== 'string') {
    throw new Error('metadata.id is not a string');
  }
  if (typeof (metadata as Metadata).numRespondents !== 'number') {
    throw new Error('metadata.numRespondents is not a number');
  }
  if (typeof (metadata as Metadata).numResponders !== 'number') {
    throw new Error('metadata.numResponders is not a number');
  }
  if (typeof (metadata as Metadata).questionText !== 'string') {
    throw new Error('metadata.questionText is not a string');
  }
  if (typeof (metadata as Metadata).questionType !== 'string') {
    throw new Error('metadata.questionType is not a string');
  }
  if (!Array.isArray((metadata as Metadata).answers)) {
    throw new Error('metadata.answers is not an array');
  }
}

const ChatPollContent: React.FC<ChatPollContentProps> = ({
  metadata: string,
}) => {
  const intl = useIntl();

  const pollData = JSON.parse(string) as unknown;
  assertAsMetadata(pollData);

  const answers = pollData.answers.reduce(caseInsensitiveReducer, []);

  const translatedAnswers: TranslatedPollAnswer[] = answers.map((answer: Answers) => {
    const translationKey = intlMessages[answer.key.toLowerCase() as keyof typeof intlMessages];
    const pollAnswer = translationKey ? intl.formatMessage(translationKey) : answer.key;
    return {
      label: pollAnswer,
      count: answer.numVotes,
      isCorrectAnswer: answer.isCorrectAnswer,
    };
  });

  return (
    <>
      <Styled.PollWrapper aria-hidden data-test="chatPollMessageText">
        <Styled.PollText>
          {pollData.questionText}
        </Styled.PollText>
        <PollResultsChart
          data={translatedAnswers}
          dataTest="chatPollResultsChart"
          variant="chat"
        />
      </Styled.PollWrapper>
      <p className="sr-only">
        {pollData.questionText ? `${pollData.questionText}: ` : ''}
        {`${translatedAnswers
          .map((answer: TranslatedPollAnswer) => `${answer.isCorrectAnswer ? `${intl.formatMessage(intlMessages.correctAnswer)}: ` : ''}${answer.label}: ${answer.count} ${
            answer.count === 1 ? intl.formatMessage(intlMessages.vote) : intl.formatMessage(intlMessages.votes)
          }`)
          .join(', ')}.`}
      </p>
      <ul className="sr-only">
        {translatedAnswers.map((answer: TranslatedPollAnswer) => (
          <li key={answer.label}>{`${answer.isCorrectAnswer ? `${intl.formatMessage(intlMessages.correctAnswer)}: ` : ''}${answer.label} — ${answer.count}`}</li>
        ))}
      </ul>
    </>
  );
};

export default ChatPollContent;
