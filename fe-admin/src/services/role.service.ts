import { apiGetData, apiPutData } from './api';
import { RoleEntityDto, UpdateRoleRequestDto } from '@/types/dto/roles.dto';

export const roleService = {
    getAll: () => apiGetData<RoleEntityDto[]>('/roles'),
    update: (id: string, payload: UpdateRoleRequestDto) =>
        apiPutData<RoleEntityDto, UpdateRoleRequestDto>(`/roles/${id}`, payload),
};
