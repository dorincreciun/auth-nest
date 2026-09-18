import { BadRequestException } from '@nestjs/common';
import { UserProfile } from '@prisma/client';

import { FileService, MFile } from '../file';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const UPLOAD_CONFIG = {
  avatarFolder: 'avatars',
  avatarMaxSizeMb: 2,
  avatarMaxSizeBytes: 2 * 1024 * 1024,
  avatarMimeTypes: /^image\/(jpeg|png|webp|gif)$/,
} as const;

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'profile-1',
    firstName: null,
    lastName: null,
    avatarUrl: null,
    location: null,
    jobTitle: null,
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user-1',
    ...overrides,
  };
}

function buildFile(): MFile {
  return new MFile({
    buffer: Buffer.from('imagine'),
    mimetype: 'image/png',
    originalname: 'avatar.png',
  });
}

describe('UsersService', () => {
  let repository: jest.Mocked<UsersRepository>;
  let fileService: jest.Mocked<Pick<FileService, 'saveFiles' | 'deleteFile'>>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      existsByEmail: jest.fn().mockResolvedValue(false),
      findById: jest.fn(),
      findByIdWithProfile: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      setVerified: jest.fn(),
      setPassword: jest.fn(),
      findProfile: jest.fn().mockResolvedValue(buildProfile()),
      upsertProfile: jest.fn(),
      setAvatarUrl: jest
        .fn()
        .mockImplementation((userId: string, avatarUrl: string | null) =>
          Promise.resolve(buildProfile({ userId, avatarUrl })),
        ),
    } as unknown as jest.Mocked<UsersRepository>;

    fileService = {
      saveFiles: jest.fn().mockResolvedValue(['https://cdn.example.com/avatars/new.webp']),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    service = new UsersService(repository, fileService as unknown as FileService, UPLOAD_CONFIG);
  });

  describe('markAsVerified', () => {
    it('delegă către repository cu valoarea corectă', async () => {
      await service.markAsVerified('user-1');

      expect(repository.setVerified).toHaveBeenCalledWith('user-1', true);
    });
  });

  describe('replaceAvatar', () => {
    it('urcă imaginea în folderul configurat și salvează URL-ul', async () => {
      const profile = await service.replaceAvatar('user-1', buildFile());

      expect(fileService.saveFiles).toHaveBeenCalledWith([expect.any(MFile)], 'avatars');
      expect(repository.setAvatarUrl).toHaveBeenCalledWith(
        'user-1',
        'https://cdn.example.com/avatars/new.webp',
      );
      expect(profile.avatarUrl).toBe('https://cdn.example.com/avatars/new.webp');
    });

    it('șterge avatarul precedent doar după ce cel nou a fost salvat', async () => {
      repository.findProfile.mockResolvedValue(
        buildProfile({ avatarUrl: 'https://cdn.example.com/avatars/old.webp' }),
      );

      await service.replaceAvatar('user-1', buildFile());

      expect(fileService.deleteFile).toHaveBeenCalledWith(
        'https://cdn.example.com/avatars/old.webp',
      );
      expect(repository.setAvatarUrl.mock.invocationCallOrder[0]).toBeLessThan(
        fileService.deleteFile.mock.invocationCallOrder[0],
      );
    });

    it('nu încearcă să șteargă nimic la primul avatar', async () => {
      await service.replaceAvatar('user-1', buildFile());

      expect(fileService.deleteFile).not.toHaveBeenCalled();
    });

    it('nu atinge profilul dacă upload-ul eșuează', async () => {
      fileService.saveFiles.mockRejectedValue(new Error('storage indisponibil'));

      await expect(service.replaceAvatar('user-1', buildFile())).rejects.toThrow(
        'storage indisponibil',
      );
      expect(repository.setAvatarUrl).not.toHaveBeenCalled();
    });
  });

  describe('removeAvatar', () => {
    it('șterge fișierul și golește câmpul din profil', async () => {
      repository.findProfile.mockResolvedValue(
        buildProfile({ avatarUrl: 'https://cdn.example.com/avatars/old.webp' }),
      );

      await service.removeAvatar('user-1');

      expect(fileService.deleteFile).toHaveBeenCalledWith(
        'https://cdn.example.com/avatars/old.webp',
      );
      expect(repository.setAvatarUrl).toHaveBeenCalledWith('user-1', null);
    });

    it('refuză ștergerea când nu există avatar', async () => {
      await expect(service.removeAvatar('user-1')).rejects.toThrow(BadRequestException);
      expect(fileService.deleteFile).not.toHaveBeenCalled();
    });
  });
});
