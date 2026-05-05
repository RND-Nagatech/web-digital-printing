import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  buildPublicPath(category: 'designs' | 'payment-proofs' | 'banners', filename: string) {
    return `/uploads/${category}/${filename}`;
  }
}
