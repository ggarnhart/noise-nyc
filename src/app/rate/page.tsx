import type { Metadata } from "next";
import { RateWizard } from "@/components/rate-wizard";

export const metadata: Metadata = {
  title: "Rate your apartment",
};

export default function RatePage() {
  return <RateWizard />;
}
