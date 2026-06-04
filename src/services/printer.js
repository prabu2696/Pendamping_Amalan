/**
 * Cimega Universal Printer & Exporter
 * Supports Word, Excel, PDF and Page Settings
 */

window.CimegaPrinter = {
  settings: {
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 40, bottom: 30, left: 40, right: 30 }, // in mm (Standard Tata Naskah Dinas)
    columns: 1
  },

  showPrintDialog: function(contentHtml, filename = 'dokumen_cimega') {
    const modalId = 'cimegaPrintModal';
    if (!document.getElementById(modalId)) {
      const modalHtml = `
        <div id="${modalId}" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(10px); font-family: 'Plus Jakarta Sans', sans-serif;">
          <div class="card" style="width:100%; max-width:500px; border-color:var(--cyan);">
            <div class="card-header">
              <div class="card-title">🖨️ PENGATURAN CETAK & EKSPOR</div>
              <button class="btn btn-ghost btn-sm" onclick="document.getElementById('${modalId}').style.display='none'">✕</button>
            </div>
            <div class="card-body">
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Ukuran Kertas</label>
                  <select class="form-control" id="prPaper">
                    <option value="A4" selected>A4 (Kuarto)</option>
                    <option value="F4">F4 (Folio/Legal)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Orientasi</label>
                  <select class="form-control" id="prOrient">
                    <option value="portrait" selected>Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>
              <div style="font-size:10px; color:var(--muted); margin-bottom:10px;">MARGIN (MM) - STANDAR TATA NASKAH DINAS</div>
              <div class="grid-2">
                <div class="form-group"><label class="form-label">Atas</label><input type="number" class="form-control" id="prMT" value="40" /></div>
                <div class="form-group"><label class="form-label">Kiri</label><input type="number" class="form-control" id="prML" value="40" /></div>
                <div class="form-group"><label class="form-label">Bawah</label><input type="number" class="form-control" id="prMB" value="30" /></div>
                <div class="form-group"><label class="form-label">Kanan</label><input type="number" class="form-control" id="prMR" value="30" /></div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:15px;">
                <button class="btn btn-primary" onclick="CimegaPrinter.export('pdf')">📄 PDF</button>
                <button class="btn btn-success" onclick="CimegaPrinter.export('word')">📝 Word</button>
                <button class="btn btn-gold" onclick="CimegaPrinter.export('excel')">📊 Excel</button>
              </div>
            </div>
          </div>
        </div>
      `;
      const div = document.createElement('div');
      div.innerHTML = modalHtml;
      document.body.appendChild(div);
    }
    
    this._currentContent = contentHtml;
    this._currentFilename = filename;
    document.getElementById(modalId).style.display = 'flex';
  },

  export: function(type) {
    const paper = document.getElementById('prPaper').value;
    const orient = document.getElementById('prOrient').value;
    const mt = document.getElementById('prMT').value;
    const ml = document.getElementById('prML').value;
    const mb = document.getElementById('prMB').value;
    const mr = document.getElementById('prMR').value;

    const content = this._currentContent;
    const filename = this._currentFilename;

    if (type === 'word') this.toWord(content, filename);
    else if (type === 'pdf') this.toPDF(content, filename, { paper, orient, ml, mt, mr, mb });
    else if (type === 'excel') this.toExcel(content, filename);
  },

  toWord: function(html, filename) {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
            "xmlns:w='urn:schemas-microsoft-com:office:word' "+
            "xmlns='http://www.w3.org/TR/REC-html40'>"+
            "<head><meta charset='utf-8'><title>Export XML to Word</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + html + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = filename + '.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  },

  toPDF: function(html, filename, settings) {
     // Gunakan native print untuk PDF agar lebih akurat dengan margin CSS jika library tidak tersedia
     const printWin = window.open('', '', 'height=600,width=800');
     printWin.document.write(`<html><head><title>${filename}</title>`);
     printWin.document.write(`<style>
        @page { size: ${settings.paper} ${settings.orient}; margin: ${settings.mt}mm ${settings.mr}mm ${settings.mb}mm ${settings.ml}mm; }
        body { font-family: serif; line-height: 1.5; color: #000; }
        #printableArea { width: 100%; }
        table { width:100%; border-collapse:collapse; margin-bottom:10px; }
        th, td { border:1px solid #000; padding:5px; text-align:left; font-size:12px; }
     </style>`);
     printWin.document.write('</head><body>');
     printWin.document.write(html);
     printWin.document.write('</body></html>');
     printWin.document.close();
     printWin.print();
  },

  toExcel: function(html, filename) {
    const template = '<html><head><meta charset="UTF-8"></head><body><table>' + html + '</table></body></html>';
    const blob = new Blob([template], {
        type: "application/vnd.ms-excel"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".xls";
    a.click();
    URL.revokeObjectURL(url);
  }
};
