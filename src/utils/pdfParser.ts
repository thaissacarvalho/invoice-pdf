import PdfParse from "pdf-parse";

export const extractDataFromPDF = async (buffer: Buffer) => {
  const data = await PdfParse(buffer);
  const text = data.text;

  const installationMatch = text.match(/(\d{10}-\d)/);
  const addressMatch = text.match(/RUA\s+([\w\s\d,-]+?)\s+-\s+(\d{8})/);
  const referenceDateMatch = text.match(/Refer[êe]ncia:\s*(\d{2}\/\d{4})/);
  const datesReadingMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}\/\d{2}\/\d{4})/);
  const totalPayMatch = text.match(/TOTAL:\s*([\d.,]+)/);
  
  const itemsInvoice: string[] = []; 

  const itemsMatch = text.match(/Itens da Fatura([\s\S]*?)CONSUMO FATURADO/);
  if (itemsMatch) {
    const linhas = itemsMatch[1].split('\n').map(linha => linha.trim()).filter(Boolean);
    linhas.forEach(item => itemsInvoice.push(item));
  }

  return {
    id: Date.now().toString(),
    numeroInstalacao: installationMatch ? installationMatch[1] : null,
    endereco: addressMatch ? `${addressMatch[1]}, ${addressMatch[2]}` : null,
    dataReferencia: referenceDateMatch ? referenceDateMatch[1] : null,
    datasLeitura: datesReadingMatch ? {
      anterior: datesReadingMatch[1].trim(),
      atual: datesReadingMatch[2].trim()
    } : null,
    totalPagar: totalPayMatch ? totalPayMatch[1] : null,
    itemsInvoice,
    extraidoEm: new Date().toISOString()
  };
};
