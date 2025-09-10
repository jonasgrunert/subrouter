import { Router } from "./router.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test({
  name: "Default 404",
  fn: async () => {
    const req = new Request("http://test.com");
    const router = new Router();
    const res = await router.serve()(req);
    assertEquals(404, res.status);
  },
});

Deno.test({
  name: "Handle middleware 200",
  fn: async () => {
    const req = new Request("http://test.com");
    const router = new Router();
    router
      .use((_, ctx, next) => {
        ctx.url = "Hello";
        return next();
      })
      .use((_, ctx) => {
        return Promise.resolve(
          new Response(ctx.url as string, { status: 201 })
        );
      });
    const res = await router.serve()(req);
    assertEquals(201, res.status);
    assertEquals("Hello", await res.text());
  },
});

Deno.test({
  name: "Handle all 200",
  fn: async () => {
    const req = new Request("http://test.com");
    const router = new Router();
    router.all("/", () => {
      return Promise.resolve(new Response(null, { status: 201 }));
    });
    const res = await router.serve()(req);
    assertEquals(201, res.status);
  },
});

Deno.test({
  name: "Handle all 200 with URLPattern",
  fn: async () => {
    const req = new Request("http://test.com");
    const router = new Router();
    router.all(new URLPattern({ pathname: "/" }), () => {
      return Promise.resolve(new Response(null, { status: 201 }));
    });
    const res = await router.serve()(req);
    assertEquals(201, res.status);
  },
});

Deno.test({
  name: "Handle subrouter",
  fn: async () => {
    const req = new Request("http://test.com/hello/me");
    const router = new Router();
    router.all(
      "/hello",
      new Router().all("/me", () =>
        Promise.resolve(new Response(null, { status: 200 }))
      )
    );
    const res = await router.serve()(req);
    assertEquals(res.status, 200);
  },
});

Deno.test({
  name: "Handle method - GET",
  fn: async () => {
    const req = new Request("http://test.com/get/me");
    const router = new Router();
    router.get(
      "/get",
      new Router().get("/me", () =>
        Promise.resolve(new Response(null, { status: 200 }))
      )
    );
    const res = await router.serve()(req);
    assertEquals(res.status, 200);
    const res2 = await router.serve()(new Request(req, { method: "POST" }));
    assertEquals(res2.status, 405);
  },
});

const httpMethods: { method: string; router: (r: Router) => Router }[] = [
  {
    method: "POST",
    router: (r) =>
      r.post("/edp", () =>
        Promise.resolve(new Response(null, { status: 200 }))
      ),
  },
  {
    method: "PUT",
    router: (r) =>
      r.put("/edp", () => Promise.resolve(new Response(null, { status: 200 }))),
  },
  {
    method: "DELETE",
    router: (r) =>
      r.delete("/edp", () =>
        Promise.resolve(new Response(null, { status: 200 }))
      ),
  },
  {
    method: "HEAD",
    router: (r) =>
      r.head("/edp", () =>
        Promise.resolve(new Response(null, { status: 200 }))
      ),
  },
  {
    method: "PATCH",
    router: (r) =>
      r.patch("/edp", () =>
        Promise.resolve(new Response(null, { status: 200 }))
      ),
  },
  {
    method: "OPTIONS",
    router: (r) =>
      r.options("/edp", () =>
        Promise.resolve(new Response(null, { status: 200 }))
      ),
  },
] as const;

httpMethods.forEach((m) => {
  Deno.test({
    name: `Handle method - ${m.method}`,
    fn: async () => {
      const req = new Request("http://test.com/edp");
      let router = new Router();
      router = m.router(router);
      const res = await router.serve()(new Request(req, { method: m.method }));
      assertEquals(res.status, 200);
      const res2 = await router.serve()(req);
      assertEquals(res2.status, 405);
    },
  });
});

Deno.test({
  name: "Handle error",
  fn: async () => {
    const req = new Request("http://test.com/hello/me");
    const router = new Router();
    router.all(
      "/hello",
      new Router().all("/me", () => {
        throw new Error("Unclaimed error");
      })
    );
    const res = await router.serve()(req);
    assertEquals(res.status, 500);
  },
});
