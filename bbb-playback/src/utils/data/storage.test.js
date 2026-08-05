jest.mock('utils/builder', () => ({
  addAlternatesToThumbnails: jest.fn(),
  build: jest.fn(),
  mergeMessages: (...arrays) => arrays.flat().sort((a, b) => a.timestamp - b.timestamp),
}));
jest.mock('utils/data', () => ({
  buildFileURL: file => file,
  getFileType: file => file.split('.').pop(),
}));

import { buildChatMessages } from './storage';

it('does not merge external media into chat messages', () => {
  const chat = [{ timestamp: 2, message: 'سلام' }];
  const polls = [{ timestamp: 3, question: 'سوال' }];
  const externalMedia = [{ timestamp: 1, url: 'https://secret.example/video?sessionToken=secret' }];

  expect(buildChatMessages(chat, polls, externalMedia)).toEqual([...chat, ...polls]);
});
