import bcrypt
from sqlalchemy.orm import Session

from app.models.models_usuario import Usuario
from app.schemas.usuario import UsuarioCreate


def criar_usuario(db: Session, dados: UsuarioCreate):
    usuario_existente = (
        db.query(Usuario)
        .filter(Usuario.username == dados.username)
        .first()
    )

    if usuario_existente:
        return None

    senha_hash = bcrypt.hashpw(
        dados.senha.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    usuario = Usuario(
        username=dados.username,
        senha_hash=senha_hash,
        nome=dados.nome,
        perfil="usuario",
        ativo=True,
    )

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    return usuario

def autenticar_usuario(db: Session, username: str,senha: str):
    usuario = (
        db.query(Usuario)
        .filter(Usuario.username == username)
        .first()
    )

    if not usuario:
        return None

    senha_valida = bcrypt.checkpw(
        senha.encode("utf-8"),
        usuario.senha_hash.encode("utf-8")
    )

    if not senha_valida:
        return None

    if not usuario.ativo:
        return None

    return usuario

def listar_usuarios(db: Session):
    return (
        db.query(Usuario)
        .order_by(Usuario.id.asc())
        .all()
    )

def criar_usuario_admin(db: Session, dados):
    usuario_existente = (
        db.query(Usuario)
        .filter(Usuario.username == dados.username)
        .first()
    )

    if usuario_existente:
        return None

    senha_hash = bcrypt.hashpw(
        dados.senha.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    usuario = Usuario(
        username=dados.username,
        senha_hash=senha_hash,
        nome=dados.nome,
        perfil=dados.perfil,
        ativo=dados.ativo,
    )

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    return usuario


def buscar_usuario_por_id(db: Session, usuario_id: int):
    return (
        db.query(Usuario)
        .filter(Usuario.id == usuario_id)
        .first()
    )


def atualizar_usuario(db: Session, usuario, dados):
    if dados.username is not None:
        usuario.username = dados.username

    if dados.nome is not None:
        usuario.nome = dados.nome

    if dados.perfil is not None:
        usuario.perfil = dados.perfil

    if dados.ativo is not None:
        usuario.ativo = dados.ativo

    db.commit()
    db.refresh(usuario)

    return usuario


def excluir_usuario(db: Session, usuario):
    db.delete(usuario)
    db.commit()