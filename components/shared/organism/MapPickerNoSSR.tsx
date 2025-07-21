import dynamic from "next/dynamic";
import type { MapPickerProps } from "./MapPicker";
const MapPickerNoSSR = dynamic<MapPickerProps>(
  () => import("./MapPicker").then(mod => mod.MapPicker),
  { ssr: false }
);
export default MapPickerNoSSR; 