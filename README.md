# SmartTrack — Backend de gestion de notes scolaires anti-fraude

## Présentation du projet

**SmartTrack** est un système de gestion de notes scolaires conçu pour améliorer la sécurité, la transparence et la traçabilité des opérations liées aux résultats des élèves.

Dans un établissement scolaire, la gestion des notes nécessite une bonne organisation des responsabilités et un contrôle rigoureux des accès. SmartTrack cherche à répondre à ces besoins en définissant des rôles distincts, en encadrant les autorisations et en conservant un historique des opérations réalisées sur le système.

Ce dépôt contient le **backend** de SmartTrack. Il assure le traitement des demandes de l'application, la vérification des identifiants, l'application des règles d'accès et la communication avec les données scolaires.

## Objectifs du système

SmartTrack vise à :

- Sécuriser l'accès aux informations scolaires.
- Séparer les responsabilités de l'administration, des enseignants et de la supervision.
- Encadrer l'accès aux opérations de consultation et de saisie des notes.
- Réduire les risques de manipulation non autorisée des résultats.
- Conserver des traces des activités afin de faciliter les contrôles et les investigations.
- Centraliser le traitement des données pour appliquer les mêmes règles de sécurité à tous les utilisateurs.

L'objectif n'est pas seulement de numériser la gestion des notes, mais aussi de mettre en place un cadre de contrôle permettant de mieux détecter et examiner les activités inhabituelles.

## Les différents rôles

Le système distingue trois profils principaux.

### Administrateur

L'administrateur assure l'organisation du système. Il peut notamment gérer les comptes utilisateurs, les salles de classe, les matières et les autorisations prévues par le système.

La conception retenue sépare son rôle administratif des opérations directes de saisie des notes, afin de renforcer la séparation des responsabilités.

### Enseignant

L'enseignant intervient dans la gestion pédagogique des élèves qui lui sont assignés. Selon les autorisations accordées, il peut demander un accès temporaire aux opérations nécessaires à son travail, notamment la saisie des notes.

Le mécanisme d'accès temporaire constitue un élément central du dispositif de contrôle.

### Superviseur

Le superviseur assure le suivi des activités et le contrôle des opérations. Son espace est destiné à la consultation du journal d'audit et au suivi des événements qui peuvent nécessiter une vérification.

Les permissions sont définies côté serveur : elles ne reposent pas uniquement sur les éléments visibles dans l'interface utilisateur.

## Comment fonctionne le système anti-fraude ?

SmartTrack s'appuie sur plusieurs mécanismes complémentaires.

**1. Authentification sécurisée**

L'utilisateur doit s'authentifier avant d'accéder aux fonctionnalités protégées. Les mots de passe sont traités avec un mécanisme de hachage et le serveur délivre un jeton d'authentification pour les requêtes suivantes.

**2. Gestion des rôles et des permissions**

Chaque utilisateur dispose d'un rôle déterminant les opérations qui lui sont autorisées. Les contrôles sont appliqués au niveau du backend, afin qu'une requête non autorisée soit refusée même si elle est envoyée directement à l'API.

**3. Autorisations temporaires**

Le système prévoit des autorisations d'accès temporaires pour encadrer certaines opérations sensibles, notamment celles liées à la saisie des notes.

**4. Journal d'audit**

Les activités suivies par le système sont consignées dans un journal d'audit destiné à faciliter les vérifications. Les informations accessibles dépendent du rôle de l'utilisateur.

**5. Alertes en temps réel**

Le backend intègre un mécanisme de communication en temps réel destiné à transmettre des événements et des alertes aux interfaces concernées.

Ces mécanismes contribuent à renforcer le contrôle et la traçabilité. Leur efficacité dépend toutefois de leur configuration, des contrôles effectivement appliqués et de tests de sécurité réguliers.

## Principales fonctionnalités du backend

Le code est organisé en modules couvrant notamment :

- **Authentification :** connexion des utilisateurs et émission des jetons d'accès.
- **Gestion des utilisateurs :** administration des comptes et de leurs rôles.
- **Classes et matières :** organisation des salles, des matières assignées et des élèves.
- **Accès temporaires :** gestion des autorisations nécessaires aux opérations encadrées.
- **Gestion des notes :** traitement des opérations sur les résultats selon les permissions définies.
- **Journal d'audit :** conservation et consultation des traces d'activité.
- **Bulletins scolaires :** génération des résultats agrégés côté serveur.
- **Communication en temps réel :** transmission d'événements et d'alertes.

