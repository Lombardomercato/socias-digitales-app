export default function CommunityAvatar({ nombre, small = false }: { nombre: string | null; small?: boolean }) {
  const iniciales = (nombre?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(parte => Array.from(parte)[0]).join('') || 'S').toLocaleUpperCase('es')
  return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full border border-[#EC9BB6] bg-[#F4CAD8] font-semibold text-[#294A38] ${small ? 'h-8 w-8 text-[11px]' : 'h-11 w-11 text-sm'}`}>{iniciales}</span>
}
