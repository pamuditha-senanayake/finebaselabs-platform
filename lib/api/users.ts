import type { User } from "@/lib/types";
import { mockUsers } from "@/lib/mock-data";
import { clone, delay } from "@/lib/api/_shared";

function toUser(user: (typeof mockUsers)[number]): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function listUsers(): Promise<User[]> {
  await delay();

  return mockUsers.map((user) => clone(toUser(user)));
}

export async function getUser(id: string): Promise<User | null> {
  await delay();

  const user = mockUsers.find((item) => item.id === id);

  return user ? clone(toUser(user)) : null;
}

export async function authenticate(
  email: string,
  password: string,
): Promise<User | null> {
  await delay();

  const normalizedEmail = email.trim().toLowerCase();
  const user = mockUsers.find(
    (item) =>
      item.email.toLowerCase() === normalizedEmail &&
      item.password === password,
  );

  return user ? clone(toUser(user)) : null;
}
