import serverless from 'serverless-http';
import { createApp } from './index';

const app = createApp();

export const handler = serverless(app);
