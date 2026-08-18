import { LegalPage } from './legal-page'

/**
 * Política de Tratamiento de Datos Personales de TuTurno.
 *
 * IMPORTANTE: revisar con un abogado colombiano antes de producción.
 * La jurisdicción de Supabase debe confirmarse cuando se defina el
 * proyecto definitivo.
 */
export function PrivacyPage() {
  return (
    <LegalPage
      title='Política de Tratamiento de Datos Personales'
      subtitle='TuTurno — Plataforma de reservas online'
    >
      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de datos personales en la plataforma
        TuTurno es <strong>Esteban González</strong>, con domicilio en{' '}
        <strong>Bogotá, Colombia</strong>. El canal habilitado para consultas y
        reclamos relacionados con datos personales es el correo{' '}
        <strong>privacidad@tuturno.online</strong>.
      </p>
      <p>
        TuTurno opera el software de reservas. Cada negocio que usa la
        plataforma es responsable de los datos de sus propios clientes y de las
        comunicaciones comerciales que envíe por su cuenta.
      </p>

      <h2>2. Datos que se recogen</h2>
      <ul>
        <li>
          <strong>Para usuarios registrados:</strong> nombre completo, correo
          electrónico y teléfono.
        </li>
        <li>
          <strong>Para reservas:</strong> recurso, fecha y hora solicitados,
          notas que el cliente decida incluir y el estado de la reserva.
        </li>
        <li>
          <strong>Para clientes sin cuenta (guests):</strong> nombre, teléfono y
          correo que el negocio registre para gestionar la reserva.
        </li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <ul>
        <li>Crear y mantener la cuenta de usuario y el perfil.</li>
        <li>
          Gestionar reservas: creación, confirmación, rechazo, cancelación y
          expiración.
        </li>
        <li>
          Enviar notificaciones operativas relacionadas con las reservas
          (confirmación, rechazo, cancelación, recordatorios). Estas
          notificaciones son necesarias para prestar el servicio y no dependen
          del consentimiento de marketing.
        </li>
        <li>Atender solicitudes de soporte y seguridad.</li>
        <li>
          Cumplir obligaciones legales, contables y de auditoría cuando aplique.
        </li>
      </ul>
      <p>
        El envío de <strong>promociones o publicidad por correo</strong> por
        parte de un negocio requiere una autorización previa, expresa e
        informada, distinta de la aceptación de esta política. Esa autorización
        se solicita por separado y se registra por negocio.
      </p>

      <h2>4. Autorización</h2>
      <p>
        Al crear una cuenta en TuTurno el usuario acepta esta Política de
        Tratamiento de Datos Personales y los Términos de Uso. Esta autorización
        es necesaria para prestar el servicio de reservas. El registro queda
        bloqueado si no se acepta.
      </p>
      <p>
        El consentimiento para fines de marketing es opcional, independiente y
        no es requisito para usar la plataforma ni para hacer reservas. No se
        preselecciona ninguna casilla de marketing.
      </p>

      <h2>5. Compartición y transferencia de datos</h2>
      <ul>
        <li>
          TuTurno <strong>no vende ni comparte listas de clientes</strong> entre
          negocios. Un negocio no puede acceder a los clientes, reservas ni
          datos de otro negocio.
        </li>
        <li>
          Cada negocio accede únicamente a los datos de los clientes que han
          reservado con él.
        </li>
        <li>
          Se utilizan los siguientes proveedores para prestar el servicio:
          <ul>
            <li>
              <strong>Supabase</strong> (base de datos, autenticación y
              funciones): los datos se almacenan en servidores ubicados en
              Estados Unidos (región US East - Ohio, proveedor de
              infraestructura AWS). Supabase cumple con estándares reconocidos
              como SOC 2.
            </li>
            <li>
              <strong>Resend</strong> (envío de correos transaccionales): los
              datos de los correos enviados se procesan en servidores ubicados
              en Estados Unidos.
            </li>
          </ul>
        </li>
      </ul>

      <h2>6. Derechos del titular</h2>
      <p>Como titular de datos personales tienes derecho a:</p>
      <ul>
        <li>Acceder a tus datos personales tratados por TuTurno.</li>
        <li>Solicitar la corrección de datos inexactos o incompletos.</li>
        <li>Solicitar la supresión de tus datos cuando proceda.</li>
        <li>Retirar el consentimiento de marketing en cualquier momento.</li>
        <li>
          Presentar reclamos ante la Superintendencia de Industria y Comercio.
        </li>
      </ul>
      <p>
        Para ejercer estos derechos escribe a{' '}
        <strong>privacidad@tuturno.online</strong> indicando tu nombre, correo
        registrado y la solicitud. Atenderemos tu solicitud en los plazos
        legales aplicables.
      </p>
      <p>
        La supresión de datos puede no ser inmediata cuando exista una
        obligación legal, contable, de seguridad o de resolución de disputas que
        requiera conservarlos. En ese caso, los datos se conservarán solo para
        esa finalidad y se suprimirán al cesar la necesidad.
      </p>

      <h2>7. Conservación de los datos</h2>
      <ul>
        <li>
          Datos de cuenta y reservas: mientras la cuenta esté activa y durante
          el período necesario para fines contables, de seguridad y de
          resolución de disputas.
        </li>
        <li>
          Consentimientos: se conservan como evidencia del cumplimiento de la
          autorización, incluso después del retiro, mientras sea necesario
          demostrar el historial.
        </li>
        <li>
          Datos de clientes sin cuenta: mientras el negocio los necesite para
          gestionar reservas; el negocio es responsable de su conservación y
          supresión.
        </li>
      </ul>

      <h2>8. Menores</h2>
      <p>
        Las cuentas de TuTurno y el contacto principal deben ser gestionados por
        adultos. Si una reserva involucra a un menor, debe ser realizada y
        gestionada por un adulto responsable o por el negocio con los datos de
        contacto del adulto. No se solicita información adicional del menor ni
        se realizan actividades de marketing o perfilamiento basadas en datos de
        menores.
      </p>

      <h2>9. Medidas de seguridad</h2>
      <p>
        TuTurno aplica medidas técnicas y organizativas razonables para proteger
        los datos personales, incluyendo control de acceso por roles, políticas
        de seguridad a nivel de fila en la base de datos y cifrado en tránsito.
        En caso de una brecha de seguridad que afecte tus datos, te informaremos
        conforme a la legislación aplicable.
      </p>

      <h2>10. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta política cuando cambien las finalidades del
        tratamiento, los proveedores o la legislación aplicable. Cada versión
        tiene una fecha y un identificador de versión. Los cambios sustanciales
        requerirán una nueva aceptación cuando corresponda.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para cualquier consulta sobre tratamiento de datos personales, escribe a{' '}
        <strong>privacidad@tuturno.online</strong>.
      </p>
    </LegalPage>
  )
}
