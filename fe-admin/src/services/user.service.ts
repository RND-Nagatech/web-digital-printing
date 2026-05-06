import { apiDeleteOk, apiGetData, apiPostData, apiPutData } from './api';
import { User } from '@/types/user';
import { CreateUserRequestDto, UpdateUserRequestDto, UserEntityDto } from '@/types/dto/users.dto';

const mapUser = (u: UserEntityDto): User => ({
  id: u._id,
  name: u.username,
  email: u.email ?? `${u.username}@local`,
  role: u.role,
  active: true,
  createdAt: u.created_at,
});

export const userService = {
  getPaged: (params: { page: number; limit: number; search?: string }) =>
    apiGetData<any>(`/users?page=${params.page}&limit=${params.limit}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}`)
      .then((res) => {
        // backend may return paged { items, meta } or plain array
        if (Array.isArray(res)) return res.map(mapUser);
        if (res && typeof res === 'object') {
          const items = (res.items || []).map(mapUser);
          const meta = res.meta ?? {
            page: params.page,
            limit: params.limit,
            total: items.length,
            totalPages: 1,
          };
          return { items, meta };
        }
        return [] as User[];
      }),
  async getAll(params?: { search?: string }) {
    const raw = await apiGetData<any>(`/users?page=1&limit=1000${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}`);
    const list: UserEntityDto[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
    let data = list.map(mapUser);
    if (params?.search) {
      const q = params.search.toLowerCase();
      data = data.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return data;
  },
  getById: async (id: string) => (await userService.getAll()).find((u) => u.id === id) ?? null,
  create: async (payload: Omit<User, 'id' | 'createdAt'>) => {
    const dto: CreateUserRequestDto = { username: payload.name.toUpperCase(), email: payload.email, password: 'password123', role: payload.role };
    const res = await apiPostData<UserEntityDto, CreateUserRequestDto>('/users', dto);
    return mapUser(res);
  },
  async update(id: string, payload: Partial<User>) {
    const dto: UpdateUserRequestDto = {
      ...(payload.name !== undefined ? { username: payload.name.toUpperCase() } : {}),
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.role !== undefined ? { role: payload.role } : {}),
    };
    await apiPutData<UserEntityDto, UpdateUserRequestDto>(`/users/${id}`, dto);
    return (await userService.getById(id)) as User;
  },
  delete: (id: string) => apiDeleteOk(`/users/${id}`),
};
