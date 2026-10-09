import Image from 'next/image'
import Link from 'next/link'
import ArrowIcon from './ArrowIcon'
import FreeClasses from './FreeClasses'
import type { ClaseCatalogo } from '@/lib/class-access'

export default function FreeStart({clases}: {clases:ClaseCatalogo[]}) {
  return <>
    <section className="mt-6 grid overflow-hidden rounded-[26px] border border-[#EC9BB6]/45 bg-[#F4CAD8] md:grid-cols-[1.25fr_0.75fr]">
      <div className="flex flex-col items-start justify-center p-6 sm:p-8 lg:p-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Socias Digitales · Para empezar</p>
        <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Tu próximo capítulo<br /><span className="font-serif font-medium">puede ser digital.</span></h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-[#655B56]">Conocé a Flor, explorá tus primeras clases y descubrí el espacio Socias.</p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <a href="#primeras-clases" className="inline-flex items-center gap-3 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">Empezar gratis <ArrowIcon /></a>
          <a href="#plan-socias" className="inline-flex items-center gap-2 text-sm font-medium text-[#294A38]">Conocer el plan Socias <ArrowIcon diagonal /></a>
        </div>
      </div>
      <div className="relative aspect-[5/4] min-h-64 md:aspect-auto">
        <Image src="https://sociasdigitales.com/assets/images/flor-mate-square.webp" alt="Florencia trabajando en su espacio digital" fill unoptimized sizes="(max-width: 768px) 100vw, 40vw" className="object-cover object-center" />
      </div>
    </section>
    <FreeClasses clases={clases} />
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#EC9BB6]/45 bg-white px-5 py-4">
      <p className="text-sm text-[#655B56]">Tu perfil, a tu manera.</p>
      <Link href="/perfil" className="inline-flex items-center gap-2 text-xs font-medium text-[#294A38]">Editar mis datos <ArrowIcon diagonal /></Link>
    </div>
  </>
}
