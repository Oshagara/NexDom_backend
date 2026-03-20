import { BadRequestException } from '@nestjs/common';
import type { MulterModuleOptions } from '@nestjs/platform-express';
import { extname } from 'path';

export const documentsMulterConfig: MulterModuleOptions = {
  dest: './uploads/documents',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed =
      ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype) ||
      ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(extname(file.originalname).toLowerCase());

    if (!allowed) {
      return callback(new BadRequestException('Invalid file type'), false);
    }
    callback(null, true);
  },
};

