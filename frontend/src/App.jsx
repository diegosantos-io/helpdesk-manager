import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Dashboard from "./pages/Dashboard";
import NovoChamado from "./pages/NovoChamado";
import ChamadoDetalhes from "./pages/ChamadoDetalhes";
import AdminUsuarios from "./pages/AdminUsuarios";
import "./App.css";

function Home() {
  const [dadosHome, setDadosHome] = useState({
    total: 0,
    abertos: 0,
    em_atendimento: 0,
    resolvidos: 0,
    recentes: [],
  });

  useEffect(() => {
    fetch("http://localhost:8000/chamados/publico")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erro ao carregar dados.");
        }

        return response.json();
      })
      .then((data) => {
        setDadosHome(data);
      })
      .catch((error) => {
        console.error("Erro ao carregar dados da Home:", error);
      });
  }, []);

  return (
    <div className="app">
      <header className="navbar">
        <Link to="/" className="logo">
          Help<span>Desk</span>
        </Link>

        <nav className="nav-links">
          <a href="#inicio">Início</a>
          <a href="#recursos">Recursos</a>
          <a href="#sobre">Sobre</a>
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="btn btn-outline">
            Entrar
          </Link>

          <Link to="/cadastro" className="btn btn-primary">
            Criar conta
          </Link>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-content">
            <span className="badge">
              Gestão de suporte simplificada
            </span>

            <h1>
              Organize seus chamados.
              <span> Melhore seu suporte.</span>
            </h1>

            <p>
              Gerencie solicitações, acompanhe atendimentos e conecte sua
              equipe em uma única plataforma de Help Desk.
            </p>

            <div className="hero-actions">
              <Link to="/cadastro" className="btn btn-primary btn-large">
                Começar agora
              </Link>

              <a href="#recursos" className="btn btn-secondary btn-large">
                Conhecer o sistema
              </a>
            </div>

            <div className="hero-info">
              <div>
                <strong>Controle</strong>
                <span>dos chamados</span>
              </div>

              <div>
                <strong>Equipe</strong>
                <span>mais organizada</span>
              </div>

              <div>
                <strong>Atendimento</strong>
                <span>mais eficiente</span>
              </div>
            </div>
          </div>

          <div className="hero-card">
            <div className="card-header">
              <div>
                <span className="card-label">Painel de suporte</span>
                <h2>Visão geral</h2>
              </div>

              <span className="status-online">● Online</span>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Chamados</span>
                <strong>{dadosHome.total}</strong>
                <small>
                  {dadosHome.abertos} abertos
                </small>
              </div>

              <div className="stat-card">
                <span>Resolvidos</span>
                <strong>{dadosHome.resolvidos}</strong>
                <small>
                  {dadosHome.em_atendimento} em atendimento
                </small>
              </div>
            </div>

            <div className="ticket-list">
              <div className="ticket-title">
                <span>Chamados recentes</span>
              </div>

              {dadosHome.recentes.map((chamado) => (
                <div className="ticket" key={chamado.id}>
                  <div className="ticket-icon">
                    {chamado.status === "resolvido"
                      ? "✓"
                      : chamado.status === "em_atendimento"
                      ? "↻"
                      : "!"}
                  </div>

                  <div className="ticket-details">
                    <strong>{chamado.titulo}</strong>
                    <span>
                      Solicitação #{chamado.id}
                    </span>
                  </div>

                  <span
                    className={`ticket-status ${
                      chamado.status === "resolvido"
                        ? "resolved"
                        : chamado.status === "em_atendimento"
                        ? "progress"
                        : "pending"
                    }`}
                  >
                    {chamado.status === "resolvido"
                      ? "Resolvido"
                      : chamado.status === "em_atendimento"
                      ? "Em atendimento"
                      : "Aberto"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="features" id="recursos">
          <div className="section-heading">
            <span className="section-label">Recursos</span>

            <h2>Tudo o que sua equipe precisa</h2>

            <p>
              Uma estrutura simples para organizar, acompanhar e resolver
              chamados de suporte.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">▣</div>

              <h3>Gestão de chamados</h3>

              <p>
                Registre e acompanhe solicitações desde a abertura até a
                resolução.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">◈</div>

              <h3>Controle de equipes</h3>

              <p>
                Organize os responsáveis e permita que cada técnico acompanhe
                seus atendimentos.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">✓</div>

              <h3>Histórico completo</h3>

              <p>
                Consulte as ações realizadas e mantenha o histórico de cada
                chamado.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer" id="sobre">
        <div className="logo">
          Help<span>Desk</span>
        </div>

        <p>HelpDesk Manager — Gestão de suporte técnico.</p>

        <span>© 2026 HelpDesk Manager</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/cadastro" element={<Cadastro />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/admin/usuarios"
          element={<AdminUsuarios />}
        />

        <Route
          path="/novo-chamado"
          element={<NovoChamado />}
        />

        <Route
          path="/chamados/:chamadoId"
          element={<ChamadoDetalhes />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;