import { AsyncLocalStorage } from "async_hooks";
import { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";
import { fromTenantIdHash } from "./hashids";
import { User, Tenant } from "@aimingle/entity";

const context = new AsyncLocalStorage();

type ContextUser = User;
type ContextValue = {
  user?: ContextUser;
  tenantId?: number;
  tenant?: Tenant;
};
export const RequestContext = {
  getValue<T extends keyof ContextValue>(
    key: T,
    defaultValue?: ContextValue[T]
  ): ContextValue[T] | undefined {
    const store: any = context.getStore();
    return store?.[key] ?? defaultValue;
  },
  getTenantId(): number | undefined {
    return this.getValue("tenantId");
  },
  getUser(): ContextUser | undefined {
    return this.getValue("user");
  },
  setValue<T extends keyof Omit<ContextValue, "tenantId">>(
    key: T,
    value: ContextValue[T]
  ): void {
    const store: any = context.getStore();
    if (store) {
      store[key] = value;
    }
  },
};
export function runWithAppContext(
  req: Request,
  resp: Response,
  next: NextFunction
): void {
  const tenantId = req.header("x-tenant-id");
  const executionId = req.header("function-execution-id") ?? nanoid();

  context.run(
    {
      tenantId: fromTenantIdHash(tenantId),
      executionId,
    },
    next
  );
}
