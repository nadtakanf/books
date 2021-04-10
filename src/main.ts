import { Server } from "node:http";
import { createServer, proxy } from "aws-serverless-express";
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from "@nestjs/platform-express";
import { eventContext } from 'aws-serverless-express/middleware';
import { Handler, Context } from "aws-lambda";
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

const express = require('express')
const binaryMimeTypes: string[] = [];

let cachedServer: Server;

process.on('unhandledRejection', reason => {
    console.error(reason);
});

process.on('uncaughtException', reason => {
    console.error(reason)
});

function setupSwagger(app: INestApplication) {
    const options = new DocumentBuilder().setTitle('MY API').setDescription('My REST API documentation').setVersion('1.0.0').addTag('Api Tag').build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('api', app, document)
}

async function bootstrapServer(): Promise<Server> {
    if(!cachedServer) {
        try {
            const expressApp = express();
            const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
            nestApp.use(eventContext())
            await nestApp.init();
            cachedServer = createServer(expressApp, undefined, binaryMimeTypes)
        } catch (error) {
            return Promise.reject(error)
        }
    }
    return cachedServer;
}

export const handler: Handler = async (event: any, context: Context) => {
    cachedServer = await bootstrapServer();
    return proxy(cachedServer, event, context, 'PROMISE').promise;
}