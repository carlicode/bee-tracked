import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Turno } from '../../types/turno';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const MisTurnos = () => {
  const navigate = useNavigate();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);

  useEffect(() => {
    loadTurnos();
  }, []);

  const loadTurnos = () => {
    try {
      setLoading(true);
      
      // Cargar turno actual si existe
      const turnoActualData = localStorage.getItem('turno_actual');
      if (turnoActualData) {
        const turno = JSON.parse(turnoActualData);
        setTurnoActual(turno);
      }

      // Cargar historial de turnos
      const turnosHistorial = JSON.parse(localStorage.getItem('turnos_historial') || '[]');
      
      // Combinar y ordenar (más recientes primero)
      const todosLosTurnos = [...(turnoActual ? [turnoActual] : []), ...turnosHistorial];
      todosLosTurnos.sort((a, b) => {
        const fechaA = a.createdAt || a.updatedAt || '';
        const fechaB = b.createdAt || b.updatedAt || '';
        return fechaB.localeCompare(fechaA);
      });

      setTurnos(todosLosTurnos);
    } catch (error) {
      console.error('Error cargando turnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDiferenciaCaja = (turno: Turno) => {
    const apertura = turno.aperturaCaja || 0;
    const cierre = turno.cierreCaja || 0;
    const qr = turno.qr || 0;
    return cierre - apertura - qr;
  };

  const formatFecha = (fecha: string | undefined) => {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/beezero/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-black font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver atrás
        </button>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Mis Turnos</h2>
        {!turnoActual && (
          <Link
            to="/beezero/iniciar-turno"
            className="bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold shadow-md"
          >
            + Iniciar Turno
          </Link>
        )}
      </div>

      {/* Turno Actual */}
      {turnoActual && (
        <div className="bg-beezero-yellow rounded-lg shadow-md p-6 mb-6 border-2 border-black">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-black mb-1">Turno Actual</h3>
              <p className="text-sm text-black/70">
                Iniciado: {formatFecha(turnoActual.createdAt)}
                {turnoActual.horaInicio && (
                  <span className="ml-2 font-bold text-black">- Hora: {turnoActual.horaInicio}</span>
                )}
              </p>
            </div>
            <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-semibold">
              EN CURSO
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-black/70">Abejita</p>
              <p className="font-semibold text-black">{turnoActual.abejita}</p>
            </div>
            <div>
              <p className="text-sm text-black/70">Auto</p>
              <p className="font-semibold text-black">{turnoActual.auto}</p>
            </div>
            <div>
              <p className="text-sm text-black/70">Apertura Caja</p>
              <p className="font-bold text-black text-lg">Bs {turnoActual.aperturaCaja}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              to="/beezero/cerrar-turno"
              className="flex-1 bg-black text-white px-4 py-2 rounded-lg hover:bg-black/90 transition font-semibold text-center"
            >
              Cerrar Turno
            </Link>
            <button
              onClick={() => navigate(`/beezero/turno/${turnoActual.id || 'actual'}`)}
              className="flex-1 bg-white text-black border-2 border-black px-4 py-2 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Ver Detalle
            </button>
          </div>
        </div>
      )}

      {/* Lista de Turnos Cerrados */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-black mb-4">Historial de Turnos</h3>
        
        {turnos.filter(t => t.turnoCerrado).length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border-2 border-gray-200">
            <p className="text-gray-700 mb-4">No hay turnos cerrados aún</p>
            {!turnoActual && (
              <Link
                to="/beezero/iniciar-turno"
                className="inline-block bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold"
              >
                Iniciar primer turno
              </Link>
            )}
          </div>
        ) : (
          turnos
            .filter(t => t.turnoCerrado)
            .map((turno, index) => {
              const diferencia = calcularDiferenciaCaja(turno);
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-beezero-yellow hover:shadow-lg transition cursor-pointer"
                  onClick={() => navigate(`/beezero/turno/${turno.id || index}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-black text-lg mb-1">
                        {turno.abejita} - {turno.auto}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatFecha(turno.createdAt)}
                        {turno.horaInicio && (
                          <span className="ml-1 font-semibold text-black">({turno.horaInicio})</span>
                        )}
                        {' - '}
                        {formatFecha(turno.updatedAt)}
                        {turno.horaCierre && (
                          <span className="ml-1 font-semibold text-black">({turno.horaCierre})</span>
                        )}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                      CERRADO
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-600">Apertura</p>
                      <p className="font-semibold text-black">Bs {turno.aperturaCaja}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Cierre</p>
                      <p className="font-semibold text-black">Bs {turno.cierreCaja}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Diferencia</p>
                      <p className={`font-bold ${diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Bs {diferencia.toFixed(2)}
                      </p>
                    </div>
                    {turno.qr && turno.qr > 0 && (
                      <div>
                        <p className="text-xs text-gray-600">QR</p>
                        <p className="font-semibold text-black">Bs {turno.qr}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

