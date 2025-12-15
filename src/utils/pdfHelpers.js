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

    const filename = `reporte-${(cliente || "cliente").replace(/[^\w-]+/g, "_")}.pdf`;

    const webhookUrl = "TU_URL_DE_WEBHOOK_AQUI"; 

    if (webhookUrl) {
        try {
            const pdfBlob = pdf.output('blob');
            const formData = new FormData();
            formData.append('file', pdfBlob, filename);
            
            formData.append('cliente', cliente || '');
            formData.append('nombreIsp', nombreIsp || '');
            formData.append('telefono', telefono || '');
            formData.append('problema', problema || '');
            formData.append('ingeniero', ingenieroNombre || '');
            formData.append('descripcion', descripcion || '');

            await fetch(webhookUrl, {
                method: 'POST',
                body: formData
            });
        } catch (e) {
            console.error(e);
        }
    }

    pdf.save(filename);
};
