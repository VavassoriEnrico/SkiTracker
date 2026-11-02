export type SkiCustomer = {
  id: string;
  created_at: string;
  email: string | null;
  profile_image_url: string | null;
  name: string | null;
  surname: string | null;
  username: string | null;
  birth_date: string | null;
  sex: string | null;
  level: number | null;
  ability: number | null;
};

export type SkiCustomerCreate = Omit<SkiCustomer, 'id' | 'created_at' | 'profile_image_url' | 'email'> & {
  name: string;
  surname: string;
  email: string;
  password: string;
};

export type SkiCustomerUpdate = Partial<Pick<SkiCustomer,
  'name' | 'surname' | 'username' | 'birth_date' | 'sex' | 'level' | 'ability'
>>;
