const platformAlias: any = {};

const defaultAlias = {
  id: 'id',
  className: 'class',
  style: 'style',
  htmlFor: 'for',
};

export const alias = { ...defaultAlias, ...platformAlias[process.env.REMAX_PLATFORM!] };

export const props = Object.values(alias);
