from datetime import datetime,timedelta,timezone
from jose import jwt

SECRET_KEY = "helpdesk-manager-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def criar_access_token(data: dict):
    dados = data.copy()

    expiracao = datetime.now(timezone.utc) + timedelta(
        minutes= ACCESS_TOKEN_EXPIRE_MINUTES
    )

    dados.update({
        "exp": expiracao
    })

    token = jwt.encode(
        dados,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    return token
