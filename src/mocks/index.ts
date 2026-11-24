// PROTOTYPE-ONLY. Register every module's mock routes here (one array per backend module).
import type { MockRoute } from "./router";
import { clinicRoutes } from "./clinic";

export const mockRoutes: readonly MockRoute[] = [...clinicRoutes];
