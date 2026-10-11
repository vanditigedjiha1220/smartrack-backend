import { SetMetadata } from '@nestjs/common';

// Marque une route comme accessible même quand user.mustChangePassword === true.
// Utilisé UNIQUEMENT sur POST /auth/change-password : c'est le seul moyen de sortir
// de cet état, donc il doit rester joignable tant que le mot de passe n'a pas changé.
export const ALLOW_PENDING_PASSWORD_KEY = 'allowPendingPassword';
export const AllowPendingPassword = () => SetMetadata(ALLOW_PENDING_PASSWORD_KEY, true);