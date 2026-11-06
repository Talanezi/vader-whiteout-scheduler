import {randomUUID} from 'crypto';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as morgan from 'morgan';
import { AppModule } from './app.module';
import { commonAppBootstrap } from './common-setup';
import ConfigService from './config/config.service';
import { isBooleanStringTrue } from './config/env.validation';

function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('CabbageMeet')
    .setDescription('CabbageMeet API desription')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  commonAppBootstrap(app);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get('NODE_ENV');
  if (nodeEnv === 'development') {
    setupSwagger(app);
  }
  if (isBooleanStringTrue(configService.get('ENABLE_CORS'))) {
    app.enableCors({
      origin: [
        new URL(configService.get('PUBLIC_URL')).origin,
        ...(configService
          .get('EXTRA_CORS_ORIGINS')
          ?.split(',')
          .map((s) => (s.charAt(0) === '^' ? new RegExp(s) : s)) || []),
      ],
      allowedHeaders: 'Content-Type,Authorization',
    });
  }
  if (isBooleanStringTrue(configService.get('TRUST_PROXY'))) {
    app.set('trust proxy', true);
  }
  // Note: in development, you will still see the X-Powered-By header in the browser.
  // This is being added by the Create-React-App server, not by Nest.
  app.disable('x-powered-by');
  app.use((req:any,res:any,next:()=>void)=>{req.whiteoutRequestId=randomUUID();res.setHeader('X-Request-ID',req.whiteoutRequestId);res.setHeader('Cache-Control','no-store, private');next()});
  app.use(morgan((tokens,req:any,res)=>JSON.stringify({type:'request',service:'scheduler',requestId:req.whiteoutRequestId,method:req.method,category:String(req.route?.path||req.path.split('/').slice(0,3).join('/')),status:Number(tokens.status(req,res)),ms:Number(tokens['response-time'](req,res)),revision:process.env.RAILWAY_GIT_COMMIT_SHA||'local',at:new Date().toISOString()})));
  app.use(
    helmet({
      // Setting a header to false prevents it from being set
      dnsPrefetchControl: false,
      hsts: nodeEnv === 'production',
      // Helmet sets the "upgrade-insecure-requests" option in the
      // Content Security Policy, which causes WebKit to automatically fetch
      // over HTTPS, which will cause the Playwright tests to fail.
      // Se https://stackoverflow.com/a/71109928.
      contentSecurityPolicy: nodeEnv === 'production' && !process.env.CI,
    }),
  );
  const port = configService.get('PORT');
  const host = configService.get('HOST');
  await app.listen(port, host);
}
bootstrap();
