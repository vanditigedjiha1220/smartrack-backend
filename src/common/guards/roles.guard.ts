import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../entities/user.entity';

// Applique la matrice de permissions par rôle définie dans l'architecture :
// ADMIN n'a jamais accès aux routes de lecture/écriture de notes (voir GradesController),
// TEACHER est en plus filtré par AccessGrantGuard (fenêtre temporaire active),
// SUPERVISOR est en lecture seule sur tout.
// Ce guard s'exécute APRÈS JwtAuthGuard : il lit req.user.role déjà posé par le JWT.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // route sans restriction de rôle explicite
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Accès refusé : cette route est réservée à ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
