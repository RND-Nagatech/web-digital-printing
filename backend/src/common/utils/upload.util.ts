import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export const fileNamer = (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
};

export const fileFilterBy = (allowedExt: string[]) => (_req: any, file: Express.Multer.File, cb: any) => {
  const ext = extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) return cb(new BadRequestException('Format file tidak didukung'), false);
  cb(null, true);
};
