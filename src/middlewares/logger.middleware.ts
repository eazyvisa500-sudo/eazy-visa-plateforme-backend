import type { Request, Response, NextFunction } from "express";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const method = req.method.padEnd(6);
    const status = res.statusCode;
    const statusColor =
      status >= 500
        ? "\x1b[31m"
        : status >= 400
          ? "\x1b[33m"
          : status >= 300
            ? "\x1b[36m"
            : "\x1b[32m";
    const reset = "\x1b[0m";
    console.log(
      `[${timestamp}] ${method} ${statusColor}${status}${reset} ${req.originalUrl} - ${duration}ms`,
    );
  });

  next();
};
