from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chamados, usuarios

app = FastAPI(
    title="HelpDesk Manager API",
    description="API para gerenciamento de chamados de suporte técnico",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chamados.router)
app.include_router(usuarios.router)


@app.get("/")
def inicio():
    return {
        "mensagem": "HelpDesk Manager API funcionando"
    }