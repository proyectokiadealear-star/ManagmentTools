import { Before, After, IWorld } from '@cucumber/cucumber';

Before(async function (this: IWorld) {
  console.log(`🔄 Iniciando escenario: ${this.pickle?.name || 'desconocido'}`);
});

After(async function (this: IWorld) {
  console.log(`✅ Finalizado: ${this.pickle?.name || 'desconocido'}`);
});
