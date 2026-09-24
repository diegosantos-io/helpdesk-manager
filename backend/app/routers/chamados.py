from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.chamado import (
    ChamadoCreate,
    ChamadoResponse,
    ChamadoResolver,
    HistoricoChamadoResponse,
    ChamadoTransferencia,
)
from app.services.chamado_service import (
    criar_chamado,
    listar_chamados_do_usuario,
    listar_chamados_para_tecnico,
    listar_todos_os_chamados,
    assumir_chamado,
    resolver_chamado,
    buscar_chamado_por_id,
    transferir_chamado,
)
from app.services.historico_service import listar_historico_chamado
from app.auth.dependencies import obter_usuario_atual
from app.models.models_usuario import Usuario
from app.models.models_chamado import Chamado


router = APIRouter(
    prefix="/chamados",
    tags=["Chamados"],
)

@router.get("/publico")
def dados_publicos_home(
    db: Session = Depends(get_db),
):
    chamados = (
        db.query(Chamado)
        .order_by(Chamado.criado_em.desc())
        .all()
    )

    total = len(chamados)

    abertos = sum(
        1 for chamado in chamados
        if chamado.status == "aberto"
    )

    em_atendimento = sum(
        1 for chamado in chamados
        if chamado.status == "em_atendimento"
    )

    resolvidos = sum(
        1 for chamado in chamados
        if chamado.status == "resolvido"
    )

    recentes = [
        {
            "id": chamado.id,
            "titulo": chamado.titulo,
            "status": chamado.status,
        }
        for chamado in chamados[:3]
    ]

    return {
        "total": total,
        "abertos": abertos,
        "em_atendimento": em_atendimento,
        "resolvidos": resolvidos,
        "recentes": recentes,
    }


@router.get("/", response_model=list[ChamadoResponse])
def listar_chamados(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    if usuario.perfil == "usuario":
        return listar_chamados_do_usuario(
            db,
            usuario.id,
        )

    if usuario.perfil == "tecnico":
        return listar_chamados_para_tecnico(
            db,
            usuario.id,
        )

    if usuario.perfil == "admin":
        return listar_todos_os_chamados(db)

    raise HTTPException(
        status_code=403,
        detail="Perfil sem permissão para listar chamados.",
    )


@router.get("/tecnico", response_model=list[ChamadoResponse])
def listar_chamados_tecnico(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    if usuario.perfil != "tecnico":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para técnicos.",
        )

    chamados = listar_chamados_para_tecnico(
        db,
        usuario.id,
    )

    return chamados


@router.get("/{chamado_id}", response_model=ChamadoResponse)
def obter_chamado(
    chamado_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    chamado = buscar_chamado_por_id(
        db,
        chamado_id,
    )

    if not chamado:
        raise HTTPException(
            status_code=404,
            detail="Chamado não encontrado.",
        )

    if usuario.perfil == "usuario":
        if chamado.usuario_id != usuario.id:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para acessar este chamado.",
            )

    elif usuario.perfil == "tecnico":
        if (
            chamado.tecnico_id is not None
            and chamado.tecnico_id != usuario.id
        ):
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para acessar este chamado.",
            )

    elif usuario.perfil == "admin":
        pass

    else:
        raise HTTPException(
            status_code=403,
            detail="Perfil sem permissão para acessar chamados.",
        )

    return chamado


@router.post("/{chamado_id}/assumir", response_model=ChamadoResponse)
def assumir_chamado_endpoint(
    chamado_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    if usuario.perfil != "tecnico":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para técnicos.",
        )

    chamado = assumir_chamado(
        db,
        chamado_id,
        usuario.id,
    )

    if not chamado:
        raise HTTPException(
            status_code=404,
            detail="Chamado não encontrado ou já está em atendimento.",
        )

    return chamado


@router.post("/{chamado_id}/resolver", response_model=ChamadoResponse)
def resolver_chamado_endpoint(
    chamado_id: int,
    dados: ChamadoResolver,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    if usuario.perfil != "tecnico":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para técnicos.",
        )

    chamado = resolver_chamado(
        db,
        chamado_id,
        usuario.id,
        dados.solucao,
    )

    if not chamado:
        raise HTTPException(
            status_code=404,
            detail=(
                "Chamado não encontrado, não está em atendimento "
                "ou pertence a outro técnico."
            ),
        )

    return chamado


@router.post("/", response_model=ChamadoResponse)
def cadastrar_chamado(
    dados: ChamadoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    chamado = criar_chamado(
        db,
        dados,
        usuario.id,
    )

    return chamado


@router.get(
    "/{chamado_id}/historico",
    response_model=list[HistoricoChamadoResponse],
)
def listar_historico(
    chamado_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    chamado = buscar_chamado_por_id(
        db,
        chamado_id,
    )

    if not chamado:
        raise HTTPException(
            status_code=404,
            detail="Chamado não encontrado.",
        )

    if usuario.perfil == "usuario":
        if chamado.usuario_id != usuario.id:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para acessar este histórico.",
            )

    elif usuario.perfil == "tecnico":
        if (
            chamado.tecnico_id is not None
            and chamado.tecnico_id != usuario.id
        ):
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para acessar este histórico.",
            )

    elif usuario.perfil == "admin":
        pass

    else:
        raise HTTPException(
            status_code=403,
            detail="Perfil sem permissão para acessar históricos.",
        )

    historico = listar_historico_chamado(
        db,
        chamado_id,
    )

    resultado = []

    for evento in historico:
        usuario_evento = (
            db.query(Usuario)
            .filter(Usuario.id == evento["usuario_id"])
            .first()
        )

        resultado.append(
            {
                "id": evento["id"],
                "chamado_id": evento["chamado_id"],
                "usuario_id": evento["usuario_id"],
                "usuario_nome": (
                    usuario_evento.nome
                    if usuario_evento
                    else None
                ),
                "acao": evento["acao"],
                "descricao": evento["descricao"],
                "criado_em": evento["criado_em"],
            }
        )

    return resultado

@router.post(
    "/{chamado_id}/transferir",
    response_model= ChamadoResponse
)
def transferir(
    chamado_id: int,
    dados: ChamadoTransferencia,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    if usuario.perfil != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para administradores"
        )

    chamado = transferir_chamado(
        db=db,
        chamado_id=chamado_id,
        novo_tecnico_id=dados.tecnico_id,
        administrador_id=usuario.id,
        motivo=dados.motivo,
    )

    if not chamado:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível transferir o chamado.",
        )

    chamado_atualizado = buscar_chamado_por_id(
        db,
        chamado_id,
    )

    return chamado_atualizado