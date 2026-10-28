"use client";

import { useRouter } from "next/navigation";
import TugasCard, { type Tugas } from "./TugasCard";

export default function DaftarTugas({ tugas }: { tugas: Tugas[] }) {
  const router = useRouter();
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {tugas.map((t) => (
        <TugasCard key={t.id} tugas={t} saatBerubah={() => router.refresh()} />
      ))}
    </ul>
  );
}
