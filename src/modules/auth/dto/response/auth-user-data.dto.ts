import { UserDto } from '../../../users';

/**
 * Conținutul `data` pentru register / login / me.
 * Controller returnează: { user }
 */
export class AuthUserDataDto {
  /** Profilul utilizatorului autentificat */
  user: UserDto;
}
