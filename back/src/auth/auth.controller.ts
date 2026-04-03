import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/me
   * Recibe el ID token de Firebase Auth en el header Authorization: Bearer <token>
   * Retorna el perfil del usuario con su rol desde Firestore.
   */
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar token Firebase y obtener perfil con rol' })
  @ApiHeader({ name: 'Authorization', description: 'Bearer <firebase_id_token>', required: true })
  @ApiResponse({ status: 200, description: 'Perfil del usuario con rol' })
  @ApiResponse({ status: 401, description: 'Token inválido, expirado o usuario no registrado' })
  async getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Se requiere Authorization: Bearer <token>');
    }

    const idToken = authHeader.replace('Bearer ', '').trim();
    return this.authService.verifyTokenAndGetProfile(idToken);
  }
}
