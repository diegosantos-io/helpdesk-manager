from sqlalchemy import Column,Integer, String, Boolean
from app.database.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer,primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    nome = Column(String(100), nullable=False)
    perfil = Column(String(20), nullable=False, default="usuario")
    ativo = Column(Boolean, nullable=False, default=True)