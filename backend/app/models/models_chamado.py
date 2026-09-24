from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.database import Base


class Chamado(Base):
    __tablename__ = "chamados"

    id = Column(Integer, primary_key=True, index=True)

    titulo = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=False)

    categoria = Column(String(50), nullable=False)
    prioridade = Column(String(20), nullable=False, default="media")
    status = Column(String(20), nullable=False, default="aberto")

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False,
    )

    tecnico_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=True,
    )

    solucao = Column(Text, nullable=True)

    criado_em = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    atualizado_em = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    usuario = relationship(
        "Usuario",
        foreign_keys=[usuario_id],
    )

    tecnico = relationship(
        "Usuario",
        foreign_keys=[tecnico_id],
    )

    @property
    def usuario_nome(self):
        return self.usuario.nome if self.usuario else None

    @property
    def tecnico_nome(self):
        return self.tecnico.nome if self.tecnico else None