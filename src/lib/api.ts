import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { DomainError } from "./domain";
import { requireUser } from "./auth";
import type { User } from "@prisma/client";

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    return NextResponse.json({ error: issues.join("; ") }, { status: 422 });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new DomainError("Request body must be JSON.", 400);
  }
  return schema.parse(raw);
}

export type RouteContext<P extends Record<string, string>> = { params: Promise<P> };

/** Wraps a handler with session lookup and uniform error mapping. */
export function withUser<P extends Record<string, string>>(
  handler: (request: Request, user: User, params: P) => Promise<NextResponse>,
) {
  return async (request: Request, context: RouteContext<P>): Promise<NextResponse> => {
    try {
      const user = await requireUser();
      const params = await context.params;
      return await handler(request, user, params);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
