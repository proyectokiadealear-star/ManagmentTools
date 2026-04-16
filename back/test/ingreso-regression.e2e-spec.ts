import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Ingreso boundary regression (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('mantiene frontera: el cambio no agrega rutas de ingreso en insumos/epp', async () => {
    await request(app.getHttpServer()).get('/api/ingreso').expect(404);
    await request(app.getHttpServer()).post('/api/insumos/ingreso').send({}).expect(404);
    await request(app.getHttpServer()).post('/api/epp/ingreso').send({}).expect(404);
  });
});
