import { LEGAL_ENTITY } from '@/lib/legal'
import { LegalPage } from './legal-page'

export function TermsPage() {
  return (
    <LegalPage
      title='Términos y Condiciones de Uso'
      subtitle='TuTurno — Plataforma de reservas online'
    >
      <h2>1. Quién presta la plataforma</h2>
      <p>
        TuTurno es una plataforma de software para publicar disponibilidad y
        gestionar solicitudes de reserva, operada desde {LEGAL_ENTITY.city}.
        Para consultas:{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
      </p>
      <p>
        TuTurno facilita el contacto entre clientes y negocios. El negocio
        correspondiente presta el servicio reservado y decide si confirma la
        solicitud. TuTurno no cobra ni recauda pagos por las reservas.
      </p>

      <h2>2. Aceptación y cuenta</h2>
      <p>
        Al crear una cuenta confirmas que tienes al menos 18 años, aceptas estos
        Términos y autorizas el tratamiento descrito en la{' '}
        <a href='/privacidad'>Política de Tratamiento de Datos Personales</a>.
        Debes proporcionar datos correctos, proteger tus credenciales y usar la
        plataforma de forma lícita. Una persona adulta debe gestionar las
        reservas que involucren a menores.
      </p>

      <h2>3. Solicitudes de reserva</h2>
      <p>
        Una solicitud no equivale a una reserva confirmada. El negocio puede
        confirmarla o rechazarla según su disponibilidad y las reglas que haya
        informado. Antes de solicitar, revisa las condiciones del negocio,
        incluidos horarios, cancelaciones, anticipos y reembolsos. Esas
        condiciones no son fijadas ni cobradas por TuTurno.
      </p>

      <h2>4. Precio y contratación de TuTurno</h2>
      <p>
        Como referencia comercial, los planes se proyectan desde $49.900 COP al
        mes por negocio. No es una oferta vinculante ni un cobro actual. El
        alcance, precio final, impuestos, duración y forma de pago se acuerdan
        por escrito con cada negocio antes de activar un plan. Actualmente no
        hay checkout ni cobros automáticos en la plataforma.
      </p>
      <p>
        Consulta la <a href='/reembolsos'>Política de reembolsos</a> para las
        condiciones aplicables a pagos que se acuerden directamente con TuTurno
        o con un negocio.
      </p>

      <h2>5. Responsabilidades de los negocios</h2>
      <ul>
        <li>
          El negocio es responsable de la relación con sus clientes y de los
          datos personales cuyo tratamiento determine. TuTurno trata datos de
          clientes por cuenta del negocio para habilitar las reservas.
        </li>
        <li>
          El negocio debe publicar sus reglas de reserva, cancelación, anticipos
          y reembolsos, y cumplirlas junto con las obligaciones aplicables de
          protección al consumidor.
        </li>
        <li>
          El negocio debe informar a sus clientes sobre el tratamiento de datos
          y obtener la autorización que corresponda, especialmente al ingresar
          datos de una persona invitada.
        </li>
        <li>
          No debe solicitar ni almacenar información médica u otros datos
          sensibles en notas o instrucciones de reserva.
        </li>
        <li>
          Los datos obtenidos a través de TuTurno solo pueden usarse para fines
          informados y autorizados. Las promociones requieren consentimiento
          separado, previo, expreso e informado.
        </li>
      </ul>

      <h2>6. Comunicaciones</h2>
      <p>
        TuTurno puede enviar avisos operativos sobre la cuenta y las reservas.
        Las promociones comerciales de un negocio son independientes y exigen
        autorización previa. Las comunicaciones comerciales deben respetar la
        normativa colombiana aplicable, incluidos los horarios y preferencias de
        contacto cuando corresponda.
      </p>

      <h2>7. Disponibilidad y responsabilidad</h2>
      <p>
        La plataforma se ofrece tal como está disponible. Puede tener
        interrupciones, errores o cambios. Nada de estos Términos limita los
        derechos irrenunciables del consumidor ni excluye responsabilidades que
        no puedan excluirse por ley.
      </p>

      <h2>8. Suspensión y terminación</h2>
      <p>
        Podemos restringir o suspender el acceso cuando sea razonablemente
        necesario para proteger la seguridad, atender una obligación legal o
        responder a un incumplimiento de estos Términos — incluido el impago de
        un plan acordado con un negocio. Puedes dejar de usar la plataforma y
        solicitar atención sobre tus datos por el canal de privacidad.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        El software de TuTurno se distribuye bajo la licencia GNU AGPL-3.0. El
        código fuente está disponible en el{' '}
        <a
          href='https://github.com/drummes12/tuturno.online'
          target='_blank'
          rel='noreferrer'
        >
          repositorio público
          <span className='sr-only'>(se abre en otra pestaña)</span>
        </a>
        . Los componentes de terceros conservan sus propias licencias, que se
        detallan en el repositorio. El negocio es responsable de contar con
        derechos para el contenido que cargue.
      </p>

      <h2>10. Ley aplicable y peticiones</h2>
      <p>
        Se aplica la legislación colombiana. Para peticiones, quejas o reclamos
        sobre TuTurno, escribe a{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. Las
        reclamaciones de consumo se atenderán dentro del término legal. Esto no
        limita tu derecho a acudir a la autoridad competente.
      </p>

      <h2>11. Cambios y contacto</h2>
      <p>
        Informaremos cambios sustanciales a estos Términos antes de que entren
        en vigor. Contacto:{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
      </p>
    </LegalPage>
  )
}
