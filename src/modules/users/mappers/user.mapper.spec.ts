import { User, UserProfile } from '@prisma/client';

import { UserWithProfile } from '../types';
import { UserMapper } from './user.mapper';

const user: User = {
  id: 'user-1',
  email: 'test@example.com',
  password: '$2b$10$secret-hash',
  isVerified: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const profile: UserProfile = {
  id: 'profile-1',
  firstName: 'Ion',
  lastName: 'Popescu',
  avatarUrl: 'https://cdn.example.com/avatars/ion.webp',
  location: 'Chișinău',
  jobTitle: 'Software Engineer',
  bio: 'Pasionat de NestJS.',
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
};

describe('UserMapper', () => {
  it('nu expune niciodată parola', () => {
    expect(UserMapper.toDto(user)).not.toHaveProperty('password');
  });

  it('întoarce profile null când relația nu a fost încărcată', () => {
    expect(UserMapper.toDto(user).profile).toBeNull();
  });

  it('mapează profilul nested când relația e prezentă', () => {
    const withProfile: UserWithProfile = { ...user, profile };

    expect(UserMapper.toDtoWithProfile(withProfile).profile).toEqual({
      firstName: 'Ion',
      lastName: 'Popescu',
      avatarUrl: 'https://cdn.example.com/avatars/ion.webp',
      location: 'Chișinău',
      jobTitle: 'Software Engineer',
      bio: 'Pasionat de NestJS.',
    });
  });

  it('tolerează un utilizator fără rând în user_profiles', () => {
    const withoutProfile: UserWithProfile = { ...user, profile: null };

    expect(UserMapper.toDtoWithProfile(withoutProfile).profile).toBeNull();
  });

  it('exclude identificatorii interni din profilul public', () => {
    const publicProfile = UserMapper.toProfileDto(profile);

    expect(publicProfile).not.toHaveProperty('id');
    expect(publicProfile).not.toHaveProperty('userId');
  });
});
