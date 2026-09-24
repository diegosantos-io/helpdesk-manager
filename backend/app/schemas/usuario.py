from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PerfilUsuario = Literal["usuario", "tecnico", "admin"]


class UsuarioCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    senha: str = Field(min_length=6, max_length=100)
    nome: str = Field(min_length=3, max_length=100)


class UsuarioAdminCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    senha: str = Field(min_length=6, max_length=100)
    nome: str = Field(min_length=3, max_length=100)
    perfil: PerfilUsuario = "usuario"
    ativo: bool = True


class UsuarioUpdate(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
    )
    nome: str | None = Field(
        default=None,
        min_length=3,
        max_length=100,
    )
    perfil: PerfilUsuario | None = None
    ativo: bool | None = None


class UsuarioResponse(BaseModel):
    id: int
    username: str
    nome: str
    perfil: str
    ativo: bool

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    senha: str