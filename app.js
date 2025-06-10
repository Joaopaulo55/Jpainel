// Configurações globais
const config = {
    serverUrl: 'https://jpainel-backend.onrender.com',
    sites: JSON.parse(localStorage.getItem('monitoredSites')) || [],
    theme: localStorage.getItem('theme') || 'dark',
    charts: {},
    socket: null,
    connected: false,
    currentSite: null
};

// Elementos DOM
const elements = {
    connectBtn: document.getElementById('connectBtn'),
    themeToggle: document.getElementById('themeToggle'),
    siteUrl: document.getElementById('siteUrl'),
    addSiteBtn: document.getElementById('addSiteBtn'),
    sitesList: document.getElementById('sitesList'),
    logFilter: document.getElementById('logFilter'),
    clearLogsBtn: document.getElementById('clearLogsBtn'),
    logsList: document.getElementById('logsList'),
    statsPeriod: document.getElementById('statsPeriod'),
    siteModal: document.getElementById('siteModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalContent: document.getElementById('modalContent'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    uptime: document.getElementById('uptime'),
    responseTime: document.getElementById('responseTime'),
    seoScore: document.getElementById('seoScore'),
    sslStatus: document.getElementById('sslStatus'),
    authBtn: document.getElementById('authBtn'),
    userAvatar: document.getElementById('userAvatar')
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initEventListeners();
    await checkAuth();
    await loadSites();
    initCharts();
    
    if (config.sites.length > 0) {
        config.currentSite = config.sites[0];
        updateSiteStats(config.currentSite.id);
    }
});

// Autenticação
async function checkAuth() {
    const token = localStorage.getItem('jwt');
    if (!token) return;
    
    try {
        const response = await axios.get(`${config.serverUrl}/api/auth/check`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.valid) {
            showUserInfo(response.data.user);
        }
    } catch (error) {
        localStorage.removeItem('jwt');
    }
}

function showUserInfo(user) {
    elements.authBtn.classList.add('hidden');
    elements.userAvatar.classList.remove('hidden');
    elements.userAvatar.src = user.picture || 'https://via.placeholder.com/40';
}

// Funções de tema
function initTheme() {
    document.body.classList.toggle('light-mode', config.theme === 'light');
    elements.themeToggle.innerHTML = config.theme === 'light' 
        ? '<i class="fas fa-moon"></i> Tema' 
        : '<i class="fas fa-sun"></i> Tema';
}

function toggleTheme() {
    config.theme = config.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', config.theme);
    document.body.classList.toggle('light-mode', config.theme === 'light');
    elements.themeToggle.innerHTML = config.theme === 'light' 
        ? '<i class="fas fa-moon"></i> Tema' 
        : '<i class="fas fa-sun"></i> Tema';
}

// Event Listeners
function initEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.connectBtn.addEventListener('click', toggleConnection);
    elements.addSiteBtn.addEventListener('click', addSite);
    elements.logFilter.addEventListener('change', filterLogs);
    elements.clearLogsBtn.addEventListener('click', clearLogs);
    elements.statsPeriod.addEventListener('change', updateStats);
    elements.closeModalBtn.addEventListener('click', () => {
        elements.siteModal.classList.add('hidden');
    });
    elements.authBtn.addEventListener('click', () => {
        window.location.href = `${config.serverUrl}/api/auth/google`;
    });
}

// Conexão WebSocket
function toggleConnection() {
    if (config.connected) {
        disconnect();
    } else {
        connect();
    }
}

function connect() {
    elements.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
    elements.connectBtn.disabled = true;
    
    config.socket = new WebSocket(`${config.serverUrl.replace('https', 'wss')}/ws`);
    
    config.socket.onopen = () => {
        config.connected = true;
        elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Desconectar';
        elements.connectBtn.disabled = false;
        elements.connectBtn.classList.remove('button-primary');
        elements.connectBtn.classList.add('button-outline');
        addLog('Conexão estabelecida com o servidor de logs', 'info');
        
        // Subscrever para atualizações
        if (config.currentSite) {
            config.socket.send(JSON.stringify({
                type: 'subscribe',
                siteId: config.currentSite.id
            }));
        }
    };
    
    config.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.tipo && data.mensagem) {
            addLog(data.mensagem, data.tipo.toLowerCase(), data.timestamp, data.ip || '');
        } else {
            switch (data.type) {
                case 'log':
                    addLog(data.message, data.logType, data.timestamp);
                    break;
                case 'stats':
                    updateRealTimeStats(data);
                    break;
                case 'lighthouse':
                    updateSEOMetrics(data);
                    break;
            }
        }
    };
    
    config.socket.onclose = () => {
        disconnect();
    };
    
    config.socket.onerror = (error) => {
        addLog(`Erro na conexão: ${error.message}`, 'error');
        disconnect();
    };
}

