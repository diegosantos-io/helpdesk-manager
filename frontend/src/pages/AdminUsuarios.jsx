import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:8000";

function AdminUsuarios() {
  const navigate = useNavigate();

  const [token] = useState(() =>
    localStorage.getItem("access_token")
  );

  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [usuarios, setUsuarios] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [modoFormulario, setModoFormulario] = useState(null);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
  const [usuarioParaAlterarStatus, setUsuarioParaAlterarStatus] =
    useState(null);

  const [mostrarBusca, setMostrarBusca] = useState(false);

  const [formulario, setFormulario] = useState({
    username: "",
    nome: "",
    senha: "",
    perfil: "usuario",
    ativo: true,
  });

  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const obterHeaders = useCallback(
    (incluirContentType = false) => {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      if (incluirContentType) {
        headers["Content-Type"] = "application/json";
      }

      return headers;
    },
    [token]
  );

  const carregarUsuarioAtual = useCallback(async () => {
    try {
      const resposta = await fetch(`${API_URL}/usuarios/me`, {
        headers: obterHeaders(),
      });

      if (!resposta.ok) {
        throw new Error(
          "Não foi possível carregar o usuário atual."
        );
      }

      const dados = await resposta.json();

      setUsuarioAtual(dados);

      if (dados.perfil !== "admin") {
        setErro(
          "Você não tem permissão para acessar esta página."
        );
      }
    } catch (error) {
      setErro(error.message);
    }
  }, [obterHeaders]);

  const carregarUsuarios = useCallback(async () => {
    try {
      setCarregando(true);

      const resposta = await fetch(`${API_URL}/usuarios/`, {
        headers: obterHeaders(),
      });

      if (!resposta.ok) {
        throw new Error(
          "Não foi possível carregar os usuários."
        );
      }

      const dados = await resposta.json();

      setUsuarios(dados);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }, [obterHeaders]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const timer = window.setTimeout(() => {
      carregarUsuarioAtual();
      carregarUsuarios();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    token,
    navigate,
    carregarUsuarioAtual,
    carregarUsuarios,
  ]);

  const limparFormulario = () => {
    setFormulario({
      username: "",
      nome: "",
      senha: "",
      perfil: "usuario",
      ativo: true,
    });

    setUsuarioEditando(null);
    setModoFormulario(null);
  };

  const abrirFormularioNovo = () => {
    setFormulario({
      username: "",
      nome: "",
      senha: "",
      perfil: "usuario",
      ativo: true,
    });

    setUsuarioEditando(null);
    setModoFormulario("novo");

    setErro("");
    setMensagem("");
  };

  const abrirFormularioEdicao = (usuario) => {
    setModoFormulario("editar");
    setUsuarioEditando(usuario);

    setFormulario({
      username: usuario.username || "",
      nome: usuario.nome || "",
      senha: "",
      perfil: usuario.perfil || "usuario",
      ativo: usuario.ativo ?? true,
    });

    setErro("");
    setMensagem("");
  };

  const atualizarCampo = (evento) => {
    const { name, value, type, checked } = evento.target;

    setFormulario((estadoAnterior) => ({
      ...estadoAnterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const salvarUsuario = async (evento) => {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    try {
      let resposta;

      if (modoFormulario === "novo") {
        resposta = await fetch(`${API_URL}/usuarios/admin`, {
          method: "POST",
          headers: obterHeaders(true),
          body: JSON.stringify({
            username: formulario.username,
            nome: formulario.nome,
            senha: formulario.senha,
            perfil: formulario.perfil,
            ativo: formulario.ativo,
          }),
        });
      } else {
        const dadosAtualizacao = {
          username: formulario.username,
          nome: formulario.nome,
          perfil: formulario.perfil,
          ativo: formulario.ativo,
        };

        if (formulario.senha.trim() !== "") {
          dadosAtualizacao.senha = formulario.senha;
        }

        resposta = await fetch(
          `${API_URL}/usuarios/${usuarioEditando.id}`,
          {
            method: "PUT",
            headers: obterHeaders(true),
            body: JSON.stringify(dadosAtualizacao),
          }
        );
      }

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.detail || "Não foi possível salvar o usuário."
        );
      }

      setMensagem(
        modoFormulario === "novo"
          ? "Usuário criado com sucesso!"
          : "Usuário atualizado com sucesso!"
      );

      limparFormulario();

      await carregarUsuarios();
    } catch (error) {
      setErro(error.message);
    }
  };

  const alternarStatusUsuario = (usuario) => {
    setUsuarioParaAlterarStatus(usuario);
    setErro("");
    setMensagem("");
  };

  const cancelarAlteracaoStatus = () => {
    setUsuarioParaAlterarStatus(null);
  };

  const confirmarAlteracaoStatus = async () => {
    if (!usuarioParaAlterarStatus) {
      return;
    }

    const usuario = usuarioParaAlterarStatus;

    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch(
        `${API_URL}/usuarios/${usuario.id}`,
        {
          method: "PUT",
          headers: obterHeaders(true),
          body: JSON.stringify({
            ativo: !usuario.ativo,
          }),
        }
      );

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.detail ||
            "Não foi possível alterar o status do usuário."
        );
      }

      setMensagem(
        usuario.ativo
          ? "Usuário desativado com sucesso!"
          : "Usuário ativado com sucesso!"
      );

      setUsuarioParaAlterarStatus(null);

      await carregarUsuarios();
    } catch (error) {
      setErro(error.message);
    }
  };

  const excluirUsuario = (usuario) => {
    setUsuarioParaExcluir(usuario);
    setErro("");
    setMensagem("");
  };

  const cancelarExclusaoUsuario = () => {
    setUsuarioParaExcluir(null);
  };

  const confirmarExclusaoUsuario = async () => {
    if (!usuarioParaExcluir) {
      return;
    }

    const usuario = usuarioParaExcluir;

    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch(
        `${API_URL}/usuarios/${usuario.id}`,
        {
          method: "DELETE",
          headers: obterHeaders(),
        }
      );

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          dados?.detail || "Não foi possível excluir o usuário."
        );
      }

      setMensagem("Usuário excluído com sucesso!");
      setUsuarioParaExcluir(null);

      if (usuarioEditando?.id === usuario.id) {
        limparFormulario();
      }

      await carregarUsuarios();
    } catch (error) {
      setErro(error.message);
    }
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroPerfil("");
    setFiltroStatus("");
  };

  const usuariosFiltrados = useMemo(() => {
    const termoBusca = busca.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const correspondeBusca =
        termoBusca === "" ||
        usuario.nome?.toLowerCase().includes(termoBusca) ||
        usuario.username?.toLowerCase().includes(termoBusca);

      const correspondePerfil =
        filtroPerfil === "" || usuario.perfil === filtroPerfil;

      const correspondeStatus =
        filtroStatus === "" ||
        (filtroStatus === "ativo" && usuario.ativo) ||
        (filtroStatus === "inativo" && !usuario.ativo);

      return (
        correspondeBusca &&
        correspondePerfil &&
        correspondeStatus
      );
    });
  }, [usuarios, busca, filtroPerfil, filtroStatus]);

  const formatarPerfil = (perfil) => {
    const perfis = {
      usuario: "Usuário",
      tecnico: "Técnico",
      admin: "Administrador",
    };

    return perfis[perfil] || perfil;
  };

  if (!token) {
    return null;
  }

  if (!usuarioAtual || usuarioAtual.perfil !== "admin") {
    return (
      <div className="dashboard-page">
        <div className="dashboard-content">
          <div className="dashboard-section">
            <h2>Acesso restrito</h2>

            <p>
              {erro ||
                "Você não tem permissão para acessar esta página."}
            </p>

            <button
              className="btn btn-primary"
              onClick={() => navigate("/dashboard")}
            >
              Voltar ao dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {usuarioParaExcluir && (
        <div className="delete-modal-overlay">
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="delete-modal-icon">!</div>

            <h3 id="delete-modal-title">
              Excluir usuário?
            </h3>

            <p>
              Você está prestes a excluir o usuário{" "}
              <strong>{usuarioParaExcluir.username}</strong>.
            </p>

            <p>
              Perfil:{" "}
              <strong>
                {formatarPerfil(usuarioParaExcluir.perfil)}
              </strong>
            </p>

            <p className="delete-modal-warning">
              Essa ação não poderá ser desfeita.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                onClick={cancelarExclusaoUsuario}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="delete-modal-confirm"
                onClick={confirmarExclusaoUsuario}
              >
                Excluir usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {usuarioParaAlterarStatus && (
        <div className="status-modal-overlay">
          <div
            className="status-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
          >
            <div
              className={
                usuarioParaAlterarStatus.ativo
                  ? "status-modal-icon status-modal-icon-warning"
                  : "status-modal-icon status-modal-icon-success"
              }
            >
              {usuarioParaAlterarStatus.ativo ? "!" : "✓"}
            </div>

            <h3 id="status-modal-title">
              {usuarioParaAlterarStatus.ativo
                ? "Desativar usuário?"
                : "Ativar usuário?"}
            </h3>

            <p>
              Você está prestes a{" "}
              {usuarioParaAlterarStatus.ativo
                ? "desativar"
                : "ativar"}{" "}
              o usuário{" "}
              <strong>
                {usuarioParaAlterarStatus.username}
              </strong>
              .
            </p>

            <p>
              Perfil:{" "}
              <strong>
                {formatarPerfil(usuarioParaAlterarStatus.perfil)}
              </strong>
            </p>

            <p className="status-modal-description">
              {usuarioParaAlterarStatus.ativo
                ? "O usuário não poderá acessar o sistema enquanto estiver inativo."
                : "O acesso do usuário ao sistema será reativado."}
            </p>

            <div className="status-modal-actions">
              <button
                type="button"
                className="status-modal-cancel"
                onClick={cancelarAlteracaoStatus}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={
                  usuarioParaAlterarStatus.ativo
                    ? "status-modal-confirm status-modal-confirm-warning"
                    : "status-modal-confirm status-modal-confirm-success"
                }
                onClick={confirmarAlteracaoStatus}
              >
                {usuarioParaAlterarStatus.ativo
                  ? "Desativar usuário"
                  : "Ativar usuário"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Gerenciamento de usuários</h1>

            <p>
              Administre os usuários e suas permissões no sistema.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/dashboard")}
            >
              Voltar
            </button>

            <button
              className="btn btn-primary"
              onClick={abrirFormularioNovo}
            >
              + Novo usuário
            </button>
          </div>
        </div>

        {erro && <div className="auth-error">{erro}</div>}

        {mensagem && (
          <div className="auth-success">{mensagem}</div>
        )}

        <div className="dashboard-section">
          <div className="admin-section-header">
            <div className="admin-section-heading">
              <h2>Usuários cadastrados</h2>

              <p>
                Visualize, edite e gerencie os usuários do sistema.
              </p>
            </div>

            <button
              type="button"
              className="admin-search-toggle"
              onClick={() =>
                setMostrarBusca((estadoAnterior) => !estadoAnterior)
              }
            >
              {mostrarBusca ? "Fechar busca" : "Buscar usuários"}
            </button>
          </div>

          {mostrarBusca && (
            <>
              <div className="admin-filters">
                <div className="admin-filter-field admin-filter-search">
                  <label htmlFor="buscar-usuario">
                    Buscar usuário
                  </label>

                  <input
                    id="buscar-usuario"
                    type="text"
                    placeholder="Nome ou nome de usuário..."
                    value={busca}
                    autoComplete="off"
                    onChange={(evento) =>
                      setBusca(evento.target.value)
                    }
                  />
                </div>

                <div className="admin-filter-field">
                  <label htmlFor="filtro-perfil">
                    Perfil
                  </label>

                  <select
                    id="filtro-perfil"
                    value={filtroPerfil}
                    onChange={(evento) =>
                      setFiltroPerfil(evento.target.value)
                    }
                  >
                    <option value="">Todos os perfis</option>
                    <option value="usuario">Usuário</option>
                    <option value="tecnico">Técnico</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="admin-filter-field">
                  <label htmlFor="filtro-status">
                    Status
                  </label>

                  <select
                    id="filtro-status"
                    value={filtroStatus}
                    onChange={(evento) =>
                      setFiltroStatus(evento.target.value)
                    }
                  >
                    <option value="">Todos os status</option>
                    <option value="ativo">Ativos</option>
                    <option value="inativo">Inativos</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="admin-clear-filters"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </button>
              </div>

              <p className="admin-results-count">
                Exibindo {usuariosFiltrados.length} de{" "}
                {usuarios.length} usuários
              </p>
            </>
          )}

          {modoFormulario === "novo" && (
            <div className="admin-user-form">
              <div className="admin-form-header">
                <div>
                  <h3>Novo usuário</h3>

                  <p>
                    Cadastre um novo usuário e defina suas permissões.
                  </p>
                </div>

                <button
                  type="button"
                  className="form-close-button"
                  onClick={limparFormulario}
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={salvarUsuario}>
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label htmlFor="username">
                      Nome de usuário
                    </label>

                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={formulario.username}
                      onChange={atualizarCampo}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="nome">
                      Nome completo
                    </label>

                    <input
                      id="nome"
                      name="nome"
                      type="text"
                      value={formulario.nome}
                      onChange={atualizarCampo}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="senha">
                      Senha
                    </label>

                    <input
                      id="senha"
                      name="senha"
                      type="password"
                      value={formulario.senha}
                      onChange={atualizarCampo}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="perfil">
                      Perfil
                    </label>

                    <select
                      id="perfil"
                      name="perfil"
                      value={formulario.perfil}
                      onChange={atualizarCampo}
                    >
                      <option value="usuario">Usuário</option>
                      <option value="tecnico">Técnico</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    name="ativo"
                    checked={formulario.ativo}
                    onChange={atualizarCampo}
                  />

                  Usuário ativo
                </label>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Criar usuário
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={limparFormulario}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {modoFormulario === "editar" && usuarioEditando && (
            <div className="admin-user-form">
              <div className="admin-form-header">
                <div>
                  <h3>
                    Editar usuário: {usuarioEditando.username}
                  </h3>

                  <p>
                    Atualize os dados e as permissões deste usuário.
                  </p>
                </div>

                <button
                  type="button"
                  className="form-close-button"
                  onClick={limparFormulario}
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={salvarUsuario}>
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label htmlFor="username">
                      Nome de usuário
                    </label>

                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={formulario.username}
                      onChange={atualizarCampo}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="nome">
                      Nome completo
                    </label>

                    <input
                      id="nome"
                      name="nome"
                      type="text"
                      value={formulario.nome}
                      onChange={atualizarCampo}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="senha">
                      Nova senha
                    </label>

                    <input
                      id="senha"
                      name="senha"
                      type="password"
                      placeholder="Deixe vazio para manter"
                      value={formulario.senha}
                      onChange={atualizarCampo}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="perfil">
                      Perfil
                    </label>

                    <select
                      id="perfil"
                      name="perfil"
                      value={formulario.perfil}
                      onChange={atualizarCampo}
                    >
                      <option value="usuario">Usuário</option>
                      <option value="tecnico">Técnico</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    name="ativo"
                    checked={formulario.ativo}
                    onChange={atualizarCampo}
                  />

                  Usuário ativo
                </label>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Salvar alterações
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={limparFormulario}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {carregando ? (
            <p>Carregando usuários...</p>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="empty-state">
              <h3>Nenhum usuário encontrado</h3>

              <p>
                Tente ajustar os filtros para encontrar outros
                usuários.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuário</th>
                    <th>Nome</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.id}</td>

                      <td>
                        <div className="admin-user-identity">
                          <span>{usuario.username}</span>

                          {usuarioAtual?.id === usuario.id && (
                            <span className="current-user-badge">
                              Você
                            </span>
                          )}
                        </div>
                      </td>

                      <td>{usuario.nome}</td>

                      <td>
                        <span className="user-profile-badge">
                          {formatarPerfil(usuario.perfil)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            usuario.ativo
                              ? "status-badge status-active"
                              : "status-badge status-inactive"
                          }
                        >
                          {usuario.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="table-action-button"
                            onClick={() =>
                              abrirFormularioEdicao(usuario)
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="table-action-button"
                            onClick={() =>
                              alternarStatusUsuario(usuario)
                            }
                          >
                            {usuario.ativo
                              ? "Desativar"
                              : "Ativar"}
                          </button>

                          <button
                            type="button"
                            className="table-action-button table-action-danger"
                            onClick={() =>
                              excluirUsuario(usuario)
                            }
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUsuarios;