import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();

    setErro("");
    setCarregando(true);

    try {
      const response = await fetch("http://localhost:8000/usuarios/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          senha,
        }),
      });

      const dados = await response.json();

      if (!response.ok) {
        throw new Error(dados.detail || "Usuário ou senha inválidos.");
      }

      localStorage.setItem("access_token", dados.access_token);

      navigate("/dashboard");
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
          <h1>Bem-vindo de volta</h1>
          <p>Entre na sua conta para acessar o sistema.</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Usuário</label>

            <input
              id="username"
              type="text"
              placeholder="Digite seu usuário"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>

            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
          </div>

          {erro && <div className="auth-error">{erro}</div>}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={carregando}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="auth-footer">
          Ainda não possui uma conta?{" "}
          <Link to="/cadastro">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;