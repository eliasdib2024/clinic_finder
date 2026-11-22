// lint-openapi.js – checks docs/openapi.yaml: valid OpenAPI 3.1 and every $ref resolves.
//   npm run lint:api
import SwaggerParser from '@apidevtools/swagger-parser';

try {
  const api = await SwaggerParser.validate('docs/openapi.yaml');
  const paths = Object.keys(api.paths);
  const ops = paths.reduce((n, p) => n + Object.keys(api.paths[p]).filter((k) => k !== 'parameters').length, 0);
  console.log(`OK: ${api.info.title} v${api.info.version} – ${paths.length} paths, ${ops} operations`);
} catch (err) {
  console.error('INVALID:', err.message);
  process.exit(1);
}
