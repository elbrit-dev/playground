"use client";

import { PLASMIC } from "@/lib/plasmic-init";
import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";

// Import styles so they are available in the Plasmic Studio canvas
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "../globals.css";

export default function PlasmicHost() {
  return PLASMIC && <PlasmicCanvasHost />;
}