La présence d'un module dans le code ne signifie pas nécessairement que toutes les fonctionnalités associées sont terminées ou prêtes pour une utilisation en production.

## Technologies utilisées

Le backend s'appuie principalement sur :

- **Node.js :** environnement d'exécution JavaScript côté serveur.
- **NestJS :** framework structurant l'application en modules, contrôleurs et services.
- **TypeScript :** langage utilisé pour organiser et fiabiliser le code.
- **TypeORM :** couche d'accès aux données.
- **JWT :** mécanisme de représentation des sessions authentifiées.
- **bcrypt :** mécanisme de hachage des mots de passe.
- **WebSocket :** communication événementielle en temps réel.

## Installation et démarrage

### Prérequis

Avant de lancer le backend, il faut disposer de :

- Node.js et npm installés.
- Le code source du projet.
- Les variables d'environnement nécessaires à la configuration.

### 1. Installer les dépendances

À la racine du dépôt, exécuter :

```bash
npm install
```

### 2. Configurer l'environnement

Crée un fichier `.env` à partir du modèle `.env.example`.

Sous Windows, dans l'invite de commandes :

```bat
copy .env.example .env
```

Dans PowerShell ou un terminal compatible :

```bash
cp .env.example .env
```

Configure les variables nécessaires au fonctionnement du serveur.

**Important :** remplace impérativement la valeur de développement de `JWT_SECRET` par une chaîne aléatoire longue et confidentielle avant toute utilisation réelle. Ne publie jamais le fichier `.env` ni les secrets qu'il contient.

### 3. Initialiser les données de démonstration

Pour créer les premiers comptes et les données de démonstration, exécute :

```bash
npm run seed
```

Le script d'initialisation crée le premier compte administrateur, un enseignant, un superviseur ainsi que des données scolaires de démonstration.

Si un compte administrateur existe déjà, le script est conçu pour ne pas recréer les données initiales. Consulte la sortie du terminal pour connaître les informations relatives au compte initial.

Cette opération est destinée à l'initialisation. Avant une utilisation réelle, vérifie les comptes créés et remplace les identifiants de démonstration.

### 4. Démarrer le serveur en développement

```bash
npm run start:dev
```

Le serveur redémarre automatiquement lorsque le code change.

Pour une exécution de production après compilation :

```bash
npm run build
npm run start
```

Par défaut, le serveur écoute sur le port `3000`. Le port peut être modifié à l'aide de la variable `PORT`, selon la configuration de l'application.

## Utilisation avec l'application Flutter

Le frontend Flutter et le backend sont deux composants distincts du projet SmartTrack.

- Le frontend fournit les écrans utilisés par les administrateurs, les enseignants et les superviseurs.
- Le backend authentifie les utilisateurs, contrôle leurs autorisations et traite les demandes de l'application.

Pour utiliser l'application, le frontend doit être configuré avec une adresse accessible du serveur backend.

Si le test est effectué sur le même ordinateur, `localhost` peut convenir. Si l'application est exécutée sur un téléphone, il faut généralement utiliser l'adresse IP locale de l'ordinateur hébergeant le serveur, à condition que le réseau et le pare-feu autorisent la communication.

## Organisation du code

Le dossier `src/` regroupe les modules de l'application. Il comprend notamment les composants d'authentification, la gestion des utilisateurs, les classes et matières, les notes, les autorisations temporaires, le journal d'audit, les bulletins et les communications en temps réel.

Le fichier `AUTHENTICATION_ET_DONNEES.md`, lorsqu'il est présent dans le dépôt, fournit des informations complémentaires sur l'authentification et la matrice des permissions.

## Évolutions possibles

Le projet pourra évoluer en fonction des besoins des établissements scolaires, notamment par :

- Le renforcement et les tests des contrôles de sécurité.
- L'amélioration du suivi des activités sensibles.
- L'enrichissement du système d'alertes.
- L'extension des fonctions de génération et de consultation des bulletins.
- L'adaptation du stockage aux besoins de déploiements plus importants, notamment avec PostgreSQL et des migrations de base de données.

## État du projet

SmartTrack est un projet en cours de développement. Le backend constitue la couche centrale de traitement et de contrôle de l'application de gestion de notes.

Les fonctionnalités doivent être validées par des tests