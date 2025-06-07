// JPainel - Painel de Controle Pessoal

const { useState, useEffect } = React;

function Card({ children, className = '' }) {
  return (
    <div className={`border rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardContent({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = 'default' }) {
  const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors";
  const styles = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
  };

  return (
    <button 
      onClick={onClick}
      className={`${baseStyle} ${styles[variant] || styles.default}`}
    >
      {children}
    </button>
  );
}

function JPainel() {
  const [logs, setLogs] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [serverStatus, setServerStatus] = useState("carregando...");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const BACKEND_URL = "https://backend-bdownload.onrender.com";

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/status`),
        fetch(`${BACKEND_URL}/logs?limit=50`),
        fetch(`${BACKEND_URL}/stats`)
      ]);

      setServerStatus((await statusRes.json())?.status || "Desconhecido");
      setLogs((await logsRes.json())?.logs || []);
      setStats((await statsRes.json()) || null);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setServerStatus("Offline ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && logs.length > 0) {
      setTimeout(initChart, 300);
    }
  }, [loading, logs]);

  const colorForLog = (type) => {
    if (type === "ERRO") return "text-red-600";
    if (type === "ALERTA") return "text-yellow-500";
    if (type === "SUCESSO") return "text-green-600";
    return "text-gray-600";
  };

  const chartData = {
    labels: logs.map((log) => new Date(log.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: "Erros",
        data: logs.map((log) => (log.tipo === "ERRO" ? 1 : 0)),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.1
      },
      {
        label: "Alertas",
        data: logs.map((log) => (log.tipo === "ALERTA" ? 1 : 0)),
        borderColor: "rgba(255, 206, 86, 1)",
        backgroundColor: "rgba(255, 206, 86, 0.2)",
        tension: 0.1
      }
    ]
  };

  return (
    <div className={darkMode ? "bg-gray-900 text-white min-h-screen p-4" : "bg-white text-black min-h-screen p-4"}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">JPainel</h1>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            {loading ? "Atualizando..." : "Atualizar Dados"}
          </Button>
          <Button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="col-span-1">
            <CardContent>
              <h2 className="text-xl font-semibold mb-2">Status do Servidor</h2>
              <p className="text-lg">
                Backend: <strong className={serverStatus.includes("✅") || serverStatus.includes("healthy") ? "text-green-500" : "text-red-500"}>
                  {serverStatus}
                </strong>
              </p>
              {stats && (
                <div className="mt-4 space-y-1 text-sm">
                  <p>Total de logs: {stats.totalLogs}</p>
                  <p>Erros: {stats.errors}</p>
                  <p>Alertas: {stats.warnings}</p>
                </div>
              )}
              <p className="text-sm mt-4">
                Última atualização: {new Date().toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardContent>
              <h2 className="text-xl font-semibold mb-2">Estatísticas</h2>
              <canvas 
                id="chart"
                width="400" 
                height="200"
                data-data={JSON.stringify(chartData)}
              ></canvas>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">Logs Recentes</h2>
                <span className="text-sm">
                  Total: {logs.length} | Erros: {logs.filter(l => l.tipo === 'ERRO').length}
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
      )}
    </div>
  );
}

function initChart() {
  const canvas = document.getElementById('chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const chartData = JSON.parse(canvas.getAttribute('data-data'));

  new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<JPainel />);
