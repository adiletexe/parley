import type {Hono} from 'hono';

/* billing routes — owned by the billing module. Mount everything under /api/billing… */
export default function register(app: Hono) {
  void app;
}
