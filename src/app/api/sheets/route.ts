import { NextResponse } from "next/server";

export async function GET() {
  try {
    // ID da planilha
    const spreadsheetId = "1pdhY9eiS_Qbpz6aBs8bVfEPHQ1dYiiut0rd7f237Jks";

    // URL pública (depois de “Publicar na Web” no Google Sheets)
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;

    const response = await fetch(exportUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Erro ao acessar Google Sheets" }, { status: 500 });
    }

    const csv = await response.text();
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv" },
    });
  } catch (error) {
    console.error("Erro API Sheets:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
