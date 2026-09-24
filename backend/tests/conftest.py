import pytest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from fastapi.testclient import TestClient

from app.main import app
from app.database.database import Base, get_db
from app.models.models_usuario import Usuario
import bcrypt


TEST_DATABASE_URL = (
    "postgresql+psycopg://helpdesk_user:helpdesk123"
    "@127.0.0.1:5433/helpdesk_manager_test"
)

engine_test = create_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine_test,
)


@pytest.fixture(scope="session", autouse=True)
def criar_tabelas():
    Base.metadata.create_all(bind=engine_test)

    yield

    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def preparar_banco():
    db = TestingSessionLocal()

    usuario_existente = (
        db.query(Usuario)
        .filter(Usuario.username == "adminteste")
        .first()
    )

    if not usuario_existente:
        senha_hash = bcrypt.hashpw(
            b"12345678",
            bcrypt.gensalt(),
        ).decode("utf-8")

        usuario = Usuario(
            username="adminteste",
            senha_hash=senha_hash,
            nome="Administrador de Teste",
            perfil="admin",
            ativo=True,
        )

        db.add(usuario)
        db.commit()

    db.close()


@pytest.fixture
def db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()