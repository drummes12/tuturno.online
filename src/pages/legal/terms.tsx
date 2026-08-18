import { LegalPage } from './legal-page'

/**
 * Términos y Condiciones de Uso de TuTurno.
 *
 * IMPORTANTE: revisar con un abogado colombiano antes de producción.
 */
export function TermsPage() {
  return (
    <LegalPage
      title='Términos y Condiciones de Uso'
      subtitle='TuTurno — Plataforma de reservas online'
    >
      <h2>1. Objeto</h2>
      <p>
        Estos Términos regulan el uso de TuTurno, una plataforma de software que
        permite a los negocios gestionar reservas online y a los clientes
        solicitar turnos. TuTurno es operado por{' '}
        <strong>Esteban González</strong>, con domicilio en Bogotá, Colombia.
      </p>
      <p>
        TuTurno presta la herramienta. El servicio reservado (la cancha, sala,
        consultorio, etc.) es prestado por el negocio correspondiente. TuTurno
        no es responsable del cumplimiento del servicio reservado por el
        negocio.
      </p>

      <h2>2. Aceptación</h2>
      <p>
        Al crear una cuenta aceptas estos Términos y la Política de Tratamiento
        de Datos Personales. Si no estás de acuerdo, no debes registrarte ni
        usar la plataforma.
      </p>

      <h2>3. Cuentas y responsabilidades del usuario</h2>
      <ul>
        <li>
          Debes proporcionar información veraz al registrarte y mantenerla
          actualizada.
        </li>
        <li>
          Eres responsable del uso de tu cuenta y de mantener la
          confidencialidad de tu contraseña.
        </li>
        <li>
          Las cuentas deben ser gestionadas por adultos. Las reservas que
          involucren menores deben ser realizadas y gestionadas por un adulto
          responsable.
        </li>
        <li>
          No debes usar la plataforma para fines ilícitos, abusivos o que
          infrinjan derechos de terceros.
        </li>
      </ul>

      <h2>4. Responsabilidades de los negocios</h2>
      <ul>
        <li>
          El negocio es responsable de los datos de sus propios clientes y de
          las comunicaciones que les envíe.
        </li>
        <li>
          El negocio no debe usar los datos de clientes obtenidos a través de
          TuTurno para fines distintos de los autorizados.
        </li>
        <li>
          El negocio no debe exportar, compartir ni usar los clientes de otro
          negocio.
        </li>
        <li>
          Las promociones comerciales que el negocio envíe a través de TuTurno
          requieren autorización previa, expresa e informada del cliente,
          registrada por separado. El simple hecho de reservar no autoriza
          marketing.
        </li>
        <li>
          El negocio es responsable de obtener y conservar la autorización de
          marketing de sus clientes sin cuenta (guests) por su propio canal
          cuando corresponda.
        </li>
      </ul>

      <h2>5. Reservas</h2>
      <p>
        Una solicitud de reserva es una petición que el negocio puede confirmar
        o rechazar. La confirmación de la reserva queda sujeta a las políticas
        del negocio. TuTurno no garantiza la disponibilidad final ni el
        cumplimiento del servicio prestado por el negocio.
      </p>

      <h2>6. Notificaciones</h2>
      <p>
        TuTurno envía notificaciones operativas por correo electrónico
        (creación, confirmación, rechazo, cancelación y expiración de reservas).
        Estas notificaciones son necesarias para prestar el servicio y no
        constituyen marketing.
      </p>

      <h2>7. Limitación de responsabilidad</h2>
      <p>
        En la medida permitida por la ley, TuTurno no será responsable de daños
        indirectos, incidentales o consecuentes derivados del uso de la
        plataforma. TuTurno no garantiza disponibilidad continua ni ausencia
        total de errores.
      </p>
      <p>
        Esta limitación no afecta los derechos irrenunciables que la legislación
        colombiana reconoce al consumidor.
      </p>

      <h2>8. Suspensión y terminación</h2>
      <p>
        Podemos suspender o terminar cuentas que infrinjan estos Términos, que
        comprometan la seguridad de la plataforma o que sean objeto de reclamos
        legales. El negocio puede dejar de usar TuTurno cuando lo decida; sus
        clientes conservan sus derechos sobre sus datos personales.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        TuTurno, su marca, su software y su diseño son propiedad de{' '}
        <strong>Esteban González</strong>. El contenido que el negocio cargue
        (logos, instrucciones, etc.) sigue siendo responsabilidad del negocio,
        que debe contar con los derechos necesarios para su uso.
      </p>

      <h2>10. Legislación aplicable</h2>
      <p>
        Estos Términos se rigen por la legislación colombiana. Cualquier
        controversia se resolverá ante las jurisdicciones competentes de{' '}
        <strong>Bogotá</strong>, Colombia, salvo que la ley disponga un fuero
        distinto para el consumidor.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para consultas sobre estos Términos escribe a{' '}
        <strong>privacidad@tuturno.online</strong>.
      </p>
    </LegalPage>
  )
}
