import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Usuario } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Sede } from '../common/enums/sede.enum';
import { AreaTaller } from '../common/enums/area-taller.enum';
import { isAssignableRole } from './assignment-role.util';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore() {
    return this.firebaseService.getFirestore();
  }

  private get auth() {
    return this.firebaseService.getAuth();
  }

  /**
   * Genera una contraseña por defecto: Surmotor + 4 dígitos + #
   * Ejemplo: Surmotor3847#
   */
  private generateDefaultPassword(): string {
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `Surmotor${digits}#`;
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findAll(): Promise<Usuario[]> {
    const snapshot = await this.firestore.collection('usuarios').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Usuario));
  }

  async findOne(id: string): Promise<Usuario> {
    const doc = await this.firestore.collection('usuarios').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return { id: doc.id, ...doc.data() } as Usuario;
  }

  async findAssignableById(id: string): Promise<Usuario> {
    const usuario = await this.findOne(id);
    if (!usuario.activo || !isAssignableRole(usuario.rol)) {
      throw new NotFoundException(`Usuario ${id} no elegible para asignación`);
    }
    return usuario;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const snap = await this.firestore
      .collection('usuarios')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Usuario;
  }

  async findBySede(sede: Sede): Promise<Usuario[]> {
    const todos = await this.findAll();
    return todos.filter(u => u.sede === sede);
  }

  async findByArea(area: AreaTaller): Promise<Usuario[]> {
    const todos = await this.findAll();
    return todos.filter(u => u.area === area);
  }

  /**
   * Crear usuario — sincroniza Firebase Auth + Firestore.
   *
   * Flujo:
   * 1. Verificar email único en Firestore
   * 2. Crear usuario en Firebase Auth (con password proporcionado o generado)
   * 3. Guardar en Firestore con el UID de Firebase Auth
   *
   * Retorna el usuario creado + la contraseña generada (solo si se auto-generó).
   */
  async create(dto: CreateUsuarioDto): Promise<Usuario & { passwordGenerado?: string }> {
    // 1. Verificar email único en Firestore
    const existente = await this.findByEmail(dto.email);
    if (existente) {
      throw new ConflictException(`Ya existe un usuario con el email ${dto.email}`);
    }

    const password = dto.password || this.generateDefaultPassword();
    const passwordFueGenerado = !dto.password;
    let uid = '';

    // 2. Crear en Firebase Auth
    try {
      const userRecord = await this.auth.createUser({
        email: dto.email,
        password,
        displayName: dto.nombre,
        disabled: dto.activo === false,
      });
      uid = userRecord.uid;
      this.logger.log(`Firebase Auth: usuario creado → ${dto.email} (uid=${uid})`);
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        // El email ya existe en Auth pero no en Firestore — vincular
        try {
          const existing = await this.auth.getUserByEmail(dto.email);
          uid = existing.uid;
          this.logger.warn(
            `Firebase Auth: email ${dto.email} ya existía (uid=${uid}), vinculando a Firestore`,
          );
        } catch {
          this.logger.error(`No se pudo recuperar uid para ${dto.email}`);
          throw new InternalServerErrorException(
            `El email ${dto.email} existe en Firebase Auth pero no se puede vincular`,
          );
        }
      } else {
        this.logger.error(`Firebase Auth error al crear ${dto.email}: ${err.message}`);
        throw new InternalServerErrorException(
          `Error creando usuario en Firebase Auth: ${err.message}`,
        );
      }
    }

    // 3. Guardar en Firestore
    const now = new Date().toISOString();
    const nuevoUsuario: Omit<Usuario, 'id'> = {
      uid,
      nombre: dto.nombre,
      email: dto.email,
      rol: dto.rol,
      sede: dto.sede,
      area: dto.area,
      activo: dto.activo !== undefined ? dto.activo : true,
      fotoUrl: dto.fotoUrl,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firestore.collection('usuarios').add(nuevoUsuario);
    const resultado: Usuario & { passwordGenerado?: string } = {
      id: docRef.id,
      ...nuevoUsuario,
    };

    if (passwordFueGenerado) {
      resultado.passwordGenerado = password;
    }

    this.logger.log(`Usuario creado en Firestore: ${docRef.id} (uid=${uid})`);
    return resultado;
  }

  /**
   * Actualizar usuario — sincroniza cambios relevantes a Firebase Auth.
   *
   * Sincroniza a Auth: email, nombre (displayName), activo (disabled).
   */
  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    const existente = await this.findOne(id);

    // Si se cambia el email, verificar que no esté en uso por otro usuario
    if (dto.email && dto.email !== existente.email) {
      const emailOcupado = await this.findByEmail(dto.email);
      if (emailOcupado) {
        throw new ConflictException(`El email ${dto.email} ya está en uso`);
      }
    }

    // Sincronizar cambios relevantes a Firebase Auth
    if (existente.uid) {
      const authUpdate: Record<string, any> = {};
      if (dto.email && dto.email !== existente.email) authUpdate.email = dto.email;
      if (dto.nombre && dto.nombre !== existente.nombre) authUpdate.displayName = dto.nombre;
      if (dto.activo !== undefined && dto.activo !== existente.activo)
        authUpdate.disabled = !dto.activo;

      if (Object.keys(authUpdate).length > 0) {
        try {
          await this.auth.updateUser(existente.uid, authUpdate);
          this.logger.log(
            `Firebase Auth: usuario actualizado (uid=${existente.uid}) → ${JSON.stringify(authUpdate)}`,
          );
        } catch (err: any) {
          this.logger.error(
            `Firebase Auth: error actualizando uid=${existente.uid}: ${err.message}`,
          );
          // No lanzar error — actualizar Firestore de todos modos y logear la advertencia
          this.logger.warn(
            'Se actualizará Firestore pero Firebase Auth quedó desincronizado.',
          );
        }
      }
    } else {
      this.logger.warn(
        `Usuario ${id} no tiene uid de Firebase Auth — solo se actualiza Firestore`,
      );
    }

    const actualizado: Usuario = {
      ...existente,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    await this.firestore.collection('usuarios').doc(id).update(actualizado as any);
    return actualizado;
  }

  /**
   * Eliminar usuario — borra de Firebase Auth y Firestore.
   */
  async remove(id: string): Promise<{ id: string; mensaje: string }> {
    const usuario = await this.findOne(id);

    // Eliminar de Firebase Auth primero
    if (usuario.uid) {
      try {
        await this.auth.deleteUser(usuario.uid);
        this.logger.log(`Firebase Auth: usuario eliminado (uid=${usuario.uid}, email=${usuario.email})`);
      } catch (err: any) {
        this.logger.error(
          `Firebase Auth: error eliminando uid=${usuario.uid}: ${err.message}`,
        );
        // Continuar con la eliminación de Firestore
      }
    }

    await this.firestore.collection('usuarios').doc(id).delete();
    return { id, mensaje: `Usuario ${id} (${usuario.email}) eliminado correctamente` };
  }

  /**
   * Desactivar usuario — marca activo=false en Firestore y disabled=true en Firebase Auth.
   */
  async desactivar(id: string): Promise<Usuario> {
    const usuario = await this.findOne(id);

    // Desactivar en Firebase Auth
    if (usuario.uid) {
      try {
        await this.auth.updateUser(usuario.uid, { disabled: true });
        this.logger.log(`Firebase Auth: usuario desactivado (uid=${usuario.uid})`);
      } catch (err: any) {
        this.logger.error(
          `Firebase Auth: error desactivando uid=${usuario.uid}: ${err.message}`,
        );
      }
    }

    const actualizado: Usuario = {
      ...usuario,
      activo: false,
      updatedAt: new Date().toISOString(),
    };
    await this.firestore.collection('usuarios').doc(id).update(actualizado as any);
    return actualizado;
  }

  /**
   * Reactivar usuario — marca activo=true en Firestore y disabled=false en Firebase Auth.
   */
  async activar(id: string): Promise<Usuario> {
    const usuario = await this.findOne(id);

    // Reactivar en Firebase Auth
    if (usuario.uid) {
      try {
        await this.auth.updateUser(usuario.uid, { disabled: false });
        this.logger.log(`Firebase Auth: usuario reactivado (uid=${usuario.uid})`);
      } catch (err: any) {
        this.logger.error(
          `Firebase Auth: error reactivando uid=${usuario.uid}: ${err.message}`,
        );
      }
    }

    const actualizado: Usuario = {
      ...usuario,
      activo: true,
      updatedAt: new Date().toISOString(),
    };
    await this.firestore.collection('usuarios').doc(id).update(actualizado as any);
    return actualizado;
  }

  /**
   * Resetear contraseña de un usuario en Firebase Auth.
   * Genera una nueva contraseña y la devuelve para que el admin la comunique al usuario.
   */
  async resetPassword(id: string): Promise<{ email: string; nuevaPassword: string }> {
    const usuario = await this.findOne(id);

    if (!usuario.uid) {
      throw new InternalServerErrorException(
        `El usuario ${id} (${usuario.email}) no tiene UID de Firebase Auth — no se puede resetear la contraseña`,
      );
    }

    const nuevaPassword = this.generateDefaultPassword();

    try {
      await this.auth.updateUser(usuario.uid, { password: nuevaPassword });
      this.logger.log(`Firebase Auth: contraseña reseteada para ${usuario.email}`);
    } catch (err: any) {
      this.logger.error(
        `Firebase Auth: error reseteando password uid=${usuario.uid}: ${err.message}`,
      );
      throw new InternalServerErrorException(
        `Error reseteando contraseña: ${err.message}`,
      );
    }

    return { email: usuario.email, nuevaPassword };
  }

  // ─── Seed ────────────────────────────────────────────────────────────────────

  /**
   * Credenciales de los usuarios seed.
   * El uid se llenará después de crearlos en Firebase Auth.
   */
  private readonly seedUsers = [
    {
      id: 'USR-001',
      nombre: 'Roberto Gómez',
      email: 'rgomez@surmotor.com',
      password: 'Jefe2024#',
      rol: 'jefe' as const,
      sede: Sede.SURMOTOR,
      area: AreaTaller.TALLER,
      activo: true,
    },
    {
      id: 'USR-002',
      nombre: 'Carlos Mendoza',
      email: 'cmendoza@surmotor.com',
      password: 'Tecnico2024#',
      rol: 'tecnico' as const,
      sede: Sede.SURMOTOR,
      area: AreaTaller.TALLER,
      activo: true,
    },
    {
      id: 'USR-003',
      nombre: 'Juan Castro',
      email: 'jcastro@surmotor.com',
      password: 'Personal2024#',
      rol: 'personal' as const,
      sede: Sede.SURMOTOR,
      area: AreaTaller.TALLER,
      activo: true,
    },
    {
      id: 'USR-004',
      nombre: 'Ana Torres',
      email: 'atorres@surmotor.com',
      password: 'Personal2024#',
      rol: 'personal' as const,
      sede: Sede.SURMOTOR,
      area: AreaTaller.RECEPCION,
      activo: true,
    },
    {
      id: 'USR-005',
      nombre: 'Pedro Villacís',
      email: 'pvillacis@granda.com',
      password: 'Tecnico2024#',
      rol: 'tecnico' as const,
      sede: Sede.GRANDA_CENTENO,
      area: AreaTaller.ENDEREZADO,
      activo: true,
    },
    {
      id: 'USR-006',
      nombre: 'Rodrigo Caicedo',
      email: 'rcaicedo@granda.com',
      password: 'Tecnico2024#',
      rol: 'tecnico' as const,
      sede: Sede.GRANDA_CENTENO,
      area: AreaTaller.PINTURA,
      activo: true,
    },
    {
      id: 'USR-007',
      nombre: 'Luis Pérez',
      email: 'lperez@shyris.com',
      password: 'Personal2024#',
      rol: 'personal' as const,
      sede: Sede.SHYRIS,
      area: AreaTaller.BODEGA,
      activo: true,
    },
    {
      id: 'USR-008',
      nombre: 'Marco Villacís',
      email: 'mvillacis@shyris.com',
      password: 'Personal2024#',
      rol: 'personal' as const,
      sede: Sede.SHYRIS,
      area: AreaTaller.TALLER,
      activo: false,
    },
  ];

  /**
   * Borra todos los usuarios de Firestore (y los de Firebase Auth por email)
   * y vuelve a ejecutar el seed. Útil para desarrollo/reset.
   */
  async resetAndSeed(): Promise<{ usuarios: number; mensaje: string }> {
    const existentes = await this.findAll();

    // Borrar Firestore
    const batch = this.firestore.batch();
    const snap = await this.firestore.collection('usuarios').get();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    this.logger.log(`Reset: ${existentes.length} usuarios borrados de Firestore`);

    // Intentar borrar de Firebase Auth también
    for (const u of existentes) {
      if (u.uid) {
        try {
          await this.auth.deleteUser(u.uid);
          this.logger.log(`Firebase Auth: usuario eliminado → ${u.email}`);
        } catch (err: any) {
          this.logger.warn(`No se pudo eliminar ${u.email} de Auth: ${err.message}`);
        }
      }
    }

    // Re-ejecutar seed
    return this.seedData(true);
  }

  async seedData(force = false): Promise<{ usuarios: number; mensaje: string }> {
    if (!force) {
      const existentes = await this.findAll();
      if (existentes.length > 0) {
        return {
          usuarios: existentes.length,
          mensaje: `Seed usuarios omitido: ya existen ${existentes.length} usuarios.`,
        };
      }
    }

    const now = new Date().toISOString();
    let creados = 0;

    for (const u of this.seedUsers) {
      let uid = '';

      try {
        // Intentar crear en Firebase Auth
        const userRecord = await this.auth.createUser({
          email: u.email,
          password: u.password,
          displayName: u.nombre,
          disabled: !u.activo,
        });
        uid = userRecord.uid;
        this.logger.log(`Firebase Auth: usuario creado → ${u.email} (${u.rol})`);
      } catch (err: any) {
        if (err.code === 'auth/email-already-exists') {
          // Ya existe en Auth — obtener uid
          try {
            const existing = await this.auth.getUserByEmail(u.email);
            uid = existing.uid;
            this.logger.log(`Firebase Auth: usuario ya existe → ${u.email}, uid=${uid}`);
          } catch {
            this.logger.warn(`No se pudo obtener uid para ${u.email}`);
          }
        } else {
          this.logger.warn(`Firebase Auth no disponible para ${u.email}: ${err.message}`);
        }
      }

      // Guardar en Firestore con el uid obtenido (o vacío en modo demo)
      const data: Omit<Usuario, 'id'> = {
        uid,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        sede: u.sede,
        area: u.area,
        activo: u.activo,
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore.collection('usuarios').doc(u.id).set(data);
      creados++;
    }

    this.logger.log(`Seed completado: ${creados} usuarios insertados.`);
    return {
      usuarios: creados,
      mensaje: `Seed completado: ${creados} usuarios creados en Firestore y Firebase Auth.`,
    };
  }
}
