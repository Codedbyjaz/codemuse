"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MaybeScreen = MaybeScreen;
exports.MaybeScreenContainer = void 0;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _jsxRuntime = require("react/jsx-runtime");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
let Screens;
try {
  Screens = require('react-native-screens');
} catch (e) {
  // Ignore
}
const MaybeScreenContainer = ({
  enabled,
  ...rest
}) => {
  if (Screens?.screensEnabled?.()) {
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(Screens.ScreenContainer, {
      enabled: enabled,
      ...rest
    });
  }
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
    ...rest
  });
};
exports.MaybeScreenContainer = MaybeScreenContainer;
function MaybeScreen({
  enabled,
  active,
  ...rest
}) {
  if (Screens?.screensEnabled?.()) {
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(Screens.Screen, {
      enabled: enabled,
      activityState: active,
      ...rest
    });
  }
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
    ...rest
  });
}
//# sourceMappingURL=ScreenFallback.js.map