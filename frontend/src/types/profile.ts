export type Profile = {
  id: string;
  created_at: string;
  name: string | null;
  surname: string | null;
  username: string | null;
  email: string | null;
  role: 'student' | 'ski_instructor';
  birth_date: string | null;
};

export type ProfileUpdate = Partial<
  Pick<Profile, 'name' | 'surname' | 'username' | 'birth_date'>
>;
