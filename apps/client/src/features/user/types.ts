export type UserRole = "admin" | "operator" | "viewer";

export type User = {
  displayName: string;
  enabled: boolean;
  id: string;
  roles: UserRole[];
  username: string;
};

export type CreateUserInput = {
  displayName: string;
  enabled: boolean;
  password: string;
  roles: UserRole[];
  username: string;
};
