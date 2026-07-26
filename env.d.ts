/* eslint-disable @typescript-eslint/no-unused-vars */

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
    NEXT_PUBLIC_CLOUDINARY_SECURE_DISTRIBUTION?: string;
    NEXT_PUBLIC_CLOUDINARY_PRIVATE_CDN?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
      CLOUDINARY_PORTFOLIO_FOLDER?: string;
      CLOUDINARY_FOLDER_MODE?: "dynamic" | "fixed";
    CLOUDINARY_IMAGE_GENERATION_PRESET?: string;
    PORTFOLIO_ADMIN_TOKEN?: string;
  }
}

export {};
