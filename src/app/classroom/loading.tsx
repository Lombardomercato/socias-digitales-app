export default function ClassroomLoading() {
  return <main aria-busy="true" className="min-h-screen bg-[#F4EFEA] px-5 py-10 text-[#211C19] sm:px-8 sm:py-16">
    <div className="mx-auto max-w-6xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Tu programa</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Tus clases</h1>
      <p role="status" aria-live="polite" className="mt-4 text-sm text-[#746A64]">Cargando tus clases y tu avance…</p>
      <div aria-hidden="true" className="mt-7 space-y-4">{[1, 2].map(i => <div key={i} className="rounded-[24px] border border-[#E7DDD5] bg-[#FAF7F3] p-6"><div className="h-5 w-2/3 max-w-56 rounded-full bg-[#E7DDD5]" /><div className="mt-4 h-2 w-full rounded-full bg-[#E7DDD5]" /></div>)}</div>
    </div>
  </main>
}
