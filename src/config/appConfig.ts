let baseRoutePrefix: string = (process.env.APP_ROUTE_PREFIX || '')?.replace(
  /\/+$/,
  '',
);
if (baseRoutePrefix && !baseRoutePrefix?.startsWith('/')) {
  baseRoutePrefix = `/${baseRoutePrefix}`;
}

export const appConfig = {
  baseRoutePrefix,
  serviceUrl: `${process.env.SERVICE_URL_PUBLIC_API}${baseRoutePrefix}`,
  port: Number(process.env.PORT || 8080),
};

export const appBaseConfig = {
  referralUrl: process.env.REFERRAL_URL,
  signInUrl: process.env.SIGN_IN_URL,
  signUpUrl: process.env.SIGN_UP_URL,
  signUpInvitationUrl: process.env.SIGN_UP_INVITATION_URL,
  signUpVerifyUrl: process.env.SIGN_UP_VERIFY_URL ?? '',
};
