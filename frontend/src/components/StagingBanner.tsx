/** Barra visible solo en entorno staging — avisa que no es producción */
export const StagingBanner = () => {
  if (import.meta.env.VITE_APP_ENV !== 'staging') return null;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-black text-center text-sm font-bold py-1.5 px-3 shadow-md"
        role="status"
      >
        ENTORNO DE PRUEBAS — Los datos no afectan producción
      </div>
      <div className="h-8 shrink-0" aria-hidden />
    </>
  );
};
