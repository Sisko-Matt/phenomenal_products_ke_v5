import { createFileRoute } from "@tanstack/react-router";
import UIPreview from "@/routes/preview";

export const Route = createFileRoute("/preview/")({
  component: UIPreview,
});
