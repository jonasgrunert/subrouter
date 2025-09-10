# Subrouter

### A webstandards first http router with a simple middleware pattern.

It handles routes and methods and provides a middleware abstraction with context and middleware per subroute.
All functions are based on the koa design of middleware with a next function, which calls the next middleware in line.
Any middleware will obtain the request and the context for that request adn retuen a response.
Request and response are from the fetch web standards
The context is a simple object, that can be modified.

## Example

```ts
import { Router } from "jsr:@jonasgrunert/subrouter"

const router = new Router();
router.all(
    "/hello",
    new Router().get("/me", () => Promise.resolve(new Response(null, { status: 200 }))),
);
Deno.serve(router.serve())
```

## API

Any handler is a function with the signature:

```ts
(req: Request, ctx: Record<unkonw, unknown>, next: () => Promise<Response>)
```

The request is a clone of the actual so all body parsing should be possible.

Any values added to the ctx are available later in other mniddlewares.
On the return trip they are even available to "higher" middleware.

The next function calls the next middleware or handler asynchronosouly and returns its promise.

A handler might also be a router instance, which would delegate subrouting to it.

Any routers with a url are constrained to the URLPattern in the handler.
If a string is given it will be interpreted as URLPAttern based on the handler.
If the handler is an instance of Roueter the URLPattern matches `pathname: {path}/*` otherwise it is `pathname: {path}`.
Matches from the URLPattern are pushed to the context under the key matches.

Any error that is not catched in the system will be logged and a 500 response without a body is sent back.
