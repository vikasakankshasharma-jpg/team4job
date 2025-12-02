
import { JobCategoryTemplate } from "./types";

export const jobCategoryTemplates: JobCategoryTemplate[] = [
  {
    id: "new-installation",
    name: "New Installation",
    includedItems: [
      "Site Assessment & Camera Placement Planning",
      "Wiring & Cabling (up to X meters)",
      "Camera & DVR/NVR Mounting",
      "System Configuration & Setup",
      "Remote Viewing Setup (Mobile/Web)",
      "Basic User Training",
    ],
  },
  {
    id: "health-check",
    name: "System Health Check",
    includedItems: [
      "Visual Inspection of All Cameras & Connections",
      "Check DVR/NVR Recording Status",
      "Verify Remote Access Functionality",
      "Clean Camera Lenses",
      "Check Power Supplies",
      "Provide System Status Report",
    ],
  },
  {
    id: "repair-job",
    name: "Repair Job",
    includedItems: [
      "Diagnostics of the Reported Issue",
      "Labor for Repair/Replacement of Faulty Part",
      "System Testing Post-Repair",
      "Confirmation of Issue Resolution",
    ],
  },
];
