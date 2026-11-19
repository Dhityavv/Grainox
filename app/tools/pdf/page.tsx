"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ConverterPage from "../converter/page";

export default function PdfToolsPage() {
  // Renders the converter page initialized to the PDF tools category
  return <ConverterPage initialCategory="pdf" initialTool="image-to-pdf" />;
}
