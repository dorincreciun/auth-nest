import { Provider } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

import { cloudinaryConfig } from '../../config';

export const CLOUDINARY = Symbol('CLOUDINARY');

export const CloudinaryProvider: Provider = {
  provide: CLOUDINARY,
  inject: [cloudinaryConfig.KEY],
  useFactory: (config: ConfigType<typeof cloudinaryConfig>) => {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    return cloudinary;
  },
};
