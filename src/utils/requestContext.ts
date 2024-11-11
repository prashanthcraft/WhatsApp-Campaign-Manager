import { AsyncLocalStorage } from "async_hooks";
import { NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";
import { fromTenantIdHash } from "./hashids";
import { User, Tenant, TenantCompany } from "@aimingle/entity";

type ContextUser = User;
type ContextValue = {
  user?: ContextUser;
  company?: TenantCompany;
  tenantId?: number;
  tenant?: Tenant;
  executionId?: string;
  isImpersonated?: boolean;
  emailVerified?: boolean;
};
const context: AsyncLocalStorage<ContextValue> = new AsyncLocalStorage();
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
  getCompany(): TenantCompany | undefined {
    return this.getValue("company");
  },
  getTenant(): Tenant | undefined {
    return this.getValue("tenant");
  },
  isImpersonated(): boolean | undefined {
    return this.getValue("isImpersonated");
  },
  isEmailVerified(): boolean | undefined {
    return this.getValue("emailVerified");
  },
  getExecutionId(): string | undefined {
    return this.getValue("executionId");
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
  setValues(values: Partial<Omit<ContextValue, "tenantId">>): void {
    const store: any = context.getStore();
    if (store) {
      Object.assign(values);
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

/**
 * Use With CAUTION: Updates the tenant on the current context
 * @param id
 * @returns
 */
export function attachTenantId(id: number): void {
  const store = context.getStore();
  if (!store) return;

  store.tenantId = id;
}
