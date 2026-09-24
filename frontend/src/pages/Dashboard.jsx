import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

function formatarStatus(status) {
  const statusFormatados = {
    aberto: "Aberto",
    pendente: "Pendente",
    em_atendimento: "Em atendimento",
    resolvido: "Resolvido",
  };

  return statusFormatados[status] || status;
}

function formatarPrioridade(prioridade) {
  const prioridades = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  };

  return prioridades[prioridade] || prioridade;
}

function formatarUsuario(chamado) {
  if (chamado.usuario_nome) {
    return chamado.usuario_nome;
  }

  if (chamado.usuario?.nome) {
    return chamado.usuario.nome;
  }

  return `Usuário #${chamado.usuario_id}`;
}

function formatarTecnico(chamado) {
  if (!chamado.tecnico_id) {
    return "Não atribuído";
  }

  if (chamado.tecnico_nome) {
    return chamado.tecnico_nome;
  }

  if (chamado.tecnico?.nome) {
    return chamado.tecnico.nome;
  }

  return `Técnico #${chamado.tecnico_id}`;
}

function Dashboard() {
  const [usuario, setUsuario] = useState(null);
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [acaoCarregando, setAcaoCarregando] = useState(null);
  const [chamadoResolvendo, setChamadoResolvendo] = useState(null);
  const [solucao, setSolucao] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [buscaChamado, setBuscaChamado] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");

  const navigate = useNavigate();

  /*
   * Atualiza os dados do dashboard.
   * É utilizado depois de assumir ou resolver um chamado.
   */
  const carregarDashboard = useCallback(
    async (mostrarCarregamento = true) => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (mostrarCarregamento) {
        setCarregando(true);
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [respostaUsuario, respostaChamados] = await Promise.all([
          fetch("http://localhost:8000/usuarios/me", {
            headers,
          }),

          fetch("http://localhost:8000/chamados/", {
            headers,
          }),
        ]);

        const dadosUsuario = await respostaUsuario.json();
        const dadosChamados = await respostaChamados.json();

        if (
          respostaUsuario.status === 401 ||
          respostaChamados.status === 401
        ) {
          localStorage.removeItem("access_token");
          navigate("/login");
          return;
        }

        if (!respostaUsuario.ok) {
          throw new Error(
            dadosUsuario.detail ||
              "Não foi possível carregar os dados do usuário."
          );
        }

        if (!respostaChamados.ok) {
          throw new Error(
            dadosChamados.detail ||
              "Não foi possível carregar os chamados."
          );
        }

        setUsuario(dadosUsuario);
        setChamados(dadosChamados);
        setErro("");
      } catch (error) {
        setErro(error.message);
      } finally {
        setCarregando(false);
      }
    },
    [navigate]
  );

  /*
   * Carregamento inicial do dashboard.
   */
  useEffect(() => {
    let componenteAtivo = true;

    async function carregarDadosIniciais() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [respostaUsuario, respostaChamados] = await Promise.all([
          fetch("http://localhost:8000/usuarios/me", {
            headers,
          }),

          fetch("http://localhost:8000/chamados/", {
            headers,
          }),
        ]);

        const dadosUsuario = await respostaUsuario.json();
        const dadosChamados = await respostaChamados.json();

        if (
          respostaUsuario.status === 401 ||
          respostaChamados.status === 401
        ) {
          localStorage.removeItem("access_token");
          navigate("/login");
          return;
        }

        if (!respostaUsuario.ok) {
          throw new Error(
            dadosUsuario.detail ||
              "Não foi possível carregar os dados do usuário."
          );
        }

        if (!respostaChamados.ok) {
          throw new Error(
            dadosChamados.detail ||
              "Não foi possível carregar os chamados."
          );
        }

        if (componenteAtivo) {
          setUsuario(dadosUsuario);
          setChamados(dadosChamados);
          setErro("");
        }
      } catch (error) {
        if (componenteAtivo) {
          setErro(error.message);
        }
      } finally {
        if (componenteAtivo) {
          setCarregando(false);
        }
      }
    }

    carregarDadosIniciais();

    return () => {
      componenteAtivo = false;
    };
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  /*
   * Técnico assume um chamado aberto.
   */
  async function assumirChamado(chamadoId) {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setAcaoCarregando(chamadoId);
    setMensagem("");
    setErro("");

    try {
      const resposta = await fetch(
        `http://localhost:8000/chamados/${chamadoId}/assumir`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const dados = await resposta.json();

      if (resposta.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      if (!resposta.ok) {
        throw new Error(
          dados.detail || "Não foi possível assumir o chamado."
        );
      }

      setMensagem("Chamado assumido com sucesso.");

      await carregarDashboard(false);
    } catch (error) {
      setErro(error.message);
    } finally {
      setAcaoCarregando(null);
    }
  }

  /*
   * Abre o modal de resolução.
   */
  function abrirFormularioResolucao(chamadoId) {
    setMensagem("");
    setErro("");
    setSolucao("");
    setChamadoResolvendo(chamadoId);
  }

  /*
   * Fecha o modal de resolução.
   */
  function cancelarResolucao() {
    if (acaoCarregando !== null) {
      return;
    }

    setChamadoResolvendo(null);
    setSolucao("");
    setErro("");
  }

  /*
   * Técnico resolve o chamado.
   */
  async function resolverChamado(chamadoId) {
    if (solucao.trim().length < 5) {
      setErro("A solução deve conter pelo menos 5 caracteres.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setAcaoCarregando(chamadoId);
    setMensagem("");
    setErro("");

    try {
      const resposta = await fetch(
        `http://localhost:8000/chamados/${chamadoId}/resolver`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            solucao: solucao.trim(),
          }),
        }
      );

      const dados = await resposta.json();

      if (resposta.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      if (!resposta.ok) {
        throw new Error(
          dados.detail || "Não foi possível resolver o chamado."
        );
      }

      setMensagem("Chamado resolvido com sucesso.");
      setChamadoResolvendo(null);
      setSolucao("");

      await carregarDashboard(false);
    } catch (error) {
      setErro(error.message);
    } finally {
      setAcaoCarregando(null);
    }
  }

  function contarChamadosPorStatus(status) {
    return chamados.filter((chamado) => chamado.status === status).length;
  }

  /*
   * Filtra os chamados pelo status selecionado nos cards.
   */
  function filtrarPorStatus(status) {
    setFiltroStatus(status);
  }

  function limparFiltros() {
    setBuscaChamado("");
    setFiltroStatus("");
    setFiltroPrioridade("");
  }

  const chamadosFiltrados = chamados.filter((chamado) => {
    const termoBusca = buscaChamado.trim().toLowerCase();

    const correspondeBusca =
      termoBusca === "" ||
      String(chamado.id).includes(termoBusca) ||
      chamado.titulo?.toLowerCase().includes(termoBusca) ||
      chamado.descricao?.toLowerCase().includes(termoBusca);

    const correspondeStatus =
      filtroStatus === "" || chamado.status === filtroStatus;

    const correspondePrioridade =
      filtroPrioridade === "" ||
      chamado.prioridade === filtroPrioridade;

    return (
      correspondeBusca &&
      correspondeStatus &&
      correspondePrioridade
    );
  });

  function podeResolverChamado(chamado) {
    return (
      usuario?.perfil === "tecnico" &&
      chamado.status === "em_atendimento" &&
      chamado.tecnico_id === usuario.id
    );
  }

  if (carregando) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (erro && !usuario) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Erro ao carregar</h1>
          <p>{erro}</p>

          <button
            className="btn btn-primary"
            onClick={handleLogout}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div className="logo">
            Help<span>Desk</span>
          </div>

          <button
            className="btn btn-outline"
            onClick={handleLogout}
          >
            Sair
          </button>
        </header>

        <main className="dashboard-content">
          <span className="badge">Área autenticada</span>

          <h1>
            Olá, {usuario.nome || usuario.username}!
          </h1>

          <p>
            Acompanhe os chamados e os atendimentos da sua equipe.
          </p>

          {mensagem && (
            <div className="dashboard-success-message">
              {mensagem}
            </div>
          )}

          {erro && (
            <div className="dashboard-error-message">
              {erro}
            </div>
          )}

          <div className="dashboard-actions">
            {usuario.perfil !== "tecnico" && (
              <button
                className="btn btn-primary"
                onClick={() => navigate("/novo-chamado")}
              >
                + Novo chamado
              </button>
            )}

            {usuario.perfil === "admin" && (
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/admin/usuarios")}
              >
                Gerenciar usuários
              </button>
            )}
          </div>

          <div className="dashboard-user-info">
            <div>
              <span>Usuário</span>
              <strong>{usuario.username}</strong>
            </div>

            <div>
              <span>Perfil</span>
              <strong>{usuario.perfil}</strong>
            </div>
          </div>

          <section className="dashboard-section">
            <div className="section-heading dashboard-section-heading">
              <span className="section-label">Resumo</span>
              <h2>Visão geral dos chamados</h2>
            </div>

            <div className="dashboard-stats">
              <button
                type="button"
                className={`dashboard-stat-card ${
                  filtroStatus === ""
                    ? "dashboard-stat-card-active"
                    : ""
                }`}
                onClick={() => filtrarPorStatus("")}
              >
                <span>Total de chamados</span>
                <strong>{chamados.length}</strong>
              </button>

              <button
                type="button"
                className={`dashboard-stat-card ${
                  filtroStatus === "aberto"
                    ? "dashboard-stat-card-active"
                    : ""
                }`}
                onClick={() => filtrarPorStatus("aberto")}
              >
                <span>Em aberto</span>
                <strong>
                  {contarChamadosPorStatus("aberto")}
                </strong>
              </button>

              <button
                type="button"
                className={`dashboard-stat-card ${
                  filtroStatus === "em_atendimento"
                    ? "dashboard-stat-card-active"
                    : ""
                }`}
                onClick={() =>
                  filtrarPorStatus("em_atendimento")
                }
              >
                <span>Em atendimento</span>
                <strong>
                  {contarChamadosPorStatus("em_atendimento")}
                </strong>
              </button>

              <button
                type="button"
                className={`dashboard-stat-card ${
                  filtroStatus === "resolvido"
                    ? "dashboard-stat-card-active"
                    : ""
                }`}
                onClick={() => filtrarPorStatus("resolvido")}
              >
                <span>Resolvidos</span>
                <strong>
                  {contarChamadosPorStatus("resolvido")}
                </strong>
              </button>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-heading dashboard-section-heading">
              <span className="section-label">Atendimentos</span>

              <h2>
                {usuario.perfil === "tecnico"
                  ? "Chamados disponíveis e atribuídos"
                  : "Chamados recentes"}
              </h2>

              <p>
                {usuario.perfil === "tecnico"
                  ? "Assuma chamados abertos e resolva os chamados atribuídos a você."
                  : "Lista de chamados disponíveis para o seu perfil."}
              </p>
            </div>

            <div className="dashboard-ticket-filters">
              <div className="dashboard-filter-group dashboard-filter-search">
                <label htmlFor="busca-chamado">
                  Buscar chamado
                </label>

                <input
                  id="busca-chamado"
                  type="text"
                  value={buscaChamado}
                  onChange={(event) =>
                    setBuscaChamado(event.target.value)
                  }
                  placeholder="Buscar por ID, título ou descrição..."
                />
              </div>

              <div className="dashboard-filter-group">
                <label htmlFor="filtro-status">
                  Status
                </label>

                <select
                  id="filtro-status"
                  value={filtroStatus}
                  onChange={(event) =>
                    setFiltroStatus(event.target.value)
                  }
                >
                  <option value="">Todos os status</option>
                  <option value="aberto">Aberto</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_atendimento">
                    Em atendimento
                  </option>
                  <option value="resolvido">Resolvido</option>
                </select>
              </div>

              <div className="dashboard-filter-group">
                <label htmlFor="filtro-prioridade">
                  Prioridade
                </label>

                <select
                  id="filtro-prioridade"
                  value={filtroPrioridade}
                  onChange={(event) =>
                    setFiltroPrioridade(event.target.value)
                  }
                >
                  <option value="">Todas as prioridades</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-outline dashboard-clear-filters"
                onClick={limparFiltros}
              >
                Limpar filtros
              </button>
            </div>

            <div className="dashboard-filter-summary">
              <span>
                Exibindo {chamadosFiltrados.length} de{" "}
                {chamados.length} chamados
              </span>
            </div>

            {chamados.length === 0 ? (
              <div className="empty-state">
                <h3>Nenhum chamado encontrado</h3>

                <p>
                  Ainda não existem chamados cadastrados para exibir.
                </p>
              </div>
            ) : chamadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <h3>Nenhum chamado corresponde aos filtros</h3>

                <p>
                  Tente alterar os termos da busca ou limpar os filtros
                  selecionados.
                </p>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="tickets-table-wrapper">
                <table className="tickets-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Chamado</th>
                      <th>Usuário</th>
                      <th>Categoria</th>
                      <th>Prioridade</th>
                      <th>Status</th>

                      {usuario.perfil !== "tecnico" && (
                        <th>Técnico responsável</th>
                      )}

                      {usuario.perfil === "tecnico" && (
                        <th>Ações</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {chamadosFiltrados.map((chamado) => (
                      <tr key={chamado.id}>
                        <td>#{chamado.id}</td>

                        <td>
                          <div className="ticket-table-title">
                            <button
                              className="chamado-titulo-button"
                              onClick={() =>
                                navigate(
                                  `/chamados/${chamado.id}`
                                )
                              }
                            >
                              {chamado.titulo}
                            </button>

                            <span>{chamado.descricao}</span>
                          </div>
                        </td>

                        <td>
                          {formatarUsuario(chamado)}
                        </td>

                        <td>{chamado.categoria}</td>

                        <td>
                          <span
                            className={`priority-badge priority-${chamado.prioridade}`}
                          >
                            {formatarPrioridade(chamado.prioridade)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${chamado.status}`}
                          >
                            {formatarStatus(chamado.status)}
                          </span>
                        </td>

                        {usuario.perfil !== "tecnico" && (
                          <td>
                            <span className="tecnico-responsavel">
                              {formatarTecnico(chamado)}
                            </span>
                          </td>
                        )}

                        {usuario.perfil === "tecnico" && (
                          <td>
                            <div className="chamado-acoes">
                              {chamado.status === "aberto" && (
                                <button
                                  className="btn btn-primary chamado-acao-button"
                                  onClick={() =>
                                    assumirChamado(chamado.id)
                                  }
                                  disabled={
                                    acaoCarregando === chamado.id
                                  }
                                >
                                  {acaoCarregando === chamado.id
                                    ? "Assumindo..."
                                    : "Assumir chamado"}
                                </button>
                              )}

                              {podeResolverChamado(chamado) && (
                                <>
                                  {chamadoResolvendo === chamado.id ? (
                                    <span className="chamado-finalizado-texto">
                                      Modal aberto
                                    </span>
                                  ) : (
                                    <button
                                      className="btn btn-primary chamado-acao-button"
                                      onClick={() =>
                                        abrirFormularioResolucao(
                                          chamado.id
                                        )
                                      }
                                    >
                                      Resolver chamado
                                    </button>
                                  )}
                                </>
                              )}

                              {chamado.status === "em_atendimento" &&
                                chamado.tecnico_id !== usuario.id && (
                                  <span className="chamado-finalizado-texto">
                                    Em atendimento
                                  </span>
                                )}

                              {chamado.status === "resolvido" && (
                                <span className="chamado-finalizado-texto">
                                  Resolvido
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {chamadoResolvendo !== null &&
        createPortal(
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                cancelarResolucao();
              }
            }}
          >
            <div
              className="modal-resolucao"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-resolucao-titulo"
            >
              <div className="modal-resolucao-header">
                <div>
                  <span className="section-label">
                    Atendimento técnico
                  </span>

                  <h2 id="modal-resolucao-titulo">
                    Resolver chamado
                  </h2>
                </div>

                <button
                  type="button"
                  className="modal-fechar-button"
                  onClick={cancelarResolucao}
                  disabled={acaoCarregando !== null}
                  aria-label="Fechar modal"
                >
                  ×
                </button>
              </div>

              <p className="modal-resolucao-descricao">
                Descreva detalhadamente o procedimento realizado para
                solucionar o problema deste chamado.
              </p>

              {erro && (
                <p className="auth-error modal-erro">
                  {erro}
                </p>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  resolverChamado(chamadoResolvendo);
                }}
              >
                <textarea
                  className="chamado-solucao-input"
                  value={solucao}
                  onChange={(event) =>
                    setSolucao(event.target.value)
                  }
                  placeholder="Descreva o que foi feito para resolver o chamado..."
                  rows={6}
                  disabled={acaoCarregando !== null}
                  autoFocus
                />

                <div className="modal-resolucao-acoes">
                  <button
                    type="button"
                    className="modal-cancelar-button"
                    onClick={cancelarResolucao}
                    disabled={acaoCarregando !== null}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="chamado-acao-button"
                    disabled={acaoCarregando !== null}
                  >
                    {acaoCarregando !== null
                      ? "Resolvendo..."
                      : "Confirmar resolução"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default Dashboard;