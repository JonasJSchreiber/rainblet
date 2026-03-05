import { Question } from '../models/game.models';

export const QUESTION_BANK: Question[] = [
  {
    id: 'math-1',
    prompt: 'What is 12 x 8?',
    options: ['84', '96', '104', '108'],
    correctIndex: 1,
    topic: 'Math'
  },
  {
    id: 'math-2',
    prompt: 'Solve: 45 + 27',
    options: ['62', '72', '82', '92'],
    correctIndex: 1,
    topic: 'Math'
  },
  {
    id: 'science-1',
    prompt: 'Which planet is known as the Red Planet?',
    options: ['Mars', 'Venus', 'Jupiter', 'Mercury'],
    correctIndex: 0,
    topic: 'Science'
  },
  {
    id: 'science-2',
    prompt: 'Water freezes at what temperature in Celsius?',
    options: ['-10', '0', '10', '32'],
    correctIndex: 1,
    topic: 'Science'
  },
  {
    id: 'history-1',
    prompt: 'Who was the first U.S. president?',
    options: ['Thomas Jefferson', 'Abraham Lincoln', 'George Washington', 'John Adams'],
    correctIndex: 2,
    topic: 'History'
  },
  {
    id: 'history-2',
    prompt: 'The pyramids are primarily associated with which civilization?',
    options: ['Roman', 'Mayan', 'Egyptian', 'Greek'],
    correctIndex: 2,
    topic: 'History'
  },
  {
    id: 'language-1',
    prompt: 'What is a synonym for "rapid"?',
    options: ['Slow', 'Quick', 'Heavy', 'Tiny'],
    correctIndex: 1,
    topic: 'Language'
  },
  {
    id: 'language-2',
    prompt: 'Which sentence is punctuated correctly?',
    options: [
      'Lets eat, grandma.',
      'Let\'s eat grandma.',
      'Let\'s eat, grandma.',
      'Lets eat grandma.'
    ],
    correctIndex: 2,
    topic: 'Language'
  },
  {
    id: 'geo-1',
    prompt: 'Which is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctIndex: 3,
    topic: 'Geography'
  },
  {
    id: 'geo-2',
    prompt: 'What is the capital of Japan?',
    options: ['Seoul', 'Tokyo', 'Kyoto', 'Beijing'],
    correctIndex: 1,
    topic: 'Geography'
  }
];
