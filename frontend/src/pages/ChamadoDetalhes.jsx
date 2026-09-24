import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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

function formatarAcao(acao) {
  const acoesFormatadas = {
    criado: "Chamado criado",
    assumido: "Chamado assumido",
    resolvido: "Chamado resolvido",
    atualizado: "Chamado atualizado",
    transferido: "Chamado transferido",
    reaberto: "Chamado reaberto",
  };

  return acoesFormatadas[acao] || acao || "Atualização do chamado";
}

function formatarData(data) {
  if (!data) {
    return "Não informado";
  }

  return new Date(data).toLocaleString("pt-BR");
}

export default function ChamadoDetalhes() {
  const { chamadoId } = useParams();
  const navigate = useNavigate();

  const [chamado, setChamado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [solucao, setSolucao] = useState("");
  const [modalResolucaoAberto, setModalResolucaoAberto] = useState(false);
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [mensagemAcao, setMensagemAcao] = useState("");

  const [tecnicos, setTecnicos] = useState([]);
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false);
  const [novoTecnicoId, setNovoTecnicoId] = useState("");
  const [motivoTransferencia, setMotivoTransferencia] = useState("");
  const [transferindo, setTransferindo] = useState(false);
  const [erroTransferencia, setErroTransferencia] = useState("");

  const carregarDados = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setErro("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const respostaUsuario = await fetch(
        "http://localhost:8000/usuarios/me",
        {
          headers,
        }
      );

      const respostaChamado = await fetch(
        `http://localhost:8000/chamados/${chamadoId}`,
        {
          headers,
        }
      );

      const respostaHistorico = await fetch(
        `http://localhost:8000/chamados/${chamadoId}/historico`,
        {
          headers,
        }
      );

      if (
        respostaUsuario.status === 401 ||
        respostaChamado.status === 401 ||
        respostaHistorico.status === 401
      ) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      if (!respostaUsuario.ok) {
        throw new Error("Não foi possível carregar o usuário.");
      }

      if (!respostaChamado.ok) {
        const dadosErro = await respostaChamado.json();

        throw new Error(
          dadosErro.detail || "Não foi possível carregar o chamado."
        );
      }

      if (!respostaHistorico.ok) {
        const dadosErroHistorico = await respostaHistorico.json();

        throw new Error(
          dadosErroHistorico.detail ||
            "Não foi possível carregar o histórico."
        );
      }

      const dadosUsuario = await respostaUsuario.json();
      const dadosChamado = await respostaChamado.json();
      const dadosHistorico = await respostaHistorico.json();

      setUsuarioAtual(dadosUsuario);
      setChamado(dadosChamado);
      setHistorico(dadosHistorico);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }, [chamadoId, navigate]);

  const carregarTecnicos = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setErroTransferencia("");

      const response = await fetch(
        "http://localhost:8000/usuarios/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        const dadosErro = await response.json();

        throw new Error(
          dadosErro.detail ||
            "Não foi possível carregar os técnicos."
        );
      }

      const usuarios = await response.json();

      const tecnicosAtivos = usuarios.filter(
        (usuario) =>
          usuario.perfil === "tecnico" &&
          usuario.ativo === true
      );

      setTecnicos(tecnicosAtivos);
    } catch (error) {
      setErroTransferencia(error.message);
    }
  }, [navigate]);

  useEffect(() => {
    // Necessário para carregar os dados da API ao abrir a página.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (usuarioAtual?.perfil === "admin") {
      // Necessário para carregar os técnicos da API quando o usuário é administrador.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      carregarTecnicos();
    }
  }, [usuarioAtual, carregarTecnicos]);

  async function assumirChamado() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setProcessandoAcao(true);
      setMensagemAcao("");
      setErro("");

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

      if (!resposta.ok) {
        throw new Error(
          dados.detail || "Não foi possível assumir o chamado."
        );
      }

      setMensagemAcao("Chamado assumido com sucesso.");

      await carregarDados();
    } catch (error) {
      setErro(error.message);
    } finally {
      setProcessandoAcao(false);
    }
  }

  async function resolverChamado(event) {
    event.preventDefault();

    if (solucao.trim().length < 5) {
      setErro("A solução deve possuir pelo menos 5 caracteres.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setProcessandoAcao(true);
      setMensagemAcao("");
      setErro("");

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

      if (!resposta.ok) {
        throw new Error(
          dados.detail || "Não foi possível resolver o chamado."
        );
      }

      setSolucao("");
      setModalResolucaoAberto(false);
      setMensagemAcao("Chamado resolvido com sucesso.");

      await carregarDados();
    } catch (error) {
      setErro(error.message);
    } finally {
      setProcessandoAcao(false);
    }
  }

  async function transferirChamado() {
    if (!novoTecnicoId) {
      setErroTransferencia("Selecione um técnico.");
      return;
    }

    if (Number(novoTecnicoId) === chamado?.tecnico_id) {
      setErroTransferencia(
        "Selecione um técnico diferente do responsável atual."
      );
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setTransferindo(true);
      setErroTransferencia("");
      setMensagemAcao("");
      setErro("");

      const resposta = await fetch(
        `http://localhost:8000/chamados/${chamadoId}/transferir`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tecnico_id: Number(novoTecnicoId),
            motivo: motivoTransferencia.trim() || null,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.detail || "Não foi possível transferir o chamado."
        );
      }

      setChamado(dados);
      setMostrarTransferencia(false);
      setNovoTecnicoId("");
      setMotivoTransferencia("");
      setErroTransferencia("");

      setMensagemAcao("Chamado transferido com sucesso.");

      await carregarDados();
    } catch (error) {
      setErroTransferencia(error.message);
    } finally {
      setTransferindo(false);
    }
  }

  function fecharModalResolucao() {
    if (processandoAcao) {
      return;
    }

    setModalResolucaoAberto(false);
    setSolucao("");
    setErro("");
  }

  function fecharModalTransferencia() {
    if (transferindo) {
      return;
    }

    setMostrarTransferencia(false);
    setNovoTecnicoId("");
    setMotivoTransferencia("");
    setErroTransferencia("");
  }

  function abrirModalTransferencia() {
    setErroTransferencia("");
    setMensagemAcao("");

    if (usuarioAtual?.perfil !== "admin") {
      return;
    }

    if (chamado?.status !== "em_atendimento") {
      setErroTransferencia(
        "Somente chamados em atendimento podem ser transferidos."
      );
      return;
    }

    setMostrarTransferencia(true);
  }

  function sair() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  const tecnicoPodeAssumir =
    usuarioAtual?.perfil === "tecnico" &&
    chamado?.status === "aberto" &&
    !chamado?.tecnico_id;

  const tecnicoPodeResolver =
    usuarioAtual?.perfil === "tecnico" &&
    chamado?.status === "em_atendimento" &&
    chamado?.tecnico_id === usuarioAtual?.id;

  const adminPodeTransferir =
    usuarioAtual?.perfil === "admin" &&
    chamado?.status === "em_atendimento" &&
    chamado?.tecnico_id !== null &&
    chamado?.tecnico_id !== undefined;

  if (carregando) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-content">
          <p>Carregando chamado...</p>
        </div>
      </main>
    );
  }

  if (erro && !chamado) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-content">
          <div className="dashboard-section">
            <p className="auth-error">{erro}</p>

            <Link to="/dashboard" className="auth-back-link">
              Voltar para o dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!chamado) {
    return null;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-title">
          <p className="dashboard-brand">HelpDesk Manager</p>
          <h1>Detalhes do chamado</h1>
        </div>

        <button className="chamado-sair-button" onClick={sair}>
          Sair
        </button>
      </header>

      <div className="dashboard-content">
        <div className="chamado-voltar-container">
          <Link to="/dashboard" className="chamado-voltar-button">
            ← Voltar para chamados
          </Link>
        </div>

        {erro && !modalResolucaoAberto && !mostrarTransferencia && (
          <div className="dashboard-section">
            <p className="auth-error">{erro}</p>
          </div>
        )}

        {mensagemAcao && (
          <div className="dashboard-section">
            <p className="auth-success">{mensagemAcao}</p>
          </div>
        )}

        <section className="dashboard-section chamado-detalhes-card">
          <div className="chamado-detalhes-header">
            <div>
              <span className="chamado-id">
                Chamado #{chamado.id}
              </span>

              <h2>{chamado.titulo}</h2>
            </div>

            <div className="chamado-badges">
              <span
                className={`status-badge status-${chamado.status}`}
              >
                {formatarStatus(chamado.status)}
              </span>

              <span
                className={`priority-badge priority-${chamado.prioridade}`}
              >
                {formatarPrioridade(chamado.prioridade)}
              </span>
            </div>
          </div>

          <div className="chamado-detalhes-grid">
            <div className="chamado-info-item">
              <span>Categoria</span>
              <strong>{chamado.categoria}</strong>
            </div>

            <div className="chamado-info-item">
              <span>Status</span>
              <strong>{formatarStatus(chamado.status)}</strong>
            </div>

            <div className="chamado-info-item">
              <span>Usuário responsável</span>
              <strong>
                {chamado.usuario_nome ||
                  `Usuário #${chamado.usuario_id}`}
              </strong>
            </div>

            <div className="chamado-info-item">
              <span>Técnico responsável</span>
              <strong>
                {chamado.tecnico_id
                  ? chamado.tecnico_nome ||
                    `Técnico #${chamado.tecnico_id}`
                  : "Ainda não atribuído"}
              </strong>
            </div>

            <div className="chamado-info-item">
              <span>Criado em</span>
              <strong>{formatarData(chamado.criado_em)}</strong>
            </div>

            <div className="chamado-info-item">
              <span>Atualizado em</span>
              <strong>{formatarData(chamado.atualizado_em)}</strong>
            </div>
          </div>

          <div className="chamado-descricao">
            <h3>Descrição</h3>
            <p>{chamado.descricao}</p>
          </div>

          <div className="chamado-solucao">
            <h3>Solução</h3>

            <p>
              {chamado.solucao ||
                "Nenhuma solução registrada ainda."}
            </p>
          </div>

          {adminPodeTransferir && (
            <div className="chamado-acoes">
              <div className= "chamado-acoes-conteudo">
                <h3>Ações administrativas</h3>

                <p>
                  Transfira este chamado para outro técnico.
                </p>
              </div>

              <button
                type="button"
                className="chamado-acao-button"
                onClick={abrirModalTransferencia}
              >
                Transferir chamado
              </button>
            </div>
          )}

          {tecnicoPodeAssumir && (
            <div className="chamado-acoes">
              <h3>Ações do técnico</h3>

              <p>
                Este chamado ainda não possui um técnico responsável.
              </p>

              <button
                type="button"
                className="chamado-acao-button"
                onClick={assumirChamado}
                disabled={processandoAcao}
              >
                {processandoAcao
                  ? "Assumindo..."
                  : "Assumir chamado"}
              </button>
            </div>
          )}

          {tecnicoPodeResolver && (
            <div className="chamado-acoes">
              <h3>Ações do técnico</h3>

              <p>
                Este chamado está em atendimento e pode ser finalizado.
              </p>

              <button
                type="button"
                className="chamado-acao-button"
                onClick={() => {
                  setErro("");
                  setSolucao("");
                  setModalResolucaoAberto(true);
                }}
              >
                Resolver chamado
              </button>
            </div>
          )}
        </section>

        <section className="dashboard-section chamado-historico">
          <div className="chamado-historico-heading">
            <span className="section-label">Acompanhamento</span>

            <h2>Histórico do chamado</h2>

            <p>
              Registro das alterações e movimentações deste chamado.
            </p>
          </div>

          {historico.length === 0 ? (
            <div className="historico-vazio">
              <p>Nenhum evento registrado para este chamado.</p>
            </div>
          ) : (
            <div className="historico-lista">
              {historico.map((evento, index) => (
                <div
                  className="historico-item"
                  key={evento.id || index}
                >
                  <div className="historico-indicador">
                    <span></span>
                  </div>

                  <div className="historico-conteudo">
                    <div className="historico-topo">
                      <h4>{formatarAcao(evento.acao)}</h4>

                      <span className="historico-data">
                        {formatarData(evento.criado_em)}
                      </span>
                    </div>

                    <p>
                      {evento.descricao ||
                        "Nenhuma descrição registrada."}
                    </p>

                    <div className="historico-usuario">
                      <span>Realizado por:</span>

                      <strong>
                        {evento.usuario_nome ||
                          evento.usuario_username ||
                          `Usuário #${evento.usuario_id}`}
                      </strong>

                      {evento.usuario_nome &&
                        evento.usuario_username && (
                          <small>
                            ({evento.usuario_username})
                          </small>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {mostrarTransferencia && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharModalTransferencia();
            }
          }}
        >
          <div
            className="modal-resolucao"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-transferencia-titulo"
          >
            <div className="modal-resolucao-header">
              <div>
                <span className="section-label">
                  Administração
                </span>

                <h2 id="modal-transferencia-titulo">
                  Transferir chamado
                </h2>
              </div>

              <button
                type="button"
                className="modal-fechar-button"
                onClick={fecharModalTransferencia}
                disabled={transferindo}
                aria-label="Fechar janela"
              >
                ×
              </button>
            </div>

            <p className="modal-resolucao-descricao">
              Selecione o técnico que ficará responsável pelo
              atendimento deste chamado.
            </p>

            <div className="chamado-transferencia-atual">
              <span>Técnico atual</span>

              <strong>
                {chamado.tecnico_nome ||
                  `Técnico #${chamado.tecnico_id}`}
              </strong>
            </div>

            {erroTransferencia && (
              <p className="auth-error modal-erro">
                {erroTransferencia}
              </p>
            )}

            <div className="dashboard-filter-group">
              <label htmlFor="novo-tecnico">
                Novo técnico
              </label>

              <select
                id="novo-tecnico"
                value={novoTecnicoId}
                onChange={(event) =>
                  setNovoTecnicoId(event.target.value)
                }
                disabled={transferindo}
              >
                <option value="">
                  Selecione um técnico
                </option>

                {tecnicos
                  .filter(
                    (tecnico) =>
                      tecnico.id !== chamado.tecnico_id
                  )
                  .map((tecnico) => (
                    <option
                      key={tecnico.id}
                      value={tecnico.id}
                    >
                      {tecnico.nome} — {tecnico.username}
                    </option>
                  ))}
              </select>
            </div>

            <div className="dashboard-filter-group">
              <label htmlFor="motivo-transferencia">
                Motivo da transferência
              </label>

              <textarea
                id="motivo-transferencia"
                className="chamado-solucao-input"
                value={motivoTransferencia}
                onChange={(event) =>
                  setMotivoTransferencia(event.target.value)
                }
                placeholder="Ex.: Técnico atual não conseguiu solucionar o problema."
                rows={4}
                disabled={transferindo}
              />
            </div>

            <div className="modal-resolucao-acoes">
              <button
                type="button"
                className="modal-cancelar-button"
                onClick={fecharModalTransferencia}
                disabled={transferindo}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="chamado-acao-button"
                onClick={transferirChamado}
                disabled={transferindo}
              >
                {transferindo
                  ? "Transferindo..."
                  : "Confirmar transferência"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalResolucaoAberto && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharModalResolucao();
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
                  Finalizar atendimento
                </span>

                <h2 id="modal-resolucao-titulo">
                  Resolver chamado
                </h2>
              </div>

              <button
                type="button"
                className="modal-fechar-button"
                onClick={fecharModalResolucao}
                disabled={processandoAcao}
                aria-label="Fechar janela"
              >
                ×
              </button>
            </div>

            <p className="modal-resolucao-descricao">
              Descreva o procedimento realizado para solucionar este
              chamado.
            </p>

            {erro && (
              <p className="auth-error modal-erro">
                {erro}
              </p>
            )}

            <form onSubmit={resolverChamado}>
              <textarea
                className="chamado-solucao-input"
                value={solucao}
                onChange={(event) => setSolucao(event.target.value)}
                placeholder="Ex.: Foi realizada a configuração do sistema e o problema foi solucionado."
                rows={6}
                disabled={processandoAcao}
                autoFocus
              />

              <div className="modal-resolucao-acoes">
                <button
                  type="button"
                  className="modal-cancelar-button"
                  onClick={fecharModalResolucao}
                  disabled={processandoAcao}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="chamado-acao-button"
                  disabled={processandoAcao}
                >
                  {processandoAcao
                    ? "Confirmando..."
                    : "Confirmar resolução"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}