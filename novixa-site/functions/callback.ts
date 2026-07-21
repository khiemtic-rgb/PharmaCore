import { handleCmsCallback, type CmsAuthEnv } from './_cms-auth';

export const onRequestGet: PagesFunction<CmsAuthEnv> = async (context) => {
  return handleCmsCallback(context.request, context.env);
};
