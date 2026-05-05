/** API `sort` query allow-lists (camelCase, aligned with list DTO field names). */

const ORGANISATION_SORT_KEYS = Object.freeze([
  'name',
  'country',
  'lastUpdated',
  'capacity',
  'organisationType',
]);

const SYSTEM_SORT_KEYS = Object.freeze([
  'name',
  'lastUpdated',
]);

module.exports = { ORGANISATION_SORT_KEYS, SYSTEM_SORT_KEYS };
