from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database.database import Base


class HistoricoChamado(Base):
    __tablename__ = "historico_chamados"

    id = Column(Integer, primary_key=True, index=True)

    chamado_id = Column(
        Integer,
        ForeignKey("chamados.id"),
        nullable=False,
    )

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False,
    )

    acao = Column(
        String(50),
        nullable=False,
    )

    descricao = Column(
        Text,
        nullable=True,
    )

    criado_em = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )