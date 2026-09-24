import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Cadastro() {
  const [formulario, setFormulario] = useState({
    username: "",
    nome: "",
    senha: "",
  });

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;

    setFormulario((estadoAnterior) => ({
      ...estadoAnterior,
      [name]: value,
    }));
  }

  async function handleCadastro(event) {
    event.preventDefault();

    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      const response = await fetch("http://localhost:8000/usuarios/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formulario),
      });

      const dados = await response.json();

      if (!response.ok) {
        throw new Error(dados.detail || "Não foi possível criar a conta.");
      }

      setSucesso("Conta criada com sucesso! Redirecionando para o login...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          Help<span>Desk</span>
        </Link>

        <div className="auth-heading">
          <h1>Criar sua conta</h1>
          <p>Preencha os dados para começar a utilizar o sistema.</p>
        </div>

        <form onSubmit={handleCadastro} className="auth-form">
          <div className="form-group">
            <label htmlFor="nome">Nome</label>

            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Digite seu nome"
              value={formulario.nome}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Usuário</label>

            <input
              id="username"
              name="username"
              type="text"
              placeholder="Escolha um usuário"
              value={formulario.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>

            <input
              id="senha"
              name="senha"
              type="password"
              placeholder="Crie uma senha"
              value={formulario.senha}
              onChange={handleChange}
              required
            />
          </div>

          {erro && <div className="auth-error">{erro}</div>}

          {sucesso && <div className="auth-success">{sucesso}</div>}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={carregando}
          >
            {carregando ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="auth-footer">
          Já possui uma conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

export default Cadastro;