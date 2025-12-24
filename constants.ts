
import { Habit, HabitCategory } from './types';

export const CATEGORIES: HabitCategory[] = ['Health', 'Mind', 'Career', 'Personal'];

export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const createEmptyYearData = () => MONTH_DAYS.map(days => Array(days).fill(false));

export const INITIAL_HABITS: Habit[] = [
  { id: '1', name: '7h+ Quality Sleep', category: 'Health', data: createEmptyYearData() },
  { id: '2', name: 'Morning Exercise', category: 'Health', data: createEmptyYearData() },
  { id: '3', name: 'Drink 2L Water', category: 'Health', data: createEmptyYearData() },
  { id: '4', name: '10 min Meditation', category: 'Mind', data: createEmptyYearData() },
  { id: '5', name: 'Daily Journaling', category: 'Mind', data: createEmptyYearData() },
  { id: '6', name: 'Digital Detox Hour', category: 'Mind', data: createEmptyYearData() },
  { id: '7', name: 'Deep Work Session', category: 'Career', data: createEmptyYearData() },
  { id: '8', name: 'Networking/Social', category: 'Career', data: createEmptyYearData() },
  { id: '9', name: 'Learn New Skill', category: 'Career', data: createEmptyYearData() },
  { id: '10', name: 'Read 20 Pages', category: 'Personal', data: createEmptyYearData() },
  { id: '11', name: 'Language Practice', category: 'Personal', data: createEmptyYearData() },
  { id: '12', name: 'No Spending Day', category: 'Personal', data: createEmptyYearData() },
  { id: '13', name: 'Vitamin Intake', category: 'Health', data: createEmptyYearData() },
  { id: '14', name: 'Inbox Zero', category: 'Career', data: createEmptyYearData() },
  { id: '15', name: 'Evening Stretch', category: 'Health', data: createEmptyYearData() },
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
