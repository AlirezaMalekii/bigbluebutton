import React, { useEffect, useState } from 'react';
import { patch } from '@mconf/bbb-diff';
import Styled from './styles';
import { GET_PAD_CONTENT_DIFF_STREAM, GetPadContentDiffStreamResponse } from './queries';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';

interface PadContentProps {
  content: string;
}

interface PadContentContainerProps {
  externalId: string;
}

/** Viewing mode must not run Etherpad JS (ace2/require-kernel) inside srcDoc. */
const stripEtherpadScripts = (html: string): string => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script\b[^>]*\/>/gi, '');

const PadContent: React.FC<PadContentProps> = ({
  content,
}) => {
  const safeContent = stripEtherpadScripts(content);
  const contentSplit = safeContent.split('<body>');
  const contentStyle = `
  <body>
  <base target="_blank">
  <style type="text/css">
    body {
      ${Styled.contentText}
    }
  </style>
  `;
  const contentWithStyle = contentSplit.length > 1
    ? [contentSplit[0], contentStyle, contentSplit.slice(1).join('<body>')].join('')
    : safeContent;
  return (
    <Styled.Wrapper>
      <Styled.Iframe
        title="shared notes viewing mode"
        srcDoc={contentWithStyle}
        sandbox=""
        data-test="sharedNotesViewingMode"
      />
    </Styled.Wrapper>
  );
};

const PadContentContainer: React.FC<PadContentContainerProps> = ({ externalId }) => {
  const [content, setContent] = useState('');
  const { data: contentDiffData } = useDeduplicatedSubscription<GetPadContentDiffStreamResponse>(
    GET_PAD_CONTENT_DIFF_STREAM,
    { variables: { externalId } },
  );

  useEffect(() => {
    if (!contentDiffData) return;
    const patches = contentDiffData.sharedNotes_diff_stream;
    const patchedContent = patches.reduce((currentContent, attribs) => patch(
      currentContent,
      { start: attribs.start, end: attribs.end, text: attribs.diff },
    ), content);
    setContent(patchedContent);
  }, [contentDiffData]);

  return (
    <PadContent content={content} />
  );
};

export default PadContentContainer;
