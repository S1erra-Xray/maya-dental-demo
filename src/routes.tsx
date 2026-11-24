// PROTOTYPE-ONLY routing. Same lazyNamed pattern as web/src/routes.tsx, but a hash router: GitHub
// Pages has no SPA fallback. On import each page line moves to web's routes.tsx with its translation
// namespaces listed, e.g. lazyNamed(() => import("@/pages/clinic/schedule"), "SchedulePage", ["clinic"]).
import { lazy, type ComponentType } from "react";
import { createHashRouter, Navigate } from "react-router-dom";
import { NotFoundPage, PrototypeShell } from "@/prototype/shell";

function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  importer: () => Promise<T>,
  name: K,
) {
  return lazy(async () => {
    const mod = await importer();
    return { default: mod[name] as ComponentType<unknown> };
  });
}

const SchedulePage = lazyNamed(() => import("@/pages/clinic/schedule"), "SchedulePage");
const BookingRequestsPage = lazyNamed(() => import("@/pages/clinic/booking-requests"), "BookingRequestsPage");
const PatientsPage = lazyNamed(() => import("@/pages/clinic/patients"), "PatientsPage");
const PatientDetailPage = lazyNamed(() => import("@/pages/clinic/patient-detail"), "PatientDetailPage");
const FeeGuidePage = lazyNamed(() => import("@/pages/clinic/fee-guide"), "FeeGuidePage");

export const router = createHashRouter([
  {
    element: <PrototypeShell />,
    children: [
      { index: true, element: <Navigate to="/schedule" replace /> },
      { path: "schedule", element: <SchedulePage /> },
      { path: "booking-requests", element: <BookingRequestsPage /> },
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/:id", element: <PatientDetailPage /> },
      { path: "fee-guide", element: <FeeGuidePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
