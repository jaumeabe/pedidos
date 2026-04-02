"use client";

import { useState } from "react";
import {
  GRANJAS,
  MEDICAMENTOS_GRANJERO,
  ROPA_GRANJERO,
  MATERIALES_GRANJERO,
  type Producto,
} from "@/lib/datos-granjero";
import {
  VISITADORES,
  MEDICAMENTOS_VISITADOR,
  MATERIALES_VISITADOR,
} from "@/lib/datos-visitador";

const CANTIDAD_OPTIONS = Array.from({ length: 101 }, (_, i) => i);

type Rol = "" | "granjero" | "visitador";
type Pedido = Record<string, number>;
type SubmitStatus = "idle" | "loading" | "success" | "error";

function buildInitialPedido(items: Producto[]): Pedido {
  return Object.fromEntries(items.map((p) => [p.nombre, 0]));
}

function formatFecha(): string {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, "0");
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const anyo = now.getFullYear();
  const horas = String(now.getHours()).padStart(2, "0");
  const minutos = String(now.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anyo} ${horas}:${minutos}`;
}

function downloadExcel(
  rolLabel: string,
  origen: string,
  fecha: string,
  medItems: { nombre: string; uds: number }[],
  ropaItems: { nombre: string; uds: number }[],
  matItems: { nombre: string; uds: number }[],
  notas: string
) {
  let rows = "";

  rows += `<Row><Cell ss:StyleID="header"><Data ss:Type="String">Pedido de Farmacia</Data></Cell></Row>`;
  rows += `<Row><Cell><Data ss:Type="String">${rolLabel}</Data></Cell><Cell><Data ss:Type="String">${origen}</Data></Cell></Row>`;
  rows += `<Row><Cell><Data ss:Type="String">Fecha</Data></Cell><Cell><Data ss:Type="String">${fecha}</Data></Cell></Row>`;
  rows += `<Row></Row>`;

  if (medItems.length > 0) {
    rows += `<Row><Cell ss:StyleID="header"><Data ss:Type="String">MEDICAMENTOS</Data></Cell></Row>`;
    rows += `<Row><Cell ss:StyleID="colhead"><Data ss:Type="String">Producto</Data></Cell><Cell ss:StyleID="colhead"><Data ss:Type="String">Uds.</Data></Cell></Row>`;
    for (const item of medItems) {
      rows += `<Row><Cell><Data ss:Type="String">${item.nombre}</Data></Cell><Cell><Data ss:Type="Number">${item.uds}</Data></Cell></Row>`;
    }
    rows += `<Row></Row>`;
  }

  if (ropaItems.length > 0) {
    rows += `<Row><Cell ss:StyleID="header"><Data ss:Type="String">ROPA</Data></Cell></Row>`;
    rows += `<Row><Cell ss:StyleID="colhead"><Data ss:Type="String">Producto</Data></Cell><Cell ss:StyleID="colhead"><Data ss:Type="String">Uds.</Data></Cell></Row>`;
    for (const item of ropaItems) {
      rows += `<Row><Cell><Data ss:Type="String">${item.nombre}</Data></Cell><Cell><Data ss:Type="Number">${item.uds}</Data></Cell></Row>`;
    }
    rows += `<Row></Row>`;
  }

  if (matItems.length > 0) {
    rows += `<Row><Cell ss:StyleID="header"><Data ss:Type="String">MATERIAL</Data></Cell></Row>`;
    rows += `<Row><Cell ss:StyleID="colhead"><Data ss:Type="String">Producto</Data></Cell><Cell ss:StyleID="colhead"><Data ss:Type="String">Uds.</Data></Cell></Row>`;
    for (const item of matItems) {
      rows += `<Row><Cell><Data ss:Type="String">${item.nombre}</Data></Cell><Cell><Data ss:Type="Number">${item.uds}</Data></Cell></Row>`;
    }
    rows += `<Row></Row>`;
  }

  if (notas) {
    rows += `<Row><Cell ss:StyleID="header"><Data ss:Type="String">Notas</Data></Cell></Row>`;
    rows += `<Row><Cell><Data ss:Type="String">${notas}</Data></Cell></Row>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="Default"><Font ss:FontName="Arial" ss:Size="11"/></Style>
  <Style ss:ID="header"><Font ss:FontName="Arial" ss:Size="12" ss:Bold="1"/></Style>
  <Style ss:ID="colhead"><Font ss:FontName="Arial" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/></Style>