function disconnect() {
    if (config.socket) {
        config.socket.close();
    }
    
    config.connected = false;
    elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i> Conectar ao Servidor';
    elements.connectBtn.classList.remove('button-outline');
    elements.connectBtn.classList.add('button-primary');
    addLog('Conexão com o servidor de logs encerrada', 'warning');
}

// Gerenciamento de Sites
async function loadSites() {
    try {
        const response = await axios.get(`${config.serverUrl}/api/sites`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
        });
        config.sites = response.data;
        renderSitesList();
    } catch (error) {
        addLog(`Erro ao carregar sites: ${error.message}`, 'error');
    }
}

async function addSite() {
    const url = elements.siteUrl.value.trim();
    
    if (!url) {
        alert('Por favor, insira uma URL válida');
        return;
    }
    
    try {
        const response = await axios.post(`${config.serverUrl}/api/sites`, {
            url: url.startsWith('http') ? url : `https://${url}`
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
        });
        
        config.sites.push(response.data);
        renderSitesList();
        elements.siteUrl.value = '';
        
        // Atualizar estatísticas para o novo site
        updateSiteStats(response.data.id);
        addLog(`Site ${url} adicionado ao monitoramento`, 'success');
    } catch (error) {
        addLog(`Erro ao adicionar site: ${error.response?.data?.message || error.message}`, 'error');
    }
}

