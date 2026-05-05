import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from 'baileys';
import * as qrcode from 'qrcode';
import { Boom } from '@hapi/boom';
import { join } from 'path';
import { rm } from 'fs/promises';
import { Model } from 'mongoose';
import { SendWaDto } from './dto/send-wa.dto';
import { AutoReplyDto } from './dto/auto-reply.dto';
import { AutoReplyRule } from './schemas/auto-reply-rule.schema';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private autoReplyRules: Array<{ keyword: string; reply: string; active: boolean; matchType: 'exact' | 'contains' }> = [];
  private sock: any = null;
  private isConnected = false;
  private lastQrText: string | null = null;
  private lastQrDataUrl: string | null = null;
  private linkedNumber: string | null = null;
  private readonly authPath = join(process.cwd(), '.wa_auth');
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(@InjectModel(AutoReplyRule.name) private readonly autoReplyModel: Model<AutoReplyRule>) { }

  private async clearAuthState() {
    try {
      await rm(this.authPath, { recursive: true, force: true });
      this.logger.log('WhatsApp auth state cleared');
    } catch (error) {
      this.logger.warn(`Failed clearing WA auth state: ${(error as Error).message}`);
    }
  }

  private resetConnectionState() {
    this.sock = null;
    this.isConnected = false;
    this.linkedNumber = null;
    this.lastQrText = null;
    this.lastQrDataUrl = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async syncAutoReplyRules() {
    const rows = await this.autoReplyModel.find({ active: true }).lean();
    this.autoReplyRules = rows.map((r) => ({
      keyword: r.keyword.toLowerCase().trim(),
      reply: r.reply,
      active: r.active,
      matchType: r.matchType ?? 'contains',
    }));
  }

  async connect() {
    if (this.sock) return this.status();
    await this.syncAutoReplyRules();

    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.lastQrText = qr;
        this.lastQrDataUrl = await qrcode.toDataURL(qr);
      }

      if (connection === 'open') {
        this.isConnected = true;
        this.lastQrText = null;
        this.lastQrDataUrl = null;
        this.linkedNumber = this.sock?.user?.id?.split(':')?.[0] ?? null;
        this.logger.log(`WhatsApp connected: ${this.linkedNumber ?? 'unknown'}`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        this.resetConnectionState();

        if (shouldReconnect) {
          this.logger.warn('WhatsApp connection closed, reconnecting in 2s...');
          this.reconnectTimer = setTimeout(() => {
            this.connect().catch((err) => this.logger.warn(`Reconnect failed: ${(err as Error).message}`));
          }, 2000);
        } else {
          await this.clearAuthState();
          this.logger.warn('WhatsApp logged out. Please rescan QR.');
        }
      }
    });

    this.sock.ev.on('messages.upsert', async (event: any) => {
      if (!this.isConnected) return;

      const msg = event?.messages?.[0];
      if (!msg || msg.key?.fromMe) return;
      const remoteJid = msg.key?.remoteJid;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!remoteJid || !text) return;

      const normalized = text.toLowerCase().trim();
      for (const rule of this.autoReplyRules) {
        const matched = rule.matchType === 'exact' ? normalized === rule.keyword : normalized.includes(rule.keyword);
        if (matched) {
          await this.sock.sendMessage(remoteJid, { text: rule.reply });
          break;
        }
      }
    });

    return this.status();
  }

  status() {
    return {
      connected: this.isConnected,
      sessionName: 'printflow-main',
      phoneNumber: this.linkedNumber ? `+${this.linkedNumber}` : '-',
      qrAvailable: Boolean(this.lastQrDataUrl),
    };
  }

  qr() {
    return {
      connected: this.isConnected,
      qrImage: this.lastQrDataUrl,
      expiresInSeconds: 20,
    };
  }

  async disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (error) {
        this.logger.warn(`WA logout skipped: ${(error as Error).message}`);
      }

      try {
        this.sock.end?.();
      } catch (error) {
        this.logger.warn(`WA socket end skipped: ${(error as Error).message}`);
      }
    }

    this.resetConnectionState();
    await this.clearAuthState();
    return { disconnected: true };
  }

  async send(dto: SendWaDto) {
    if (!this.sock || !this.isConnected) {
      throw new Error('WhatsApp belum terkoneksi. Scan QR dulu.');
    }

    const jid = dto.to.includes('@s.whatsapp.net') ? dto.to : `${dto.to.replace(/\D/g, '')}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text: dto.message });
    return { sent: true, provider: 'baileys', simulated: false };
  }

  async findAutoReply(page = 1, limit = 10, search = '') {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const q = search.trim();
    const filter = q ? { $or: [{ keyword: { $regex: q, $options: 'i' } }, { reply: { $regex: q, $options: 'i' } }] } : {};

    const [items, total] = await Promise.all([
      this.autoReplyModel.find(filter).sort({ created_at: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      this.autoReplyModel.countDocuments(filter),
    ]);

    return {
      items: items.map((r: any) => ({
        id: String(r._id),
        keyword: r.keyword,
        reply: r.reply,
        active: Boolean(r.active),
        matchType: r.matchType ?? 'contains',
      })),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  async setAutoReply(dto: AutoReplyDto) {
    const created = await this.autoReplyModel.create({
      keyword: dto.keyword.trim(),
      reply: dto.reply.trim(),
      active: dto.active ?? true,
      matchType: dto.matchType ?? 'contains',
      updated_at: new Date(),
    });
    await this.syncAutoReplyRules();
    return {
      id: String(created._id),
      keyword: created.keyword,
      reply: created.reply,
      active: created.active,
      matchType: created.matchType,
    };
  }

  async updateAutoReply(id: string, dto: AutoReplyDto) {
    const updated = await this.autoReplyModel
      .findByIdAndUpdate(
        id,
        {
          ...(dto.keyword !== undefined ? { keyword: dto.keyword.trim() } : {}),
          ...(dto.reply !== undefined ? { reply: dto.reply.trim() } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(dto.matchType !== undefined ? { matchType: dto.matchType } : {}),
          updated_at: new Date(),
        },
        { new: true },
      )
      .lean();

    if (!updated) return { updated: false };
    await this.syncAutoReplyRules();
    return {
      id: String(updated._id),
      keyword: updated.keyword,
      reply: updated.reply,
      active: updated.active,
      matchType: updated.matchType ?? 'contains',
    };
  }

  async deleteAutoReply(id: string) {
    const deleted = await this.autoReplyModel.findByIdAndDelete(id).lean();
    await this.syncAutoReplyRules();
    return { deleted: Boolean(deleted) };
  }

  async onModuleDestroy() {
    if (this.sock) {
      this.sock.end?.();
      this.sock = null;
    }
  }

  async onModuleInit() {
    try {
      await this.connect();
      this.logger.log('WhatsApp auto-connect initialized');
    } catch (error) {
      this.logger.warn(`WhatsApp auto-connect failed: ${(error as Error).message}`);
    }
  }
}
