import { Link } from 'react-router-dom';

export const DashboardBeezero = () => {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-black mb-2">Bienvenido</h2>
        <p className="text-gray-700">¿Qué deseas hacer hoy?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Iniciar Turno */}
        <Link
          to="/beezero/iniciar-turno"
          className="bg-white rounded-xl shadow-lg p-6 border-2 border-beezero-yellow hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-beezero-yellow rounded-full p-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">Iniciar Turno</h3>
              <p className="text-sm text-gray-600">Comienza tu jornada laboral</p>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Registra apertura de caja, foto del auto, ubicación y más
          </p>
        </Link>

        {/* Cerrar Turno */}
        <Link
          to="/beezero/cerrar-turno"
          className="bg-white rounded-xl shadow-lg p-6 border-2 border-beezero-yellow hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-beezero-yellow rounded-full p-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">Cerrar Turno</h3>
              <p className="text-sm text-gray-600">Finaliza tu jornada laboral</p>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Registra cierre de caja, QR, fotos finales y más
          </p>
        </Link>

        {/* Nueva Carrera */}
        <Link
          to="/beezero/nueva-carrera"
          className="bg-white rounded-xl shadow-lg p-6 border-2 border-beezero-yellow hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-beezero-yellow rounded-full p-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">Nueva Carrera</h3>
              <p className="text-sm text-gray-600">Registra una carrera realizada</p>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Registra los detalles de tu carrera: cliente, destino, precio
          </p>
        </Link>

        {/* Ver Carreras */}
        <Link
          to="/beezero/mis-carreras"
          className="bg-white rounded-xl shadow-lg p-6 border-2 border-beezero-yellow hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-beezero-yellow rounded-full p-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">Mis Carreras</h3>
              <p className="text-sm text-gray-600">Historial de carreras</p>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Revisa todas tus carreras registradas
          </p>
        </Link>

        {/* Mis Turnos */}
        <Link
          to="/beezero/mis-turnos"
          className="bg-white rounded-xl shadow-lg p-6 border-2 border-beezero-yellow hover:shadow-xl transition transform hover:scale-105"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-beezero-yellow rounded-full p-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">Mis Turnos</h3>
              <p className="text-sm text-gray-600">Historial de turnos</p>
            </div>
          </div>
          <p className="text-gray-700 text-sm">
            Revisa inicio y cierre de tus turnos
          </p>
        </Link>
      </div>
    </div>
  );
};