async function removeSite(id) {
    if (!confirm('Tem certeza que deseja remover este site do monitoramento?')) return;
    
    try {
        await axios.delete(`${config.serverUrl}/api/sites/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
        });
        
        config.sites = config.sites.filter(site => site.id !== id);
        renderSitesList();
        
        if (config.sites.length === 0) {
            clearStats();
        }
    } catch (error) {
        addLog(`Erro ao remover site: ${error.message}`, 'error');
    }
}

function renderSitesList() {
    elements.sitesList.innerHTML = '';
    
    if (config.sites.length === 0) {
        elements.sitesList.innerHTML = `
            <div class="text-center text-300 p-4">
                <i class="fas fa-info-circle mr-2"></i> Nenhum site sendo monitorado
            </div>
        `;
        return;
    }
    
    config.sites.forEach(site => {
        const siteElement = document.createElement('div');
        siteElement.className = 'flex justify-between items-center p-3 mb-2 bg-bg-300 rounded';
        siteElement.innerHTML = `
            <div class="truncate flex-1 mr-2" title="${site.url}">${site.url}</div>
            <div class="flex gap-2">
                <button class="button button-outline view-site-btn" data-id="${site.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="button button-outline remove-site-btn" data-id="${site.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        elements.sitesList.appendChild(siteElement);
    });
    
    // Adicionar event listeners aos botões
    document.querySelectorAll('.view-site-btn').forEach(btn => {
        btn.addEventListener('click', () => viewSiteDetails(btn.dataset.id));
    });
    
    document.querySelectorAll('.remove-site-btn').forEach(btn => {
        btn.addEventListener('click', () => removeSite(btn.dataset.id));
    });
}

async function viewSiteDetails(siteId) {
    try {
        const response = await axios.get(`${config.serverUrl}/api/sites/${siteId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
        });
        
        const site = response.data;
        config.currentSite = site;
        
        elements.modalTitle.textContent = `Detalhes: ${site.url}`;
        elements.modalContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="card">
                    <h4>Informações Básicas</h4>
                    <div class="flex flex-col gap-2 mt-3">
                        <div class="flex justify-between">
                            <span>URL:</span>
                            <span class="font-bold">${site.url}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Monitorando desde:</span>
                            <span class="font-bold">${new Date(site.added).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Disponibilidade:</span>
                            <span class="font-bold">${site.uptime.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <h4>SEO</h4>
                    <div class="chart-container">
                        <canvas id="seoChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="card mt-4">
                <h4>Tráfego por País</h4>
                <div class="chart-container">
                    <canvas id="countryChart"></canvas>
                </div>
            </div>
        `;
        
        elements.siteModal.classList.remove('hidden');
        
        // Carrega dados adicionais
        await Promise.all([
            fetchSiteAnalytics(siteId),
            runLighthouseCheck(site.url)
        ]);
    } catch (error) {
        addLog(`Erro ao carregar detalhes: ${error.message}`, 'error');
    }
}

// Integrações com APIs
async function fetchSiteAnalytics(siteId) {
    try {
        const response = await axios.get(`${config.serverUrl}/api/analytics/${siteId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
        });
        
        updateCharts(response.data);
        return response.data;
    } catch (error) {
        addLog(`Erro ao buscar analytics: ${error.message}`, 'error');
        return null;
    }
}

async function runLighthouseCheck(url) {
    try {
        const response = await axios.post(`${config.serverUrl}/api/sites/lighthouse`, { url }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
        });
        
        updateSEOMetrics(response.data);
        return response.data;
    } catch (error) {
        addLog(`Erro no Lighthouse: ${error.message}`, 'error');
        return null;
    }
}

function updateCharts(analyticsData) {
    if (!analyticsData) return;
    
    // Atualiza gráfico de tráfego
    if (config.charts.trafficChart) {
        config.charts.trafficChart.data.labels = analyticsData.traffic.dates;
        config.charts.trafficChart.data.datasets[0].data = analyticsData.traffic.sessions;
        config.charts.trafficChart.update();
    }
    
    // Atualiza gráfico de demografia
    if (config.charts.demographicsChart) {
        config.charts.demographicsChart.data.labels = analyticsData.demographics.countries;
        config.charts.demographicsChart.data.datasets[0].data = analyticsData.demographics.sessions;
        config.charts.demographicsChart.update();
    }
}

function updateSEOMetrics(lighthouseData) {
    if (!lighthouseData) return;
    
    elements.seoScore.textContent = `${Math.round(lighthouseData.seo)}/100`;
    
    // Atualiza gráfico radar
    const seoCtx = document.getElementById('seoChart')?.getContext('2d');
    if (seoCtx) {
        new Chart(seoCtx, {
            type: 'radar',
            data: {
                labels: ['Performance', 'Acessibilidade', 'Boas Práticas', 'SEO', 'Velocidade'],
                datasets: [{
                    label: 'Pontuação SEO',
                    data: [
                        lighthouseData.performance,
                        lighthouseData.accessibility,
                        lighthouseData.bestPractices,
                        lighthouseData.seo,
                        lighthouseData.metrics.speedIndex
                    ],
                    backgroundColor: 'rgba(100, 255, 218, 0.2)',
                    borderColor: 'rgba(100, 255, 218, 1)',
                    pointBackgroundColor: 'rgba(100, 255, 218, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(100, 255, 218, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'var(--border-100)' },
                        grid: { color: 'var(--border-100)' },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        pointLabels: { color: 'var(--text-200)' }
                    }
                }
            }
        });
    }
}

function updateRealTimeStats(data) {
    elements.uptime.textContent = `${data.uptime.toFixed(2)}%`;
    elements.responseTime.textContent = `${data.responseTime}ms`;
    
    if (config.charts.regionChart) {
        config.charts.regionChart.data.datasets[0].data = [
            data.traffic.north_america,
            data.traffic.europe,
            data.traffic.asia,
            data.traffic.south_america,
            data.traffic.africa,
            data.traffic.oceania
        ];
        config.charts.regionChart.update();
    }
}

// Gráficos
function initCharts() {
    // Gráfico de regiões
    const regionCtx = document.getElementById('regionChart')?.getContext('2d');
    if (regionCtx) {
        config.charts.regionChart = new Chart(regionCtx, {
            type: 'doughnut',
            data: {
                labels: ['América do Norte', 'Europa', 'Ásia', 'América do Sul', 'África', 'Oceania'],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(100, 255, 218, 0.7)',
                        'rgba(100, 200, 255, 0.7)',
                        'rgba(255, 100, 100, 0.7)',
                        'rgba(255, 200, 100, 0.7)',
                        'rgba(150, 100, 255, 0.7)',
                        'rgba(100, 255, 150, 0.7)'
                    ],
                    borderColor: 'var(--bg-100)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: 'var(--text-200)' }
                    }
                }
            }
        });
    }
    
    // Gráfico de tráfego (adicionado)
    const trafficCtx = document.getElementById('trafficChart')?.getContext('2d');
    if (trafficCtx) {
        config.charts.trafficChart = new Chart(trafficCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sessões',
                    data: [],
                    borderColor: 'rgba(100, 255, 218, 1)',
                    backgroundColor: 'rgba(100, 255, 218, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'var(--border-100)' },
                        ticks: { color: 'var(--text-200)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: 'var(--text-200)' }
                    }
                }
            }
        });
    }
}

// Gerenciamento de Logs
function addLog(message, type = 'info', timestamp = new Date().toISOString(), ip = '') {
    const logElement = document.createElement('div');
    logElement.className = `log-entry log-${type} fade-in`;
    
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString();
    const dateStr = date.toLocaleDateString();
    
    logElement.innerHTML = `
        <div class="log-timestamp">${dateStr} ${timeStr}</div>
        <div class="log-message flex-1">${message}</div>
        ${ip ? `<div class="log-meta">IP: ${ip}</div>` : ''}
        <div class="log-type-badge">
            <i class="fas ${getLogIcon(type)}"></i>
        </div>
    `;
    
    elements.logsList.prepend(logElement);
}

function getLogIcon(type) {
    switch (type) {
        case 'error': return 'fa-times-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': return 'fa-info-circle';
        case 'success': return 'fa-check-circle';
        default: return 'fa-info-circle';
    }
}

function filterLogs() {
    const filter = elements.logFilter.value;
    const logs = document.querySelectorAll('.log-entry');
    
    logs.forEach(log => {
        const shouldShow = filter === 'all' || log.classList.contains(`log-${filter}`);
        log.style.display = shouldShow ? 'flex' : 'none';
    });
}

function clearLogs() {
    if (confirm('Tem certeza que deseja limpar todos os logs?')) {
        elements.logsList.innerHTML = '';
        addLog('Logs limpos', 'info');
    }
}

// Atualização de estatísticas do site
async function updateSiteStats(siteId) {
    try {
        const response = await axios.get(`${config.serverUrl}/api/sites/${siteId}/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
        });
        
        const stats = response.data;
        elements.uptime.textContent = `${stats.uptime.toFixed(2)}%`;
        elements.responseTime.textContent = `${stats.avgResponseTime}ms`;
        elements.seoScore.textContent = stats.seoScore ? `${Math.round(stats.seoScore)}/100` : '--';
        elements.sslStatus.textContent = stats.sslValid ? 'Válido' : 'Inválido';
        
        if (config.charts.regionChart) {
            config.charts.regionChart.data.datasets[0].data = [
                stats.traffic.north_america,
                stats.traffic.europe,
                stats.traffic.asia,
                stats.traffic.south_america,
                stats.traffic.africa,
                stats.traffic.oceania
            ];
            config.charts.regionChart.update();
        }
    } catch (error) {
        addLog(`Erro ao atualizar estatísticas: ${error.message}`, 'error');
    }
}

function clearStats() {
    elements.uptime.textContent = '--';
    elements.responseTime.textContent = '--';
    elements.seoScore.textContent = '--';
    elements.sslStatus.textContent = '--';
}

function updateStats() {
    const period = elements.statsPeriod.value;
    if (config.currentSite) {
        updateSiteStats(config.currentSite.id);
    }
    addLog(`Estatísticas atualizadas para o período: ${getPeriodName(period)}`, 'info');
}

function getPeriodName(period) {
    switch (period) {
        case '24h': return 'Últimas 24 horas';
        case '7d': return 'Últimos 7 dias';
        case '30d': return 'Últimos 30 dias';
        default: return period;
    }
}