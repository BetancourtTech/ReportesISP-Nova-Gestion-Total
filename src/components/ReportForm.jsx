// src/components/ReportForm.jsx
import React, { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import "../styles/style.css";

export default function ReportForm() {
    const [cliente, setCliente] = useState("");
    const [nombreIsp, setNombreIsp] = useState("");
    const [rol, setRol] = useState("");
    const [telefono, setTelefono] = useState("");
    const [problema, setProblema] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [ingenieroNombre, setIngenieroNombre] = useState("");
    const [previews, setPreviews] = useState([]);
    const fileInputRef = useRef(null);

    const readFileAsDataURL = (file) =>
        new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(new Error("read error"));
            r.onload = () => resolve(r.result);
            r.readAsDataURL(file);
        });

    const captureVideoThumbnail = (file, atSec = 1.0) =>
        new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const video = document.createElement("video");
            video.preload = "metadata";
            video.muted = true;
            video.src = url;
            video.playsInline = true;

            const clean = () => {
                try {
                    URL.revokeObjectURL(url);
                } catch { }
            };

            const handleError = (e) => {
                clean();
                reject(e);
            };

            video.addEventListener("loadedmetadata", () => {
                const t = Math.min(atSec, Math.max(0, (video.duration || 0) / 2));
                try {
                    video.currentTime = t;
                } catch {
                    setTimeout(() => {
                        try {
                            video.currentTime = t;
                        } catch { }
                    }, 200);
                }
            });

            video.addEventListener("seeked", () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 360;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                    clean();
                    resolve(dataUrl);
                } catch (err) {
                    handleError(err);
                }
            });

            video.addEventListener("error", handleError);
            video.load();
        });

    function cryptoId() {
        return Math.random().toString(36).slice(2, 9);
    }

    const onFilesChange = async (e) => {
        const files = Array.from(e.target.files || []);
        const limit = 80;
        const selection = files.slice(0, limit);
        const results = [];

        for (const f of selection) {
            try {
                if (f.type.startsWith("image/")) {
                    const d = await readFileAsDataURL(f);
                    results.push({ id: cryptoId(), name: f.name, type: "image", dataUrl: d, file: f });
                } else if (f.type.startsWith("video/")) {
                    try {
                        const thumb = await captureVideoThumbnail(f, 1.0);
                        results.push({ id: cryptoId(), name: f.name, type: "video", dataUrl: thumb, file: f });
                    } catch {
                        results.push({ id: cryptoId(), name: f.name, type: "video", dataUrl: "", file: f });
                    }
                } else {
                    results.push({ id: cryptoId(), name: f.name, type: "file", dataUrl: "", file: f });
                }
            } catch {
                results.push({ id: cryptoId(), name: f.name, type: "error", dataUrl: "", file: f });
            }
        }

        setPreviews(results);
    };

    const addImageToPdf = (pdf, dataUrl, xMM, yMM, maxWmm) =>
        new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const pxW = img.naturalWidth || 1;
                const pxH = img.naturalHeight || 1;
                const ratio = pxH / pxW;
                const widthMM = maxWmm;
                const heightMM = Math.max(12, widthMM * ratio);
                try {
                    pdf.addImage(dataUrl, "JPEG", xMM, yMM, widthMM, heightMM);
                } catch {
                    try {
                        pdf.addImage(dataUrl, "PNG", xMM, yMM, widthMM, heightMM);
                    } catch { }
                }
                resolve(heightMM);
            };
            img.onerror = () => resolve(0);
            img.src = dataUrl;
        });

    const generarPdf = async () => {
        console.log('=== FUNCION GENERAR PDF INICIADA ===');
        console.log('Cliente:', cliente);
        console.log('ISP:', nombreIsp);
        console.log('Telefono:', telefono);
        
        if (!cliente || !nombreIsp || !telefono) {
            console.error('Faltan datos requeridos');
            alert("Completa Cliente, ISP y Teléfono antes de generar el PDF.");
            return;
        }

        console.log('Validación pasada, generando PDF...');

        const pdf = new jsPDF({ unit: "mm", format: "a4" });
        const pageW = 210;
        const pageH = 297;
        const M = 20;
        const contentW = pageW - M * 2;
        const lineH = 7;

        const blueTitle = [20, 90, 200];
        const blueLabel = [10, 110, 220];
        const black = [0, 0, 0];
        const grey = [120, 120, 120];

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.setTextColor(...blueTitle);
        pdf.text("REPORTE ISP - Nova Gestión Total", pageW / 2, M, { align: "center" });

        let y = M + 12;

        const writeLabel = (txt) => {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(...blueLabel);
            pdf.text(txt, M, y);
            y += 5;
        };

        const writeValue = (txt) => {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.setTextColor(...black);
            pdf.text(String(txt || "-"), M, y);
            y += lineH;
        };

        writeLabel("Cliente:");
        writeValue(cliente);
        writeLabel("Empresa / ISP:");
        writeValue(nombreIsp);
        writeLabel("Rol:");
        writeValue(rol || "-");
        writeLabel("Teléfono:");
        writeValue(telefono);
        writeLabel("Problema:");
        writeValue(problema || "-");
        writeLabel("Ingeniero:");
        writeValue(ingenieroNombre || "-");

        writeLabel("Descripción:");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...black);

        const descriptionText = descripcion || "-";
        const wrapped = pdf.splitTextToSize(descriptionText, contentW);
        const usableHeight = pageH - M - 30;
        const linesPerPage = Math.floor(usableHeight / lineH);
        let idx = 0;

        if (wrapped.length === 0) {
            pdf.text("-", M, y);
            y += lineH;
        } else {
            while (idx < wrapped.length) {
                const chunk = wrapped.slice(idx, idx + linesPerPage);
                pdf.text(chunk, M, y);
                idx += chunk.length;
                if (idx < wrapped.length) {
                    pdf.addPage();
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(12);
                    pdf.setTextColor(...blueTitle);
                    pdf.text("REPORTE ISP - Nova Gestión Total (continuación)", pageW / 2, M, { align: "center" });
                    y = M + 12;
                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(10);
                    pdf.setTextColor(...black);
                } else {
                    y += chunk.length * lineH;
                }
            }
        }

        pdf.setFontSize(9);
        pdf.setTextColor(...grey);
        pdf.text(`Generado: ${new Date().toLocaleString()}`, M, pageH - 12);

        const imgs = previews.filter((p) => p.type === "image" && p.dataUrl).slice(0, 80);
        if (imgs.length > 0) {
            pdf.addPage();
            let imgY = M;
            const gap = 6;
            const cols = 2;
            const colW = (contentW - gap) / cols;

            for (let i = 0; i < imgs.length; i++) {
                const item = imgs[i];
                const col = i % cols;
                const x = M + col * (colW + gap);

                if (imgY > pageH - M - 60) {
                    pdf.addPage();
                    imgY = M;
                }

                const usedH = await addImageToPdf(pdf, item.dataUrl, x, imgY, colW);

                if (col === cols - 1) {
                    imgY += usedH + gap;
                } else if (i === imgs.length - 1) {
                    imgY += usedH + gap;
                }
            }

            pdf.setFontSize(9);
            pdf.setTextColor(...grey);
            pdf.text(`Generado: ${new Date().toLocaleString()}`, M, pageH - 12);
        }

        try {
            console.log('Iniciando envío a n8n...');
            
            const pdfBlob = pdf.output('blob');
            
            const pdfBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(pdfBlob);
            });

            const imagenesBase64 = [];
            for (const img of imgs) {
                if (img.dataUrl) {
                    imagenesBase64.push({
                        nombre: img.file?.name || `imagen-${imagenesBase64.length + 1}`,
                        base64: img.dataUrl.split(',')[1],
                        tipo: img.type
                    });
                }
            }

            const dataParaN8n = {
                cliente: cliente,
                nombreIsp: nombreIsp,
                rol: rol,
                telefono: telefono,
                problema: problema || '',
                ingenieroNombre: ingenieroNombre || '',
                descripcion: descripcion || '',
                fecha: new Date().toISOString(),
                fechaLegible: new Date().toLocaleString('es-CO', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                }),
                pdfBase64: pdfBase64,
                nombreArchivo: `reporte-${(cliente || "cliente").replace(/[^\w-]+/g, "_")}.pdf`,
                imagenes: imagenesBase64,
                cantidadImagenes: imagenesBase64.length
            };

            const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.wsmypantalla.online/webhook/a80b30e9-a131-42b1-b5df-3789b4f75602';

            console.log('=== DEBUG INFO ===');
            console.log('Variable de entorno:', import.meta.env.VITE_N8N_WEBHOOK_URL);
            console.log('URL final:', webhookUrl);
            console.log('Todas las env vars:', import.meta.env);
            console.log('==================');
            console.log('Datos a enviar:', {
                cliente: dataParaN8n.cliente,
                nombreIsp: dataParaN8n.nombreIsp,
                telefono: dataParaN8n.telefono,
                problema: dataParaN8n.problema,
                cantidadImagenes: dataParaN8n.cantidadImagenes,
                tamañoPDF: `${(pdfBase64.length / 1024 / 1024).toFixed(2)} MB`
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataParaN8n),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error HTTP ${response.status}: ${errorText}`);
            }

            const resultado = await response.json();
            console.log('Respuesta de n8n:', resultado);
            
            alert('Reporte enviado exitosamente a n8n');
            
        } catch (error) {
            console.error('Error al enviar a n8n:', error);
            
            let mensajeError = 'Error al enviar el reporte';
            
            if (error.name === 'AbortError') {
                mensajeError = 'Tiempo de espera agotado. Verifica tu conexión o el webhook de n8n.';
            } else if (error.message.includes('Failed to fetch')) {
                mensajeError = 'No se pudo conectar con n8n. Verifica:\n- La URL del webhook\n- Que n8n esté activo\n- Tu conexión a internet';
            } else if (error.message.includes('URL del webhook no configurada')) {
                mensajeError = error.message;
            } else {
                mensajeError = `Error: ${error.message}`;
            }
            
            alert(mensajeError);
            
            console.log('Continuando con descarga local del PDF...');
        }

        const filename = `reporte-${(cliente || "cliente").replace(/[^\w-]+/g, "_")}.pdf`;
        pdf.save(filename);
        console.log('PDF guardado localmente:', filename);
    };

    return (
        <div className="report-root">
            <h1>REPORTE ISP - Nova Gestión Total</h1>

            <section id="formulario" aria-labelledby="form-title">
                <label htmlFor="cliente">Nombre/Apellido</label>
                <input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder=" Tu Nombre y Apellido" />

                <label htmlFor="nombreIsp">Empresa / ISP</label>
                <input id="nombreIsp" value={nombreIsp} onChange={(e) => setNombreIsp(e.target.value)} placeholder="Nombre de la ISP" />

                <label htmlFor="rol">Rol</label>
                <select id="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
                    <option value="">-- selecciona --</option>
                    <option value="Administrador del sistema">Administrador del sistema</option>
                    <option value="Contable">Contable</option>
                    <option value="Vendedor">Vendedor</option>
                    <option value="Punto de venta aliado">Punto de venta aliado</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Jefe bodega">Jefe de bodega</option>
                    <option value="Equipo de soporte">Equipo de soporte</option>
                    <option value="Equipo de encuestas">Equipo de encuestas</option>
                </select>

                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" />

                <label htmlFor="problema">Problema</label>
                <select id="problema" value={problema} onChange={(e) => setProblema(e.target.value)}>
                    <option value="">-- selecciona --</option>
                    <option value="Velocidad diferente a la del plan">Velocidad diferente a la del plan</option>
                    <option value="Cliente sin internet">Cliente sin internet</option>
                    <option value="Falla de WhatsappAPI">Falla de WhatsappAPI</option>
                    <option value="Error de facturación">Error de facturación</option>
                    <option value="Configuración de la Mikrotik">Configuración de la Mikrotik</option>
                    <option value="Problema de Drivers">Problema de Drivers</option>
                    <option value="Falla en la plataforma">Falla en la plataforma</option>
                    <option value="Solucitud de migración">Solucitud de migración</option>
                    <option value="internet-caido">Internet caído</option>
                    <option value="baja-velocidad">Baja velocidad</option>
                    <option value="suspension">Suspensión</option>
                    <option value="otro">Otro</option>
                </select>

                <label htmlFor="descripcion">Descripción</label>
                <textarea id="descripcion" rows="4" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción" />

                <label htmlFor="ingenieroNombre">Ingeniero (opcional)</label>
                <input id="ingenieroNombre" value={ingenieroNombre} onChange={(e) => setIngenieroNombre(e.target.value)} placeholder="Nombre del ingeniero" />

                <label htmlFor="archivos">Adjuntar evidencias</label>
                <input id="archivos" type="file" multiple ref={fileInputRef} onChange={onFilesChange} />

                <div className="file-help">Se mostrarán miniaturas de imágenes y vídeos (hasta 80 archivos).</div>

                <button id="btnGenerar" type="button" onClick={generarPdf} style={{ marginTop: 14 }}>
                    Generar Reporte
                </button>
            </section>

            <aside className="preview-panel" aria-label="Preview">
                <h3>Vista previa</h3>
                <div id="preview" className="preview-grid">
                    {previews.length === 0 ? (
                        <div className="file-help">No hay archivos cargados.</div>
                    ) : (
                        previews.map((p) => (
                            <div key={p.id} className="preview-item">
                                {p.dataUrl ? <img src={p.dataUrl} alt={p.name} /> : <div className="preview-empty">Archivo</div>}
                                <div className="preview-file" title={p.name}>
                                    {p.name}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>
        </div>
    );
}
