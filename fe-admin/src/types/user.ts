export type Role = "admin" | "owner" | "kasir";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatar?: string;
  active: boolean;
  createdAt: string;
}

export interface AuthUser extends User {
  permissions: string[];
}
