// Reemplaza tu función generarPdf actual por esta
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

    // COLORES
    const blueTitle = [20, 90, 200]; // azul para títulos (RGB)
    const black = [0, 0, 0];

    // --- Portada / encabezado con estilos ---
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

    // subtítulo azul para sección detalles
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...blueTitle);
    pdf.text("Detalles:", margin, 66);

    // texto normal en negro (body)
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

    // Descripción: usar splitTextToSize para ajuste automático
    if (descripcion) {
        // título para descripción en azul
        y += 4;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...blueTitle);
        pdf.text("Descripción:", margin, y);
        y += lineHeight;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...black);
        pdf.setFontSize(10);

        // dividir texto por ancho de contenido
        const wrapped = pdf.splitTextToSize(descripcion, contentW);
        const maxLinesPerPage = Math.floor((pageH - margin - y - 20) / lineHeight); // espacio para pie
        let idx = 0;

        while (idx < wrapped.length) {
            const chunk = wrapped.slice(idx, idx + maxLinesPerPage);
            pdf.text(chunk, margin, y);
            idx += chunk.length;
            // si quedan líneas, añadir página y resetear y
            if (idx < wrapped.length) {
                pdf.addPage();
                // colocar encabezado de continuidad (opcional)
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

    // Pie con fecha en gris oscuro
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generado: ${new Date().toLocaleString()}`, margin, pageH - 12);

    // Galería de imágenes / miniaturas (opcional)
    const imgs = previews.filter((p) => p.type === "image" || (p.type === "video" && p.dataUrl));
    if (imgs.length > 0) {
        // Añadir página extra para imágenes
        pdf.addPage();
        let imgY = margin;
        const gap = 6;
        const cols = 2;
        const colW = (contentW - gap * (cols - 1)) / cols;

        for (let i = 0; i < imgs.length; i++) {
            const item = imgs[i];
            const col = i % cols;
            const x = margin + col * (colW + gap);

            if (!item.dataUrl) continue; // ignorar sin thumbnail

            // Esperar a que la imagen se cargue y añadirla, conservando proporción
            // Reutilizamos addImageToPdf (asegúrate existe en tu componente)
            const usedH = await addImageToPdf(pdf, item.dataUrl, x, imgY, colW);

            // Si estamos en la segunda columna (col === cols-1) avanzamos la fila
            if (col === cols - 1) {
                imgY += usedH + gap;
            } else {
                // si es la última imagen impar, reservar espacio para su altura
                if (i === imgs.length - 1) imgY += usedH + gap;
            }

            // si no queda espacio vertical, nueva página y reset imgY
            if (imgY > pageH - margin - 40) {
                pdf.addPage();
                imgY = margin;
            }
        }
    }

    // guardar PDF
    const filename = `reporte-${(cliente || "cliente").replace(/[^\w-]+/g, "_")}.pdf`;
    pdf.save(filename);
};
