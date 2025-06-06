// JPainel - Painel de Controle Pessoal

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

const BACKEND_URL = "https://backend-bdownload.onrender.com";

export default function JPainel() {
  const [logs, setLogs] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [serverStatus, setServerStatus] = useState("carregando...");

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/logs`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
    }
  };

  const checkBackendHealth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/status`);
      const data = await res.json();
      setServerStatus(data?.status || "Desconhecido");
    } catch {
      setServerStatus("Offline ❌");
    }
  };

  const refreshData = () => {
    fetchLogs();
    checkBackendHealth();
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => setDarkMode(!darkMode);

  const colorForLog = (type) => {
    if (type === "erro") return "text-red-600";
    if (type === "alerta") return "text-yellow-500";
    return "text-green-600";
  };

  const chartData = {
    labels: logs.map((log) => new Date(log.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: "Erros por hora",
        data: logs.map((log) => (log.tipo === "erro" ? 1 : 0)),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.1
      },
      {
        label: "Alertas",
        data: logs.map((log) => (log.tipo === "alerta" ? 1 : 0)),
        borderColor: "rgba(255, 206, 86, 1)",
        backgroundColor: "rgba(255, 206, 86, 0.2)",
        tension: 0.1
      }
    ],
  };

  return (
    <div className={darkMode ? "bg-gray-900 text-white min-h-screen p-4" : "bg-white text-black min-h-screen p-4"}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">JPainel</h1>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline">
            Atualizar Dados
          </Button>
          <Button onClick={toggleTheme}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />} Modo {darkMode ? "Claro" : "Escuro"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="col-span-1">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Status do Servidor</h2>
            <p className="text-lg">
              Backend: <strong className={serverStatus.includes("✅") ? "text-green-500" : "text-red-500"}>{serverStatus}</strong>
            </p>
            <p className="text-sm mt-2">
              Última atualização: {new Date().toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Estatísticas de Erros</h2>
            <Line 
              data={chartData} 
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">Logs Recentes</h2>
              <span className="text-sm">
                Total: {logs.length} | Erros: {logs.filter(l => l.tipo === 'erro').length}
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto border rounded-lg p-2">
              {logs.length === 0 ? (
                <p className="text-center py-4">Nenhum log disponível</p>
              ) : (
                <ul className="space-y-1">
                  {logs.map((log, idx) => (
                    <li key={idx} className={`text-sm ${colorForLog(log.tipo)}`}>
                      <span className="text-gray-500 dark:text-gray-400">
                        [{new Date(log.timestamp).toLocaleString()}]
                      </span> {log.tipo.toUpperCase()} - {log.mensagem}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}