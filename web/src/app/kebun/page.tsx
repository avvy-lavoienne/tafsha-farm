export default function KebunPage() {
  return <Placeholder title="Kebun" desc="Halaman Depan & Lahan Depan Mushola + sub-blok. CRUD menyusul di M2." />;
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h1 className="text-xl font-bold text-green-900">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{desc}</p>
    </div>
  );
}
