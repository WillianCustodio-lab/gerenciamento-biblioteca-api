import jwt from "jsonwebtoken";
import { findUserById } from "../services/user.service.js";

export async function authenticate(request, response, next) {
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

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return response.status(401).json({
      message: "Token inválido ou expirado.",
    });
  }

  const userId = Number(payload.sub);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return response.status(401).json({
      message: "Token inválido ou expirado.",
    });
  }

  try {
    const user = await findUserById(userId);

    if (!user) {
      return response.status(401).json({
        message: "Usuário não encontrado. Faça login com uma conta válida.",
      });
    }

    request.user = {
      id: Number(user.id),
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
