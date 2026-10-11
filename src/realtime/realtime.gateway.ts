import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Role } from '../entities/user.entity';

// Diffuse en temps réel :
//  - aux SUPERVISEURS : toute création/modification de note (élève, enseignant, ancienne/nouvelle valeur, motif)
//  - aux ADMIN : les demandes d'accès envoyées par les enseignants (jamais le contenu des notes)
//  - aux ENSEIGNANTS : la confirmation qu'un accès leur a été octroyé
// L'authentification du socket se fait par JWT passé en query param au moment du connect.
@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('RealtimeGateway');

  // socket.id -> { userId, role }
  private connectedUsers = new Map<string, { userId: string; role: Role }>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      const payload = await this.jwtService.verifyAsync(token);
      this.connectedUsers.set(client.id, { userId: payload.sub, role: payload.role });
      client.join(`role:${payload.role}`);
      client.join(`user:${payload.sub}`);
      this.logger.log(`Connecté: ${payload.email} (${payload.role})`);
    } catch {
      this.logger.warn('Connexion WebSocket refusée: token invalide');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }

  // --- Émissions utilisées par les services métier ---

  notifySupervisorsGradeEvent(payload: {
    action: 'GRADE_CREATED' | 'GRADE_MODIFIED';
    studentName: string;
    teacherName: string;
    subjectName: string;
    classRoomName: string;
    oldValue?: number;
    newValue: number;
    reason?: string;
    timestamp: Date;
  }) {
    this.server.to(`role:${Role.SUPERVISOR}`).emit('grade_event', payload);
  }

  notifyAdminAccessRequest(payload: {
    teacherName: string;
    classRoomName: string;
    subjectName: string;
    requestedAt: Date;
  }) {
    this.server.to(`role:${Role.ADMIN}`).emit('access_requested', payload);
  }

  notifyTeacherAccessGranted(teacherId: string, payload: { classRoomName: string; subjectName: string; expiresAt: Date }) {
    this.server.to(`user:${teacherId}`).emit('access_granted', payload);
  }

  notifyTeacherAccessRevoked(teacherId: string, payload: { classRoomName: string; subjectName: string }) {
    this.server.to(`user:${teacherId}`).emit('access_revoked', payload);
  }

  // --- Absences ---
  // L'appel fait par l'enseignant part immédiatement vers admin ET superviseurs —
  // aucun accès temporaire n'est requis pour cette action, contrairement aux notes.

  notifyAbsenceRecorded(payload: {
    classRoomId: string;
    subjectName: string;
    teacherName: string;
    date: string;
    studentNames: string[];
    hours: number;
  }) {
    this.server.to(`role:${Role.ADMIN}`).emit('absence_recorded', payload);
    this.server.to(`role:${Role.SUPERVISOR}`).emit('absence_recorded', payload);
  }

  notifyJustificationApproved(payload: { studentName: string; date: string; supervisorName: string }) {
    this.server.to(`role:${Role.ADMIN}`).emit('justification_approved', payload);
  }
}
