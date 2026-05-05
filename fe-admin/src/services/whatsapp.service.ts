import { api, apiGetData, apiPostData } from './api';
import { AutoReplyRule, WhatsAppSetting } from '@/types/order';
import { WhatsappAutoReplyRequestDto, WhatsappQrDto, WhatsappStatusDto } from '@/types/dto/whatsapp.dto';

const unwrapApi = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

const normalizeQrImage = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (value.startsWith('data:image')) return value;
  return `data:image/png;base64,${value}`;
};

export const whatsappService = {
  getSetting: async (): Promise<WhatsAppSetting> => {
    const raw = await api.get('/whatsapp/status');
    const d = unwrapApi<WhatsappStatusDto>(raw.data);
    return { connected: d.connected, phoneNumber: d.phoneNumber, sessionName: d.sessionName, autoReplyEnabled: true };
  },
  updateSetting: async (payload: Partial<WhatsAppSetting>) => ({ connected: payload.connected ?? false, phoneNumber: payload.phoneNumber ?? '-', sessionName: payload.sessionName ?? 'printflow-main', autoReplyEnabled: payload.autoReplyEnabled ?? true }),
  connect: async () => {
    await apiPostData('/whatsapp/connect');
    return whatsappService.getQr();
  },
  getQr: async () => {
    const raw = await api.get('/whatsapp/qr');
    const qr = unwrapApi<WhatsappQrDto>(raw.data);
    return { ...qr, qrImage: normalizeQrImage(qr?.qrImage) };
  },
  disconnect: async () => { await apiPostData('/whatsapp/disconnect'); return { disconnected: true }; },
  getRules: async () => {
    const res = await apiGetData<{ items: AutoReplyRule[]; meta: { total: number } }>('/whatsapp/auto-reply', { params: { page: 1, limit: 1000 } });
    return res.items;
  },
  getPaged: async (params: { page: number; limit: number; search?: string }) => {
    return apiGetData<{ items: AutoReplyRule[]; meta: { page: number; limit: number; total: number; totalPages: number } }>('/whatsapp/auto-reply', { params });
  },
  createRule: async (payload: Omit<AutoReplyRule, 'id'>) => {
    const dto: WhatsappAutoReplyRequestDto & { active?: boolean; matchType?: 'exact' | 'contains' } = {
      keyword: payload.keyword,
      reply: payload.reply,
      active: payload.active,
      matchType: payload.matchType,
    };
    return apiPostData<AutoReplyRule, typeof dto>('/whatsapp/auto-reply', dto);
  },
  updateRule: async (id: string, payload: Partial<AutoReplyRule>) => {
    const res = await api.put(`/whatsapp/auto-reply/${id}`, payload);
    return unwrapApi<AutoReplyRule>(res.data);
  },
  deleteRule: async (id: string) => { await api.delete(`/whatsapp/auto-reply/${id}`); return { success: true }; },
};
