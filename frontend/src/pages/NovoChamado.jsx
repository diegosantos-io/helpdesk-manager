import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function NovoChamado() {
  const [formulario, setFormulario] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    prioridade: "media",
  });

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;

    setFormulario((estadoAnterior) => ({
      ...estadoAnterior,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErro("");
    setCarregando(true);

    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/chamados/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formulario),
      });

      const dados = await response.json();

      if (!response.ok) {
        throw new Error(
          dados.detail || "Não foi possível criar o chamado."
        );
      }

      navigate("/dashboard");
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card new-ticket-card">
        <Link to="/dashboard" className="auth-back-link">
          ← Voltar para o dashboard
        </Link>

        <div className="auth-heading">
          <span className="section-label">Atendimento</span>

          <h1>Novo chamado</h1>

          <p>
            Descreva o problema para que a equipe possa realizar o atendimento.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="titulo">Título</label>

            <input
              id="titulo"
              name="titulo"
              type="text"
              placeholder="Ex.: Computador não liga"
              value={formulario.titulo}
              onChange={handleChange}
              minLength={3}
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="descricao">Descrição</label>

            <textarea
              id="descricao"
              name="descricao"
              placeholder="Descreva o problema com o máximo de detalhes..."
              value={formulario.descricao}
              onChange={handleChange}
              minLength={5}
              rows={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoria</label>

            <select
              id="categoria"
              name="categoria"
              value={formulario.categoria}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Rede">Rede</option>
              <option value="Periféricos">Periféricos</option>
              <option value="Acesso">Acesso</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="prioridade">Prioridade</label>

            <select
              id="prioridade"
              name="prioridade"
              value={formulario.prioridade}
              onChange={handleChange}
              required
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          {erro && <div className="auth-error">{erro}</div>}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={carregando}
          >
            {carregando ? "Enviando..." : "Abrir chamado"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NovoChamado;