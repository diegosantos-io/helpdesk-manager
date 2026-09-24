from sqlalchemy.orm import Session

from app.models.models_chamado import Chamado
from app.models.models_usuario import Usuario
from app.schemas.chamado import ChamadoCreate
from app.services.historico_service import registrar_historico


def criar_chamado(
    db: Session,
    dados: ChamadoCreate,
    usuario_id: int,
):
    chamado = Chamado(
        titulo=dados.titulo,
        descricao=dados.descricao,
        categoria=dados.categoria,
        prioridade=dados.prioridade,
        status="aberto",
        usuario_id=usuario_id,
    )

    db.add(chamado)
    db.commit()
    db.refresh(chamado)

    registrar_historico(
        db=db,
        chamado_id=chamado.id,
        usuario_id=usuario_id,
        acao="criado",
        descricao="Chamado criado pelo usuário.",
    )

    return chamado


def listar_chamados_do_usuario(
    db: Session,
    usuario_id: int,
):
    return (
        db.query(Chamado)
        .filter(Chamado.usuario_id == usuario_id)
        .order_by(Chamado.criado_em.desc())
        .all()
    )


def listar_todos_os_chamados(db: Session):
    return (
        db.query(Chamado)
        .order_by(Chamado.criado_em.desc())
        .all()
    )


def listar_chamados_para_tecnico(
    db: Session,
    tecnico_id: int,
):
    return (
        db.query(Chamado)
        .filter(
            (Chamado.status == "aberto")
            | (Chamado.tecnico_id == tecnico_id)
        )
        .order_by(Chamado.criado_em.asc())
        .all()
    )


def assumir_chamado(
    db: Session,
    chamado_id: int,
    tecnico_id: int,
):
    chamado = (
        db.query(Chamado)
        .filter(Chamado.id == chamado_id)
        .first()
    )

    if not chamado:
        return None

    if chamado.status != "aberto":
        return None

    chamado.status = "em_atendimento"
    chamado.tecnico_id = tecnico_id

    db.commit()
    db.refresh(chamado)

    registrar_historico(
        db=db,
        chamado_id=chamado.id,
        usuario_id=tecnico_id,
        acao="assumido",
        descricao="Chamado assumido pelo técnico.",
    )

    return chamado


def resolver_chamado(
    db: Session,
    chamado_id: int,
    tecnico_id: int,
    solucao: str,
):
    chamado = (
        db.query(Chamado)
        .filter(Chamado.id == chamado_id)
        .first()
    )

    if not chamado:
        return None

    if chamado.status != "em_atendimento":
        return None

    if chamado.tecnico_id != tecnico_id:
        return None

    chamado.solucao = solucao
    chamado.status = "resolvido"

    db.commit()
    db.refresh(chamado)

    registrar_historico(
        db=db,
        chamado_id=chamado.id,
        usuario_id=tecnico_id,
        acao="resolvido",
        descricao="Chamado resolvido pelo técnico.",
    )

    return chamado


def buscar_chamado_por_id(
    db: Session,
    chamado_id: int,
):
    return (
        db.query(Chamado)
        .filter(Chamado.id == chamado_id)
        .first()
    )

def transferir_chamado(
    db: Session,
    chamado_id: int,
    novo_tecnico_id: int,
    administrador_id: int,
    motivo: str | None = None,
):
    chamado = (
        db.query(Chamado)
        .filter(Chamado.id == chamado_id)
        .first()
    )

    if not chamado:
        return None

    if chamado.status != "em_atendimento":
        return None

    tecnico = (
        db.query(Usuario)
        .filter(
            Usuario.id == novo_tecnico_id,
            Usuario.perfil == "tecnico",
            Usuario.ativo.is_(True),
        )
        .first()
    )

    if not tecnico:
        return None

    tecnico_anterior = chamado.tecnico_id

    chamado.tecnico_id = novo_tecnico_id

    db.commit()
    db.refresh(chamado)

    usuario_anterior = (
        db.query(Usuario)
        .filter(Usuario.id == tecnico_anterior)
        .first()
    )

    nome_anterior = (
        usuario_anterior.nome
        if usuario_anterior
        else f"Técnico ID {tecnico_anterior}"
    )

    descricao = (
        f"Chamado transferido de {nome_anterior} "
        f"para {tecnico.nome}."
    )

    if motivo:
        descricao += f" Motivo: {motivo}"

    registrar_historico(
        db=db,
        chamado_id=chamado.id,
        usuario_id=administrador_id,
        acao="transferido",
        descricao=descricao,
    )

    return chamado