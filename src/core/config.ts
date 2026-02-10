export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8080'
  : 'https://api.tbctxt.io';

export const APP_VERSION = 'v4.0-ts';

export const WOWHEAD_CONFIG = {
  colorLinks: true,
  iconizeLinks: true,
  renameLinks: false,
  iconSize: 'small',
  hide: {
    sellprice: true,
    ilvl: false
  },
  dropChance: true,
  domain: 'tbc'
};
