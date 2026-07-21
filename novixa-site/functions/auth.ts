import { handleCmsAuth, type CmsAuthEnv } from './_cms-auth';

export const onRequestGet: PagesFunction<CmsAuthEnv> = async (context) => {
  return handleCmsAuth(context.request, context.env);
};
