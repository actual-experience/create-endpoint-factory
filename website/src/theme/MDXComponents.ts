import * as InfimaComponents from '@site/src/components/infima';
import MDXComponents from '@theme-original/MDXComponents';
// Import the original mapper

export default {
  // Re-use the default mapping
  ...MDXComponents,
  // Map the "highlight" tag to our <Highlight /> component!
  ...InfimaComponents,
};
