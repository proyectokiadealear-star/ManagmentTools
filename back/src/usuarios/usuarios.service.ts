import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Usuario } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Sede } from '../common/enums/sede.enum';
import { AreaTaller } from '../common/enums/area-taller.enum';

@Injectable()
export class UsuariosService implements OnModuleInit {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async onModuleInit() {
    const result = await this.seedData(false);
    this.logger.log(result.mensaje);
  }

  private get firestore() {
    return this.firebaseService.getFirestore();
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

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    // Verificar email único
    const existente = await this.findByEmail(dto.email);
    if (existente) {
      throw new ConflictException(`Ya existe un usuario con el email ${dto.email}`);
    }

    const now = new Date().toISOString();
    const nuevoUsuario: Omit<Usuario, 'id'> = {
      uid: '',                          // Se llenará cuando se conecte Firebase Auth
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
    return { id: docRef.id, ...nuevoUsuario };
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    const existente = await this.findOne(id);

    // Si se cambia el email, verificar que no esté en uso por otro usuario
    if (dto.email && dto.email !== existente.email) {
      const emailOcupado = await this.findByEmail(dto.email);
      if (emailOcupado) {
        throw new ConflictException(`El email ${dto.email} ya está en uso`);
      }
    }

    const actualizado: Usuario = {
      ...existente,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    await this.firestore.collection('usuarios').doc(id).update(actualizado as any);
    return actualizado;
  }

  async remove(id: string): Promise<{ id: string; mensaje: string }> {
    await this.findOne(id); // lanza 404 si no existe
    await this.firestore.collection('usuarios').doc(id).delete();
    return { id, mensaje: `Usuario ${id} eliminado correctamente` };
  }

  /**
   * Desactiva un usuario sin eliminarlo del sistema.
   * En el futuro: también llamará a Firebase Auth Admin SDK → disableUser(uid)
   */
  async desactivar(id: string): Promise<Usuario> {
    return this.update(id, { activo: false });
  }

  /**
   * Reactiva un usuario desactivado.
   * En el futuro: también llamará a Firebase Auth Admin SDK → enableUser(uid)
   */
  async activar(id: string): Promise<Usuario> {
    return this.update(id, { activo: true });
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
    const auth = this.firebaseService.getAuth();

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
          await auth.deleteUser(u.uid);
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
    const auth = this.firebaseService.getAuth();
    let creados = 0;

    for (const u of this.seedUsers) {
      let uid = '';

      try {
        // Intentar crear en Firebase Auth
        const userRecord = await auth.createUser({
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
            const existing = await auth.getUserByEmail(u.email);
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
      mensaje: `Seed completado: ${creados} usuarios creados en Firestore${auth.createUser ? ' y Firebase Auth' : ' (modo demo)'}.`,
    };
  }
}
