const generarPdf = async () => {
    if (!cliente || !nombreIsp || !telefono) {
        alert("Completa Cliente, ISP y Teléfono antes de generar el PDF.");
        return;
    }

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const margin = 15;
    const contentW = pageW - margin * 2;

    const blueTitle = [20, 90, 200];
    const black = [0, 0, 0];

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(...blueTitle);
    pdf.text("REPORTE ISP - Nova Gestión Total", margin, 28);

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...black);
    pdf.text(`Cliente: ${cliente}`, margin, 40);
    pdf.text(`Empresa/ISP: ${nombreIsp}`, margin, 48);
    pdf.text(`Teléfono: ${telefono}`, margin, 56);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...blueTitle);
    pdf.text("Detalles:", margin, 66);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...black);
    let y = 74;
    const lineHeight = 6;

    if (problema) {
        pdf.text(`Problema: ${problema}`, margin, y);
        y += lineHeight;
    }
    if (ingenieroNombre) {
        pdf.text(`Ingeniero: ${ingenieroNombre}`, margin, y);
        y += lineHeight;
    }

    if (descripcion) {
        y += 4;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...blueTitle);
        pdf.text("Descripción:", margin, y);
        y += lineHeight;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...black);
        pdf.setFontSize(10);

        const wrapped = pdf.splitTextToSize(descripcion, contentW);
        const maxLinesPerPage = Math.floor((pageH - margin - y - 20) / lineHeight);
        let idx = 0;

        while (idx < wrapped.length) {
            const chunk = wrapped.slice(idx, idx + maxLinesPerPage);
            pdf.text(chunk, margin, y);
            idx += chunk.length;
            if (idx < wrapped.length) {
                pdf.addPage();
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(12);
                pdf.setTextColor(...blueTitle);
                pdf.text("Continuación - Descripción", margin, 20);
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(10);
                pdf.setTextColor(...black);
                y = 28;
            }
        }
    }

    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generado: ${new Date().toLocaleString()}`, margin, pageH - 12);

    const imgs = previews.filter((p) => p.type === "image" || (p.type === "video" && p.dataUrl));
    if (imgs.length > 0) {
        pdf.addPage();
        let imgY = margin;
        const gap = 6;
        const cols = 2;
        const colW = (contentW - gap * (cols - 1)) / cols;

        for (let i = 0; i < imgs.length; i++) {
            const item = imgs[i];
            const col = i % cols;
            const x = margin + col * (colW + gap);

            if (!item.dataUrl) continue;

            const usedH = await addImageToPdf(pdf, item.dataUrl, x, imgY, colW);

            if (col === cols - 1) {
                imgY += usedH + gap;
            } else {
                if (i === imgs.length - 1) imgY += usedH + gap;
            }

            if (imgY > pageH - margin - 40) {
                pdf.addPage();
                imgY = margin;
            }
        }
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

export { generarPdf };
