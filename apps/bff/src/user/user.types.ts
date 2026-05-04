export type AuthUser = {
  id: string;
  username: string;
  roles: string[];
};

export type User = AuthUser & {
  displayName: string;
  enabled: boolean;
};

export type UserRecord = User & {
  passwordHash: string;
};

export type CreateUserInput = Omit<User, "id"> & {
  id?: string;
  password: string;
};

export type UpdateUserInput = Partial<Omit<User, "id">>;
