import { LEGAL_ENTITY } from '@/lib/legal'
import { LegalPage } from './legal-page'

export function PrivacyPage() {
  return (
    <LegalPage
      title='Política de Tratamiento de Datos Personales'
      subtitle='TuTurno — Plataforma de reservas online'
    >
      <p>
        Esta política explica qué datos personales tratamos, para qué, con quién
        se comparten y cómo puedes ejercer tus derechos conforme a la Ley 1581
        de 2012 y su reglamentación.
      </p>

      <h2>1. Responsable y encargado</h2>
      <p>
        Para los datos de registro y operación de la plataforma, el responsable
        es el titular de <strong>TuTurno</strong>, con domicilio en{' '}
        {LEGAL_ENTITY.city}. Contacto para privacidad:{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
      </p>
      <p>
        Para los datos que un negocio recoge de sus clientes al gestionar una
        reserva, ese negocio determina los fines y actúa como responsable.
        TuTurno trata esos datos por cuenta del negocio como encargado, de
        acuerdo con sus instrucciones y para operar el servicio. Para consultas
        sobre el uso que un negocio haga de tus datos, también puedes contactar
        directamente a ese negocio.
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre, correo electrónico, teléfono de
          contacto y credenciales gestionadas por el proveedor de autenticación.
        </li>
        <li>
          <strong>Reservas:</strong> negocio, espacio, fecha, hora, estado y
          notas que decidas escribir. El negocio puede registrar nombre y datos
          de contacto de clientes invitados; al hacerlo, declara contar con la
          autorización de esa persona y su declaración queda registrada como
          evidencia.
        </li>
        <li>
          <strong>Solicitud de negocio:</strong> nombre y enlace solicitado del
          negocio, y los datos de contacto y descripción que decidas
          proporcionar.
        </li>
        <li>
          <strong>Preferencias del dispositivo:</strong> tema, negocios
          visitados recientemente, estado del tutorial y datos técnicos
          necesarios para notificaciones push cuando las habilitas.
        </li>
      </ul>
      <p>
        Actualmente las cuentas se crean con correo electrónico y contraseña;
        TuTurno no ofrece inicio de sesión con Google ni Microsoft. No pedimos
        datos sensibles. No escribas información médica, financiera, biométrica,
        contraseñas ni datos de menores en las notas o instrucciones de una
        reserva. Si un negocio presta servicios de salud, debe evitar recoger
        información clínica por medio de TuTurno.
      </p>

      <h2>3. Finalidades y autorización</h2>
      <ul>
        <li>
          Crear y proteger tu cuenta y permitir el acceso a la plataforma.
        </li>
        <li>
          Gestionar solicitudes, confirmaciones, cambios y cancelaciones de
          reservas.
        </li>
        <li>
          Enviar avisos operativos por correo o notificación push si la
          habilitaste.
        </li>
        <li>Atender solicitudes de soporte, privacidad y seguridad.</li>
        <li>
          Evaluar solicitudes de creación de negocios y comunicarnos contigo.
        </li>
        <li>
          Cumplir obligaciones legales y conservar evidencia cuando sea
          necesario.
        </li>
      </ul>
      <p>
        Al registrarte, autorizas el tratamiento descrito para prestar el
        servicio y aceptas los Términos. Al enviar una reserva o una solicitud
        de negocio, se muestra y registra por separado la autorización necesaria
        para esa finalidad. Puedes retirar una autorización cuando el
        tratamiento no sea necesario para cumplir un contrato o una obligación
        legal. El retiro puede impedir la prestación de la función relacionada.
      </p>
      <p>
        Las promociones de un negocio requieren una autorización opcional,
        separada y no premarcada. Puedes retirarla desde{' '}
        <a href='/preferencias'>Preferencias de privacidad</a>. Los avisos sobre
        una reserva no son publicidad.
      </p>

      <h2>4. Compartición y proveedores</h2>
      <p>
        Los datos se comparten solo con el negocio al que corresponde tu
        reserva, con las personas autorizadas de ese negocio y con proveedores
        que permiten operar la plataforma:
      </p>
      <ul>
        <li>
          <strong>Supabase:</strong> autenticación, base de datos y funciones en
          la región us-east-2 (Ohio, Estados Unidos).
        </li>
        <li>
          <strong>Resend:</strong> envío de correos transaccionales. El
          proveedor procesa los datos necesarios para entregar los correos; su
          ubicación y retención dependen de sus condiciones vigentes.
        </li>
        <li>
          <strong>Proveedor de hosting:</strong> entrega de la aplicación y
          registros técnicos de las solicitudes, según la configuración y
          política del proveedor.
        </li>
        <li>
          <strong>Servicio push del navegador:</strong> recibe el endpoint y las
          claves técnicas de la suscripción únicamente si activas las
          notificaciones en tu dispositivo.
        </li>
      </ul>
      <p>
        Supabase almacena información en Estados Unidos. Esta política informa
        esa ubicación, pero no afirma que el país tenga nivel adecuado ni que
        exista una excepción aplicable a todas las operaciones. El responsable
        debe mantener con cada proveedor los contratos y mecanismos exigidos por
        la Ley 1581 de 2012 y su reglamentación para transmisiones o
        transferencias internacionales. No vendemos tus datos personales.
      </p>

      <h2>5. Cookies y tecnologías similares</h2>
      <p>
        La aplicación no instala cookies propias de analítica o publicidad ni
        incorpora herramientas de seguimiento o contenido de terceros. Usa
        almacenamiento local del navegador para mantener la sesión, recordar
        preferencias y ofrecer lectura sin conexión. Consulta la{' '}
        <a href='/cookies'>Política de cookies y almacenamiento</a> para ver el
        detalle. Si añadimos tecnologías que traten datos para fines opcionales,
        actualizaremos el aviso y solicitaremos la autorización que corresponda
        antes de activarlas.
      </p>

      <h2>6. Derechos y cómo ejercerlos</h2>
      <p>
        Puedes conocer, actualizar y rectificar tus datos; solicitar prueba de
        la autorización, información sobre el uso, supresión o revocatoria
        cuando proceda, y presentar quejas ante la Superintendencia de Industria
        y Comercio (SIC), una vez agotado el trámite ante el responsable o
        encargado.
      </p>
      <p>
        Envía tu solicitud a{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> con tu
        nombre, el correo asociado a la cuenta y una descripción clara de lo que
        solicitas. Las consultas se atienden en un máximo de 10 días hábiles; si
        no es posible, se informarán los motivos y la fecha de respuesta, que no
        podrá superar 5 días hábiles adicionales. Los reclamos se atienden en 15
        días hábiles; si no es posible, se informarán los motivos y la fecha de
        respuesta, que no podrá superar 8 días hábiles adicionales.
      </p>

      <h2>7. Conservación y seguridad</h2>
      <p>
        Conservamos los datos mientras sean necesarios para las finalidades
        informadas, mientras la cuenta o la relación con el negocio esté activa,
        y durante los plazos de prescripción u obligaciones legales aplicables.
        Los registros de autorización se conservan como evidencia por el tiempo
        necesario para acreditar su obtención. Cuando dejan de ser necesarios,
        se suprimen o se anonimizan de forma segura.
      </p>
      <p>
        Aplicamos controles de acceso por roles, políticas de seguridad de base
        de datos y cifrado en tránsito. Ninguna medida elimina por completo los
        riesgos de seguridad. Si ocurre un incidente que requiera notificación,
        actuaremos conforme a la regulación aplicable.
      </p>

      <h2>8. Menores</h2>
      <p>
        Las cuentas son para personas adultas. Una reserva que involucre a un
        menor debe ser gestionada por su representante o por el negocio con los
        datos de contacto del adulto responsable. No ingreses datos del menor en
        las notas.
      </p>

      <h2>9. Vigencia y cambios</h2>
      <p>
        Esta política rige desde el 25 de septiembre de 2026. La base de datos
        se conserva durante el tiempo indicado en la sección 7. Comunicaremos
        los cambios sustanciales antes de aplicarlos y solicitaremos una nueva
        autorización cuando la ley lo exija.
      </p>

      <h2>10. Contacto y autoridad</h2>
      <p>
        Contacto de privacidad:{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
        Puedes presentar una queja ante la{' '}
        <a href='https://www.sic.gov.co/' target='_blank' rel='noreferrer'>
          Superintendencia de Industria y Comercio
          <span className='sr-only'>(se abre en otra pestaña)</span>
        </a>{' '}
        después de presentar tu consulta o reclamo ante el responsable.
      </p>
    </LegalPage>
  )
}
