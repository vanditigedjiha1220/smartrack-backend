# Backend — Système de Gestion de Notes Anti-Fraude

## Installation

```bash
npm install
```

## Configuration

Copier `.env.example` en `.env` et **changer `JWT_SECRET`** avant toute utilisation réelle
(une chaîne aléatoire longue — pas la valeur de développement fournie).

```bash
cp .env.example .env
```

## Premier démarrage (une seule fois)

```bash
npm run seed
```

Crée le tout premier compte admin (affiché en console), plus un enseignant, un superviseur,
et une salle de démonstration avec une matière et deux élèves. Si un compte admin existe déjà,
cette commande ne fait rien (protection contre un re-seed accidentel qui dupliquerait les données).

## Lancer le serveur

```bash
npm run start:dev   # développement — redémarre automatiquement à chaque changement de code
npm run start        # production — nécessite d'avoir fait `npm run build` avant
```

Le serveur écoute sur `0.0.0.0:3000` par défaut (configurable via `PORT` dans `.env`) —
accessible depuis tout appareil connecté au même réseau local, pas seulement `localhost`.

## Garder le serveur actif en continu (production)

```bash
npm install -g pm2
npm run build
pm2 start dist/main.js --name "notes-backend"
pm2 save
pm2 startup   # configure le démarrage automatique avec la machine
```

## Structure du projet

```
src/
  entities/        Modèles de données (User, ClassRoom, Grade, AccessGrant, AuditLog, Bulletin...)
  auth/             Login, hash bcrypt, émission JWT
  common/           Guards (JwtAuthGuard, RolesGuard), décorateurs (@Roles, @CurrentUser)
  users/            CRUD comptes (admin uniquement)
  classrooms/       Salles, matières assignées, élèves (admin en écriture, tous en lecture)
  access-grants/    Accès temporaires — cœur du système anti-fraude
  grades/           Notes — AUCUNE route accessible à l'admin
  audit-log/        Journal immuable — vue complète (superviseur) / métadonnées (admin)
  bulletins/        Génération agrégée côté serveur
  realtime/         WebSocket — alertes temps réel
  scripts/seed.ts   Script d'amorçage des données initiales
```

Voir `AUTHENTICATION_ET_DONNEES.md` pour le détail du fonctionnement de l'authentification
et de la matrice de permissions.

## Vérifier que tout fonctionne

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lycee.cm","password":"ChangeMoi123!"}'
```

Doit renvoyer un `accessToken` et les informations du compte admin.

## Migration vers PostgreSQL (établissements plus grands)

Dans `src/app.module.ts`, remplacer le bloc `TypeOrmModule.forRoot` :

```ts
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [...],
  synchronize: false,   // utiliser des migrations en production avec PostgreSQL
})
```

Aucun service ni contrôleur n'a besoin d'être modifié — TypeORM abstrait le moteur de stockage.
