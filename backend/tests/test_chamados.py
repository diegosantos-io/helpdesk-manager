from app.models.models_usuario import Usuario

def test_criar_chamado_autenticado(client):
    login = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "12345678",
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    resposta = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "titulo": "Computador não liga",
            "descricao": "O computador não apresenta nenhum sinal de energia.",
            "categoria": "Hardware",
            "prioridade": "alta",
        },
    )

    assert resposta.status_code == 200

    dados = resposta.json()

    assert "id" in dados
    assert dados["titulo"] == "Computador não liga"
    assert dados["descricao"] == "O computador não apresenta nenhum sinal de energia."
    assert dados["categoria"] == "Hardware"
    assert dados["prioridade"] == "alta"
    assert dados["status"] == "aberto"
    assert dados["usuario_id"] > 0
    assert dados["tecnico_id"] is None
    assert dados["solucao"] is None


def test_criar_chamado_sem_autenticacao(client):
    resposta = client.post(
        "/chamados/",
        json={
            "titulo": "Tentativa sem login",
            "descricao": "Este chamado não deveria ser criado sem autenticação.",
            "categoria": "Hardware",
            "prioridade": "media",
        },
    )

    assert resposta.status_code == 401


def test_listar_chamados_admin(client):
    login = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "12345678",
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    resposta = client.get(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert resposta.status_code == 200

    dados = resposta.json()

    assert isinstance(dados, list)
    assert len(dados) >= 1

    chamado = dados[0]

    assert "id" in chamado
    assert "titulo" in chamado
    assert "status" in chamado


def test_usuario_lista_apenas_seus_chamados(client, db):
    usuario = db.query(Usuario).filter(
        Usuario.username == "usuariotestechamado"
    ).first()

    if not usuario:
        import bcrypt

        senha_hash = bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt(),
        ).decode("utf-8")

        usuario = Usuario(
            username="usuariotestechamado",
            senha_hash=senha_hash,
            nome="Usuário de Teste de Chamados",
            perfil="usuario",
            ativo=True,
        )

        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    login = client.post(
        "/usuarios/login",
        json={
            "username": "usuariotestechamado",
            "senha": "12345678",
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    criar = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "titulo": "Chamado do usuário comum",
            "descricao": "Chamado criado pelo usuário comum para teste.",
            "categoria": "Software",
            "prioridade": "media",
        },
    )

    assert criar.status_code == 200

    resposta = client.get(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert resposta.status_code == 200

    chamados = resposta.json()

    assert isinstance(chamados, list)
    assert len(chamados) >= 1

    for chamado in chamados:
        assert chamado["usuario_id"] == usuario.id


def test_tecnico_lista_chamados(client, db):
    usuario = db.query(Usuario).filter(
        Usuario.username == "tecnicotestechamado"
    ).first()

    if not usuario:
        import bcrypt

        senha_hash = bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt(),
        ).decode("utf-8")

        usuario = Usuario(
            username="tecnicotestechamado",
            senha_hash=senha_hash,
            nome="Técnico de Teste",
            perfil="tecnico",
            ativo=True,
        )

        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    login = client.post(
        "/usuarios/login",
        json={
            "username": "tecnicotestechamado",
            "senha": "12345678",
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    resposta = client.get(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert resposta.status_code == 200

    chamados = resposta.json()

    assert isinstance(chamados, list)


def test_usuario_comum_nao_acessa_lista_de_tecnico(client):
    login = client.post(
        "/usuarios/login",
        json={
            "username": "usuariotestechamado",
            "senha": "12345678",
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    resposta = client.get(
        "/chamados/tecnico",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert resposta.status_code == 403


def test_tecnico_assume_chamado(client):
    # Login como administrador para criar o chamado
    login_admin = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "12345678",
        },
    )

    assert login_admin.status_code == 200

    token_admin = login_admin.json()["access_token"]

    criar = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token_admin}",
        },
        json={
            "titulo": "Chamado para assumir",
            "descricao": "Chamado criado para testar a atribuição ao técnico.",
            "categoria": "Hardware",
            "prioridade": "alta",
        },
    )

    assert criar.status_code == 200

    chamado = criar.json()
    chamado_id = chamado["id"]

    assert chamado["status"] == "aberto"
    assert chamado["tecnico_id"] is None

    # Login como técnico
    login_tecnico = client.post(
        "/usuarios/login",
        json={
            "username": "tecnicotestechamado",
            "senha": "12345678",
        },
    )

    assert login_tecnico.status_code == 200

    token_tecnico = login_tecnico.json()["access_token"]

    assumir = client.post(
        f"/chamados/{chamado_id}/assumir",
        headers={
            "Authorization": f"Bearer {token_tecnico}",
        },
    )

    assert assumir.status_code == 200

    dados = assumir.json()

    assert dados["id"] == chamado_id
    assert dados["tecnico_id"] > 0
    assert dados["status"] == "em_atendimento"

def test_usuario_comum_nao_pode_assumir_chamado(client):
    # Login como administrador para criar o chamado
    login_admin = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "12345678",
        },
    )

    assert login_admin.status_code == 200

    token_admin = login_admin.json()["access_token"]

    criar = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token_admin}",
        },
        json={
            "titulo": "Chamado protegido",
            "descricao": "Chamado usado para testar as permissões de acesso.",
            "categoria": "Software",
            "prioridade": "media",
        },
    )

    assert criar.status_code == 200

    chamado_id = criar.json()["id"]

    # Login como usuário comum
    login_usuario = client.post(
        "/usuarios/login",
        json={
            "username": "usuariotestechamado",
            "senha": "12345678",
        },
    )

    assert login_usuario.status_code == 200

    token_usuario = login_usuario.json()["access_token"]

    assumir = client.post(
        f"/chamados/{chamado_id}/assumir",
        headers={
            "Authorization": f"Bearer {token_usuario}",
        },
    )

    assert assumir.status_code == 403


