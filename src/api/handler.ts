import serverless from 'serverless-http';
import App from '../app';

export const handler = serverless(App);
