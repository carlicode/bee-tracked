import { useRef } from 'react';
import html2canvas from 'html2canvas';

export type ResumenTurnoData = {
  abejita: string;
  auto: string;
  fechaInicio?: string;
  horaInicio?: string;
  horaCierre: string;
  aperturaCaja: number;
  cierreCaja: number;
  pagosQR: number;
  totalGastos: number;
  diferencia: number;
  kilometrajeInicio?: number | string;
  kilometrajeCierre?: number | string;
  bateriaInicio?: number | string;
  bateriaCierre?: number | string;
  danosAuto?: string;
  observaciones?: string;
  gastos?: { tipo: string; monto: number; descripcion?: string; placa?: string }[];
};

type Props = {
  data: ResumenTurnoData;
  onAccept: () => void;
};

export function ResumenTurnoCerrado({ data, onAccept }: Props) {
  const resumenRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!resumenRef.current) return;
    try {
      const canvas = await html2canvas(resumenRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `turno-${data.abejita.replace(/\s+/g, '-')}-${data.horaCierre.replace(':', '')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generando imagen del resumen:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="text-5xl mb-3">✓</div>
        <h3 className="text-2xl font-bold text-black">Turno cerrado exitosamente</h3>
        <p className="text-sm text-gray-600 mt-1">Revisa el resumen y compártelo con tu grupo</p>
      </div>

      <div ref={resumenRef} className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-beezero-yellow">
        <div className="bg-beezero-yellow px-5 py-4">
          <h4 className="font-bold text-black text-lg">Resumen del Turno</h4>
          <p className="text-sm text-black/70">BeeZero · {data.fechaInicio || 'Hoy'}</p>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500">Abejita</p>
              <p className="font-semibold text-black">{data.abejita}</p>
            </div>
            <div>
              <p className="text-gray-500">Auto</p>
              <p className="font-semibold text-black">{data.auto}</p>
            </div>
            <div>
              <p className="text-gray-500">Hora inicio</p>
              <p className="font-semibold text-black">{data.horaInicio || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Hora cierre</p>
              <p className="font-semibold text-black">{data.horaCierre}</p>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Apertura caja</span>
              <span className="font-semibold">Bs {data.aperturaCaja}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cierre caja</span>
              <span className="font-semibold">Bs {data.cierreCaja}</span>
            </div>
            {data.pagosQR > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Pagos QR</span>
                <span className="font-semibold text-green-700">+ Bs {data.pagosQR.toFixed(2)}</span>
              </div>
            )}
            {data.totalGastos > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Total gastos</span>
                <span className="font-semibold text-red-600">- Bs {data.totalGastos.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-bold text-black">Diferencia</span>
              <span className={`font-bold ${data.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Bs {data.diferencia.toFixed(2)}
              </span>
            </div>
          </div>

          {(data.kilometrajeInicio != null || data.kilometrajeCierre != null) && (
            <div className="border-t pt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500">Km inicio</p>
                <p className="font-semibold">{data.kilometrajeInicio ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Km cierre</p>
                <p className="font-semibold">{data.kilometrajeCierre ?? '—'}</p>
              </div>
            </div>
          )}

          {(data.bateriaInicio != null || data.bateriaCierre != null) && (
            <div className="border-t pt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500">Batería inicio</p>
                <p className="font-semibold">{data.bateriaInicio ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Batería cierre</p>
                <p className="font-semibold">{data.bateriaCierre ?? '—'}</p>
              </div>
            </div>
          )}

          {data.gastos && data.gastos.length > 0 && (
            <div className="border-t pt-3">
              <p className="font-semibold text-black mb-2">Gastos</p>
              <ul className="space-y-1">
                {data.gastos.map((g, i) => (
                  <li key={i} className="flex justify-between text-xs">
                    <span>{g.tipo}{g.descripcion ? ` — ${g.descripcion}` : ''}</span>
                    <span className="font-medium">Bs {Number(g.monto).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.danosAuto && data.danosAuto !== 'ninguno' && (
            <div className="border-t pt-3">
              <p className="text-gray-500">Daños registrados</p>
              <p className="font-medium">{data.danosAuto}</p>
            </div>
          )}

          {data.observaciones && (
            <div className="border-t pt-3">
              <p className="text-gray-500">Observaciones</p>
              <p className="font-medium">{data.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void handleDownload()}
          className="flex-1 border-2 border-black text-black px-4 py-3 rounded-lg hover:bg-gray-50 transition font-semibold"
        >
          Descargar resumen
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 bg-beezero-yellow text-black px-4 py-3 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold shadow-md"
        >
          Aceptar
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="flex items-start gap-2 text-sm font-semibold text-amber-800">
          <span className="text-lg leading-none">⚠️</span>
          No olvides cerrar la aplicación cuando termines de usarla.
        </p>
      </div>
    </div>
  );
}
