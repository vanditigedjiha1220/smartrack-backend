import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  // Émet accessToken + refreshToken + profil, dans un format identique partout
  // (login, changePassword, refresh) — l'app Flutter traite les trois réponses pareil.
  private async buildSession(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    // Secret ET durée de vie différents de l'accessToken — c'est LUI, et lui seul,
    // qui sera stocké sur l'appareil pour la connexion par empreinte.
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.config.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '30d'),
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersRepo.findOne({ where: { email } });

    // Message volontairement identique en cas d'email inconnu ou de mot de passe faux,
    // pour ne pas révéler l'existence d'un compte à un tiers.
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.buildSession(user);
  }

  // Appelé uniquement via POST /auth/change-password (route marquée @AllowPendingPassword()).
  // C'est le seul chemin qui fait passer mustChangePassword à false : ni l'admin,
  // ni aucune autre route, ne peuvent le faire.
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const currentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    user.passwordHash = await this.hashPassword(newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await this.usersRepo.save(user);

    // On réémet une session fraîche (access + refresh) : l'ancien accessToken portait
    // mustChangePassword=true et resterait bloqué partout ailleurs jusqu'à expiration sinon.
    return this.buildSession(user);
  }

  // Échange un refresh token valide contre une nouvelle session complète —
  // c'est cette route que l'app appelle après déverrouillage par empreinte,
  // SANS jamais redemander le mot de passe.
  async refresh(refreshToken: string) {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('REFRESH_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token invalide ou expiré — reconnectez-vous avec votre mot de passe',
      );
    }

    if (payload.type !== 'refresh') {
      // Empêche qu'un accessToken normal soit détourné pour servir de refresh token.
      throw new UnauthorizedException('Jeton invalide');
    }

    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Compte introuvable');
    }

    return this.buildSession(user);
  }
}