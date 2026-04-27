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
  password: string;
};
