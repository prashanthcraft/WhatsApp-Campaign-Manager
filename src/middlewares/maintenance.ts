import logger from "@utils/logger";
import { NextFunction, Request, Response } from "express";
import { pathToRegexp } from "path-to-regexp";

export function checkMaintenanceMode(excludedPaths: string[] = []) {
  const { regexp } = pathToRegexp(excludedPaths);

  return async (req: Request, resp: Response, next: NextFunction) => {
    if (regexp.test(req.url)) {
      return next();
    }
    try {
      const maintenanceModeStatus = await getMaintenanceStatus();
      if (maintenanceModeStatus) {
        resp.status(503).send({ code: "maintenance_mode" });
      }
    } catch (error) {
      logger.error("maintenance status: ", error);
    }
    next();
  };
}
/**
 * Todo: Update the status to a service that will be consumed by firestore remote config 
 * @returns MaintenanceModeStatus
 */
const getMaintenanceStatus = async (): Promise<Boolean> => {
  return process.env.MAINTENANCE_STATUS?.toLowerCase() === 'true';
};
