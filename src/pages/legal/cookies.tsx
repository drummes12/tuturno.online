import { LEGAL_ENTITY } from '@/lib/legal'
import { LegalPage } from './legal-page'

export function CookiesPage() {
  return (
    <LegalPage
      title='Política de cookies y almacenamiento'
      subtitle='Qué guarda TuTurno en tu navegador'
    >
      <p>
        La aplicación no instala cookies propias para publicidad o analítica y
        no utiliza Google Analytics, píxeles publicitarios ni contenido
        incrustado de terceros. Esta página describe el almacenamiento local y
        técnico que sí utiliza para funcionar.
      </p>

      <h2>1. Almacenamiento del navegador</h2>
      <ul>
        <li>
          <strong>Sesión de Supabase (localStorage):</strong> mantiene tu sesión
          iniciada. Se conserva hasta que cierres sesión, expire la sesión o
          borres los datos del navegador.
        </li>
        <li>
          <strong>Preferencias (localStorage):</strong> tema visual, negocios
          visitados recientemente, estado del tutorial y fecha del último aviso
          sobre notificaciones. Se conservan hasta que borres los datos del
          navegador. La etapa activa del tutorial usa sessionStorage y se borra
          al cerrar la pestaña.
        </li>
        <li>
          <strong>Notificaciones:</strong> el navegador administra el permiso;
          si las activas, el endpoint y las claves técnicas de la suscripción
          quedan asociados a tu cuenta. Puedes desactivarlas desde los ajustes
          del navegador o de tu dispositivo.
        </li>
        <li>
          <strong>Caché de aplicación y lectura sin conexión:</strong> el
          service worker conserva archivos de la aplicación y algunas respuestas
          de lectura de Supabase para permitir el modo sin conexión. La caché de
          datos se elimina al cerrar sesión y al borrar los datos del sitio
          desde el navegador.
        </li>
      </ul>
      <p>
        Estos datos se usan para autenticación, recordar preferencias y prestar
        funciones que solicitaste; no para seguirte entre sitios. No es posible
        desactivar el almacenamiento indispensable y seguir usando las funciones
        que dependen de él.
      </p>

      <h2>2. Cookies</h2>
      <p>
        El código de TuTurno no crea intencionalmente cookies de seguimiento. La
        autenticación se guarda en almacenamiento local del navegador, no en una
        cookie creada por TuTurno. Los proveedores de infraestructura o el
        navegador pueden aplicar tecnologías técnicas propias conforme a sus
        servicios; consulta sus políticas para más información.
      </p>
      <p>
        Si incorporamos analítica, publicidad o contenido de terceros que trate
        datos personales, actualizaremos esta política y solicitaremos una
        autorización previa, expresa e informada cuando corresponda. La SIC ha
        indicado que el uso de cookies que implique tratamiento de datos
        personales está sujeto a la Ley 1581 de 2012.
      </p>

      <h2>3. Cómo borrar los datos locales</h2>
      <p>
        Puedes cerrar sesión desde el menú de tu cuenta y borrar los datos del
        sitio tuturno.online desde los ajustes de privacidad del navegador. Si
        desactivas las notificaciones en los ajustes del dispositivo, TuTurno
        dejará de recibir avisos push en él.
      </p>

      <h2>4. Más información</h2>
      <p>
        El tratamiento de datos personales se explica en la{' '}
        <a href='/privacidad'>Política de Tratamiento de Datos Personales</a>.
        Para consultas escribe a{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
      </p>
    </LegalPage>
  )
}
