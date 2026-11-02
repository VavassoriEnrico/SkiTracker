export type SkiInstructor = {
  id: string;
  created_at: string;
  name: string | null;
  surname: string | null;
  username: string | null;
  email: string | null;
  birth_date: string | null;
};

export type SkiInstructorUpdate = Partial<
  Pick<SkiInstructor, 'name' | 'surname' | 'username' | 'birth_date'>
>;
