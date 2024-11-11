const disableAll = process.env.EMAIL_DISABLE_ALL === "true";

const monitoringRecipients = process.env.MONITORING_RECIPIENTS?.split(/[,\s;]/)
  .map((address) => address.trim())
  ?.filter((address) => address);
export const mailConfig = {
  disableAll,
  enableMonitoring: process.env.ENABLE_EMAIL_MONITORING === "true",
  monitoringRecipients,
  smtpKeys: parseEnvObject("SMTP_KEYS"),
  disableSignUpVerification: process.env.DISABLE_SIGN_UP_VERIFICATION ?? false
};

export const smtpConfig = {
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  monitoringEmail: "monitoring@example.com",
  enableMonitoring: true,
};

export function parseEnvObject(varName: string): Record<string, any> {
  try {
    return JSON.parse(process.env[varName] || "{}");
  } catch (err) {}
  return {};
}
