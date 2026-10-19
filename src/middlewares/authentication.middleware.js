import jwt from "jsonwebtoken";

export function authenticate(request, response, next) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return response.status(401).json({
      message: "Token não informado.",
    });
  }

  const [type, token] = authorization.split(" ");

  if (type !== "Bearer" || !token) {
    return response.status(401).json({
      message: "Formato de token inválido.",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    request.user = {
      id: Number(payload.sub),
      role: payload.role,
    };

    return next();
  } catch {
    return response.status(401).json({
      message: "Token inválido ou expirado.",
    });
  }
}
