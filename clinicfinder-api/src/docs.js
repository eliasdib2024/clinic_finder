// docs.js – API documentation: serves docs/openapi.yaml and Swagger UI
//   GET /docs               → Swagger UI (try every endpoint in the browser)
//   GET /docs/openapi.yaml  → the raw OpenAPI document (import it into Postman, Insomnia…)
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import swaggerUi from 'swagger-ui-express';

const text = await readFile(new URL('../docs/openapi.yaml', import.meta.url), 'utf8');
export const openapi = parse(text);

export function mountDocs(app) {
  app.get('/docs/openapi.yaml', (req, res) => res.type('text/yaml').send(text));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'ClinicFinder API docs',
    swaggerOptions: {
      persistAuthorization: true,   // keep the pasted token after a page reload
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  }));
}
