import { useState, useEffect, useMemo } from "react";
import { parseCSV, BrindeData } from "@/utils/csvParser";
import { Filters } from "@/components/dashboard/Filters";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { BrindesPieChart } from "@/components/dashboard/BrindesPieChart";
import { QuantityByClientChart } from "@/components/dashboard/QuantityByClientChart";
import { ServiceChart } from "@/components/dashboard/ServiceChart";
import { CityChart } from "@/components/dashboard/CityChart";
import { ResponsavelChart } from "@/components/dashboard/ResponsavelChart";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { ClienteDetailView } from "@/components/dashboard/ClienteDetailView";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import carpediemLogo from "@/assets/carpediem-logo.png";

const Index = () => {
  const [data, setData] = useState<BrindeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState("todos");
  const [selectedRespComercial, setSelectedRespComercial] = useState("todos");
  const [selectedRespCS, setSelectedRespCS] = useState("todos");
  const [selectedBrinde, setSelectedBrinde] = useState("todos");
  const [selectedEntregue, setSelectedEntregue] = useState("todos");
  const [uploadedFileName, setUploadedFileName] = useState<string>();
  const [dataMode, setDataMode] = useState<"local" | "online">("online");
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>("https://docs.google.com/spreadsheets/d/1pdhY9eiS_Qbpz6aBs8bVfEPHQ1dYiiut0rd7f237Jks/edit?usp=sharing");
  const { toast } = useToast();

  useEffect(() => {
    const loadDataFromGoogleSheets = async () => {
      try {
        const spreadsheetId = "1pdhY9eiS_Qbpz6aBs8bVfEPHQ1dYiiut0rd7f237Jks";
        const exportUrl = "/api/sheets";
        
        const response = await fetch(exportUrl);
        if (!response.ok) {
          throw new Error("Não foi possível acessar a planilha. Verifique se ela está pública.");
        }
        
        const csvText = await response.text();
        const parsedData = await parseCSV(csvText);
        setData(parsedData);
        toast({
          title: "Dados carregados do Google Sheets!",
          description: `${parsedData.length} registros carregados automaticamente.`,
        });
      } catch (error) {
        console.error("Erro ao carregar dados do Google Sheets:", error);
        toast({
          title: "Erro ao conectar Google Sheets",
          description: "Certifique-se que a planilha está com permissão pública de visualização.",
          variant: "destructive",
        });
        // Fallback para CSV local se Google Sheets falhar
        try {
          const response = await fetch("/src/data/brindes.csv");
          const csvText = await response.text();
          const parsedData = await parseCSV(csvText);
          setData(parsedData);
          setDataMode(undefined);
          setGoogleSheetsUrl(undefined);
        } catch (fallbackError) {
          console.error("Erro ao carregar CSV local:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDataFromGoogleSheets();
  }, [toast]);

  // Filtrar dados
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchCliente = selectedCliente === "todos" || item.cliente === selectedCliente;
      const matchRespComercial = selectedRespComercial === "todos" || item.responsavelComercial === selectedRespComercial;
      const matchRespCS = selectedRespCS === "todos" || item.responsavelCS === selectedRespCS;
      const matchBrinde = selectedBrinde === "todos" || item.brindes === selectedBrinde;
      const matchEntregue = selectedEntregue === "todos" || 
                           (selectedEntregue === "entregue" && item.entregue) ||
                           (selectedEntregue === "pendente" && !item.entregue);
      return matchCliente && matchRespComercial && matchRespCS && matchBrinde && matchEntregue;
    });
  }, [data, selectedCliente, selectedRespComercial, selectedRespCS, selectedBrinde, selectedEntregue]);

  // Extrair listas únicas para filtros
  const clientes = useMemo(() => 
    [...new Set(data.map(item => item.cliente))].filter(Boolean).sort(),
    [data]
  );

  const responsaveisComerciais = useMemo(() => 
    [...new Set(data.map(item => item.responsavelComercial))].filter(Boolean).sort(),
    [data]
  );

  const responsaveisCS = useMemo(() => 
    [...new Set(data.map(item => item.responsavelCS))].filter(Boolean).sort(),
    [data]
  );

  const brindes = useMemo(() => 
    [...new Set(data.map(item => item.brindes))].filter(Boolean).sort(),
    [data]
  );

  // Calcular dados dos gráficos
  const brindesDistribution = useMemo(() => {
    const counts = filteredData.reduce((acc, item) => {
      const tipo = item.brindes || "Não";
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors: Record<string, string> = {
      "A": "hsl(var(--chart-1))",
      "B": "hsl(var(--chart-2))",
      "C": "hsl(var(--chart-3))",
      "Não": "hsl(var(--muted))",
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || "hsl(var(--chart-4))",
    }));
  }, [filteredData]);

  const topClientes = useMemo(() => {
    const clienteMap = filteredData.reduce((acc, item) => {
      const total = item.quantidadeA + item.quantidadeB + item.quantidadeC;
      if (total > 0) {
        acc[item.cliente] = (acc[item.cliente] || 0) + total;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(clienteMap)
      .map(([cliente, quantidade]) => ({ cliente, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [filteredData]);

  const serviceData = useMemo(() => {
    const serviceMap = filteredData.reduce((acc, item) => {
      const servico = item.servico || "Não informado";
      if (!acc[servico]) {
        acc[servico] = { quantidade: 0, clientes: new Set() };
      }
      const total = item.quantidadeA + item.quantidadeB + item.quantidadeC;
      acc[servico].quantidade += total;
      acc[servico].clientes.add(item.cliente);
      return acc;
    }, {} as Record<string, { quantidade: number; clientes: Set<string> }>);

    return Object.entries(serviceMap)
      .map(([servico, data]) => ({
        servico,
        quantidade: data.quantidade,
        clientes: data.clientes.size,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredData]);

  const cityData = useMemo(() => {
    const cityMap = filteredData.reduce((acc, item) => {
      const cidade = item.cidade || "Não informado";
      const total = item.quantidadeA + item.quantidadeB + item.quantidadeC;
      acc[cidade] = (acc[cidade] || 0) + total;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(cityMap)
      .map(([cidade, quantidade]) => ({ cidade, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [filteredData]);

  const respComercialData = useMemo(() => {
    const respMap = filteredData.reduce((acc, item) => {
      const resp = item.responsavelComercial || "Não informado";
      if (!acc[resp]) {
        acc[resp] = { quantidade: 0, clientes: new Set() };
      }
      const total = item.quantidadeA + item.quantidadeB + item.quantidadeC;
      acc[resp].quantidade += total;
      acc[resp].clientes.add(item.cliente);
      return acc;
    }, {} as Record<string, { quantidade: number; clientes: Set<string> }>);

    return Object.entries(respMap)
      .map(([responsavel, data]) => ({
        responsavel,
        quantidade: data.quantidade,
        clientes: data.clientes.size,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredData]);

  const respCSData = useMemo(() => {
    const respMap = filteredData.reduce((acc, item) => {
      const resp = item.responsavelCS || "Não informado";
      if (!acc[resp]) {
        acc[resp] = { quantidade: 0, clientes: new Set() };
      }
      const total = item.quantidadeA + item.quantidadeB + item.quantidadeC;
      acc[resp].quantidade += total;
      acc[resp].clientes.add(item.cliente);
      return acc;
    }, {} as Record<string, { quantidade: number; clientes: Set<string> }>);

    return Object.entries(respMap)
      .map(([responsavel, data]) => ({
        responsavel,
        quantidade: data.quantidade,
        clientes: data.clientes.size,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredData]);

  const stats = useMemo(() => {
    const totalBrindes = filteredData.reduce((sum, item) => 
      sum + item.quantidadeA + item.quantidadeB + item.quantidadeC, 0);
    const totalComBrindes = filteredData.filter(item => 
      (item.quantidadeA + item.quantidadeB + item.quantidadeC) > 0);
    
    return {
      totalBrindes,
      totalClientes: new Set(filteredData.map(item => item.cliente)).size,
      clientesComBrindes: new Set(totalComBrindes.map(item => item.cliente)).size,
      totalCidades: new Set(filteredData.map(item => item.cidade).filter(Boolean)).size,
    };
  }, [filteredData]);

  const handleClearFilters = () => {
    setSelectedCliente("todos");
    setSelectedRespComercial("todos");
    setSelectedRespCS("todos");
    setSelectedBrinde("todos");
    setSelectedEntregue("todos");
  };

  const handleToggleEntregue = (cliente: string, currentStatus: boolean) => {
    setData(prevData => 
      prevData.map(item => 
        item.cliente === cliente 
          ? { ...item, entregue: !currentStatus }
          : item
      )
    );
    toast({
      title: currentStatus ? "Marcado como pendente" : "Marcado como entregue",
      description: `Status de entrega atualizado para ${cliente}`,
    });
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const parsedData = await parseCSV(text);
      setData(parsedData);
      setUploadedFileName(file.name);
      setDataMode("local");
      setGoogleSheetsUrl(undefined);
      setSelectedCliente("todos");
      setSelectedRespComercial("todos");
      setSelectedRespCS("todos");
      setSelectedBrinde("todos");
      setSelectedEntregue("todos");
      toast({
        title: "Planilha importada!",
        description: `${parsedData.length} registros carregados de ${file.name}`,
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro ao importar",
        description: "Não foi possível processar o arquivo CSV.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSheetsUrl = async (url: string) => {
    setLoading(true);
    try {
      // Extrair o ID da planilha da URL
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        throw new Error("URL inválida do Google Sheets");
      }
      const spreadsheetId = match[1];
      
      // Construir URL de exportação CSV
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
      
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("Não foi possível acessar a planilha. Verifique se ela está pública.");
      }
      
      const csvText = await response.text();
      const parsedData = await parseCSV(csvText);
      setData(parsedData);
      setGoogleSheetsUrl(url);
      setDataMode("online");
      setUploadedFileName(undefined);
      setSelectedCliente("todos");
      setSelectedRespComercial("todos");
      setSelectedRespCS("todos");
      setSelectedBrinde("todos");
      setSelectedEntregue("todos");
      toast({
        title: "Google Sheets conectado!",
        description: `${parsedData.length} registros carregados da planilha online`,
      });
    } catch (error) {
      console.error("Erro ao conectar Google Sheets:", error);
      toast({
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Não foi possível conectar ao Google Sheets. Certifique-se de que a planilha está pública.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearUpload = async () => {
    setLoading(true);
    setUploadedFileName(undefined);
    setGoogleSheetsUrl(undefined);
    setDataMode(undefined);
    try {
      const response = await fetch("/src/data/brindes.csv");
      const csvText = await response.text();
      const parsedData = await parseCSV(csvText);
      setData(parsedData);
      setSelectedCliente("todos");
      setSelectedRespComercial("todos");
      setSelectedRespCS("todos");
      setSelectedBrinde("todos");
      setSelectedEntregue("todos");
      toast({
        title: "Dados padrão restaurados",
        description: `${parsedData.length} registros carregados.`,
      });
    } catch (error) {
      console.error("Erro ao carregar dados padrão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível restaurar os dados padrão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">Dashboard de Brindes 2025</h1>
          <p className="text-muted-foreground">Análise completa da distribuição de brindes por cliente, serviço e região</p>
        </div>
        <img src={carpediemLogo} alt="Carpediem Logo" className="h-20 w-auto" />
      </header>

      <FileUpload 
        onFileSelect={handleFileUpload}
        onGoogleSheetsUrl={handleGoogleSheetsUrl}
        currentFileName={uploadedFileName}
        currentMode={dataMode}
        onClear={handleClearUpload}
      />

      <Filters
        clientes={clientes}
        responsaveisComerciais={responsaveisComerciais}
        responsaveisCS={responsaveisCS}
        brindes={brindes}
        selectedCliente={selectedCliente}
        selectedRespComercial={selectedRespComercial}
        selectedRespCS={selectedRespCS}
        selectedBrinde={selectedBrinde}
        selectedEntregue={selectedEntregue}
        onClienteChange={setSelectedCliente}
        onRespComercialChange={setSelectedRespComercial}
        onRespCSChange={setSelectedRespCS}
        onBrindeChange={setSelectedBrinde}
        onEntregueChange={setSelectedEntregue}
        onClearFilters={handleClearFilters}
      />

      <StatsCards {...stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrindesPieChart data={brindesDistribution} />
        <QuantityByClientChart data={topClientes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceChart data={serviceData} />
        <CityChart data={cityData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponsavelChart data={respComercialData} title="Responsáveis Comerciais" />
        <ResponsavelChart data={respCSData} title="Responsáveis CS" />
      </div>

      <ClienteDetailView 
        data={filteredData} 
        onToggleEntregue={handleToggleEntregue}
      />
    </div>
  );
};

export default Index;