def test_tecnico_resolve_chamado(client):
    # Login como administrador para criar o chamado
    login_admin = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "12345678",
        },
    )

    assert login_admin.status_code == 200

    token_admin = login_admin.json()["access_token"]

    criar = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token_admin}",
        },
        json={
            "titulo": "Chamado para resolver",
            "descricao": "Chamado criado para testar a resolução.",
            "categoria": "Software",
            "prioridade": "alta",
        },
    )

    assert criar.status_code == 200

    chamado_id = criar.json()["id"]

    # Login como técnico
    login_tecnico = client.post(
        "/usuarios/login",
        json={
            "username": "tecnicotestechamado",
            "senha": "12345678",
        },
    )

    assert login_tecnico.status_code == 200

    token_tecnico = login_tecnico.json()["access_token"]

    # Técnico assume o chamado
    assumir = client.post(
        f"/chamados/{chamado_id}/assumir",
        headers={
            "Authorization": f"Bearer {token_tecnico}",
        },
    )

    assert assumir.status_code == 200
    assert assumir.json()["status"] == "em_atendimento"

    # Técnico resolve o chamado
    resolver = client.post(
        f"/chamados/{chamado_id}/resolver",
        headers={
            "Authorization": f"Bearer {token_tecnico}",
        },
        json={
            "solucao": "O problema foi identificado e corrigido com sucesso.",
        },
    )

    assert resolver.status_code == 200

    dados = resolver.json()

    assert dados["id"] == chamado_id
    assert dados["status"] == "resolvido"
    assert dados["solucao"] == "O problema foi identificado e corrigido com sucesso."
    assert dados["tecnico_id"] is not None

def test_listar_historico_chamado(client):
    # Login como administrador
    login_admin = client.post(
        "/usuarios/login",
        json={
            "username": "adminteste",
            "senha": "12345678",
        },
    )

    assert login_admin.status_code == 200

    token_admin = login_admin.json()["access_token"]

    # Criar chamado
    criar = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token_admin}",
        },
        json={
            "titulo": "Chamado com histórico",
            "descricao": "Chamado criado para testar o histórico.",
            "categoria": "Software",
            "prioridade": "media",
        },
    )

    assert criar.status_code == 200

    chamado_id = criar.json()["id"]

    # Consultar histórico como administrador
    resposta = client.get(
        f"/chamados/{chamado_id}/historico",
        headers={
            "Authorization": f"Bearer {token_admin}",
        },
    )

    assert resposta.status_code == 200

    historico = resposta.json()

    assert isinstance(historico, list)
    assert len(historico) >= 1

    registro = historico[0]

    assert "id" in registro
    assert registro["chamado_id"] == chamado_id
    assert "usuario_id" in registro
    assert "acao" in registro
    assert "criado_em" in registro

