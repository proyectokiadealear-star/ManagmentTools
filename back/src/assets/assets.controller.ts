import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { TransferirActivoDto } from './dto/transferir-activo.dto';

// TODO: Agregar AuthGuard cuando esté implementado
// @UseGuards(AuthGuard)

@Controller('api/activos')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  create(@Body() createActivoDto: CreateActivoDto) {
    // TODO: Obtener usuarioId del token
    return this.assetsService.create(createActivoDto, 'demo-user');
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActivoDto: UpdateActivoDto) {
    return this.assetsService.update(id, updateActivoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }

  @Post(':id/transferir')
  transferir(
    @Param('id') id: string,
    @Body() transferirDto: TransferirActivoDto,
  ) {
    // TODO: Obtener usuarioId y nombre del token
    return this.assetsService.transferir(
      id,
      transferirDto,
      'demo-user',
      'Usuario Demo',
    );
  }

  @Get(':id/movimientos')
  getMovimientos(@Param('id') id: string) {
    return this.assetsService.getMovimientos(id);
  }
}
