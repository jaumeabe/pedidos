import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { formatEur } from "@/lib/datos-granjero";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurado");
  return new Resend(key);
}

type LineaPedido = { nombre: string; unidades: number; precio: number };

interface EmailPayload {
  rol: "granjero" | "visitador";
  origen: string;
  medicamentos: LineaPedido[];
  materiales: LineaPedido[];
  notas?: string;
}

function tableHtml(titulo: string, items: LineaPedido[]): string {
  if (items.length === 0) return "";

  const rowsHtml = items
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${r.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center;font-weight:600;">${r.unidades}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;color:#555;">${r.precio > 0 ? formatEur(r.precio) : "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:600;color:#1d4ed8;">${r.precio > 0 ? formatEur(r.precio * r.unidades) : "—"}</td>
      </tr>`
    )
    .join("");

  const subtotal = items.reduce((acc, r) => acc + r.precio * r.unidades, 0);

  return `
    <h3 style="margin:24px 0 8px;font-size:15px;color:#1a1a2e;border-bottom:2px solid #e2e8f0;padding-bottom:6px;">${titulo}</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;border-bottom:2px solid #e2e8f0;">PRODUCTO</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;border-bottom:2px solid #e2e8f0;">UDS.</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;border-bottom:2px solid #e2e8f0;">PRECIO/UD.</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;border-bottom:2px solid #e2e8f0;">TOTAL</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr style="background:#f1f5f9;">
          <td colspan="3" style="padding:10px 12px;font-size:13px;font-weight:700;color:#1a1a2e;">Subtotal ${titulo}</td>
          <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#1d4ed8;text-align:right;">${formatEur(subtotal)}</td>
        </tr>
      </tfoot>
    </table>`;
}

function formatFechaServer(): string {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, "0");
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const anyo = now.getFullYear();
  const horas = String(now.getHours()).padStart(2, "0");
  const minutos = String(now.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anyo} ${horas}:${minutos}`;
}

function buildEmailHtml(payload: EmailPayload): string {
  const rolLabel = payload.rol === "granjero" ? "Granja" : "Visitador";
  const fecha = formatFechaServer();
  const medTable = tableHtml("Medicamentos", payload.medicamentos);
  const matTable = tableHtml("Material", payload.materiales);

  const totalGeneral =
    payload.medicamentos.reduce((a, r) => a + r.precio * r.unidades, 0) +
    payload.materiales.reduce((a, r) => a + r.precio * r.unidades, 0);

  const notasHtml = payload.notas
    ? `<div style="margin:16px 32px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;">
        <strong>Notas:</strong> ${payload.notas}
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1a1a2e;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Pedido de Farmacia</h1>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">Nuevo pedido de medicamentos y materiales</p>
    </div>

    <!-- Datos -->
    <div style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#6b7280;">${rolLabel.toUpperCase()}</td>
          <td style="font-size:13px;color:#6b7280;text-align:right;">FECHA</td>
        </tr>
        <tr>
          <td style="font-size:18px;font-weight:700;color:#1a1a2e;">${payload.origen}</td>
          <td style="font-size:18px;font-weight:700;color:#1a1a2e;text-align:right;">${fecha}</td>
        </tr>
      </table>
    </div>

    <!-- Tablas -->
    <div style="padding:8px 32px 24px;">
      ${medTable}
      ${matTable}
    </div>

    ${notasHtml}

    <!-- Total general -->
    <div style="margin:0 32px 32px;background:#1d4ed8;border-radius:8px;padding:16px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:15px;font-weight:700;color:#fff;">TOTAL PEDIDO</td>
          <td style="font-size:22px;font-weight:700;color:#fff;text-align:right;">${formatEur(totalGeneral)}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Generado automáticamente · Pedidos Farmacia
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const payload: EmailPayload = await req.json();

    const html = buildEmailHtml(payload);

    const recipient = process.env.RECIPIENT_EMAIL;
    if (!recipient) {
      return NextResponse.json(
        { error: "RECIPIENT_EMAIL no configurado" },
        { status: 500 }
      );
    }

    const fromEmail =
      process.env.FROM_EMAIL ?? "Pedidos Farmacia <onboarding@resend.dev>";

    const rolLabel = payload.rol === "granjero" ? "Granja" : "Visitador";
    const subject = `Pedido ${rolLabel}: ${payload.origen}`;

    const recipients = [recipient];
    const extraEmails = process.env.EXTRA_RECIPIENTS;
    if (extraEmails) {
      recipients.push(
        ...extraEmails
          .split(",")
          .map((e: string) => e.trim())
          .filter(Boolean)
      );
    }

    console.log("[RESEND] Enviando pedido:", {
      from: fromEmail,
      to: recipients,
      subject,
    });

    const { data, error } = await getResend().emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
    });

    if (error) {
      console.error("[RESEND] Error de Resend:", JSON.stringify(error));
      return NextResponse.json(
        {
          error: `Error de Resend: ${error.message ?? JSON.stringify(error)}`,
        },
        { status: 500 }
      );
    }

    console.log("[RESEND] Email enviado OK, id:", data?.id);
    return NextResponse.json({ ok: true, emailId: data?.id });
  } catch (err) {
    console.error("[RESEND] Error inesperado:", err);
    return NextResponse.json(
      { error: "Error al enviar el email" },
      { status: 500 }
    );
  }
}
