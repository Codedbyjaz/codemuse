"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractPathFromURL = extractPathFromURL;
var _escapeStringRegexp = _interopRequireDefault(require("escape-string-regexp"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function extractPathFromURL(prefixes, url) {
  for (const prefix of prefixes) {
    const protocol = prefix.match(/^[^:]+:/)?.[0] ?? '';
    const host = prefix.replace(new RegExp(`^${(0, _escapeStringRegexp.default)(protocol)}`), '').replace(/\/+/g, '/') // Replace multiple slash (//) with single ones
    .replace(/^\//, ''); // Remove extra leading slash

    const prefixRegex = new RegExp(`^${(0, _escapeStringRegexp.default)(protocol)}(/)*${host.split('.').map(it => it === '*' ? '[^/]+' : (0, _escapeStringRegexp.default)(it)).join('\\.')}`);
    const [originAndPath, ...searchParams] = url.split('?');
    const normalizedURL = originAndPath.replace(/\/+/g, '/').concat(searchParams.length ? `?${searchParams.join('?')}` : '');
    if (prefixRegex.test(normalizedURL)) {
      return normalizedURL.replace(prefixRegex, '');
    }
  }
  return undefined;
}
//# sourceMappingURL=extractPathFromURL.js.map