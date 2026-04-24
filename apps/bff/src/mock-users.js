export const mockUsers = [
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

export function findUserByCredentials(username, password) {
  return mockUsers.find((user) => user.username === username && user.password === password) ?? null;
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  };
}
