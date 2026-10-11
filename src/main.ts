import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Autorise les apps Flutter (desktop + mobile) à se connecter depuis le réseau local.
  app.enableCors({ origin: '*' });

  // Validation automatique des DTOs (class-validator) sur toutes les routes.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Serveur démarré sur http://0.0.0.0:${port} (accessible depuis le réseau local)`);
}
bootstrap();
