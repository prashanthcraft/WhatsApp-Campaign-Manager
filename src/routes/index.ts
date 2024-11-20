import { createBuildInfoEndpoint } from 'build-genie';
import express from 'express';

import { signup } from '../api/auth/authController';

export default function () {
  const routes = express.Router();
  routes.use('/auth', require('@api/auth'));
  routes.get('/version', createBuildInfoEndpoint('./dist/build-info.json'));
  return routes;
}
