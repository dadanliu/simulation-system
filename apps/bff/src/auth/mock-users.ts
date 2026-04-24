export type AuthUser = {
  id: string;
  username: string;
  name: string;
  role: string;
};

type MockUserRecord = AuthUser & {
  password: string;
};

const mockUsers: MockUserRecord[] = [
  {
    id: "u_admin_001",
    username: "admin",
    password: "admin123",
    name: "Admin User",
    role: "admin"
  },
  {
    id: "u_operator_001",
    username: "operator",
    password: "operator123",
    name: "Operator User",
    role: "operator"
  }
];

export function findUserByCredentials(username: string, password: string): AuthUser | null {
  const user = mockUsers.find((item) => item.username === username && item.password === password);

  if (!user) {
    return null;
  }

  const { password: _password, ...safeUser } = user;
  return safeUser;
}
