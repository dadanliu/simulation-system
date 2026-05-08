export type AuthUser = {
  id: string;
  permissions: string[];
  roles: string[];
  username: string;
};

export type User = {
  displayName: string;
  enabled: boolean;
  id: string;
  roles: string[];
  username: string;
};

export type UserRecord = User & {
  passwordHash: string;
};

export type CreateUserInput = Omit<User, "id"> & {
  id?: string;
  password: string;
};

export type UpdateUserInput = Partial<Omit<User, "id">>;
