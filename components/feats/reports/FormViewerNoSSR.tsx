import dynamic from "next/dynamic";
import type { FormViewerProps } from "./form-viewer";
const FormViewerNoSSR = dynamic<FormViewerProps>(
  () => import("./form-viewer").then(mod => mod.FormViewer),
  { ssr: false }
);
export default FormViewerNoSSR; 