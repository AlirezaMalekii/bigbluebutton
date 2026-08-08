import { getVisibleMessages } from './utils';

const messages = [
  { id: 'first', timestamp: 10 },
  { id: 'second', timestamp: 20 },
  { id: 'third', timestamp: 30 },
];

it('hides chat messages until their recording timestamp is reached', () => {
  expect(getVisibleMessages(messages, -1)).toEqual([]);
  expect(getVisibleMessages(messages, 0)).toEqual([messages[0]]);
  expect(getVisibleMessages(messages, 1)).toEqual(messages.slice(0, 2));
  expect(getVisibleMessages(messages, 2)).toEqual(messages);
});
