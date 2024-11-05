
let baseRoutePrefix: string = (process.env.APP_ROUTE_PREFIX || '')?.replace(/\/+$/, '');
if(baseRoutePrefix && !baseRoutePrefix?.startsWith('/')){
    baseRoutePrefix = `/${baseRoutePrefix}`;
}

export const appConfig = {
    baseRoutePrefix,
    serviceUrl: `${process.env.SERVICE_URL_PUBLIC_API}${baseRoutePrefix}`,
    port: Number(process.env.PORT || 8080)
}