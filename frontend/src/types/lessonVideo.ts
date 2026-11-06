export type LessonVideo = {
  id: number;
  lesson_id: number;
  video_url: string;
  comment: string | null;
  customer_id: string | null;
  skeleton_video_url: string | null;
  pose_data_url: string | null;
};
