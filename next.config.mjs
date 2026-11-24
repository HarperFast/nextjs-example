import { withHarper } from '@harperfast/nextjs';

// `withHarper` wires this Next.js app into Harper: it marks the `harper` package as a server
// external, so Next.js never tries to bundle Harper's native dependencies. This app's server code
// doesn't import `harper` at all; it uses the `tables` global Harper injects (see app/actions.js).
// Add your own Next.js config inside.
export default withHarper({});
