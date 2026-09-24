import bcrypt
from app.models.models_usuario import Usuario
from app.auth.security import criar_access_token

def test_login_usuario_valido(client):
    resposta = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "12345678",
        },
    )

    assert resposta.status_code == 200

    dados = resposta.json()

    assert "access_token" in dados
    assert dados["token_type"] == "bearer"



def test_login_usuario_senha_incorreta(client):
    resposta = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "senha_errada",
        },
    )

    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Usuário ou senha inválidos."


def test_usuario_me_com_token_valido(client):
    login = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "12345678"
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    resposta = client.get(
        "/usuarios/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert resposta.status_code == 200

    dados = resposta.json()

    assert dados["username"] == "adminteste"
    assert dados["nome"] == "Administrador de Teste"
    assert dados["perfil"] == "admin"

def test_usuario_me_sem_token(client):
    resposta = client.get("/usuarios/me")

    assert resposta.status_code in (401,403)

def test_usuario_me_com_token_invalido(client):
    resposta = client.get(
        "/usuarios/me",
        headers={
            "Authorization": "Bearer token_invalido",
        },
    )

    assert resposta.status_code == 401



def test_cadastrar_usuario(client):
    resposta = client.post(
        "/usuarios/",
        json={
            "username": "novousuario",
            "senha": "12345678",
            "nome": "Novo Usuário",
        },
    )

    assert resposta.status_code == 200

    dados = resposta.json()

    assert dados["username"] == "novousuario"
    assert dados["nome"] == "Novo Usuário"
    assert dados["perfil"] == "usuario"
    assert dados["ativo"] is True
    assert "id" in dados


def test_cadastrar_usuario_username_duplicado(client):
    resposta = client.post(
        "/usuarios/",
        json={
            "username": "adminteste",
            "senha": "12345678",
            "nome": "Outro Administrador",
        },
    )

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Username já está em uso."


def test_cadastrar_usuario_sem_senha(client):
    resposta = client.post(
        "/usuarios/",
        json={
            "username": "usuariosemsenha",
            "nome": "Usuário Sem Senha",
        },
    )

    assert resposta.status_code == 422


def test_cadastrar_usuario_sem_username(client):
    resposta = client.post(
        "/usuarios/",
        json={
            "senha": "12345678",
            "nome": "Usuário sem Username",
        },
    )

    assert resposta.status_code == 422


def test_cadastrar_usuario_sem_nome(client):
    resposta = client.post(
        "/usuarios/",
        json={
            "username": "usuariosemnome",
            "senha": "12345678",
        },
    )

    assert resposta.status_code == 422


def test_login_usuario_inativo(client, db):
    usuario = Usuario(
        username="usuarioinativo",
        senha_hash=bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt(),
        ).decode("utf-8"),
        nome="Usuário Inativo",
        perfil="usuario",
        ativo=False,
    )

    db.add(usuario)
    db.commit()

    resposta = client.post(
        "/usuarios/login",
        json={
            "username": "usuarioinativo",
            "senha": "12345678",
        },
    )

    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Usuário ou senha inválidos."


def test_usuario_me_com_token_de_usuario_inexistente(client):
    token = criar_access_token(
        data={"sub": "999999"}
    )

    resposta = client.get(
        "/usuarios/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Token inválido ou expirado."


def test_usuario_me_retorna_perfil_usuario(client, db):
    usuario = Usuario(
        username = "usuario comum teste",
        senha_hash= bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt(),
        ).decode("utf-8"),
        nome="Usuário Comum",
        perfil="usuario",
        ativo=True,
    )

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    login = client.post(
        "/usuarios/login",
        json={
            "username": "usuario comum teste",
            "senha": "12345678",
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    resposta = client.get(
        "/usuarios/me",
        headers={
            "Authorization" : f"Bearer {token}",
        },
    )

    assert resposta.status_code == 200

    dados = resposta.json()

    assert dados["username"] == "usuario comum teste"
    assert dados["nome"] == "Usuário Comum"
    assert dados["perfil"] == "usuario"