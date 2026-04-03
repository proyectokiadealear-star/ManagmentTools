import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '../usuarios/usuario.entity';

export interface AuthPayload {
  uid: string;
  email: string;
  nombre: string;
  rol: string;
  sede: string;
  area: string;
  fotoUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usuariosService: UsuariosService,
  ) {}

  /**
   * Verifica un ID token de Firebase Auth y retorna el perfil del usuario
   * con su rol desde Firestore.
   */
  async verifyTokenAndGetProfile(idToken: string): Promise<AuthPayload> {
    let decodedToken: any;

    try {
      decodedToken = await this.firebaseService.getAuth().verifyIdToken(idToken);
    } catch (err) {
      this.logger.warn('Token inválido o expirado', err);
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const uid: string = decodedToken.uid;
    const email: string = decodedToken.email ?? '';

    // Buscar el usuario en Firestore por email para obtener el rol
    const usuario: Usuario | null = await this.usuariosService.findByEmail(email);

    if (!usuario) {
      throw new UnauthorizedException(`Usuario con email ${email} no registrado en el sistema`);
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Tu cuenta está desactivada. Contacta al administrador.');
    }

    return {
      uid,
      email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      sede: usuario.sede,
      area: usuario.area,
      fotoUrl: usuario.fotoUrl,
    };
  }
}
