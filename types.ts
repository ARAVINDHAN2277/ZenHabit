
export type HabitCategory = 'Health' | 'Mind' | 'Career' | 'Personal';

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  data: boolean[][]; // [monthIndex][dayIndex]
}

export interface MonthlyReflection {
  wins: string;
  improvements: string;
}

export interface AppState {
  habits: Habit[];
  reflections: Record<number, MonthlyReflection>; // Store reflections per month index
  currentMonth: number; // 0-11
  year: number;
}
