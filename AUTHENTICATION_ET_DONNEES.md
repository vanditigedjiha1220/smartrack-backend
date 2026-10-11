# Authentification et Gestion des Données — Backend

## 1. Authentification

### 1.1 Cycle de vie d'une connexion

```
App Flutter (desktop/mobile)
       │
       │  POST /auth/login  { email, password }
       ▼
AuthController → AuthService.login()
       │
       │ 1. Recherche l'utilisateur par email
       │ 2. bcrypt.compare(password, user.passwordHash)
       │ 3. Si valide → génère un JWT signé (payload: sub=userId, email, role)
       ▼
Retour: { accessToken, user: { id, firstName, lastName, email, role } }
```

Le mot de passe n'est **jamais** stocké en clair : `AuthService.hashPassword()` applique `bcrypt` avec 12 rounds de salage à la création du compte (`UsersService.create`). Seul le hash est persisté en base (`User.passwordHash`).

En cas d'email inconnu **ou** de mot de passe incorrect, la même erreur générique `"Identifiants invalides"` est renvoyée — volontairement, pour ne pas laisser un tiers deviner quels emails existent dans le système.

### 1.2 Ce que contient le token

Le JWT est un objet auto-suffisant, signé avec `JWT_SECRET` (variable d'environnement), avec une durée de vie de 8h (`JWT_EXPIRES_IN`). Il transporte :

```json
{ "sub": "userId", "email": "...", "role": "ADMIN | TEACHER | SUPERVISOR", "iat": ..., "exp": ... }
```

Le rôle voyage **dans le token lui-même** — c'est ce qui permet à chaque requête ultérieure d'être filtrée sans re-consulter la base à chaque fois pour connaître le rôle de l'appelant.

### 1.3 Vérification à chaque requête protégée

Deux guards s'enchaînent sur toute route qui en a besoin (`@UseGuards(JwtAuthGuard, RolesGuard)`) :

| Guard | Rôle |
|---|---|
| `JwtAuthGuard` | Lit l'en-tête `Authorization: Bearer <token>`, vérifie la signature et l'expiration via `jwtService.verifyAsync()`. Si invalide → `401 Unauthorized`. Si valide, attache `req.user = { userId, email, role }`. |
| `RolesGuard` | Lit les rôles autorisés déclarés sur la route via `@Roles(Role.ADMIN)` (ou plusieurs), compare à `req.user.role`. Si non autorisé → `403 Forbidden`. |

Ce sont **deux dimensions indépendantes** : la première dit "es-tu bien connecté", la seconde dit "as-tu le droit d'être ici". Une route peut n'avoir aucun `@Roles()` → accessible à tout utilisateur authentifié, quel que soit son rôle (ex: `GET /classrooms`, la structure des salles n'est pas sensible).

### 1.4 Biométrie côté mobile (à implémenter côté Flutter)

La biométrie (`local_auth`) ne remplace **jamais** cette vérification serveur. Son rôle : protéger l'accès à l'app une fois le JWT déjà obtenu et stocké localement (ex: `flutter_secure_storage`), pour qu'un tiers avec le téléphone déverrouillé de l'enseignant ne puisse pas rouvrir l'app sans repasser une empreinte. Flux prévu :

```
1er login          → email + mot de passe → JWT stocké en secure storage
Ouvertures suivantes → déverrouillage biométrique local → JWT relu du storage
                        (si expiré → nouveau login email/mdp obligatoire)
```

### 1.5 WebSocket

