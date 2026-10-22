export default function AdminRecovery() {
  return <main className="min-h-screen bg-[#F4EFEA] px-5 py-12 text-[#211C19]">
    <section className="mx-auto max-w-xl rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-6 sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Panel de Flor</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold">No pudimos cargar el panel.</h1>
      <p role="alert" className="mt-4 text-sm leading-6 text-[#746A64]">No podemos confirmar la lista de alumnas y las cifras en este momento. Para evitar confusiones, no mostramos un listado vacío ni totales incompletos.</p>
      <p className="mt-3 text-sm leading-6 text-[#746A64]">Tus datos no se modificaron. Volvé a cargar el panel para intentarlo nuevamente.</p>
      <a href="/admin" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294A38]">Reintentar</a>
    </section>
  </main>
}
