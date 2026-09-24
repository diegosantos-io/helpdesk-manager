from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioAdminCreate,
    UsuarioUpdate,
    LoginRequest,
)
from app.services.usuario_service import (
    criar_usuario,
    autenticar_usuario,
    listar_usuarios,
    criar_usuario_admin,
    buscar_usuario_por_id,
    atualizar_usuario,
    excluir_usuario,
)
from app.auth.security import criar_access_token
from app.auth.dependencies import obter_usuario_atual
from app.models.models_usuario import Usuario


router = APIRouter(
    prefix="/usuarios",
    tags=["Usuários"],
)


def exigir_admin(usuario_atual: Usuario):
    if usuario_atual.perfil != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido apenas para administradores.",
        )


@router.post("/", response_model=UsuarioResponse)
def cadastrar_usuario(
    dados: UsuarioCreate,
    db: Session = Depends(get_db),
):
    usuario = criar_usuario(db, dados)

    if usuario is None:
        raise HTTPException(
            status_code=409,
            detail="Username já está em uso.",
        )

    return usuario


@router.post("/login")
def login(
    dados: LoginRequest,
    db: Session = Depends(get_db),
):
    usuario = autenticar_usuario(
        db,
        dados.username,
        dados.senha,
    )

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="Usuário ou senha inválidos.",
        )

    access_token = criar_access_token(
        data={
            "sub": str(usuario.id),
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me")
def usuario_atual(
    usuario: Usuario = Depends(obter_usuario_atual),
):
    return {
        "id": usuario.id,
        "username": usuario.username,
        "nome": usuario.nome,
        "perfil": usuario.perfil,
    }


@router.get("/", response_model=list[UsuarioResponse])
def listar_todos_usuarios(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    exigir_admin(usuario_atual)

    return listar_usuarios(db)


@router.post("/admin", response_model=UsuarioResponse, status_code=201)
def cadastrar_usuario_admin(
    dados: UsuarioAdminCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    exigir_admin(usuario_atual)

    usuario = criar_usuario_admin(db, dados)

    if usuario is None:
        raise HTTPException(
            status_code=409,
            detail="Username já está em uso.",
        )

    return usuario


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def editar_usuario(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    exigir_admin(usuario_atual)

    usuario = buscar_usuario_por_id(db, usuario_id)

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado.",
        )

    if dados.username is not None:
        outro_usuario = (
            db.query(Usuario)
            .filter(
                Usuario.username == dados.username,
                Usuario.id != usuario_id,
            )
            .first()
        )

        if outro_usuario:
            raise HTTPException(
                status_code=409,
                detail="Username já está em uso.",
            )

    if usuario.id == usuario_atual.id and dados.ativo is False:
        raise HTTPException(
            status_code=400,
            detail="Você não pode desativar o próprio usuário.",
        )

    if usuario.id == usuario_atual.id and dados.perfil != "admin":
        raise HTTPException(
            status_code=400,
            detail="Você não pode remover o próprio perfil de administrador.",
        )

    return atualizar_usuario(db, usuario, dados)


@router.delete("/{usuario_id}", status_code=204)
def remover_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    exigir_admin(usuario_atual)

    usuario = buscar_usuario_por_id(db, usuario_id)

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado.",
        )

    if usuario.id == usuario_atual.id:
        raise HTTPException(
            status_code=400,
            detail="Você não pode excluir o próprio usuário.",
        )

    excluir_usuario(db, usuario)

    return None