Le canal temps réel (`RealtimeGateway`) réutilise le **même JWT**, passé en query param à la connexion (`ws://.../socket.io/?token=...`). Un token invalide déconnecte immédiatement le socket. Chaque client rejoint deux "rooms" Socket.IO : `role:<ROLE>` (diffusion par rôle, ex. alertes à tous les superviseurs) et `user:<userId>` (message ciblé, ex. confirmation d'accès à un enseignant précis).

---

## 2. Gestion des données

### 2.1 Où vivent les données

Une base **locale par établissement** — pas de mutualisation cloud. Par défaut SQLite (`better-sqlite3`, fichier `dev.db`), migrable vers PostgreSQL en ne changeant qu'une ligne dans `app.module.ts` (`type: 'postgres'` + identifiants de connexion) : aucun service ni contrôleur n'a besoin d'être modifié, car TypeORM abstrait le moteur de stockage derrière les mêmes `Repository<Entity>`.

### 2.2 ORM et entités

TypeORM fait le pont entre les classes TypeScript (`src/entities/*.ts`) et les tables SQL. Chaque entité déclare ses colonnes et relations par décorateurs :

```ts
@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() studentId: string;
  @ManyToOne(() => Student) student: Student;
  @Column('float') value: number;
  ...
}
```

`synchronize: true` (mode développement) fait créer/mettre à jour les tables automatiquement à partir de ces classes au démarrage. **En production**, on bascule sur des migrations explicites (`typeorm migration:generate`) pour ne jamais risquer une perte de données sur un schéma déjà rempli.

### 2.3 La règle qui structure tout : qui peut lire/écrire quoi

Ce n'est **pas** une convention d'interface — c'est vérifié dans chaque `Service` et chaque `Controller`, indépendamment de ce que l'app cliente affiche :

| Table | Admin | Enseignant | Superviseur |
|---|---|---|---|
| `grades` (notes) | **Aucun accès, ni lecture ni écriture** | Écrit uniquement les siennes, dans sa fenêtre active | Lecture complète |
| `access_grants` | Crée/révoque | Lit les siens, demande | — |
| `audit_logs` | Lecture **métadonnées seulement** (`findAllMetadataOnly` — omet `oldValue`/`newValue`) | — | Lecture complète (`findAllFull`) |
| `classrooms`, `students`, `subject_assignments` | Écrit (configuration) | Lecture | Lecture |
| `bulletins` | Déclenche la génération, lit le résultat agrégé final | — | Lecture |

Concrètement, `GradesController` ne déclare **aucune** route avec `@Roles(Role.ADMIN)` — la possibilité n'existe pas dans le code, ce n'est pas juste caché dans l'UI. Testé en conditions réelles : un appel direct `GET /grades` avec un token admin renvoie `403 Forbidden`, avant même d'atteindre la base.

### 2.4 La preuve d'accès légitime, rattachée à la donnée elle-même

Chaque note stocke `enteredViaGrantId` : l'identifiant du `AccessGrant` qui a autorisé son écriture. Ce n'est pas qu'une trace déclarative — `GradesService.create()` et `.modify()` appellent `AccessGrantsService.assertValidGrant()` **avant toute écriture**, qui revérifie en base que le grant existe, est `ACTIVE`, et que `expiresAt > maintenant`. Aucune confiance n'est faite à ce que le client prétend avoir comme droits.

### 2.5 Modification = motif obligatoire, jamais un écrasement silencieux

Une note n'est jamais réécrite sans laisser de trace : `GradesService.modify()` refuse la requête (`400 Bad Request`) si `reason` est vide, crée un enregistrement `GradeModification` (ancienne valeur, nouvelle valeur, motif, horodatage) en plus de mettre à jour `Grade.value`, puis diffuse l'événement aux superviseurs via WebSocket. L'historique complet reste interrogeable indéfiniment (`modificationHistory` sur l'entité `Grade`).

### 2.6 Journal d'audit : écriture fermée, lecture cloisonnée

`AuditLogService.record()` est appelée uniquement **depuis d'autres services** (`GradesService`, `AccessGrantsService`, `BulletinsService`) — aucun contrôleur n'expose de route d'écriture directe sur cette table. En lecture, deux méthodes distinctes servent deux publics : `findAllFull()` (superviseurs, valeurs comprises) et `findAllMetadataOnly()` (admin, qui/quand/quelle salle/quelle action — `oldValue`, `newValue` et `studentId` sont explicitement omis du mapping de sortie).

### 2.7 Bulletins : agrégation côté serveur, jamais la grille brute à l'admin

`BulletinsService.generateForClass()` lit les notes brutes en interne (`GradesService.findRawForBulletinComputation`, méthode qui n'est appelée que par ce service, jamais exposée sur une route accessible à l'admin), calcule moyennes pondérées et classement, persiste le résultat, puis ne retourne à l'appelant admin que `{ studentId, studentName, average, rank }` — jamais le détail note-par-matière qui a servi au calcul.

### 2.8 Fuite de données à éviter : les relations chargées par TypeORM

Point de vigilance rencontré en testant : quand un service charge une relation `User` (ex. `teacher`, `actor`) via `relations: [...]`, TypeORM renvoie l'objet complet — **`passwordHash` inclus**, même haché. Chaque service qui expose une relation `User` doit explicitement le retirer avant de renvoyer la réponse :

```ts
const { passwordHash, ...safeTeacher } = grant.teacher;
return { ...grant, teacher: safeTeacher };
```

Appliqué dans `GradesService.findAllForSupervisor`, `AccessGrantsService.findAllForAdmin`, `AuditLogService.findAllFull`. À reproduire systématiquement pour tout nouvel endpoint qui charge une relation `User`.

### 2.9 Expiration automatique — la donnée elle-même se referme

`GrantExpirationTask` (cron toutes les 5 minutes) repasse `AccessGrant.status` de `ACTIVE` à `EXPIRED` dès que `expiresAt` est dépassé, sans intervention humaine. Combiné à la revérification systématique dans `assertValidGrant()`, cela garantit qu'une fenêtre d'accès se ferme réellement à l'heure dite, même si personne côté admin n'agit pour la refermer.