def test_usuario_acessa_historico_do_proprio_chamado(client):
    login = client.post(
        "/usuarios/login",
        json={
            "username": "usuariotestechamado",
            "senha": "12345678",
        },
    )

    assert login.status_code == 200

    token = login.json()["access_token"]

    criar = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "titulo": "Meu chamado para histórico",
            "descricao": "Chamado criado para testar acesso ao próprio histórico.",
            "categoria": "Software",
            "prioridade": "media",
        },
    )

    assert criar.status_code == 200

    chamado_id = criar.json()["id"]

    resposta = client.get(
        f"/chamados/{chamado_id}/historico",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert resposta.status_code == 200

    historico = resposta.json()

    assert isinstance(historico, list)
    assert len(historico) >= 1

    for registro in historico:
        assert registro["chamado_id"] == chamado_id

def test_usuario_nao_acessa_historico_de_outro_usuario(client, db):
    import bcrypt

    usuario2 = db.query(Usuario).filter(
        Usuario.username == "outro usuarioteste"
    ).first()

    if not usuario2:
        senha_hash = bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt(),
        ).decode("utf-8")

        usuario2 = Usuario(
            username="outro_usuario_historico",
            senha_hash=senha_hash,
            nome="Outro Usuário",
            perfil="usuario",
            ativo=True,
        )

        db.add(usuario2)
        db.commit()
        db.refresh(usuario2)

    # Login do primeiro usuário
    login_usuario1 = client.post(
        "/usuarios/login",
        json={
            "username": "usuariotestechamado",
            "senha": "12345678",
        },
    )

    assert login_usuario1.status_code == 200

    token_usuario1 = login_usuario1.json()["access_token"]

    # Primeiro usuário cria o chamado
    criar = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token_usuario1}",
        },
        json={
            "titulo": "Chamado privado",
            "descricao": "Chamado para testar acesso indevido ao histórico.",
            "categoria": "Software",
            "prioridade": "media",
        },
    )

    assert criar.status_code == 200

    chamado_id = criar.json()["id"]

    # Login do segundo usuário comum
    login_usuario2 = client.post(
        "/usuarios/login",
        json={
            "username": "outro_usuario_historico",
            "senha": "12345678",
        },
    )

    assert login_usuario2.status_code == 200

    token_usuario2 = login_usuario2.json()["access_token"]

    # Segundo usuário tenta acessar o histórico do primeiro
    resposta = client.get(
        f"/chamados/{chamado_id}/historico",
        headers={
            "Authorization": f"Bearer {token_usuario2}",
        },
    )

    assert resposta.status_code == 403

