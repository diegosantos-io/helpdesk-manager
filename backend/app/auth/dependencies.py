from fastapi import Depends,HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.auth.security import SECRET_KEY, ALGORITHM
from app.database.database import get_db
from app.models.models_usuario import Usuario

security = HTTPBearer()

def obter_usuario_atual(
        credencias: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db),
):
    token = credencias.credentials

    credencias_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail= "Token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        usuario_id = payload.get("sub")

        if usuario_id is None:
            raise credencias_exception

    except JWTError:
        raise credencias_exception

    usuario = (
        db.query(Usuario)
        .filter(Usuario.id == int(usuario_id))
        .first()
    )

    if usuario is None or not usuario.ativo:
        raise credencias_exception

    return usuario