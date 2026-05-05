export interface WhatsappStatusDto {
  connected: boolean;
  phoneNumber: string;
  sessionName: string;
}

export interface WhatsappQrDto {
  qrImage: string | null;
  connected: boolean;
}

export interface WhatsappAutoReplyRequestDto {
  keyword: string;
  reply: string;
}
