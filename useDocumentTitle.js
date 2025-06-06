"use strict";

import * as React from 'react';
/**
 * Set the document title for the active screen
 */
export function useDocumentTitle(ref, {
  enabled = true,
  formatter = (options, route) => options?.title ?? route?.name
} = {}) {
  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    const navigation = ref.current;
    if (navigation) {
      const title = formatter(navigation.getCurrentOptions(), navigation.getCurrentRoute());
      document.title = title;
    }
    return navigation?.addListener('options', e => {
      const title = formatter(e.data.options, navigation?.getCurrentRoute());
      document.title = title;
    });
  });
}
//# sourceMappingURL=useDocumentTitle.js.map