import { Router } from "./router.ts";

const router = new Router();
router.all(
  "/hello",
  new Router().get("/me", () =>
    Promise.resolve(new Response(null, { status: 200 }))
  )
);
Deno.serve(router.serve());
