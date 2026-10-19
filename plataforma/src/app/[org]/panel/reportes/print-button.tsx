"use client";

import { btn } from "@/components/ui";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btn}>
      Imprimir / PDF
    </button>
  );
}
