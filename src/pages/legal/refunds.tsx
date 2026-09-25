import { LEGAL_ENTITY } from '@/lib/legal'
import { LegalPage } from './legal-page'

export function RefundsPage() {
  return (
    <LegalPage
      title='Política de cancelaciones y reembolsos'
      subtitle='Pagos de TuTurno y pagos directos a los negocios'
    >
      <h2>1. Pagos por el servicio de TuTurno</h2>
      <p>
        TuTurno no tiene checkout ni realiza cobros automáticos actualmente. Si
        se acuerda un plan, el precio, periodo, alcance y medio de pago se
        informan por escrito antes de activarlo. No se iniciará un cobro
        periódico automático sin una autorización expresa.
      </p>
      <p>
        Si realizaste un pago directamente a TuTurno y tienes una solicitud de
        cancelación o devolución, escribe a{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> con el
        comprobante y el motivo. Revisaremos el caso conforme a lo pactado y a
        los derechos que reconoce la ley. Cuando aplique el derecho de retracto
        en una prestación de servicios contratada a distancia, el plazo general
        es de cinco días hábiles desde la celebración del contrato (artículo 47
        de la Ley 1480 de 2011), sujeto a las excepciones legales, incluida la
        ejecución del servicio con acuerdo del consumidor.
      </p>
      <p>
        La reversión de pagos electrónicos procede solo en los casos y mediante
        el procedimiento del artículo 51 de la Ley 1480 de 2011, reglamentado
        por el Decreto 587 de 2016. Puede aplicar ante fraude, operación no
        solicitada, falta de recepción o servicio que no corresponda a lo
        contratado, según resulte aplicable. El retracto y la reversión son
        mecanismos distintos.
      </p>

      <h2>2. Pagos por reservas de negocios</h2>
      <p>
        TuTurno no recibe ni procesa pagos, anticipos o depósitos por una
        reserva. Si un negocio cobra directamente, el pago se realiza entre el
        cliente y ese negocio. Antes de pagar, consulta con el negocio su regla
        de cancelación, devolución y cambios, además de los derechos que te
        correspondan como consumidor.
      </p>
      <p>
        El negocio que recibe el pago es responsable de responder una solicitud
        de devolución asociada a su servicio. TuTurno no puede ordenar ni
        ejecutar una devolución de dinero que no recibió.
      </p>

      <h2>3. Contacto</h2>
      <p>
        Para pagos hechos directamente a TuTurno:{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. Para
        anticipos o pagos de una reserva, contacta al negocio que recibió el
        dinero. Esta política no elimina derechos irrenunciables bajo la Ley
        1480 de 2011 y sus normas reglamentarias.
      </p>
    </LegalPage>
  )
}
