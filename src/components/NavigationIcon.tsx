const paths = {
  inicio: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  lanzamiento: 'M4 20V4m0 1h15l-3 5 3 5H4',
  clases: 'M12 5v15m0-15C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Z',
  perfil: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  solicitudes: 'M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a8 8 0 0 1 12-7m1 5 2 2 4-4',
  productos: 'M3 7h18v14H3Zm0 0 3-4h12l3 4M9 11h6',
  comunidad: 'M4 4h16v12H9l-5 4Zm4 5h8m-8 3h5',
  resultados: 'M4 20V10m8 10V4m8 16v-7',
  notificaciones: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  configuracion: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M8 15v6',
}

export default function NavigationIcon({ name }: { name: keyof typeof paths }) {
  return <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d={paths[name]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
