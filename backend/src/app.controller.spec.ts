import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should report a healthy status', () => {
    const result = appController.health();
    expect(result).toMatchObject({ status: 'ok' });
    expect(result.timestamp).toEqual(expect.any(String));
  });
});