</Styles>
<Worksheet ss:Name="Pedido">
  <Table ss:DefaultColumnWidth="120">
    <Column ss:Width="280"/>
    <Column ss:Width="80"/>
    ${rows}
  </Table>
</Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Pedido_${origen.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PedidosPage() {
  const [rol, setRol] = useState<Rol>("");

  // Granjero state
  const [granja, setGranja] = useState("");

  // Visitador state
  const [visitador, setVisitador] = useState("");

  // Shared state
  const [notas, setNotas] = useState("");
  const [fechaEnvio, setFechaEnvio] = useState("");
  const [medicamentos, setMedicamentos] = useState<Pedido>({});
  const [ropa, setRopa] = useState<Pedido>({});
  const [materiales, setMateriales] = useState<Pedido>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [emailError, setEmailError] = useState("");

  const medList = rol === "granjero" ? MEDICAMENTOS_GRANJERO : MEDICAMENTOS_VISITADOR;
  const ropaList = ROPA_GRANJERO;
  const matList = rol === "granjero" ? MATERIALES_GRANJERO : MATERIALES_VISITADOR;

  function handleRolChange(newRol: Rol) {
    setRol(newRol);
    setGranja("");
    setVisitador("");
    setNotas("");
    if (newRol === "granjero") {
      setMedicamentos(buildInitialPedido(MEDICAMENTOS_GRANJERO));
      setRopa(buildInitialPedido(ROPA_GRANJERO));
      setMateriales(buildInitialPedido(MATERIALES_GRANJERO));
    } else if (newRol === "visitador") {
      setMedicamentos(buildInitialPedido(MEDICAMENTOS_VISITADOR));
      setRopa({});
      setMateriales(buildInitialPedido(MATERIALES_VISITADOR));
    }
  }

  function handleMedicamento(nombre: string, cantidad: number) {
    setMedicamentos((prev) => ({ ...prev, [nombre]: cantidad }));
  }

  function handleRopa(nombre: string, cantidad: number) {
    setRopa((prev) => ({ ...prev, [nombre]: cantidad }));
  }

  function handleMaterial(nombre: string, cantidad: number) {
    setMateriales((prev) => ({ ...prev, [nombre]: cantidad }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rol === "granjero" && !granja) {
      alert("Por favor, selecciona una granja.");
      return;
    }
    if (rol === "visitador" && !visitador) {
      alert("Por favor, selecciona tu nombre.");
      return;
    }

    setStatus("loading");
    setEmailError("");
    setFechaEnvio(formatFecha());

    const medicamentosConPedido = medList
      .filter((p) => medicamentos[p.nombre] > 0)
      .map((p) => ({ nombre: p.nombre, unidades: medicamentos[p.nombre] }));

    const ropaConPedido = ropaList
      .filter((p) => ropa[p.nombre] > 0)
      .map((p) => ({ nombre: p.nombre, unidades: ropa[p.nombre] }));

    const materialesConPedido = matList
      .filter((p) => materiales[p.nombre] > 0)
      .map((p) => ({ nombre: p.nombre, unidades: materiales[p.nombre] }));

    if (medicamentosConPedido.length === 0 && ropaConPedido.length === 0 && materialesConPedido.length === 0) {
      alert("No has seleccionado ningún producto.");
      setStatus("idle");
      return;
    }

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rol,
          origen: rol === "granjero" ? granja : visitador,
          medicamentos: medicamentosConPedido,
          ropa: ropaConPedido,
          materiales: materialesConPedido,
          notas,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEmailError(data.error ?? "Error desconocido al enviar el email.");
      }
    } catch {
      setEmailError("No se pudo conectar con el servidor de email.");
    }

    setStatus("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    setRol("");
    setGranja("");
    setVisitador("");
    setNotas("");
    setFechaEnvio("");
    setMedicamentos({});
    setRopa({});
    setMateriales({});
    setStatus("idle");
    setEmailError("");
  }

  function handleExcel() {
    const origen = rol === "granjero" ? granja : visitador;
    const rolLabel = rol === "granjero" ? "Granja" : "Visitador";
    const medItems = medicamentosConPedido.map((p) => ({
      nombre: p.nombre,
      uds: medicamentos[p.nombre],
    }));
    const ropaItems = ropaConPedido.map((p) => ({
      nombre: p.nombre,
      uds: ropa[p.nombre],
    }));
    const matItems = materialesConPedido.map((p) => ({
      nombre: p.nombre,
      uds: materiales[p.nombre],
    }));
    downloadExcel(rolLabel, origen, fechaEnvio, medItems, ropaItems, matItems, notas);
  }

  const medicamentosConPedido = medList.filter((p) => medicamentos[p.nombre] > 0);
  const ropaConPedido = ropaList.filter((p) => ropa[p.nombre] > 0);
  const materialesConPedido = matList.filter((p) => materiales[p.nombre] > 0);

  // ─── SUCCESS SCREEN ──────────────────────────────────────────────────
  if (status === "success") {
    const origen = rol === "granjero" ? granja : visitador;
    const rolLabel = rol === "granjero" ? "Granja" : "Visitador";
    return (
      <div style={styles.page}>
        <div className="success-card" style={styles.successCard}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.successTitle}>Pedido Enviado</h1>
          <p style={styles.successSubtitle}>
            <strong>{rolLabel}:</strong> {origen}
          </p>
          <p style={styles.successDate}>
            Fecha: {fechaEnvio}
          </p>

          {emailError ? (
            <div style={styles.emailError}>
              ⚠️ Hubo un error al enviar el email: {emailError}
            </div>
          ) : (
            <div style={styles.emailOk}>
              ✉️ Se ha enviado el pedido por email a farmacia correctamente.
            </div>
          )}

          {medicamentosConPedido.length > 0 && (
            <SummaryTable
              titulo="Medicamentos"
              productos={medicamentosConPedido}
              pedido={medicamentos}
            />
          )}

          {ropaConPedido.length > 0 && (
            <SummaryTable
              titulo="Ropa"
              productos={ropaConPedido}
              pedido={ropa}
            />
          )}

          {materialesConPedido.length > 0 && (
            <SummaryTable
              titulo="Material"
              productos={materialesConPedido}
              pedido={materiales}
            />
          )}

          {notas && (
            <div style={styles.notasBox}>
              <strong>Notas:</strong> {notas}
            </div>
          )}

          <div className="button-row" style={styles.buttonRow}>
            <button onClick={handleExcel} className="action-btn" style={styles.excelBtn}>
              Descargar Excel
            </button>
            <button onClick={() => window.print()} className="action-btn" style={styles.printBtn}>
              Imprimir / Guardar PDF
            </button>
            <button onClick={handleReset} className="action-btn" style={styles.resetBtn}>
              Nuevo pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ROLE SELECTION ──────────────────────────────────────────────────
  if (!rol) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.title}>Pedidos de Farmacia</h1>
            <p style={styles.subtitle}>Selecciona tu perfil para hacer un pedido</p>
          </header>
          <div className="role-grid" style={styles.roleGrid}>
            <button
              onClick={() => handleRolChange("granjero")}
              style={styles.roleCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2563eb";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
              }}
            >
              <div style={styles.roleIcon}>🐷</div>
              <h2 style={styles.roleTitle}>Granjero</h2>
              <p style={styles.roleDesc}>
                Pedido de medicamentos y materiales para tu granja
              </p>
            </button>
            <button
              onClick={() => handleRolChange("visitador")}
              style={styles.roleCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2563eb";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
              }}
            >
              <div style={styles.roleIcon}>👨‍⚕️</div>
              <h2 style={styles.roleTitle}>Visitador</h2>
              <p style={styles.roleDesc}>
                Pedido de medicamentos y materiales para visitas
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ORDER FORM ──────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Pedidos de Farmacia</h1>
          <p style={styles.subtitle}>
            {rol === "granjero" ? "Pedido para Granja" : "Pedido de Visitador"}
          </p>
          <button onClick={handleReset} style={styles.backBtn}>
            ← Cambiar perfil
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          {/* Selector */}
          <div className="form-card" style={styles.card}>
            <h2 style={styles.cardTitle}>
              {rol === "granjero" ? "Datos de la Granja" : "Datos del Visitador"}
            </h2>
            <div style={styles.field}>
              <label style={styles.label}>
                {rol === "granjero" ? "Nombre de la granja *" : "Tu nombre *"}
              </label>
              {rol === "granjero" ? (
                <select
                  value={granja}
                  onChange={(e) => setGranja(e.target.value)}
                  style={styles.input}
                  required
                >
                  <option value="">— Selecciona una granja —</option>
                  {GRANJAS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={visitador}
                  onChange={(e) => setVisitador(e.target.value)}
                  style={styles.input}
                  required
                >
                  <option value="">— Selecciona tu nombre —</option>
                  {VISITADORES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Medicamentos */}
          <div className="form-card" style={styles.card}>
            <h2 style={styles.cardTitle}>Medicamentos</h2>
            <p style={styles.cardHint}>
              Selecciona las unidades que quieres pedir (0 = no pedir)
            </p>
            <div className="product-grid" style={styles.grid}>
              {medList.map((p) => (
                <div key={p.nombre} style={styles.productRow}>
                  <div style={styles.productInfo}>
                    <span style={styles.productLabel}>{p.nombre}</span>
                  </div>
                  <select
                    value={medicamentos[p.nombre] ?? 0}
                    onChange={(e) =>
                      handleMedicamento(p.nombre, Number(e.target.value))
                    }
                    style={{
                      ...styles.select,
                      ...((medicamentos[p.nombre] ?? 0) > 0
                        ? styles.selectActive
                        : {}),
                    }}
                  >
                    {CANTIDAD_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Ropa (solo granjero) */}
          {rol === "granjero" && (
          <div className="form-card" style={styles.card}>
            <h2 style={styles.cardTitle}>Ropa</h2>
            <p style={styles.cardHint}>
              Selecciona las unidades que quieres pedir (0 = no pedir)
            </p>
            <div className="product-grid" style={styles.grid}>
              {ropaList.map((p) => (
                <div key={p.nombre} style={styles.productRow}>
                  <div style={styles.productInfo}>
                    <span style={styles.productLabel}>{p.nombre}</span>
                  </div>
                  <select
                    value={ropa[p.nombre] ?? 0}
                    onChange={(e) =>
                      handleRopa(p.nombre, Number(e.target.value))
                    }
                    style={{
                      ...styles.select,
                      ...((ropa[p.nombre] ?? 0) > 0
                        ? styles.selectActive
                        : {}),
                    }}
                  >
                    {CANTIDAD_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Material */}
          <div className="form-card" style={styles.card}>
            <h2 style={styles.cardTitle}>Material</h2>
            <p style={styles.cardHint}>
              Selecciona las unidades que quieres pedir (0 = no pedir)
            </p>
            <div className="product-grid" style={styles.grid}>
              {matList.map((p) => (
                <div key={p.nombre} style={styles.productRow}>
                  <div style={styles.productInfo}>
                    <span style={styles.productLabel}>{p.nombre}</span>
                  </div>
                  <select
                    value={materiales[p.nombre] ?? 0}
                    onChange={(e) =>
                      handleMaterial(p.nombre, Number(e.target.value))
                    }
                    style={{
                      ...styles.select,
                      ...((materiales[p.nombre] ?? 0) > 0
                        ? styles.selectActive
                        : {}),
                    }}
                  >
                    {CANTIDAD_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="form-card" style={styles.card}>
            <h2 style={styles.cardTitle}>Notas adicionales</h2>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Escribe aquí cualquier observación o nota sobre el pedido..."
              style={styles.textarea}
              rows={3}
            />
          </div>

          <div style={styles.submitRow}>
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                ...styles.submitBtn,
                ...(status === "loading" ? styles.submitBtnLoading : {}),
              }}
            >
              {status === "loading" ? "Enviando…" : "Enviar Pedido"}
            </button>
            <p style={styles.submitHint}>
              Se enviará el pedido por email a farmacia
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SUMMARY TABLE COMPONENT ───────────────────────────────────────────
function SummaryTable({
  titulo,
  productos,
  pedido,
}: {
  titulo: string;
  productos: Producto[];
  pedido: Pedido;
}) {
  return (
    <section style={styles.summarySection}>
      <h2 style={styles.sectionTitle}>{titulo}</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Producto</th>
            <th style={{ ...styles.th, textAlign: "center", width: 80 }}>Uds.</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => {
            const uds = pedido[p.nombre];
            return (
              <tr key={p.nombre}>
                <td style={styles.td}>{p.nombre}</td>
                <td style={{ ...styles.td, textAlign: "center", fontWeight: 600 }}>
                  {uds}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fa",
    padding: "24px 16px",
  },
  container: {
    maxWidth: 860,
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
  },
  backBtn: {
    marginTop: 12,
    display: "inline-block",
    backgroundColor: "transparent",
    color: "#2563eb",
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    padding: "4px 8px",
  },
  // Role selection
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
    gap: 24,
    maxWidth: 600,
    margin: "0 auto",
  },
  roleCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: "40px 28px",
    border: "2px solid #e2e8f0",
    cursor: "pointer",
    textAlign: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    transition: "all 0.2s",
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: 8,
  },
  roleDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 1.4,
  },
  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: "24px 28px",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#1a1a2e",
    marginBottom: 6,
    borderBottom: "2px solid #e8ecf0",
    paddingBottom: 10,
  },
  cardHint: {
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
  },
  field: {
    flex: 1,
    minWidth: 220,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#444",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    outline: "none",
    backgroundColor: "#fafafa",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    outline: "none",
    backgroundColor: "#fafafa",
    resize: "vertical" as const,
    fontFamily: "inherit",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))",
    gap: 10,
  },
  productRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 12px",
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    border: "1px solid #e8ecf0",
  },
  productInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  productLabel: {
    fontSize: 13,
    color: "#333",
    lineHeight: 1.3,
  },
  productPrice: {
    fontSize: 11,
    color: "#999",
  },
  select: {
    padding: "6px 8px",
    fontSize: 14,
    border: "1px solid #d1d5db",
    borderRadius: 5,
    backgroundColor: "#fff",
    cursor: "pointer",
    minWidth: 64,
    textAlign: "center",
  },
  selectActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 600,
  },
  submitRow: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 40,
  },
  submitBtn: {
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "14px 40px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 0.3,
  },
  submitBtnLoading: {
    backgroundColor: "#93c5fd",
    cursor: "not-allowed",
  },
  submitHint: {
    marginTop: 10,
    fontSize: 12,
    color: "#9ca3af",
  },
  // Success screen
  successCard: {
    maxWidth: 780,
    margin: "0 auto",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: "40px 36px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    color: "#fff",
    fontSize: 28,
    lineHeight: "56px",
    textAlign: "center",
    margin: "0 auto 16px",
  },
  successTitle: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: 4,
  },
  successSubtitle: {
    textAlign: "center",
    fontSize: 15,
    color: "#555",
    marginBottom: 16,
  },
  successDate: {
    textAlign: "center",
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
  },
  emailOk: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 13,
    marginBottom: 24,
    textAlign: "center",
  },
  emailError: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 13,
    marginBottom: 24,
    textAlign: "center",
  },
  notasBox: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 13,
    marginBottom: 24,
    color: "#92400e",
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#1a1a2e",
    marginBottom: 10,
    borderBottom: "1px solid #e8ecf0",
    paddingBottom: 6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    backgroundColor: "#f1f5f9",
    color: "#374151",
    fontWeight: 600,
    borderBottom: "1px solid #e2e8f0",
    fontSize: 12,
  },
  td: {
    padding: "7px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#333",
  },
  buttonRow: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  excelBtn: {
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  printBtn: {
    backgroundColor: "#1a1a2e",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  resetBtn: {
    backgroundColor: "#fff",
    color: "#2563eb",
    border: "2px solid #2563eb",
    borderRadius: 8,
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
