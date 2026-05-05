export interface RoleEntityDto {
    _id: string;
    name: string;
    permissions: string[];
    created_at?: string;
}

export interface UpdateRoleRequestDto {
    name?: string;
    permissions?: string[];
}
