"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createBottomTabNavigator = createBottomTabNavigator;
var _native = require("@react-navigation/native");
var _BottomTabView = require("../views/BottomTabView.js");
var _jsxRuntime = require("react/jsx-runtime");
function BottomTabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
  UNSTABLE_router,
  ...rest
}) {
  const {
    state,
    descriptors,
    navigation,
    NavigationContent
  } = (0, _native.useNavigationBuilder)(_native.TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
    UNSTABLE_router
  });
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(NavigationContent, {
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_BottomTabView.BottomTabView, {
      ...rest,
      state: state,
      navigation: navigation,
      descriptors: descriptors
    })
  });
}
function createBottomTabNavigator(config) {
  return (0, _native.createNavigatorFactory)(BottomTabNavigator)(config);
}
//# sourceMappingURL=createBottomTabNavigator.js.map