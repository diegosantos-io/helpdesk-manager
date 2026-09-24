from sqlalchemy.orm import Session

from app.models.models_historico import HistoricoChamado
from app.models.models_usuario import Usuario


def registrar_historico(
    db: Session,
    chamado_id: int,
    usuario_id: int,
    acao: str,
    descricao: str | None = None,
):
    historico = HistoricoChamado(
        chamado_id=chamado_id,
        usuario_id=usuario_id,
        acao=acao,
        descricao=descricao,
    )

    db.add(historico)
    db.commit()
    db.refresh(historico)

    return historico


def listar_historico_chamado(
    db: Session,
    chamado_id: int,
):
    registros = (
        db.query(HistoricoChamado, Usuario)
        .join(
            Usuario,
            Usuario.id == HistoricoChamado.usuario_id,
        )
        .filter(HistoricoChamado.chamado_id == chamado_id)
        .order_by(HistoricoChamado.id.asc())
        .all()
    )

    historico_formatado = []

    for historico, usuario in registros:
        historico_formatado.append(
            {
                "id": historico.id,
                "chamado_id": historico.chamado_id,
                "usuario_id": historico.usuario_id,
                "usuario_nome": usuario.nome,
                "usuario_username": usuario.username,
                "acao": historico.acao,
                "descricao": historico.descricao,
                "criado_em": historico.criado_em,
            }
        )

    return historico_formatado