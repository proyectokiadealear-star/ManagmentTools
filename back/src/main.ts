import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:3001',
      // Producción — agregar tu dominio real de Vercel aquí
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('SURMOTOR API')
    .setDescription('Sistema de Gestión de Activos de Taller KIA — API REST')
    .setVersion('1.0')
    .addTag('activos', 'Gestión de activos del taller')
    .addTag('finanzas', 'Depreciación, reparar vs reemplazar')
    .addTag('configuracion', 'Configuración dinámica del taller')
    .addTag('responsabilidades', 'Designación de responsables por área')
    .addTag('personal', 'Personal de taller')
    .addTag('locations', 'Ubicaciones jerárquicas')
    .addTag('mantenimientos', 'Programación y ejecución de mantenimientos')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