def test_tecnico_nao_resolve_chamado_de_outro_tecnico(client, db):
    import bcrypt
    from app.models.models_usuario import Usuario

    def criar_usuario_se_nao_existir(
        username,
        nome,
        perfil,
        senha="12345678",
    ):
        usuario = db.query(Usuario).filter(
            Usuario.username == username
        ).first()

        if not usuario:
            senha_hash = bcrypt.hashpw(
                senha.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            usuario = Usuario(
                username=username,
                senha_hash=senha_hash,
                nome=nome,
                perfil=perfil,
                ativo=True,
            )

            db.add(usuario)
            db.commit()
            db.refresh(usuario)

        return usuario

    # Criar o primeiro técnico
    criar_usuario_se_nao_existir(
        username="diegoteste1",
        nome="Diego Técnico",
        perfil="tecnico",
    )

    # Criar o segundo técnico
    criar_usuario_se_nao_existir(
        username="tecnico_historico_teste",
        nome="Técnico Dois",
        perfil="tecnico",
    )

    # Criar o usuário comum
    criar_usuario_se_nao_existir(
        username="usuariotestechamado",
        nome="Usuário de Teste",
        perfil="usuario",
    )

    # Login do usuário comum
    login_usuario = client.post(
        "/usuarios/login",
        json={
            "username": "usuariotestechamado",
            "senha": "12345678",
        },
    )

    assert login_usuario.status_code == 200
    token_usuario = login_usuario.json()["access_token"]

    # Usuário cria um chamado
    resposta_criacao = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token_usuario}",
        },
        json={
            "titulo": "Chamado de teste entre técnicos",
            "descricao": "Chamado usado para validar a permissão de resolução.",
            "categoria": "Software",
            "prioridade": "media",
        },
    )

    assert resposta_criacao.status_code == 200
    chamado_id = resposta_criacao.json()["id"]

    # Login do primeiro técnico
    login_tecnico1 = client.post(
        "/usuarios/login",
        json={
            "username": "diegoteste1",
            "senha": "12345678",
        },
    )

    assert login_tecnico1.status_code == 200
    token_tecnico1 = login_tecnico1.json()["access_token"]

    # Primeiro técnico assume o chamado
    assumir = client.post(
        f"/chamados/{chamado_id}/assumir",
        headers={
            "Authorization": f"Bearer {token_tecnico1}",
        },
    )

    assert assumir.status_code == 200

    # Login do segundo técnico
    login_tecnico2 = client.post(
        "/usuarios/login",
        json={
            "username": "tecnico_historico_teste",
            "senha": "12345678",
        },
    )

    assert login_tecnico2.status_code == 200
    token_tecnico2 = login_tecnico2.json()["access_token"]

    # Segundo técnico tenta resolver o chamado do primeiro técnico
    resposta = client.post(
        f"/chamados/{chamado_id}/resolver",
        headers={
            "Authorization": f"Bearer {token_tecnico2}",
        },
        json={
            "solucao": "Tentativa de resolver chamado de outro técnico.",
        },
    )

    # O sistema deve impedir a resolução
    assert resposta.status_code == 404

def test_tecnico_nao_assume_chamado_ja_assumido(client, db):
    import bcrypt
    from app.models.models_usuario import Usuario

    def criar_usuario_se_nao_existir(
        username,
        nome,
        perfil,
        senha="12345678",
    ):
        usuario = db.query(Usuario).filter(
            Usuario.username == username
        ).first()

        if not usuario:
            senha_hash = bcrypt.hashpw(
                senha.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            usuario = Usuario(
                username=username,
                senha_hash=senha_hash,
                nome=nome,
                perfil=perfil,
                ativo=True,
            )

            db.add(usuario)
            db.commit()
            db.refresh(usuario)

        return usuario

    # Criar os técnicos necessários
    criar_usuario_se_nao_existir(
        username="diegoteste1",
        nome="Diego Técnico",
        perfil="tecnico",
    )

    criar_usuario_se_nao_existir(
        username="tecnico_historico_teste",
        nome="Técnico Dois",
        perfil="tecnico",
    )

    # Criar o usuário comum
    criar_usuario_se_nao_existir(
        username="usuario_assumir_teste",
        nome="Usuário Criador",
        perfil="usuario",
    )

    # Login do usuário comum
    login_usuario = client.post(
        "/usuarios/login",
        json={
            "username": "usuario_assumir_teste",
            "senha": "12345678",
        },
    )

    assert login_usuario.status_code == 200
    token_usuario = login_usuario.json()["access_token"]

    # Usuário cria um chamado
    resposta_criacao = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token_usuario}",
        },
        json={
            "titulo": "Chamado já assumido",
            "descricao": "Chamado usado para testar dupla atribuição.",
            "categoria": "Software",
            "prioridade": "media",
        },
    )

    assert resposta_criacao.status_code == 200
    chamado_id = resposta_criacao.json()["id"]

    # Login do primeiro técnico
    login_tecnico1 = client.post(
        "/usuarios/login",
        json={
            "username": "diegoteste1",
            "senha": "12345678",
        },
    )

    assert login_tecnico1.status_code == 200
    token_tecnico1 = login_tecnico1.json()["access_token"]

    # Primeiro técnico assume o chamado
    primeira_tentativa = client.post(
        f"/chamados/{chamado_id}/assumir",
        headers={
            "Authorization": f"Bearer {token_tecnico1}",
        },
    )

    assert primeira_tentativa.status_code == 200

    # Login do segundo técnico
    login_tecnico2 = client.post(
        "/usuarios/login",
        json={
            "username": "tecnico_historico_teste",
            "senha": "12345678",
        },
    )

    assert login_tecnico2.status_code == 200
    token_tecnico2 = login_tecnico2.json()["access_token"]

    # Segundo técnico tenta assumir o mesmo chamado
    segunda_tentativa = client.post(
        f"/chamados/{chamado_id}/assumir",
        headers={
            "Authorization": f"Bearer {token_tecnico2}",
        },
    )

    # A API deve impedir a segunda atribuição
    assert segunda_tentativa.status_code == 404

