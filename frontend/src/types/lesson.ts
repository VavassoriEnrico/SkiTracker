export type SkiLesson = {
  id: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  instructor_id: string;
  customer_ids: string[];
};

export type LessonDraft = Pick<SkiLesson, 'lesson_date' | 'start_time' | 'end_time' | 'customer_ids'>;
