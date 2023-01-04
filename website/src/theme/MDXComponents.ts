import React from 'react';
// Import the original mapper
import MDXComponents from '@theme-original/MDXComponents';
import * as InfimaComponents from '@site/src/components/infima';

export default {
  // Re-use the default mapping
  ...MDXComponents,
  // Map the "highlight" tag to our <Highlight /> component!
  ...InfimaComponents,
};
