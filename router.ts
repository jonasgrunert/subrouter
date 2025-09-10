type Handler = (
  req: Request,
  ctx: Record<string | number | symbol, unknown> & {
    readonly matches: URLPatternResult[];
    info: unknown;
  },
  next: () => Promise<Response>
) => Promise<Response>;

const httpMethods = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "HEAD",
  "PATCH",
  "OPTIONS",
] as const satisfies string[];

function defaultNext() {
  return Promise.resolve(new Response(null, { status: 501 }));
}

export class Router {
  readonly #middleware: Array<Handler> = [];
  readonly #routes: Array<[URLPattern, string[], Handler | Router]> = [];

  serve(): (req: Request, info?: unknown) => Promise<Response> {
    return (req: Request, info: unknown = undefined) => {
      return this.handler()(req, { info: info, matches: [] }, defaultNext);
    };
  }

  use(handler: Handler): this {
    this.#middleware.push(handler);
    return this;
  }

  all(
    pathSpec: URLPattern | string,
    handler: Handler | Router,
    methods: string[] = httpMethods
  ): this {
    const matcher =
      typeof pathSpec === "string"
        ? new URLPattern({
            pathname: pathSpec + (handler instanceof Router ? "/*" : ""),
          })
        : pathSpec;
    this.#routes.push([matcher, methods.map((m) => m.toUpperCase()), handler]);
    return this;
  }

  get(pathSpec: URLPattern | string, handler: Handler | Router): this {
    return this.all(pathSpec, handler, ["GET"]);
  }

  post(pathSpec: URLPattern | string, handler: Handler | Router): this {
    return this.all(pathSpec, handler, ["POST"]);
  }

  put(pathSpec: URLPattern | string, handler: Handler | Router): this {
    return this.all(pathSpec, handler, ["PUT"]);
  }

  delete(pathSpec: URLPattern | string, handler: Handler | Router): this {
    return this.all(pathSpec, handler, ["DELETE"]);
  }

  head(pathSpec: URLPattern | string, handler: Handler | Router): this {
    return this.all(pathSpec, handler, ["HEAD"]);
  }

  patch(pathSpec: URLPattern | string, handler: Handler | Router): this {
    return this.all(pathSpec, handler, ["PATCH"]);
  }

  options(pathSpec: URLPattern | string, handler: Handler | Router): this {
    return this.all(pathSpec, handler, ["OPTIONS"]);
  }

  handler(base: string = ""): Handler {
    return (req, ctx) => {
      try {
        const requestedUrl = new URL(req.url);
        requestedUrl.pathname = requestedUrl.pathname.replace(
          new RegExp(`^${base}`),
          ""
        );
        const m = this.#routes.find(([matcher]) => matcher.test(requestedUrl));
        let h: Handler = defaultNext;
        if (m === undefined) {
          // not found
          h = () => Promise.resolve(new Response(null, { status: 404 }));
        } else if (m && !m[1].includes(req.method.toUpperCase())) {
          // method unsupported
          h = () => Promise.resolve(new Response(null, { status: 405 }));
        } else {
          h =
            m?.[2] instanceof Router ? m?.[2].handler(m?.[0].pathname) : m?.[2];
        }
        const match = m?.[0].exec(req.url)!;
        const dispatch = (i: number) => (): Promise<Response> => {
          const fn = i === this.#middleware.length ? h : this.#middleware[i];
          ctx.matches.push(match);
          return fn(req.clone(), ctx, dispatch(i + 1));
        };
        return dispatch(0)();
      } catch (e) {
        console.error(e);
        return Promise.resolve(new Response(null, { status: 500 }));
      }
    };
  }
}
