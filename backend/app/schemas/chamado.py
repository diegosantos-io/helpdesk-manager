from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict

class ChamadoCreate(BaseModel):
    titulo: str = Field(min_length=3, max_length=150)
    descricao: str = Field(min_length=5)
    categoria: str = Field(min_length=3, max_length=50)
    prioridade: str = Field(default="media", max_length=20)


class ChamadoResponse(BaseModel):
    id: int
    titulo: str
    descricao: str
    categoria: str
    prioridade: str
    status: str

    usuario_id: int
    usuario_nome: str | None = None

    tecnico_id: int | None
    tecnico_nome: str | None = None

    solucao: str | None

    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class ChamadoResolver(BaseModel):
    solucao: str = Field(min_length=5)


class HistoricoChamadoResponse(BaseModel):
    id: int
    chamado_id: int
    usuario_id: int
    usuario_nome: str | None = None
    acao: str
    descricao: str | None
    criado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class ChamadoTransferencia(BaseModel):
    tecnico_id: int
    motivo: str | None = None
