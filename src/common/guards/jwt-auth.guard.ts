import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ALLOW_PENDING_PASSWORD_KEY } from '../decorators/allow-pending-password.decorator';

// Vérifie la présence et la validité du JWT sur chaque requête protégée.
// Attache l'utilisateur décodé (userId, email, role, mustChangePassword) à req.user
// pour les guards suivants.
//
// SÉCURITÉ : ce guard étant déjà appliqué sur TOUTES les routes protégées, c'est
// l'endroit le plus sûr pour bloquer un compte tant que son mot de passe temporaire
// (connu de l'admin qui l'a créé) n'a pas été remplacé — plutôt que de devoir
// modifier chaque contrôleur individuellement. Seule la route marquée
// @AllowPendingPassword() (POST /auth/change-password) reste joignable.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant');
    }

    const token = authHeader.substring(7);

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    request.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword === true,
    };

    const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (request.user.mustChangePassword && !allowPending) {
      throw new ForbiddenException(
        'Mot de passe temporaire non changé : vous devez le remplacer avant de continuer.',
      );
    }

    return true;
  }
}