def test_historico_de_chamado_inexistente(client, db):
    import bcrypt
    from app.models.models_usuario import Usuario

    # Criar usuário caso ainda não exista
    usuario = db.query(Usuario).filter(
        Usuario.username == "usuario_historico_inexistente"
    ).first()

    if not usuario:
        senha_hash = bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt(),
        ).decode("utf-8")

        usuario = Usuario(
            username="usuario_historico_inexistente",
            senha_hash=senha_hash,
            nome="Usuário Histórico",
            perfil="usuario",
            ativo=True,
        )

        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    # Login do usuário
    login = client.post(
        "/usuarios/login",
        json={
            "username": "usuario_historico_inexistente",
            "senha": "12345678",
        },
    )

    assert login.status_code == 200
    token = login.json()["access_token"]

    # Tentar acessar o histórico de um chamado inexistente
    resposta = client.get(
        "/chamados/999999/historico",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert resposta.status_code == 404

def test_admin_acessa_historico_de_qualquer_chamado(client, db):
    import bcrypt
    from app.models.models_usuario import Usuario

    def criar_usuario_se_nao_existir(
        username,
        nome,
        perfil,
        senha="12345678",
    ):
        usuario = db.query(Usuario).filter(
            Usuario.username == username
        ).first()

        if not usuario:
            senha_hash = bcrypt.hashpw(
                senha.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            usuario = Usuario(
                username=username,
                senha_hash=senha_hash,
                nome=nome,
                perfil=perfil,
                ativo=True,
            )

            db.add(usuario)
            db.commit()
            db.refresh(usuario)

        return usuario

    # Criar um usuário comum
    criar_usuario_se_nao_existir(
        username="usuario_admin_historico",
        nome="Usuário do Chamado",
        perfil="usuario",
    )

    # Criar o administrador
    criar_usuario_se_nao_existir(
        username="admin_historico_teste",
        nome="Administrador de Teste",
        perfil="admin",
    )

    # Login do usuário comum
    login_usuario = client.post(
        "/usuarios/login",
        json={
            "username": "usuario_admin_historico",
            "senha": "12345678",
        },
    )

    assert login_usuario.status_code == 200
    token_usuario = login_usuario.json()["access_token"]

    # Usuário cria um chamado
    criacao = client.post(
        "/chamados/",
        headers={
            "Authorization": f"Bearer {token_usuario}",
        },
        json={
            "titulo": "Chamado para histórico administrativo",
            "descricao": "Chamado usado para validar o acesso do administrador.",
            "categoria": "Software",
            "prioridade": "media",
        },
    )

    assert criacao.status_code == 200
    chamado_id = criacao.json()["id"]

    # Login do administrador
    login_admin = client.post(
        "/usuarios/login",
        json={
            "username": "admin_historico_teste",
            "senha": "12345678",
        },
    )

    assert login_admin.status_code == 200
    token_admin = login_admin.json()["access_token"]

    # Administrador consulta o histórico do chamado
    resposta = client.get(
        f"/chamados/{chamado_id}/historico",
        headers={
            "Authorization": f"Bearer {token_admin}",
        },
    )

    assert resposta.status_code == 200
    assert isinstance(resposta.json(), list)