import {
  findAllUsers,
  findUserById,
} from "../services/user.service.js";

export async function showCurrentUser(request, response) {
  try {
    const user = await findUserById(request.user.id);

    if (!user) {
      return response.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    return response.status(200).json({ user });
  } catch {
    return response.status(500).json({
      message: "Erro interno ao consultar usuário.",
    });
  }
}

export async function listUsers(request, response) {
  try {
    const users = await findAllUsers();
    return response.status(200).json({ users });
  } catch {
    return response.status(500).json({
      message: "Erro interno ao consultar usuários.",
    });
  }
}
